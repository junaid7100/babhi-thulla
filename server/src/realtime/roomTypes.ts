import { Card, EscapeRecord, GameStatus, PlayedCard, Suit } from "../engine/types";

export interface PlayerRecord {
  id: string;
  playerSecret: string;
  displayName: string;
  seat: number;
  connected: boolean;
  socketId: string | null;
  hand: Card[];
  isBot: boolean;
  escaped: boolean;
  escapedAt: number | null;
  finishPosition: number | null;
  disconnectedAt: number | null;
  stats: {
    thullasCaused: number;
    pilesPickedUp: number;
  };
}

export interface GameRoom {
  id: string;
  roomCode: string;
  status: GameStatus;
  hostPlayerId: string;
  maxPlayers: number;
  withBots: boolean;
  players: PlayerRecord[];
  currentTrick: PlayedCard[];
  discardPile: Card[];
  leadSuit: Suit | null;
  currentPlayerId: string | null;
  firstTrick: boolean;
  turnNumber: number;
  trickNumber: number;
  thullaCount: number;
  turnDeadline: number | null;
  escapeOrder: EscapeRecord[];
  bhabhiPlayerId: string | null;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  expiresAt: number;
}

export function activePlayerOrder(room: GameRoom): string[] {
  return room.players.filter((p) => !p.escaped).map((p) => p.id);
}

export function findPlayer(room: GameRoom, playerId: string): PlayerRecord | undefined {
  return room.players.find((p) => p.id === playerId);
}
