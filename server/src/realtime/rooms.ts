import { randomUUID, randomBytes } from "crypto";
import { RULES } from "../engine/rules";
import {
  checkGameEnd,
  getLegalCards,
  initGame,
  playCard as enginePlayCard,
  resolveCompletedTrick,
} from "../engine/engine";
import { sortHand } from "../engine/deck";
import { Card, EngineTrickState, EscapeRecord } from "../engine/types";
import { generateRoomCode } from "./roomCodes";
import { GameRoom, PlayerRecord, activePlayerOrder, findPlayer } from "./roomTypes";
import { saveRoomSnapshot, deleteRoomRow } from "../db/repository";

const BOT_NAMES = ["Bot Raju", "Bot Simran", "Bot Amit", "Bot Neha", "Bot Farhan"];

export class RoomNotFoundError extends Error {}

const rooms = new Map<string, GameRoom>(); // roomCode -> room
const roomsByGameId = new Map<string, string>(); // gameId -> roomCode

function newPlayer(displayName: string, seat: number, isBot: boolean): PlayerRecord {
  return {
    id: randomUUID(),
    playerSecret: randomBytes(16).toString("hex"),
    displayName,
    seat,
    connected: !isBot,
    socketId: null,
    hand: [],
    isBot,
    escaped: false,
    escapedAt: null,
    finishPosition: null,
    disconnectedAt: null,
    stats: { thullasCaused: 0, pilesPickedUp: 0 },
  };
}

export function getRoom(roomCode: string): GameRoom | undefined {
  return rooms.get((roomCode || "").toUpperCase());
}

export function getRoomByGameId(gameId: string): GameRoom | undefined {
  const code = roomsByGameId.get(gameId);
  return code ? rooms.get(code) : undefined;
}

function persist(room: GameRoom): void {
  void saveRoomSnapshot(room);
}

export function registerRehydratedRoom(room: GameRoom): void {
  rooms.set(room.roomCode, room);
  roomsByGameId.set(room.id, room.roomCode);
}

export function createRoom(opts: {
  hostDisplayName: string;
  maxPlayers?: number;
  withBots: boolean;
}): { room: GameRoom; playerId: string; playerSecret: string } {
  const roomCode = generateRoomCode((code) => rooms.has(code));
  const maxPlayers =
    opts.maxPlayers && opts.maxPlayers >= RULES.minPlayers && opts.maxPlayers <= RULES.maxPlayers
      ? opts.maxPlayers
      : RULES.defaultMaxPlayers;

  const host = newPlayer(opts.hostDisplayName, 0, false);
  const players = [host];

  if (opts.withBots) {
    const botSlots = Math.max(0, Math.min(BOT_NAMES.length, maxPlayers - players.length));
    for (let i = 0; i < botSlots; i++) {
      players.push(newPlayer(BOT_NAMES[i], players.length, true));
    }
  }

  const now = Date.now();
  const room: GameRoom = {
    id: randomUUID(),
    roomCode,
    status: "LOBBY",
    hostPlayerId: host.id,
    maxPlayers,
    withBots: opts.withBots,
    players,
    currentTrick: [],
    discardPile: [],
    leadSuit: null,
    currentPlayerId: null,
    firstTrick: true,
    turnNumber: 0,
    trickNumber: 0,
    thullaCount: 0,
    turnDeadline: null,
    escapeOrder: [],
    bhabhiPlayerId: null,
    createdAt: now,
    startedAt: null,
    finishedAt: null,
    expiresAt: now + RULES.roomTtlMs,
  };
  rooms.set(roomCode, room);
  roomsByGameId.set(room.id, roomCode);
  persist(room);
  return { room, playerId: host.id, playerSecret: host.playerSecret };
}

export function joinRoom(
  roomCode: string,
  displayName: string
): { room: GameRoom; playerId: string; playerSecret: string } | { error: string } {
  const room = getRoom(roomCode);
  if (!room) return { error: "Room not found." };
  if (room.status !== "LOBBY") return { error: "This game has already started." };
  if (room.players.length >= room.maxPlayers) return { error: "The room is full." };

  const player = newPlayer(displayName, room.players.length, false);
  room.players.push(player);
  persist(room);
  return { room, playerId: player.id, playerSecret: player.playerSecret };
}

/** Deterministic host migration: the lowest-seat connected human player. */
function pickNextHost(room: GameRoom, excludePlayerId: string): string | null {
  const candidates = room.players.filter((p) => p.id !== excludePlayerId);
  const connectedHumans = candidates.filter((p) => p.connected && !p.isBot);
  const pool = connectedHumans.length > 0 ? connectedHumans : candidates.filter((p) => !p.isBot);
  const fallback = pool.length > 0 ? pool : candidates;
  if (fallback.length === 0) return null;
  return fallback.sort((a, b) => a.seat - b.seat)[0].id;
}

