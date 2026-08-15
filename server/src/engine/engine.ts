// Pure game-rules engine. No I/O, no socket/DB code — independently unit-testable.
import { RULES } from "./rules";
import { createDeck, dealCards, shuffleDeck, sortHand } from "./deck";
import {
  Card,
  EngineTrickState,
  MoveResult,
  PlayedCard,
  Suit,
  SUIT_NAMES,
  TrickResolution,
} from "./types";

/** Fresh shuffled deck, dealt evenly, with the A♠ holder set to lead. */
export function initGame(playerIds: string[]): {
  hands: Record<string, Card[]>;
  currentPlayerId: string;
} {
  const deck = shuffleDeck(createDeck());
  const dealt = dealCards(deck, playerIds.length);
  const hands: Record<string, Card[]> = {};
  playerIds.forEach((id, i) => {
    hands[id] = sortHand(dealt[i]);
  });
  const currentPlayerId = findStartingPlayer(hands, playerIds);
  return { hands, currentPlayerId };
}

/** Which player currently holds the starting card (A♠ by default). */
export function findStartingPlayer(
  hands: Record<string, Card[]>,
  playerIds: string[]
): string {
  for (const id of playerIds) {
    if ((hands[id] || []).some((c) => c.id === RULES.startingCard)) return id;
  }
  throw new Error("No player holds the starting card — invalid deal.");
}

/** Cards in `hand` that are legal to play given the current lead suit (null = leading). */
export function getLegalCards(hand: Card[], leadSuit: Suit | null): Card[] {
  if (!leadSuit) return hand.slice();
  const followers = hand.filter((c) => c.suit === leadSuit);
  return followers.length > 0 ? followers : hand.slice();
}

export function getNextActivePlayer(
  fromPlayerId: string,
  activeOrder: string[],
  skip: Set<string> = new Set()
): string {
  const n = activeOrder.length;
  const fromIdx = activeOrder.indexOf(fromPlayerId);
  for (let k = 1; k <= n; k++) {
    const idx = (fromIdx + k + n) % n;
    const id = activeOrder[idx];
    if (!skip.has(id)) return id;
  }
  return fromPlayerId;
}

export function checkPlayerEscape(hand: Card[]): boolean {
  return hand.length === 0;
}

export function checkGameEnd(activePlayerOrder: string[]): boolean {
  return activePlayerOrder.length <= 1;
}

/** A play is a Thulla iff its suit differs from the (already-established) lead suit. */
export function detectThulla(playedSuit: Suit, leadSuit: Suit): boolean {
  return playedSuit !== leadSuit;
}

export function highestOfSuit(trick: PlayedCard[], suit: Suit): PlayedCard {
  let best: PlayedCard | null = null;
  for (const played of trick) {
    if (played.card.suit === suit && (!best || played.card.value > best.card.value)) {
      best = played;
    }
  }
  if (!best) throw new Error(`No card of suit ${suit} found in trick — invalid trick state.`);
  return best;
}

/**
 * Validates and (functionally) applies a single card play. Does not mutate the
 * input state; returns a new hands/trick snapshot plus the outcome. The caller
 * (rooms.ts) is responsible for committing the returned state.
 */
