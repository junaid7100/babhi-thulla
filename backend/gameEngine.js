// Pure game-rules engine. No socket/IO code here — must be unit-testable standalone.

const SUITS = ["S", "H", "D", "C"];
const SUIT_NAMES = { S: "Spades", H: "Hearts", D: "Diamonds", C: "Clubs" };
const RANKS = [
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
const HAND_SUIT_ORDER = { D: 0, C: 1, H: 2, S: 3 };

function createDeck() {
  const deck = [];
  for (const s of SUITS) {
    for (const { r, v } of RANKS) {
      deck.push({ id: `${r}${s}`, suit: s, rank: r, value: v });
    }
  }
  return deck;
}

function shuffle(deck, rng = Math.random) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// Deals as evenly as possible; some players may get one extra card.
function dealCards(deck, numPlayers) {
  const hands = Array.from({ length: numPlayers }, () => []);
  deck.forEach((card, i) => hands[i % numPlayers].push(card));
  return hands;
}

function sortHand(hand) {
  return hand.slice().sort((a, b) => {
    if (a.suit !== b.suit) return HAND_SUIT_ORDER[a.suit] - HAND_SUIT_ORDER[b.suit];
    return b.value - a.value;
  });
}

function findPlayerIndexWithCard(hands, cardId) {
  return hands.findIndex((h) => h.some((c) => c.id === cardId));
}

// Which card ids in `hand` are legal to play given the current lead suit.
// leadSuit === null means this player is leading the trick (any card legal).
function getLegalCardIds(hand, leadSuit) {
  if (!leadSuit) return hand.map((c) => c.id);
  const followers = hand.filter((c) => c.suit === leadSuit);
  if (followers.length > 0) return followers.map((c) => c.id);
  return hand.map((c) => c.id);
}

function highestOfSuit(trick, suit) {
  let best = null;
  for (const played of trick) {
    if (played.card.suit === suit) {
      if (!best || played.card.value > best.card.value) best = played;
    }
  }
  return best;
}

/**
 * Creates a fresh game state for a set of players (array of player ids, in seat order).
 * Returns { hands: Map<playerId, Card[]>, currentPlayerId, firstTrick }
 */
function initGame(playerIds, rng = Math.random) {
  const deck = shuffle(createDeck(), rng);
  const dealtHands = dealCards(deck, playerIds.length);
  const hands = {};
  playerIds.forEach((id, i) => {
    hands[id] = dealtHands[i];
  });
  const starterIdx = dealtHands.findIndex((h) => h.some((c) => c.id === "AS"));
  return {
    hands,
    currentPlayerId: playerIds[starterIdx],
    firstTrick: true,
  };
}

/**
 * Validates and applies a single card play against the given engine state.
 *
 * state: {
 *   hands: { [playerId]: Card[] },
 *   currentTrick: [{ playerId, card }],
 *   leadSuit: string|null,
 *   currentPlayerId: string,
 *   firstTrick: boolean,
 *   activePlayerOrder: string[],   // seat order of players still in the game (not escaped)
 *   escaped: Set<string> or array,
 * }
 *
 * Returns { ok: true, ...effects } or { ok: false, error: string }.
 * Does NOT mutate the passed-in state; returns a new state plus event info.
 */
function validateAndApplyMove(state, playerId, cardId) {
  const { hands, currentTrick, leadSuit, currentPlayerId, firstTrick, activePlayerOrder } = state;
  const escaped = new Set(state.escaped || []);

  if (escaped.has(playerId)) {
    return { ok: false, error: "You have already escaped and cannot play." };
  }
  if (playerId !== currentPlayerId) {
    return { ok: false, error: "It's not your turn." };
  }
  const hand = hands[playerId] || [];
  const card = hand.find((c) => c.id === cardId);
  if (!card) {
    return { ok: false, error: "You don't have that card." };
  }

  // The very first card of the game must be A♠, played by whoever holds it.
  if (firstTrick && currentTrick.length === 0 && cardId !== "AS") {
    return { ok: false, error: "You must lead with the Ace of Spades." };
  }

  const effectiveLeadSuit = currentTrick.length === 0 ? null : leadSuit;
  const legalIds = getLegalCardIds(hand, effectiveLeadSuit);
  if (!legalIds.includes(cardId)) {
    return { ok: false, error: `You must follow ${SUIT_NAMES[effectiveLeadSuit]}.` };
  }

  const newHand = hand.filter((c) => c.id !== cardId);
  const newHands = { ...hands, [playerId]: newHand };
  const newTrick = [...currentTrick, { playerId, card }];
  const newLeadSuit = currentTrick.length === 0 ? card.suit : leadSuit;

  const isThulla = card.suit !== newLeadSuit;

  const playedIds = new Set(newTrick.map((t) => t.playerId));
  const allPlayed = activePlayerOrder.every((id) => escaped.has(id) || playedIds.has(id));

  const result = {
    ok: true,
    hands: newHands,
    trick: newTrick,
    leadSuit: newLeadSuit,
    isThulla,
    trickComplete: isThulla || allPlayed,
    cardPlayed: card,
  };

  if (!result.trickComplete) {
    result.nextPlayerId = getNextToPlay(playerId, playedIds, activePlayerOrder, escaped);
  }

  return result;
}

function getNextToPlay(fromPlayerId, playedIds, activeOrder, escaped) {
  const n = activeOrder.length;
  const fromIdx = activeOrder.indexOf(fromPlayerId);
  for (let k = 1; k <= n; k++) {
    const idx = (fromIdx + k) % n;
    const id = activeOrder[idx];
    if (!escaped.has(id) && !playedIds.has(id)) return id;
  }
  return fromPlayerId;
}

/**
 * Resolves a completed trick: determines winner, whether cards get picked up or discarded,
 * and which players escaped as a result.
 *
 * trick: [{ playerId, card }]
 * leadSuit: string
 * isThulla: boolean
 * firstTrick: boolean — was this the very first trick of the game
 * hands: current hands AFTER the triggering card was removed (i.e. state.hands post-play)
 *
 * Returns {
 *   winnerId, pileSize, handsAfter, escapedNow: [playerId,...]
 * }
 */
function resolveTrick({ trick, leadSuit, isThulla, firstTrick, hands, activePlayerOrder, escaped }) {
  const winnerEntry = highestOfSuit(trick, leadSuit);
  const winnerId = winnerEntry.playerId;

  let handsAfter = hands;
  const pickedUp = isThulla && !firstTrick;

  if (pickedUp) {
    const winnerHand = hands[winnerId] || [];
    handsAfter = {
      ...hands,
      [winnerId]: [...winnerHand, ...trick.map((t) => t.card)],
    };
  }
  // Normal trick (or first-trick Thulla exception): cards vanish into discard, no hand grows.

  const escapedSet = new Set(escaped || []);
  const escapedNow = [];
  for (const id of activePlayerOrder) {
    if (escapedSet.has(id)) continue;
    const h = handsAfter[id] || [];
    if (h.length === 0) {
      escapedNow.push(id);
    }
  }

  return {
    winnerId,
    pileSize: trick.length,
    pickedUp,
    handsAfter,
    escapedNow,
  };
}

module.exports = {
  SUITS,
  SUIT_NAMES,
  RANKS,
  createDeck,
  shuffle,
  dealCards,
  sortHand,
  findPlayerIndexWithCard,
  getLegalCardIds,
  highestOfSuit,
  initGame,
  validateAndApplyMove,
  getNextToPlay,
  resolveTrick,
};
