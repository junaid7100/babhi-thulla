import { Server, Socket } from "socket.io";
import { RULES } from "../engine/rules";
import * as rooms from "./rooms";
import { GameRoom } from "./roomTypes";
import { buildLobbyView, buildResultsView, buildStateView } from "./stateView";
import { sanitizeDisplayName, uniqueDisplayName } from "./sanitize";
import { normalizeRoomCode } from "./roomCodes";
import { pickAutoCard } from "./bot";
import { KeyedMutex } from "./mutex";
import { RateLimiter } from "./rateLimit";
import { logGameEventSafe } from "./logger";
import { PlayCardOutcome } from "./rooms";

const BOT_MOVE_DELAY_MS = 2500;

const roomMutex = new KeyedMutex();
const actionRateLimiter = new RateLimiter(40, 10_000);

const turnTimers = new Map<string, NodeJS.Timeout>();
const roomExpiryTimers = new Map<string, NodeJS.Timeout>();

function clearTurnTimer(roomCode: string): void {
  const t = turnTimers.get(roomCode);
  if (t) {
    clearTimeout(t);
    turnTimers.delete(roomCode);
  }
}

function emitStateToAll(io: Server, room: GameRoom): void {
  for (const p of room.players) {
    if (p.socketId) io.to(p.socketId).emit("STATE_UPDATE", buildStateView(room, p.id));
  }
}

function emitLobbyToAll(io: Server, room: GameRoom): void {
  io.to(room.roomCode).emit("ROOM_UPDATED", buildLobbyView(room));
}

function scheduleNextTurn(io: Server, roomCode: string): void {
  clearTurnTimer(roomCode);
  const room = rooms.getRoom(roomCode);
  if (!room || room.status !== "PLAYING") return;
  const player = room.players.find((p) => p.id === room.currentPlayerId);
  if (!player) return;

  const delay = player.isBot ? BOT_MOVE_DELAY_MS : RULES.turnTimeLimitMs;
  const forPlayerId = player.id;

  const timer = setTimeout(() => {
    turnTimers.delete(roomCode);
    void roomMutex.run(roomCode, () => autoPlayCurrentTurn(io, roomCode, forPlayerId));
  }, delay);
  timer.unref?.();
  turnTimers.set(roomCode, timer);
}

function autoPlayCurrentTurn(io: Server, roomCode: string, forPlayerId: string): void {
  const room = rooms.getRoom(roomCode);
  if (!room || room.status !== "PLAYING") return;
  if (room.currentPlayerId !== forPlayerId) return; // already moved on
  const player = room.players.find((p) => p.id === forPlayerId);
  if (!player) return;

  const cardId = pickAutoCard(player.hand, room.leadSuit, room.currentTrick, room.firstTrick);
  const result = rooms.playCardAction(roomCode, forPlayerId, cardId);
  if ("error" in result) return;
  if (!player.isBot) {
    io.to(roomCode).emit("TURN_AUTO_PLAYED", { playerId: player.id, displayName: player.displayName });
  }
  processPlayResult(io, room, result);
}

function processPlayResult(io: Server, room: GameRoom, result: PlayCardOutcome): void {
  if (result.trickResolved) {
    logGameEventSafe(room.id, "TRICK_RESOLVED", { trickNumber: room.trickNumber });
    if (result.isThulla && result.thullaInfo) {
      io.to(room.roomCode).emit("THULLA", result.thullaInfo);
      logGameEventSafe(room.id, "THULLA_DETECTED", { missingSuit: result.thullaInfo.missingSuit });
    }
    for (const esc of result.newlyEscaped ?? []) {
      io.to(room.roomCode).emit("PLAYER_ESCAPED", esc);
      logGameEventSafe(room.id, "PLAYER_ESCAPED", { finishPosition: esc.finishPosition });
    }
  }

  if (!result.gameFinished) {
    scheduleNextTurn(io, room.roomCode);
  } else {
    clearTurnTimer(room.roomCode);
  }

  emitStateToAll(io, room);

  if (result.gameFinished) {
    io.to(room.roomCode).emit("GAME_FINISHED", buildResultsView(room));
    logGameEventSafe(room.id, "GAME_FINISHED", { bhabhiPlayerId: room.bhabhiPlayerId });
  }
}

