const rooms = require("./rooms");
const { pickBotCard } = require("./bot");

const BOT_MOVE_DELAY_MS = 3000;
const TURN_TIME_LIMIT_MS = 30000;
const ROOM_TTL_MS = 15 * 60 * 1000;

// roomCode -> timeout handle for the current player's turn (bot "thinking" delay or a
// human's time limit — whichever applies). Cleared and rescheduled on every turn change.
const pendingTurnTimers = new Map();
// roomCode -> timeout handle for the room's 15-minute lifetime cap.
const roomExpiryTimers = new Map();

function clearPendingTurn(roomCode) {
  const timer = pendingTurnTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    pendingTurnTimers.delete(roomCode);
  }
}

// Builds the player-specific view sent to a single socket. Never includes other players' hands.
function buildStateView(room, forPlayerId) {
  const me = room.players.find((p) => p.id === forPlayerId);
  return {
    roomCode: room.roomCode,
    status: room.status,
    maxPlayers: room.maxPlayers,
    hostPlayerId: room.hostPlayerId,
    you: me ? { id: me.id, hand: me.hand } : null,
    players: room.players.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      seat: p.seat,
      cardCount: p.hand.length,
      connected: p.connected,
      escaped: p.escaped,
      escapedAt: p.escapedAt,
      isBot: p.isBot,
      isCurrentTurn: room.status === "PLAYING" && room.currentPlayerId === p.id,
    })),
    currentTrick: room.currentTrick.map((t) => {
      const player = room.players.find((p) => p.id === t.playerId);
      return { playerId: t.playerId, displayName: player ? player.displayName : "?", card: t.card };
    }),
    leadSuit: room.leadSuit,
    currentPlayerId: room.currentPlayerId,
    turnDeadline: room.turnDeadline || null,
    firstTrick: room.firstTrick,
    trickCount: room.trickCount,
    thullaCount: room.thullaCount,
    bhabhiPlayerId: room.bhabhiPlayerId || null,
    escapeOrder: (room.escapeOrder || []).map((id) => {
      const p = room.players.find((pl) => pl.id === id);
      return { playerId: id, displayName: p ? p.displayName : "?" };
    }),
  };
}

function buildLobbyView(room) {
  return {
    roomCode: room.roomCode,
    status: room.status,
    hostPlayerId: room.hostPlayerId,
    maxPlayers: room.maxPlayers,
    players: room.players.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      seat: p.seat,
      connected: p.connected,
      isBot: p.isBot,
    })),
  };
}

function emitStateToAll(io, room) {
  for (const p of room.players) {
    if (p.socketId) {
      io.to(p.socketId).emit("STATE_UPDATE", buildStateView(room, p.id));
    }
  }
}

function emitLobbyToAll(io, room) {
  io.to(room.roomCode).emit("ROOM_UPDATED", buildLobbyView(room));
}

// Plays a legal (follow-suit) card on behalf of whoever's turn it currently is, then
// applies the outcome exactly as a real player's move would be applied — recursing into
// applyPlayResult so a run of consecutive auto-played turns plays itself out.
function autoPlayCurrentTurn(io, roomCode, forPlayerId) {
  const room = rooms.getRoom(roomCode);
  if (!room || room.status !== "PLAYING") return;
  if (room.currentPlayerId !== forPlayerId) return; // turn already moved on
  const player = room.players.find((p) => p.id === forPlayerId);
  if (!player) return;

  const cardId = pickBotCard(player.hand, room.leadSuit, room.currentTrick, room.firstTrick);
  const result = rooms.playCard(roomCode, forPlayerId, cardId);
  if (result.error) return;
  if (!player.isBot) {
    io.to(roomCode).emit("TURN_AUTO_PLAYED", { playerId: player.id, displayName: player.displayName });
  }
  applyPlayResult(io, room, result);
}

