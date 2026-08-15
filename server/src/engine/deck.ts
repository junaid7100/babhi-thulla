import { randomInt } from "crypto";
import { Card, Rank, Suit } from "./types";

const SUITS: Suit[] = ["S", "H", "D", "C"];

const RANKS: { r: Rank; v: number }[] = [
  { r: "A", v: 14 },
  { r: "K", v: 13 },
  { r: "Q", v: 12 },
  { r: "J", v: 11 },
  { r: "10", v: 10 },
  { r: "9", v: 9 },
  { r: "8", v: 8 },
  { r: "7", v: 7 },
  { r: "6", v: 6 },
  { r: "5", v: 5 },
  { r: "4", v: 4 },
  { r: "3", v: 3 },
  { r: "2", v: 2 },
];

// Hand sort order: Diamonds, Clubs, Hearts, Spades — high to low within suit.
const HAND_SUIT_ORDER: Record<Suit, number> = { D: 0, C: 1, H: 2, S: 3 };

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const { r, v } of RANKS) {
      deck.push({ id: `${r}${suit}`, suit, rank: r, value: v });
    }
  }
  return deck;
}

/** Cryptographically secure Fisher-Yates shuffle. */
export function shuffleDeck(deck: Card[]): Card[] {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/** Deals as evenly as possible across `numPlayers`; earlier seats may get one extra card. */
export function dealCards(deck: Card[], numPlayers: number): Card[][] {
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
  deck.forEach((card, i) => hands[i % numPlayers].push(card));
  return hands;
}

export function sortHand(hand: Card[]): Card[] {
  return hand.slice().sort((a, b) => {
    if (a.suit !== b.suit) return HAND_SUIT_ORDER[a.suit] - HAND_SUIT_ORDER[b.suit];
    return b.value - a.value;
  });
}