export function leaveRoom(roomCode: string, playerId: string): { room: GameRoom; hostChanged: boolean } | undefined {
  const room = getRoom(roomCode);
  if (!room) return undefined;
  room.players = room.players.filter((p) => p.id !== playerId);

  if (room.players.length === 0 || !room.players.some((p) => !p.isBot)) {
    rooms.delete(room.roomCode);
    roomsByGameId.delete(room.id);
    void deleteRoomRow(room.id);
    return undefined;
  }

  let hostChanged = false;
  if (room.hostPlayerId === playerId) {
    const nextHost = pickNextHost(room, playerId);
    if (nextHost) {
      room.hostPlayerId = nextHost;
      hostChanged = true;
    }
  }
  persist(room);
  return { room, hostChanged };
}

export function startGame(roomCode: string, requestingPlayerId: string): { room: GameRoom } | { error: string } {
  const room = getRoom(roomCode);
  if (!room) return { error: "Room not found." };
  if (room.hostPlayerId !== requestingPlayerId) return { error: "Only the host can start the game." };
  if (room.status !== "LOBBY") return { error: "The game has already started." };
  if (room.players.length < RULES.minPlayers) return { error: `Need at least ${RULES.minPlayers} players to start.` };

  dealAndBegin(room);
  persist(room);
  return { room };
}

function dealAndBegin(room: GameRoom): void {
  const playerIds = room.players.map((p) => p.id);
  const { hands, currentPlayerId } = initGame(playerIds);
  for (const p of room.players) {
    p.hand = hands[p.id];
    p.escaped = false;
    p.escapedAt = null;
    p.finishPosition = null;
    p.stats = { thullasCaused: 0, pilesPickedUp: 0 };
  }
  room.status = "PLAYING";
  room.currentTrick = [];
  room.discardPile = [];
  room.leadSuit = null;
  room.currentPlayerId = currentPlayerId;
  room.firstTrick = true;
  room.trickNumber = 0;
  room.turnNumber = 0;
  room.thullaCount = 0;
  room.startedAt = Date.now();
  room.finishedAt = null;
  room.escapeOrder = [];
  room.bhabhiPlayerId = null;
  room.turnDeadline = Date.now() + RULES.turnTimeLimitMs;
}

export interface PlayCardOutcome {
  trickResolved: boolean;
  isThulla?: boolean;
  thullaInfo?: { offenderName: string; missingSuit: string; winnerName: string; pileSize: number } | null;
  newlyEscaped?: EscapeRecord[];
  gameFinished?: boolean;
}

export function playCardAction(
  roomCode: string,
  playerId: string,
  cardId: string
): PlayCardOutcome | { error: string } {
  const room = getRoom(roomCode);
  if (!room) return { error: "Room not found." };
  if (room.status !== "PLAYING") return { error: "The game is not in progress." };

  const handsMap: Record<string, Card[]> = {};
  for (const p of room.players) handsMap[p.id] = p.hand;

  const state: EngineTrickState = {
    hands: handsMap,
    currentTrick: room.currentTrick,
    leadSuit: room.leadSuit,
    currentPlayerId: room.currentPlayerId as string,
    firstTrick: room.firstTrick,
    activePlayerOrder: activePlayerOrder(room),
    escaped: room.players.filter((p) => p.escaped).map((p) => p.id),
  };

  const result = enginePlayCard(state, playerId, cardId);
  if (!result.ok) return { error: result.error };

  for (const p of room.players) p.hand = result.hands[p.id];
  room.currentTrick = result.trick;
  room.leadSuit = result.leadSuit;
  room.turnNumber += 1;

  if (!result.trickComplete) {
    room.currentPlayerId = result.nextPlayerId as string;
    room.turnDeadline = Date.now() + RULES.turnTimeLimitMs;
    persist(room);
    return { trickResolved: false };
  }

  const handsMap2: Record<string, Card[]> = {};
  for (const p of room.players) handsMap2[p.id] = p.hand;

  const resolution = resolveCompletedTrick({
    trick: room.currentTrick,
    leadSuit: room.leadSuit,
    isThulla: result.isThulla,
    firstTrick: room.firstTrick,
    hands: handsMap2,
    activePlayerOrder: activePlayerOrder(room),
    escaped: room.players.filter((p) => p.escaped).map((p) => p.id),
  });

  for (const p of room.players) p.hand = sortHand(resolution.handsAfter[p.id] || []);
  if (!resolution.pickedUp) {
    room.discardPile.push(...room.currentTrick.map((t) => t.card));
  }

  room.trickNumber += 1;
  if (result.isThulla) room.thullaCount += 1;

  const winnerPlayer = findPlayer(room, resolution.winnerId);
  const offenderPlayer = findPlayer(room, playerId);

  let thullaInfo: PlayCardOutcome["thullaInfo"] = null;
  if (result.isThulla && offenderPlayer && winnerPlayer) {
    thullaInfo = {
      offenderName: offenderPlayer.displayName,
      missingSuit: room.leadSuit,
      winnerName: winnerPlayer.displayName,
      pileSize: resolution.pileSize,
    };
    offenderPlayer.stats.thullasCaused += 1;
    if (resolution.pickedUp) winnerPlayer.stats.pilesPickedUp += 1;
  }

  const newlyEscaped: EscapeRecord[] = [];
  for (const id of resolution.escapedNow) {
    const p = findPlayer(room, id);
    if (p && !p.escaped) {
      p.escaped = true;
      p.escapedAt = room.escapeOrder.length + 1;
      p.finishPosition = room.escapeOrder.length + 1;
      const rec: EscapeRecord = { playerId: p.id, displayName: p.displayName, finishPosition: p.escapedAt };
      room.escapeOrder.push(rec);
      newlyEscaped.push(rec);
    }
  }

  room.currentTrick = [];
  room.leadSuit = null;
  room.firstTrick = false;

  const remaining = activePlayerOrder(room);
  let gameFinished = false;
  if (checkGameEnd(remaining)) {
    gameFinished = true;
    room.status = "GAME_FINISHED";
    room.bhabhiPlayerId = remaining[0] || null;
    room.finishedAt = Date.now();
    room.turnDeadline = null;
  } else {
    room.currentPlayerId = resolution.winnerId;
    room.turnDeadline = Date.now() + RULES.turnTimeLimitMs;
  }

  persist(room);

  return {
    trickResolved: true,
    isThulla: result.isThulla,
    thullaInfo,
    newlyEscaped,
    gameFinished,
  };
}