// Schedules whoever's turn it now is to auto-play: a short "thinking" delay for bots,
// or the full time limit for a human before their turn is auto-played for them.
function scheduleNextTurn(io, roomCode) {
  clearPendingTurn(roomCode);
  const room = rooms.getRoom(roomCode);
  if (!room || room.status !== "PLAYING") return;
  const player = room.players.find((p) => p.id === room.currentPlayerId);
  if (!player) return;

  const delay = player.isBot ? BOT_MOVE_DELAY_MS : TURN_TIME_LIMIT_MS;
  const forPlayerId = player.id;
  room.turnDeadline = Date.now() + delay;

  const timer = setTimeout(() => {
    pendingTurnTimers.delete(roomCode);
    autoPlayCurrentTurn(io, roomCode, forPlayerId);
  }, delay);
  pendingTurnTimers.set(roomCode, timer);
}

// Shared by the real PLAY_CARD handler and autoPlayCurrentTurn so bot/auto-played moves
// and human moves broadcast events (THULLA, PLAYER_ESCAPED, STATE_UPDATE, GAME_FINISHED)
// identically. Schedules the next turn's timer *before* emitting state so the deadline
// sent to clients is already in place.
function applyPlayResult(io, room, result) {
  if (result.trickResolved) {
    if (result.isThulla && result.thullaInfo) {
      io.to(room.roomCode).emit("THULLA", result.thullaInfo);
    }
    for (const esc of result.newlyEscaped) {
      io.to(room.roomCode).emit("PLAYER_ESCAPED", esc);
    }
  }

  if (!result.gameFinished) {
    scheduleNextTurn(io, room.roomCode);
  } else {
    clearPendingTurn(room.roomCode);
    room.turnDeadline = null;
  }

  emitStateToAll(io, room);

  if (result.gameFinished) {
    const bhabhi = room.players.find((p) => p.id === room.bhabhiPlayerId);
    io.to(room.roomCode).emit("GAME_FINISHED", {
      bhabhiPlayerId: room.bhabhiPlayerId,
      bhabhiName: bhabhi ? bhabhi.displayName : null,
      escapeOrder: (room.escapeOrder || []).map((id) => {
        const p = room.players.find((pl) => pl.id === id);
        return { playerId: id, displayName: p ? p.displayName : "?" };
      }),
      trickCount: room.trickCount,
      thullaCount: room.thullaCount,
    });
  }
}

// A room is force-closed 15 minutes after creation, win/lose/still-in-lobby regardless —
// connected clients are told why and knocked back to the timers cleaned up.
function scheduleRoomExpiry(io, roomCode) {
  const timer = setTimeout(() => {
    roomExpiryTimers.delete(roomCode);
    const room = rooms.getRoom(roomCode);
    if (!room) return;
    io.to(roomCode).emit("ROOM_EXPIRED", { message: "This room has expired after 15 minutes." });
    clearPendingTurn(roomCode);
    rooms.deleteRoom(roomCode);
  }, ROOM_TTL_MS);
  roomExpiryTimers.set(roomCode, timer);
}