function scheduleRoomExpiry(io: Server, roomCode: string): void {
  const existing = roomExpiryTimers.get(roomCode);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    roomExpiryTimers.delete(roomCode);
    const room = rooms.getRoom(roomCode);
    if (!room) return;
    io.to(roomCode).emit("ROOM_EXPIRED", { message: "This room has expired." });
    logGameEventSafe(room.id, "ROOM_EXPIRED", {});
    clearTurnTimer(roomCode);
    rooms.deleteRoom(roomCode);
  }, RULES.roomTtlMs);
  timer.unref?.();
  roomExpiryTimers.set(roomCode, timer);
}

export function resumeTimersForRehydratedRoom(io: Server, room: GameRoom): void {
  scheduleRoomExpiry(io, room.roomCode);
  if (room.status === "PLAYING") scheduleNextTurn(io, room.roomCode);
}

export function registerSocketHandlers(io: Server, socket: Socket): void {
  function rateLimited(): boolean {
    if (actionRateLimiter.allow(socket.id)) return false;
    socket.emit("ERROR", { message: "Too many actions — please slow down." });
    return true;
  }

  socket.on("CREATE_ROOM", ({ displayName, maxPlayers, withBots }) => {
    if (rateLimited()) return;
    const name = sanitizeDisplayName(displayName);
    if (!name) {
      socket.emit("ERROR", { message: "Please enter a display name." });
      return;
    }
    const { room, playerId, playerSecret } = rooms.createRoom({
      hostDisplayName: name,
      maxPlayers: Number(maxPlayers) || undefined,
      withBots: !!withBots,
    });
    const player = room.players.find((p) => p.id === playerId)!;
    player.socketId = socket.id;
    socket.join(room.roomCode);
    socket.emit("ROOM_CREATED", { roomCode: room.roomCode, playerId, playerSecret });
    emitLobbyToAll(io, room);
    scheduleRoomExpiry(io, room.roomCode);
    logGameEventSafe(room.id, "GAME_CREATED", { roomCode: room.roomCode });
    logGameEventSafe(room.id, "PLAYER_JOINED", { seat: 0 });
  });

  socket.on("JOIN_ROOM", ({ roomCode, displayName }) => {
    if (rateLimited()) return;
    const code = normalizeRoomCode(roomCode);
    const room = rooms.getRoom(code);
    const existingNames = room ? room.players.map((p) => p.displayName) : [];
    const name = uniqueDisplayName(sanitizeDisplayName(displayName), existingNames);
    if (!name) {
      socket.emit("ERROR", { message: "Please enter a display name." });
      return;
    }
    const result = rooms.joinRoom(code, name);
    if ("error" in result) {
      socket.emit("ERROR", { message: result.error });
      return;
    }
    const { room: joinedRoom, playerId, playerSecret } = result;
    const player = joinedRoom.players.find((p) => p.id === playerId)!;
    player.socketId = socket.id;
    socket.join(joinedRoom.roomCode);
    socket.emit("ROOM_JOINED", { roomCode: joinedRoom.roomCode, playerId, playerSecret });
    emitLobbyToAll(io, joinedRoom);
    logGameEventSafe(joinedRoom.id, "PLAYER_JOINED", { seat: player.seat });
  });

  socket.on("START_GAME", () => {
    if (rateLimited()) return;
    const { room, player } = rooms.findRoomBySocketId(socket.id);
    if (!room || !player) {
      socket.emit("ERROR", { message: "You are not in a room." });
      return;
    }
    void roomMutex.run(room.roomCode, () => {
      const result = rooms.startGame(room.roomCode, player.id);
      if ("error" in result) {
        socket.emit("ERROR", { message: result.error });
        return;
      }
      io.to(room.roomCode).emit("GAME_STARTED", {});
      logGameEventSafe(room.id, "CARDS_DEALT", { playerCount: room.players.length });
      scheduleNextTurn(io, result.room.roomCode);
      emitStateToAll(io, result.room);
    });
  });

  socket.on("PLAY_CARD", ({ cardId }) => {
    if (rateLimited()) return;
    const { room, player } = rooms.findRoomBySocketId(socket.id);
    if (!room || !player) {
      socket.emit("ERROR", { message: "You are not in a room." });
      return;
    }
    if (typeof cardId !== "string" || cardId.length > 8) {
      socket.emit("ERROR", { message: "Invalid card." });
      return;
    }
    void roomMutex.run(room.roomCode, () => {
      const result = rooms.playCardAction(room.roomCode, player.id, cardId);
      if ("error" in result) {
        socket.emit("ERROR", { message: result.error });
        return;
      }
      logGameEventSafe(room.id, "CARD_PLAYED", { trickNumber: room.trickNumber });
      const freshRoom = rooms.getRoom(room.roomCode);
      if (freshRoom) processPlayResult(io, freshRoom, result);
    });
  });

  socket.on("PLAY_AGAIN", () => {
    if (rateLimited()) return;
    const { room, player } = rooms.findRoomBySocketId(socket.id);
    if (!room || !player) {
      socket.emit("ERROR", { message: "You are not in a room." });
      return;
    }
    void roomMutex.run(room.roomCode, () => {
      const result = rooms.resetForRematch(room.roomCode, player.id);
      if ("error" in result) {
        socket.emit("ERROR", { message: result.error });
        return;
      }
      io.to(room.roomCode).emit("GAME_STARTED", {});
      logGameEventSafe(room.id, "CARDS_DEALT", { playerCount: room.players.length, rematch: true });
      scheduleNextTurn(io, result.room.roomCode);
      emitStateToAll(io, result.room);
    });
  });

  socket.on("LEAVE_ROOM", () => {
    const { room, player } = rooms.findRoomBySocketId(socket.id);
    if (!room || !player) return;
    socket.leave(room.roomCode);
    const result = rooms.leaveRoom(room.roomCode, player.id);
    if (result) {
      emitLobbyToAll(io, result.room);
      if (result.room.status === "PLAYING") emitStateToAll(io, result.room);
      if (result.hostChanged) {
        const host = result.room.players.find((p) => p.id === result.room.hostPlayerId);
        io.to(result.room.roomCode).emit("HOST_CHANGED", { hostPlayerId: result.room.hostPlayerId, hostName: host?.displayName });
        logGameEventSafe(result.room.id, "HOST_CHANGED", { hostPlayerId: result.room.hostPlayerId });
      }
    } else {
      clearTurnTimer(room.roomCode);
      const expiry = roomExpiryTimers.get(room.roomCode);
      if (expiry) {
        clearTimeout(expiry);
        roomExpiryTimers.delete(room.roomCode);
      }
    }
  });

  socket.on("RECONNECT_TO_ROOM", ({ roomCode, playerId, playerSecret }) => {
    if (rateLimited()) return;
    const code = normalizeRoomCode(roomCode);
    const result = rooms.reconnectPlayer(code, playerId, playerSecret);
    if ("error" in result) {
      socket.emit("ERROR", { message: result.error });
      return;
    }
    const { room, player } = result;
    player.socketId = socket.id;
    socket.join(room.roomCode);
    socket.emit("ROOM_JOINED", { roomCode: room.roomCode, playerId: player.id, playerSecret: player.playerSecret });
    io.to(room.roomCode).emit("PLAYER_RECONNECTED", { playerId: player.id, displayName: player.displayName });
    logGameEventSafe(room.id, "PLAYER_RECONNECTED", { playerId: player.id });
    emitLobbyToAll(io, room);
    if (room.status === "PLAYING" || room.status === "GAME_FINISHED") emitStateToAll(io, room);
  });

  socket.on("disconnect", () => {
    const { room, player } = rooms.findRoomBySocketId(socket.id);
    if (!room || !player) return;
    const result = rooms.markDisconnected(room.roomCode, player.id);
    if (!result) return;
    io.to(room.roomCode).emit("PLAYER_DISCONNECTED", { playerId: player.id, displayName: player.displayName });
    logGameEventSafe(room.id, "PLAYER_DISCONNECTED", { playerId: player.id });
    emitLobbyToAll(io, result.room);
    if (result.hostChanged) {
      const host = result.room.players.find((p) => p.id === result.room.hostPlayerId);
      io.to(result.room.roomCode).emit("HOST_CHANGED", { hostPlayerId: result.room.hostPlayerId, hostName: host?.displayName });
      logGameEventSafe(result.room.id, "HOST_CHANGED", { hostPlayerId: result.room.hostPlayerId });
    }
  });
}
