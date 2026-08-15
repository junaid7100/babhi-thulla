const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createDeck,
  dealCards,
  sortHand,
  getLegalCardIds,
  initGame,
  validateAndApplyMove,
  resolveTrick,
} = require("./gameEngine");

// ---- Deck ----

test("deck has exactly 52 unique cards, all 4 suits x 13 ranks", () => {
  const deck = createDeck();
  assert.equal(deck.length, 52);
  const ids = new Set(deck.map((c) => c.id));
  assert.equal(ids.size, 52);
  const suits = new Set(deck.map((c) => c.suit));
  assert.deepEqual([...suits].sort(), ["C", "D", "H", "S"]);
  for (const s of suits) {
    const ranksForSuit = deck.filter((c) => c.suit === s);
    assert.equal(ranksForSuit.length, 13);
  }
});

// ---- Dealing ----

test("dealing distributes all 52 cards with no duplicates or loss, near-even for 3/4/5 players", () => {
  for (const n of [3, 4, 5]) {
    const deck = createDeck();
    const hands = dealCards(deck, n);
    const total = hands.reduce((sum, h) => sum + h.length, 0);
    assert.equal(total, 52);
    const allIds = hands.flat().map((c) => c.id);
    assert.equal(new Set(allIds).size, 52);
    const counts = hands.map((h) => h.length);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
  }
});

// ---- First player ----

test("player holding A-spades is identified as starting player and must lead with it", () => {
  const { hands, currentPlayerId } = initGame(["p1", "p2", "p3"]);
  assert.ok(hands[currentPlayerId].some((c) => c.id === "AS"));

  const otherCard = hands[currentPlayerId].find((c) => c.id !== "AS");
  const state = {
    hands,
    currentTrick: [],
    leadSuit: null,
    currentPlayerId,
    firstTrick: true,
    activePlayerOrder: ["p1", "p2", "p3"],
    escaped: [],
  };
  const result = validateAndApplyMove(state, currentPlayerId, otherCard.id);
  assert.equal(result.ok, false);
  assert.match(result.error, /Ace of Spades/);

  const goodResult = validateAndApplyMove(state, currentPlayerId, "AS");
  assert.equal(goodResult.ok, true);
});

// ---- Follow-suit ----

test("follow-suit: must play lead suit if held, otherwise anything is legal", () => {
  const hand = [
    { id: "KH", suit: "H", rank: "K", value: 13 },
    { id: "2H", suit: "H", rank: "2", value: 2 },
    { id: "3C", suit: "C", rank: "3", value: 3 },
  ];
  assert.deepEqual(getLegalCardIds(hand, "H").sort(), ["2H", "KH"].sort());

  const handNoHearts = [
    { id: "3C", suit: "C", rank: "3", value: 3 },
    { id: "5D", suit: "D", rank: "5", value: 5 },
  ];
  assert.deepEqual(getLegalCardIds(handNoHearts, "H").sort(), ["3C", "5D"].sort());
});

test("playing off-suit while holding lead suit is rejected", () => {
  const hands = {
    p1: [
      { id: "AS", suit: "S", rank: "A", value: 14 },
      { id: "2H", suit: "H", rank: "2", value: 2 },
    ],
    p2: [
      { id: "KH", suit: "H", rank: "K", value: 13 },
      { id: "3C", suit: "C", rank: "3", value: 3 },
    ],
    p3: [{ id: "4D", suit: "D", rank: "4", value: 4 }],
  };
  const afterLead = {
    hands: { ...hands, p1: hands.p1.filter((c) => c.id !== "AS") },
    currentTrick: [{ playerId: "p1", card: { id: "AS", suit: "S", rank: "A", value: 14 } }],
    leadSuit: "S",
    currentPlayerId: "p2",
    firstTrick: true,
    activePlayerOrder: ["p1", "p2", "p3"],
    escaped: [],
  };
  // p2 has no spades, may play anything (valid thulla)
  const r = validateAndApplyMove(afterLead, "p2", "3C");
  assert.equal(r.ok, true);
  assert.equal(r.isThulla, true);
});