function registerSocketHandlers(io, socket) {
  socket.on("CREATE_ROOM", ({ displayName, maxPlayers, withBots }) => {
    if (!displayName || !displayName.trim()) {
      socket.emit("ERROR", { message: "Please enter a display name." });
      return;
    }
    const { room, playerId } = rooms.createRoom({
      hostDisplayName: displayName.trim().slice(0, 20),
      maxPlayers,
      withBots: !!withBots,
    });
    const player = room.players.find((p) => p.id === playerId);
    player.socketId = socket.id;
    socket.join(room.roomCode);
    socket.emit("ROOM_CREATED", { roomCode: room.roomCode, playerId });
    emitLobbyToAll(io, room);
    scheduleRoomExpiry(io, room.roomCode);
  });

  socket.on("JOIN_ROOM", ({ roomCode, displayName }) => {
    if (!displayName || !displayName.trim()) {
      socket.emit("ERROR", { message: "Please enter a display name." });
      return;
    }
    const result = rooms.joinRoom(roomCode, displayName.trim().slice(0, 20));
    if (result.error) {
      socket.emit("ERROR", { message: result.error });
      return;
    }
    const { room, playerId } = result;
    const player = room.players.find((p) => p.id === playerId);
    player.socketId = socket.id;
    socket.join(room.roomCode);
    socket.emit("ROOM_JOINED", { roomCode: room.roomCode, playerId });
    emitLobbyToAll(io, room);
  });

  socket.on("START_GAME", ({ roomCode }) => {
    const { room: existing } = rooms.findRoomBySocketId(socket.id);
    const room = existing || rooms.getRoom(roomCode);
    if (!room) {
      socket.emit("ERROR", { message: "Room not found." });
      return;
    }
    const player = room.players.find((p) => p.socketId === socket.id);
    const result = rooms.startGame(room.roomCode, player ? player.id : null);
    if (result.error) {
      socket.emit("ERROR", { message: result.error });
      return;
    }
    io.to(room.roomCode).emit("GAME_STARTED", {});
    scheduleNextTurn(io, result.room.roomCode);
    emitStateToAll(io, result.room);
  });

  socket.on("PLAY_CARD", ({ roomCode, cardId }) => {
    const room = rooms.getRoom(roomCode);
    if (!room) {
      socket.emit("ERROR", { message: "Room not found." });
      return;
    }
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) {
      socket.emit("ERROR", { message: "You are not in this room." });
      return;
    }
    const result = rooms.playCard(roomCode, player.id, cardId);
    if (result.error) {
      socket.emit("ERROR", { message: result.error });
      return;
    }

    applyPlayResult(io, room, result);
  });

  socket.on("PLAY_AGAIN", ({ roomCode }) => {
    const room = rooms.getRoom(roomCode);
    if (!room) {
      socket.emit("ERROR", { message: "Room not found." });
      return;
    }
    const player = room.players.find((p) => p.socketId === socket.id);
    const result = rooms.resetForRematch(roomCode, player ? player.id : null);
    if (result.error) {
      socket.emit("ERROR", { message: result.error });
      return;
    }
    io.to(room.roomCode).emit("GAME_STARTED", {});
    scheduleNextTurn(io, result.room.roomCode);
    emitStateToAll(io, result.room);
  });

  socket.on("LEAVE_ROOM", ({ roomCode }) => {
    const room = rooms.getRoom(roomCode);
    if (!room) return;
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;
    socket.leave(room.roomCode);
    const updated = rooms.leaveRoom(roomCode, player.id);
    if (updated) {
      emitLobbyToAll(io, updated);
      if (updated.status === "PLAYING") emitStateToAll(io, updated);
    } else {
      // Room was torn down (empty, or no humans left) — drop its timers too.
      clearPendingTurn(room.roomCode);
      const expiry = roomExpiryTimers.get(room.roomCode);
      if (expiry) {
        clearTimeout(expiry);
        roomExpiryTimers.delete(room.roomCode);
      }
    }
  });

  socket.on("RECONNECT", ({ roomCode, playerId }) => {
    const result = rooms.reconnect(roomCode, playerId);
    if (result.error) {
      socket.emit("ERROR", { message: result.error });
      return;
    }
    const { room, player } = result;
    player.socketId = socket.id;
    socket.join(room.roomCode);
    socket.emit("ROOM_JOINED", { roomCode: room.roomCode, playerId: player.id });
    io.to(room.roomCode).emit("PLAYER_RECONNECTED", { playerId: player.id, displayName: player.displayName });
    emitLobbyToAll(io, room);
    if (room.status === "PLAYING" || room.status === "FINISHED") {
      emitStateToAll(io, room);
    }
  });

  socket.on("disconnect", () => {
    const { room, player } = rooms.findRoomBySocketId(socket.id);
    if (!room || !player) return;
    rooms.markDisconnected(room.roomCode, player.id);
    io.to(room.roomCode).emit("PLAYER_DISCONNECTED", { playerId: player.id, displayName: player.displayName });
    emitLobbyToAll(io, room);
  });
}

module.exports = { registerSocketHandlers, buildStateView, buildLobbyView };
