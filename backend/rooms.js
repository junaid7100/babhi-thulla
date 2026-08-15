const crypto = require("crypto");
const { initGame, validateAndApplyMove, resolveTrick, sortHand } = require("./gameEngine");

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O,0,I,1
const DEFAULT_MAX_PLAYERS = 5;

/** @type {Map<string, GameRoom>} */
const rooms = new Map();

function generateRoomCode() {
  let code;
  do {
    code = "";
    for (let i = 0; i < 4; i++) {
      code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
  } while (rooms.has(code));
  return code;
}

function createRoom({ hostDisplayName, maxPlayers }) {
  const roomCode = generateRoomCode();
  const hostId = crypto.randomUUID();
  const room = {
    roomCode,
    status: "LOBBY",
    hostPlayerId: hostId,
    maxPlayers: maxPlayers && maxPlayers >= 3 && maxPlayers <= 8 ? maxPlayers : DEFAULT_MAX_PLAYERS,
    players: [
      {
        id: hostId,
        displayName: hostDisplayName,
        seat: 0,
        connected: true,
        socketId: null,
        hand: [],
        escaped: false,
        escapedAt: null,
      },
    ],
    currentTrick: [],
    leadSuit: null,
    currentPlayerId: null,
    firstTrick: true,
    trickCount: 0,
    thullaCount: 0,
    createdAt: Date.now(),
    startedAt: null,
  };
  rooms.set(roomCode, room);
  return { room, playerId: hostId };
}

function getRoom(roomCode) {
  return rooms.get((roomCode || "").toUpperCase());
}

function joinRoom(roomCode, displayName) {
  const room = getRoom(roomCode);
  if (!room) return { error: "Room not found." };
  if (room.status !== "LOBBY") return { error: "This game has already started." };
  if (room.players.length >= room.maxPlayers) return { error: "The room is full." };

  const playerId = crypto.randomUUID();
  const seat = room.players.length;
  room.players.push({
    id: playerId,
    displayName,
    seat,
    connected: true,
    socketId: null,
    hand: [],
    escaped: false,
    escapedAt: null,
  });
  return { room, playerId };
}

function leaveRoom(roomCode, playerId) {
  const room = getRoom(roomCode);
  if (!room) return;
  room.players = room.players.filter((p) => p.id !== playerId);
  if (room.players.length === 0) {
    rooms.delete(room.roomCode);
    return;
  }
  if (room.hostPlayerId === playerId) {
    room.hostPlayerId = room.players[0].id;
  }
  return room;
}

function startGame(roomCode, requestingPlayerId) {
  const room = getRoom(roomCode);
  if (!room) return { error: "Room not found." };
  if (room.hostPlayerId !== requestingPlayerId) return { error: "Only the host can start the game." };
  if (room.status !== "LOBBY") return { error: "The game has already started." };
  if (room.players.length < 3) return { error: "Need at least 3 players to start." };

  dealAndBegin(room);
  return { room };
}

function dealAndBegin(room) {
  const playerIds = room.players.map((p) => p.id);
  const { hands, currentPlayerId } = initGame(playerIds);
  for (const p of room.players) {
    p.hand = sortHand(hands[p.id]);
    p.escaped = false;
    p.escapedAt = null;
  }
  room.status = "PLAYING";
  room.currentTrick = [];
  room.leadSuit = null;
  room.currentPlayerId = currentPlayerId;
  room.firstTrick = true;
  room.trickCount = 0;
  room.thullaCount = 0;
  room.startedAt = Date.now();
  room.escapeOrder = [];
  room.bhabhiPlayerId = null;
}

function activePlayerOrder(room) {
  return room.players.filter((p) => !p.escaped).map((p) => p.id);
}

/**
 * Attempts to play a card. Returns:
 * { error } on rejection, or
 * { trickResolved: bool, thulla: {...}|null, escaped: [...], gameFinished: bool, ... } on success
 */
function playCard(roomCode, playerId, cardId) {
  const room = getRoom(roomCode);
  if (!room) return { error: "Room not found." };
  if (room.status !== "PLAYING") return { error: "The game is not in progress." };

  const handsMap = {};
  for (const p of room.players) handsMap[p.id] = p.hand;

  const state = {
    hands: handsMap,
    currentTrick: room.currentTrick,
    leadSuit: room.leadSuit,
    currentPlayerId: room.currentPlayerId,
    firstTrick: room.firstTrick,
    activePlayerOrder: activePlayerOrder(room),
    escaped: room.players.filter((p) => p.escaped).map((p) => p.id),
  };

  const result = validateAndApplyMove(state, playerId, cardId);
  if (!result.ok) {
    return { error: result.error };
  }

  // Apply hand removal immediately.
  for (const p of room.players) {
    p.hand = result.hands[p.id];
  }
  room.currentTrick = result.trick;
  room.leadSuit = result.leadSuit;

  if (!result.trickComplete) {
    room.currentPlayerId = result.nextPlayerId;
    return { trickResolved: false };
  }

  // Trick complete: resolve.
  const handsMap2 = {};
  for (const p of room.players) handsMap2[p.id] = p.hand;

  const resolved = resolveTrick({
    trick: room.currentTrick,
    leadSuit: room.leadSuit,
    isThulla: result.isThulla,
    firstTrick: room.firstTrick,
    hands: handsMap2,
    activePlayerOrder: activePlayerOrder(room),
    escaped: room.players.filter((p) => p.escaped).map((p) => p.id),
  });

  for (const p of room.players) {
    p.hand = sortHand(resolved.handsAfter[p.id] || []);
  }

  room.trickCount += 1;
  if (result.isThulla) room.thullaCount += 1;

  const winnerPlayer = room.players.find((p) => p.id === resolved.winnerId);
  const offenderPlayer = room.players.find((p) => p.id === playerId);

  const thullaInfo = result.isThulla
    ? {
        offenderName: offenderPlayer.displayName,
        offenderSuitMissing: room.leadSuit,
        winnerName: winnerPlayer.displayName,
        pileSize: resolved.pileSize,
      }
    : null;

  // Apply escapes.
  const newlyEscaped = [];
  for (const id of resolved.escapedNow) {
    const p = room.players.find((pl) => pl.id === id);
    if (p && !p.escaped) {
      p.escaped = true;
      room.escapeOrder = room.escapeOrder || [];
      p.escapedAt = room.escapeOrder.length + 1;
      room.escapeOrder.push(id);
      newlyEscaped.push({ playerId: p.id, displayName: p.displayName, finishPosition: p.escapedAt });
    }
  }

  // Clear trick state.
  room.currentTrick = [];
  room.leadSuit = null;
  room.firstTrick = false;

  const remaining = activePlayerOrder(room);
  let gameFinished = false;
  if (remaining.length <= 1) {
    gameFinished = true;
    room.status = "FINISHED";
    room.bhabhiPlayerId = remaining[0] || null;
  } else {
    // Winner leads next trick, unless they just escaped (can't happen: escape means hand
    // reached 0, but a Thulla winner's hand grows so they can't have escaped this trick).
    room.currentPlayerId = resolved.winnerId;
  }

  return {
    trickResolved: true,
    isThulla: result.isThulla,
    thullaInfo,
    newlyEscaped,
    gameFinished,
  };
}

function resetForRematch(roomCode, requestingPlayerId) {
  const room = getRoom(roomCode);
  if (!room) return { error: "Room not found." };
  if (room.hostPlayerId !== requestingPlayerId) return { error: "Only the host can start a new game." };
  dealAndBegin(room);
  return { room };
}

function reconnect(roomCode, playerId) {
  const room = getRoom(roomCode);
  if (!room) return { error: "Room not found." };
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { error: "Player not found in this room." };
  player.connected = true;
  return { room, player };
}

function markDisconnected(roomCode, playerId) {
  const room = getRoom(roomCode);
  if (!room) return;
  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.connected = false;
    player.socketId = null;
  }
  return room;
}

function findRoomBySocketId(socketId) {
  for (const room of rooms.values()) {
    const player = room.players.find((p) => p.socketId === socketId);
    if (player) return { room, player };
  }
  return {};
}

module.exports = {
  rooms,
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  startGame,
  playCard,
  resetForRematch,
  reconnect,
  markDisconnected,
  findRoomBySocketId,
};
