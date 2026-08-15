const rooms = require("./rooms");
const { pickBotCard } = require("./bot");

const BOT_MOVE_DELAY_MS = 1000;

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

// If it's now a bot's turn, plays a card for it after a short "thinking" delay, then
// applies the outcome the same way a real player's move would be applied — recursing
// into itself via applyPlayResult so a run of consecutive bot turns plays itself out.
function scheduleBotTurn(io, roomCode) {
  const room = rooms.getRoom(roomCode);
  if (!room || room.status !== "PLAYING") return;
  const bot = room.players.find((p) => p.id === room.currentPlayerId);
  if (!bot || !bot.isBot) return;

  setTimeout(() => {
    const freshRoom = rooms.getRoom(roomCode);
    if (!freshRoom || freshRoom.status !== "PLAYING") return;
    const freshBot = freshRoom.players.find((p) => p.id === freshRoom.currentPlayerId);
    if (!freshBot || !freshBot.isBot) return;

    const cardId = pickBotCard(freshBot.hand, freshRoom.leadSuit, freshRoom.currentTrick, freshRoom.firstTrick);
    const result = rooms.playCard(roomCode, freshBot.id, cardId);
    if (result.error) return;
    applyPlayResult(io, freshRoom, result);
  }, BOT_MOVE_DELAY_MS);
}

// Shared by the real PLAY_CARD handler and scheduleBotTurn so bot moves and human moves
// broadcast events (THULLA, PLAYER_ESCAPED, STATE_UPDATE, GAME_FINISHED) identically.
function applyPlayResult(io, room, result) {
  if (result.trickResolved) {
    if (result.isThulla && result.thullaInfo) {
      io.to(room.roomCode).emit("THULLA", result.thullaInfo);
    }
    for (const esc of result.newlyEscaped) {
      io.to(room.roomCode).emit("PLAYER_ESCAPED", esc);
    }
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
    return;
  }

  scheduleBotTurn(io, room.roomCode);
}

function registerSocketHandlers(io, socket) {
  socket.on("CREATE_ROOM", ({ displayName, maxPlayers }) => {
    if (!displayName || !displayName.trim()) {
      socket.emit("ERROR", { message: "Please enter a display name." });
      return;
    }
    const { room, playerId } = rooms.createRoom({ hostDisplayName: displayName.trim().slice(0, 20), maxPlayers });
    const player = room.players.find((p) => p.id === playerId);
    player.socketId = socket.id;
    socket.join(room.roomCode);
    socket.emit("ROOM_CREATED", { roomCode: room.roomCode, playerId });
    emitLobbyToAll(io, room);
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
    emitStateToAll(io, result.room);
    scheduleBotTurn(io, result.room.roomCode);
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
    emitStateToAll(io, result.room);
    scheduleBotTurn(io, result.room.roomCode);
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