export function playCard(state: EngineTrickState, playerId: string, cardId: string): MoveResult {
  const { hands, currentTrick, leadSuit, currentPlayerId, firstTrick, activePlayerOrder } = state;
  const escaped = new Set(state.escaped);

  if (escaped.has(playerId)) {
    return { ok: false, error: "You have already escaped and cannot play." };
  }
  if (!activePlayerOrder.includes(playerId)) {
    return { ok: false, error: "You are not an active player in this game." };
  }
  if (playerId !== currentPlayerId) {
    return { ok: false, error: "It is not your turn." };
  }

  const hand = hands[playerId] || [];
  const card = hand.find((c) => c.id === cardId);
  if (!card) {
    return { ok: false, error: "That card is not in your hand." };
  }

  // The very first card of the game must be the starting card (A♠).
  if (firstTrick && currentTrick.length === 0 && cardId !== RULES.startingCard) {
    return { ok: false, error: `You must lead with ${RULES.startingCard}.` };
  }

  const effectiveLeadSuit: Suit | null = currentTrick.length === 0 ? null : leadSuit;
  if (RULES.requireFollowSuit && effectiveLeadSuit) {
    const legal = getLegalCards(hand, effectiveLeadSuit);
    if (!legal.some((c) => c.id === cardId)) {
      return { ok: false, error: `You must follow ${SUIT_NAMES[effectiveLeadSuit]}.` };
    }
  }

  const newHand = hand.filter((c) => c.id !== cardId);
  const newHands = { ...hands, [playerId]: newHand };
  const newTrick: PlayedCard[] = [...currentTrick, { playerId, card, sequence: currentTrick.length }];
  const newLeadSuit: Suit = currentTrick.length === 0 ? card.suit : (leadSuit as Suit);

  const isThulla = RULES.thullaEnabled && detectThulla(card.suit, newLeadSuit);

  const playedIds = new Set(newTrick.map((t) => t.playerId));
  const allPlayed = activePlayerOrder.every((id) => escaped.has(id) || playedIds.has(id));
  const trickComplete = (isThulla && RULES.thullaEndsTrick) || allPlayed;

  const result: MoveResult = {
    ok: true,
    hands: newHands,
    trick: newTrick,
    leadSuit: newLeadSuit,
    isThulla,
    trickComplete,
    cardPlayed: card,
  };

  if (!trickComplete) {
    result.nextPlayerId = getNextActivePlayer(playerId, activePlayerOrder, new Set([...playedIds, ...escaped]));
  }

  return result;
}

/** Determines the trick winner (independent of pickup/discard behavior). */
export function resolveTrick(trick: PlayedCard[], leadSuit: Suit): { winnerId: string; winningCard: Card } {
  const winner = highestOfSuit(trick, leadSuit);
  return { winnerId: winner.playerId, winningCard: winner.card };
}

/** Thulla resolution: winner's hand absorbs the entire trick pile. */
export function resolvePickup(
  trick: PlayedCard[],
  winnerId: string,
  hands: Record<string, Card[]>
): Record<string, Card[]> {
  const winnerHand = hands[winnerId] || [];
  return {
    ...hands,
    [winnerId]: [...winnerHand, ...trick.map((t) => t.card)],
  };
}

/** Normal-trick resolution: the pile is simply removed from play. Returns the discard additions. */
export function discardTrick(trick: PlayedCard[]): Card[] {
  return trick.map((t) => t.card);
}

/**
 * Full trick resolution combining winner-finding + pickup/discard + escape
 * detection, matching the Thulla-vs-normal-trick distinction in the spec.
 */
export function resolveCompletedTrick(params: {
  trick: PlayedCard[];
  leadSuit: Suit;
  isThulla: boolean;
  firstTrick: boolean;
  hands: Record<string, Card[]>;
  activePlayerOrder: string[];
  escaped: string[];
}): TrickResolution {
  const { trick, leadSuit, isThulla, firstTrick, hands, activePlayerOrder, escaped } = params;
  const { winnerId } = resolveTrick(trick, leadSuit);

  // The first trick is always discarded, even if it technically contains a
  // Thulla — the A♠ leader must never pick up their own opening trick.
  const pickedUp = isThulla && RULES.thullaWinnerGetsPile && !firstTrick;

  const handsAfter = pickedUp ? resolvePickup(trick, winnerId, hands) : hands;

  const escapedSet = new Set(escaped);
  const escapedNow: string[] = [];
  for (const id of activePlayerOrder) {
    if (escapedSet.has(id)) continue;
    if (checkPlayerEscape(handsAfter[id] || [])) escapedNow.push(id);
  }

  return {
    winnerId,
    pileSize: trick.length,
    pickedUp,
    handsAfter,
    escapedNow,
  };
}
