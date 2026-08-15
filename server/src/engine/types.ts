export type Suit = "S" | "H" | "D" | "C";

export const SUIT_NAMES: Record<Suit, string> = {
  S: "Spades",
  H: "Hearts",
  D: "Diamonds",
  C: "Clubs",
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

export type Rank = "A" | "K" | "Q" | "J" | "10" | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2";

export interface Card {
  id: string; // e.g. "AS", "10H" — unique within a deck
  suit: Suit;
  rank: Rank;
  value: number; // 2-14, A high
}

export interface PlayedCard {
  playerId: string;
  card: Card;
  sequence: number;
}

export type GameStatus =
  | "LOBBY"
  | "STARTING"
  | "DEALING"
  | "PLAYING"
  | "PLAYER_ESCAPED"
  | "GAME_FINISHED"
  | "CANCELLED";

export interface EscapeRecord {
  playerId: string;
  displayName: string;
  finishPosition: number;
}

export interface EngineTrickState {
  hands: Record<string, Card[]>;
  currentTrick: PlayedCard[];
  leadSuit: Suit | null;
  currentPlayerId: string;
  firstTrick: boolean;
  activePlayerOrder: string[]; // seat order of players who have not escaped
  escaped: string[];
}

export interface MoveRejected {
  ok: false;
  error: string;
}

export interface MoveAccepted {
  ok: true;
  hands: Record<string, Card[]>;
  trick: PlayedCard[];
  leadSuit: Suit;
  isThulla: boolean;
  trickComplete: boolean;
  cardPlayed: Card;
  nextPlayerId?: string;
}

export type MoveResult = MoveRejected | MoveAccepted;

export interface TrickResolution {
  winnerId: string;
  pileSize: number;
  pickedUp: boolean;
  handsAfter: Record<string, Card[]>;
  escapedNow: string[];
}
