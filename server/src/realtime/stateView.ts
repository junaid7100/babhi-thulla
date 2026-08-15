import { GameRoom } from "./roomTypes";
import { getLegalCardIdsForPlayer } from "./rooms";

/**
 * Per-player state payload. Never includes another player's `hand` — only
 * `you.hand` for the socket this is being sent to. This is the single choke
 * point that enforces private-hand isolation (spec §24/§62).
 */
export function buildStateView(room: GameRoom, forPlayerId: string) {
  const me = room.players.find((p) => p.id === forPlayerId);
  return {
    roomCode: room.roomCode,
    status: room.status,
    maxPlayers: room.maxPlayers,
    hostPlayerId: room.hostPlayerId,
    withBots: room.withBots,
    you: me
      ? {
          id: me.id,
          hand: me.hand,
          legalCardIds: getLegalCardIdsForPlayer(room, me.id),
        }
      : null,
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
    discardCount: room.discardPile.length,
    leadSuit: room.leadSuit,
    currentPlayerId: room.currentPlayerId,
    turnDeadline: room.turnDeadline,
    firstTrick: room.firstTrick,
    trickNumber: room.trickNumber,
    thullaCount: room.thullaCount,
    bhabhiPlayerId: room.bhabhiPlayerId,
    escapeOrder: room.escapeOrder,
    startedAt: room.startedAt,
    finishedAt: room.finishedAt,
  };
}

export function buildLobbyView(room: GameRoom) {
  return {
    roomCode: room.roomCode,
    status: room.status,
    hostPlayerId: room.hostPlayerId,
    maxPlayers: room.maxPlayers,
    withBots: room.withBots,
    players: room.players.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      seat: p.seat,
      connected: p.connected,
      isBot: p.isBot,
    })),
  };
}

export function buildResultsView(room: GameRoom) {
  const bhabhi = room.players.find((p) => p.id === room.bhabhiPlayerId);
  return {
    roomCode: room.roomCode,
    bhabhiPlayerId: room.bhabhiPlayerId,
    bhabhiName: bhabhi?.displayName ?? null,
    bhabhiCardsRemaining: bhabhi?.hand.length ?? 0,
    escapeOrder: room.escapeOrder,
    trickCount: room.trickNumber,
    thullaCount: room.thullaCount,
    durationMs: room.startedAt && room.finishedAt ? room.finishedAt - room.startedAt : null,
    stats: room.players.map((p) => ({
      playerId: p.id,
      displayName: p.displayName,
      thullasCaused: p.stats.thullasCaused,
      pilesPickedUp: p.stats.pilesPickedUp,
      finishPosition: p.finishPosition,
    })),
  };
}
