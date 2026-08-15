export type Suit = "S" | "H" | "D" | "C";

export const SUIT_SYMBOLS: Record<Suit, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
export const SUIT_NAMES: Record<Suit, string> = { S: "Spades", H: "Hearts", D: "Diamonds", C: "Clubs" };
export const RED_SUITS: Suit[] = ["H", "D"];

export interface Card {
  id: string;
  suit: Suit;
  rank: string;
  value: number;
}

export interface TrickCard {
  playerId: string;
  displayName: string;
  card: Card;
}

export interface PublicPlayer {
  id: string;
  displayName: string;
  seat: number;
  cardCount: number;
  connected: boolean;
  escaped: boolean;
  escapedAt: number | null;
  isBot: boolean;
  isCurrentTurn: boolean;
}

export type GameStatus = "LOBBY" | "STARTING" | "DEALING" | "PLAYING" | "PLAYER_ESCAPED" | "GAME_FINISHED" | "CANCELLED";

export interface StateView {
  roomCode: string;
  status: GameStatus;
  maxPlayers: number;
  hostPlayerId: string;
  withBots: boolean;
  you: { id: string; hand: Card[]; legalCardIds: string[] } | null;
  players: PublicPlayer[];
  currentTrick: TrickCard[];
  discardCount: number;
  leadSuit: Suit | null;
  currentPlayerId: string | null;
  turnDeadline: number | null;
  firstTrick: boolean;
  trickNumber: number;
  thullaCount: number;
  bhabhiPlayerId: string | null;
  escapeOrder: { playerId: string; displayName: string; finishPosition: number }[];
  startedAt: number | null;
  finishedAt: number | null;
}

export interface LobbyView {
  roomCode: string;
  status: GameStatus;
  hostPlayerId: string;
  maxPlayers: number;
  withBots: boolean;
  players: { id: string; displayName: string; seat: number; connected: boolean; isBot: boolean }[];
}

export interface ResultsView {
  roomCode: string;
  bhabhiPlayerId: string | null;
  bhabhiName: string | null;
  bhabhiCardsRemaining: number;
  escapeOrder: { playerId: string; displayName: string; finishPosition: number }[];
  trickCount: number;
  thullaCount: number;
  durationMs: number | null;
  stats: { playerId: string; displayName: string; thullasCaused: number; pilesPickedUp: number; finishPosition: number | null }[];
}

export interface ThullaInfo {
  offenderName: string;
  missingSuit: Suit;
  winnerName: string;
  pileSize: number;
}