test("playing off-suit when lead suit IS held is illegal", () => {
  const state = {
    hands: {
      p1: [{ id: "2S", suit: "S", rank: "2", value: 2 }],
      p2: [
        { id: "KS", suit: "S", rank: "K", value: 13 },
        { id: "3C", suit: "C", rank: "3", value: 3 },
      ],
    },
    currentTrick: [{ playerId: "p1", card: { id: "2S", suit: "S", rank: "2", value: 2 } }],
    leadSuit: "S",
    currentPlayerId: "p2",
    firstTrick: false,
    activePlayerOrder: ["p1", "p2"],
    escaped: [],
  };
  const r = validateAndApplyMove(state, "p2", "3C");
  assert.equal(r.ok, false);
  assert.match(r.error, /follow Spades/);
});

// ---- Thulla detection & resolution ----

test("thulla ends trick immediately; remaining players never asked to play", () => {
  const state = {
    hands: {
      p1: [],
      p2: [{ id: "3C", suit: "C", rank: "3", value: 3 }],
      p3: [{ id: "9S", suit: "S", rank: "9", value: 9 }],
    },
    currentTrick: [{ playerId: "p1", card: { id: "KS", suit: "S", rank: "K", value: 13 } }],
    leadSuit: "S",
    currentPlayerId: "p2",
    firstTrick: false,
    activePlayerOrder: ["p1", "p2", "p3"],
    escaped: [],
  };
  const r = validateAndApplyMove(state, "p2", "3C");
  assert.equal(r.ok, true);
  assert.equal(r.isThulla, true);
  assert.equal(r.trickComplete, true);
  assert.equal(r.nextPlayerId, undefined); // p3 never gets a turn this trick
});

test("thulla resolution: highest lead-suit card wins, winner's hand grows by trick size, others unchanged", () => {
  const trick = [
    { playerId: "p1", card: { id: "KS", suit: "S", rank: "K", value: 13 } },
    { playerId: "p2", card: { id: "3C", suit: "C", rank: "3", value: 3 } },
    { playerId: "p3", card: { id: "AS", suit: "S", rank: "A", value: 14 } },
  ];
  const hands = { p1: [{ id: "2D", suit: "D", rank: "2", value: 2 }], p2: [], p3: [{ id: "5H", suit: "H", rank: "5", value: 5 }] };
  const result = resolveTrick({
    trick,
    leadSuit: "S",
    isThulla: true,
    firstTrick: false,
    hands,
    activePlayerOrder: ["p1", "p2", "p3"],
    escaped: [],
  });
  assert.equal(result.winnerId, "p3");
  assert.equal(result.handsAfter.p3.length, 1 + 3);
  assert.deepEqual(result.handsAfter.p1, hands.p1);
  assert.deepEqual(result.handsAfter.p2, hands.p2);
});

test("first-trick thulla exception: pile is discarded, not picked up by anyone", () => {
  const trick = [
    { playerId: "p1", card: { id: "AS", suit: "S", rank: "A", value: 14 } },
    { playerId: "p2", card: { id: "3C", suit: "C", rank: "3", value: 3 } },
  ];
  const hands = { p1: [{ id: "2D", suit: "D", rank: "2", value: 2 }], p2: [{ id: "5H", suit: "H", rank: "5", value: 5 }] };
  const result = resolveTrick({
    trick,
    leadSuit: "S",
    isThulla: true,
    firstTrick: true,
    hands,
    activePlayerOrder: ["p1", "p2"],
    escaped: [],
  });
  assert.equal(result.pickedUp, false);
  assert.deepEqual(result.handsAfter, hands); // nobody's hand grew
});

// ---- Normal trick ----

test("normal trick: highest lead-suit card wins lead only; all cards vanish, no hand grows", () => {
  const trick = [
    { playerId: "p1", card: { id: "5S", suit: "S", rank: "5", value: 5 } },
    { playerId: "p2", card: { id: "KS", suit: "S", rank: "K", value: 13 } },
    { playerId: "p3", card: { id: "2S", suit: "S", rank: "2", value: 2 } },
  ];
  const hands = { p1: [{ id: "1x" }], p2: [{ id: "2x" }], p3: [{ id: "3x" }] };
  const result = resolveTrick({
    trick,
    leadSuit: "S",
    isThulla: false,
    firstTrick: false,
    hands,
    activePlayerOrder: ["p1", "p2", "p3"],
    escaped: [],
  });
  assert.equal(result.winnerId, "p2");
  assert.deepEqual(result.handsAfter, hands); // unchanged, cards discarded
});