export function resetForRematch(roomCode: string, requestingPlayerId: string): { room: GameRoom } | { error: string } {
  const room = getRoom(roomCode);
  if (!room) return { error: "Room not found." };
  if (room.hostPlayerId !== requestingPlayerId) return { error: "Only the host can start a new game." };
  dealAndBegin(room);
  persist(room);
  return { room };
}

export function reconnectPlayer(
  roomCode: string,
  playerId: string,
  playerSecret: string
): { room: GameRoom; player: PlayerRecord } | { error: string } {
  const room = getRoom(roomCode);
  if (!room) return { error: "Room not found." };
  const player = findPlayer(room, playerId);
  if (!player) return { error: "Player not found in this room." };
  if (player.playerSecret !== playerSecret) return { error: "Invalid reconnection credentials." };
  player.connected = true;
  player.disconnectedAt = null;
  persist(room);
  return { room, player };
}

export function markDisconnected(roomCode: string, playerId: string): { room: GameRoom; hostChanged: boolean } | undefined {
  const room = getRoom(roomCode);
  if (!room) return undefined;
  const player = findPlayer(room, playerId);
  if (!player) return undefined;
  player.connected = false;
  player.socketId = null;
  player.disconnectedAt = Date.now();

  let hostChanged = false;
  if (room.hostPlayerId === playerId) {
    // Only migrate away from a disconnected host if another connected human
    // exists — otherwise leave host duties with them until they reconnect.
    const alt = room.players.filter((p) => p.connected && !p.isBot && p.id !== playerId).sort((a, b) => a.seat - b.seat)[0];
    if (alt) {
      room.hostPlayerId = alt.id;
      hostChanged = true;
    }
  }
  persist(room);
  return { room, hostChanged };
}

export function findRoomBySocketId(socketId: string): { room: GameRoom; player: PlayerRecord } | Record<string, never> {
  for (const room of rooms.values()) {
    const player = room.players.find((p) => p.socketId === socketId);
    if (player) return { room, player };
  }
  return {};
}

export function deleteRoom(roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room) return;
  rooms.delete(room.roomCode);
  roomsByGameId.delete(room.id);
  void deleteRoomRow(room.id);
}

export function allRooms(): GameRoom[] {
  return [...rooms.values()];
}

export function getLegalCardIdsForPlayer(room: GameRoom, playerId: string): string[] {
  const player = findPlayer(room, playerId);
  if (!player || room.status !== "PLAYING" || room.currentPlayerId !== playerId) return [];
  if (room.firstTrick && room.currentTrick.length === 0) {
    return player.hand.some((c) => c.id === RULES.startingCard) ? [RULES.startingCard] : player.hand.map((c) => c.id);
  }
  const effectiveLeadSuit = room.currentTrick.length === 0 ? null : room.leadSuit;
  return getLegalCards(player.hand, effectiveLeadSuit).map((c) => c.id);
}