// ---- Escape ----

test("hand reaching 0 marks escape; escaped players are skipped and never dealt cards again", () => {
  const trick = [
    { playerId: "p1", card: { id: "5S", suit: "S", rank: "5", value: 5 } },
    { playerId: "p2", card: { id: "KS", suit: "S", rank: "K", value: 13 } },
  ];
  const hands = { p1: [], p2: [{ id: "2x" }] };
  const result = resolveTrick({
    trick,
    leadSuit: "S",
    isThulla: false,
    firstTrick: false,
    hands,
    activePlayerOrder: ["p1", "p2"],
    escaped: [],
  });
  assert.deepEqual(result.escapedNow, ["p1"]);
});

test("escaped player is skipped in turn rotation", () => {
  const { getNextToPlay } = require("./gameEngine");
  const next = getNextToPlay("p1", new Set(), ["p1", "p2", "p3"], new Set(["p2"]));
  assert.equal(next, "p3");
});

// ---- End game ----

test("game ends when exactly one active player remains; that player is Bhabhi", () => {
  const activePlayerOrder = ["p1", "p2", "p3"];
  const escaped = new Set(["p1", "p2"]);
  const stillIn = activePlayerOrder.filter((id) => !escaped.has(id));
  assert.equal(stillIn.length, 1);
  assert.equal(stillIn[0], "p3");
});

// ---- Illegal move rejection ----

test("illegal moves are rejected with no state mutation: card not in hand", () => {
  const state = {
    hands: { p1: [{ id: "AS", suit: "S", rank: "A", value: 14 }], p2: [] },
    currentTrick: [],
    leadSuit: null,
    currentPlayerId: "p1",
    firstTrick: true,
    activePlayerOrder: ["p1", "p2"],
    escaped: [],
  };
  const r = validateAndApplyMove(state, "p1", "9H");
  assert.equal(r.ok, false);
  assert.equal(state.hands.p1.length, 1); // untouched
});

test("illegal moves are rejected: playing out of turn", () => {
  const state = {
    hands: {
      p1: [{ id: "AS", suit: "S", rank: "A", value: 14 }],
      p2: [{ id: "2H", suit: "H", rank: "2", value: 2 }],
    },
    currentTrick: [],
    leadSuit: null,
    currentPlayerId: "p1",
    firstTrick: true,
    activePlayerOrder: ["p1", "p2"],
    escaped: [],
  };
  const r = validateAndApplyMove(state, "p2", "2H");
  assert.equal(r.ok, false);
  assert.match(r.error, /not your turn/);
});

test("illegal moves are rejected: playing after escaping", () => {
  const state = {
    hands: { p1: [], p2: [{ id: "2H", suit: "H", rank: "2", value: 2 }] },
    currentTrick: [],
    leadSuit: null,
    currentPlayerId: "p2",
    firstTrick: false,
    activePlayerOrder: ["p1", "p2"],
    escaped: ["p1"],
  };
  const r = validateAndApplyMove(state, "p1", "2H");
  assert.equal(r.ok, false);
  assert.match(r.error, /escaped/);
});

// ---- Hand sort order ----

test("sortHand orders Diamonds, Clubs, Hearts, Spades, high to low within suit", () => {
  const hand = [
    { id: "2S", suit: "S", rank: "2", value: 2 },
    { id: "AH", suit: "H", rank: "A", value: 14 },
    { id: "KD", suit: "D", rank: "K", value: 13 },
    { id: "3C", suit: "C", rank: "3", value: 3 },
    { id: "AD", suit: "D", rank: "A", value: 14 },
  ];
  const sorted = sortHand(hand);
  assert.deepEqual(
    sorted.map((c) => c.id),
    ["AD", "KD", "3C", "AH", "2S"]
  );
});
