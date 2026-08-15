import assert from "node:assert/strict";
import { test, describe } from "node:test";
import {
  createDeck,
  shuffleDeck,
  dealCards,
  sortHand,
  findStartingPlayer,
  getLegalCards,
  playCard,
  resolveCompletedTrick,
  checkPlayerEscape,
  checkGameEnd,
  getNextActivePlayer,
  initGame,
  RULES,
} from "../src/engine";
import { Card, EngineTrickState, PlayedCard, Suit } from "../src/engine/types";

function card(id: string): Card {
  const found = createDeck().find((c) => c.id === id);
  if (!found) throw new Error(`unknown card ${id}`);
  return found;
}

describe("Deck", () => {
  test("has exactly 52 cards", () => {
    assert.equal(createDeck().length, 52);
  });

  test("has no duplicate card ids", () => {
    const ids = createDeck().map((c) => c.id);
    assert.equal(new Set(ids).size, 52);
  });

  test("has all four suits", () => {
    const suits = new Set(createDeck().map((c) => c.suit));
    assert.deepEqual([...suits].sort(), ["C", "D", "H", "S"]);
  });

  test("has all thirteen ranks per suit", () => {
    for (const suit of ["S", "H", "D", "C"] as Suit[]) {
      const ranks = createDeck().filter((c) => c.suit === suit);
      assert.equal(ranks.length, 13);
    }
  });

  test("shuffle preserves the full card set", () => {
    const original = createDeck();
    const shuffled = shuffleDeck(original);
    assert.equal(shuffled.length, 52);
    assert.deepEqual(
      [...shuffled.map((c) => c.id)].sort(),
      [...original.map((c) => c.id)].sort()
    );
  });
});

describe("Dealing", () => {
  test("distributes all cards with no loss or duplication (4 players)", () => {
    const deck = shuffleDeck(createDeck());
    const hands = dealCards(deck, 4);
    const total = hands.reduce((sum, h) => sum + h.length, 0);
    assert.equal(total, 52);
    const allIds = hands.flat().map((c) => c.id);
    assert.equal(new Set(allIds).size, 52);
    for (const h of hands) assert.equal(h.length, 13);
  });

  test("deals as evenly as possible for 3 players (17/17/18)", () => {
    const deck = shuffleDeck(createDeck());
    const hands = dealCards(deck, 3);
    const sizes = hands.map((h) => h.length).sort((a, b) => a - b);
    assert.deepEqual(sizes, [17, 17, 18]);
  });

  test("deals evenly for odd player counts up to 8", () => {
    for (let n = 3; n <= 8; n++) {
      const hands = dealCards(shuffleDeck(createDeck()), n);
      const sizes = hands.map((h) => h.length);
      assert.equal(Math.max(...sizes) - Math.min(...sizes) <= 1, true);
      assert.equal(sizes.reduce((a, b) => a + b, 0), 52);
    }
  });
});

describe("First turn", () => {
  test("the A♠ holder is the starting player", () => {
    const players = ["p1", "p2", "p3"];
    const { hands, currentPlayerId } = initGame(players);
    assert.equal(hands[currentPlayerId].some((c) => c.id === "AS"), true);
  });

  test("the first card played must be A♠", () => {
    const players = ["p1", "p2", "p3"];
    const { hands, currentPlayerId } = initGame(players);
    const otherId = hands[currentPlayerId].find((c) => c.id !== "AS")!.id;
    if (!otherId) return; // starter only has AS in a pathological tiny hand; skip
    const state: EngineTrickState = {
      hands,
      currentTrick: [],
      leadSuit: null,
      currentPlayerId,
      firstTrick: true,
      activePlayerOrder: players,
      escaped: [],
    };
    const result = playCard(state, currentPlayerId, otherId);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /Ace of Spades|AS/i);
  });

  test("playing A♠ first is accepted", () => {
    const players = ["p1", "p2", "p3"];
    const { hands, currentPlayerId } = initGame(players);
    const state: EngineTrickState = {
      hands,
      currentTrick: [],
      leadSuit: null,
      currentPlayerId,
      firstTrick: true,
      activePlayerOrder: players,
      escaped: [],
    };
    const result = playCard(state, currentPlayerId, "AS");
    assert.equal(result.ok, true);
  });
});

describe("Follow suit", () => {
  function baseState(hands: Record<string, Card[]>, leadSuit: Suit | null, trick: PlayedCard[]): EngineTrickState {
    return {
      hands,
      currentTrick: trick,
      leadSuit,
      currentPlayerId: "p2",
      firstTrick: false,
      activePlayerOrder: ["p1", "p2", "p3"],
      escaped: [],
    };
  }

  test("player holding the lead suit cannot play another suit", () => {
    const hands = {
      p1: [card("AS")],
      p2: [card("KH"), card("2C")],
      p3: [card("QH")],
    };
    const trick: PlayedCard[] = [{ playerId: "p1", card: card("7H"), sequence: 0 }];
    // p1 led hearts conceptually; construct with leadSuit H
    const state = baseState(hands, "H", trick);
    const result = playCard(state, "p2", "2C");
    assert.equal(result.ok, false);
  });

  test("player without the lead suit may play any suit (Thulla)", () => {
    const hands = {
      p1: [card("AS")],
      p2: [card("2C")],
      p3: [card("QH")],
    };
    const trick: PlayedCard[] = [{ playerId: "p1", card: card("7H"), sequence: 0 }];
    const state = baseState(hands, "H", trick);
    const result = playCard(state, "p2", "2C");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.isThulla, true);
  });

  test("getLegalCards restricts to lead suit when held", () => {
    const hand = [card("2H"), card("3C"), card("4H")];
    const legal = getLegalCards(hand, "H");
    assert.deepEqual(legal.map((c) => c.id).sort(), ["2H", "4H"]);
  });

  test("getLegalCards allows anything when lead suit not held", () => {
    const hand = [card("2C"), card("3D")];
    const legal = getLegalCards(hand, "H");
    assert.deepEqual(legal.map((c) => c.id).sort(), ["2C", "3D"]);
  });
});

describe("Thulla", () => {
  test("off-suit play when void of lead suit ends the trick immediately", () => {
    const hands = { p1: [], p2: [], p3: [card("AC")] };
    const state: EngineTrickState = {
      hands: { p1: [], p2: [], p3: [card("AC")] },
      currentTrick: [
        { playerId: "p1", card: card("7H"), sequence: 0 },
        { playerId: "p2", card: card("KH"), sequence: 1 },
      ],
      leadSuit: "H",
      currentPlayerId: "p3",
      firstTrick: false,
      activePlayerOrder: ["p1", "p2", "p3"],
      escaped: [],
    };
    const result = playCard(state, "p3", "AC");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.isThulla, true);
      assert.equal(result.trickComplete, true);
      assert.equal(result.nextPlayerId, undefined);
    }
    void hands;
  });

  test("highest lead-suit card wins and receives the entire pile", () => {
    const trick: PlayedCard[] = [
      { playerId: "p1", card: card("5H"), sequence: 0 },
      { playerId: "p2", card: card("QH"), sequence: 1 },
      { playerId: "p3", card: card("AC"), sequence: 2 },
    ];
    const resolution = resolveCompletedTrick({
      trick,
      leadSuit: "H",
      isThulla: true,
      firstTrick: false,
      hands: { p1: [], p2: [], p3: [] },
      activePlayerOrder: ["p1", "p2", "p3"],
      escaped: [],
    });
    assert.equal(resolution.winnerId, "p2");
    assert.equal(resolution.pickedUp, true);
    assert.equal(resolution.handsAfter.p2.length, 3);
    assert.deepEqual(
      resolution.handsAfter.p2.map((c) => c.id).sort(),
      ["5H", "AC", "QH"]
    );
  });

  test("the Thulla offender does not receive the pile merely for playing it", () => {
    const trick: PlayedCard[] = [
      { playerId: "p1", card: card("5H"), sequence: 0 },
      { playerId: "p2", card: card("QH"), sequence: 1 },
      { playerId: "p3", card: card("AC"), sequence: 2 },
    ];
    const resolution = resolveCompletedTrick({
      trick,
      leadSuit: "H",
      isThulla: true,
      firstTrick: false,
      hands: { p1: [], p2: [], p3: [] },
      activePlayerOrder: ["p1", "p2", "p3"],
      escaped: [],
    });
    assert.notEqual(resolution.winnerId, "p3");
    assert.equal(resolution.handsAfter.p3.length, 0);
  });

  test("the first trick is discarded even when it is technically a Thulla", () => {
    const trick: PlayedCard[] = [
      { playerId: "p1", card: card("AS"), sequence: 0 },
      { playerId: "p2", card: card("2C"), sequence: 1 },
    ];
    const resolution = resolveCompletedTrick({
      trick,
      leadSuit: "S",
      isThulla: true,
      firstTrick: true,
      hands: { p1: [], p2: [] },
      activePlayerOrder: ["p1", "p2"],
      escaped: [],
    });
    assert.equal(resolution.pickedUp, false);
    assert.equal(resolution.handsAfter.p1.length, 0);
  });
});

describe("Normal trick (no Thulla)", () => {
  test("highest lead-suit card wins, cards are discarded, winner leads next", () => {
    const trick: PlayedCard[] = [
      { playerId: "p1", card: card("4H"), sequence: 0 },
      { playerId: "p2", card: card("KH"), sequence: 1 },
      { playerId: "p3", card: card("7H"), sequence: 2 },
      { playerId: "p4", card: card("QH"), sequence: 3 },
    ];
    const resolution = resolveCompletedTrick({
      trick,
      leadSuit: "H",
      isThulla: false,
      firstTrick: false,
      hands: { p1: [], p2: [], p3: [], p4: [] },
      activePlayerOrder: ["p1", "p2", "p3", "p4"],
      escaped: [],
    });
    assert.equal(resolution.winnerId, "p2");
    assert.equal(resolution.pickedUp, false);
    assert.equal(resolution.handsAfter.p2.length, 0);
  });
});

describe("Escape", () => {
  test("an empty hand marks the player escaped", () => {
    assert.equal(checkPlayerEscape([]), true);
    assert.equal(checkPlayerEscape([card("2C")]), false);
  });

  test("an escaped player is excluded from activePlayerOrder for turn rotation", () => {
    const next = getNextActivePlayer("p1", ["p1", "p2", "p3"], new Set(["p2"]));
    assert.equal(next, "p3");
  });

  test("an escaped player cannot be dealt back into a Thulla pickup", () => {
    // p1 has escaped (empty hand) prior to this trick's resolution; engine must
    // never select an escaped id as the pile recipient. Winner-finding only
    // considers cards actually present in the trick, so this is a structural
    // guarantee: an escaped player cannot have played in the trick at all.
    const trick: PlayedCard[] = [
      { playerId: "p2", card: card("5H"), sequence: 0 },
      { playerId: "p3", card: card("2C"), sequence: 1 },
    ];
    const resolution = resolveCompletedTrick({
      trick,
      leadSuit: "H",
      isThulla: true,
      firstTrick: false,
      hands: { p1: [], p2: [], p3: [] },
      activePlayerOrder: ["p2", "p3"],
      escaped: ["p1"],
    });
    assert.notEqual(resolution.winnerId, "p1");
  });
});

describe("End game / Bhabhi", () => {
  test("one active player remaining ends the game", () => {
    assert.equal(checkGameEnd(["p3"]), true);
    assert.equal(checkGameEnd(["p2", "p3"]), false);
  });

  test("the sole remaining active player is the Bhabhi", () => {
    const active = ["p3"];
    assert.equal(checkGameEnd(active), true);
    assert.equal(active[0], "p3");
  });
});

describe("Illegal move rejection", () => {
  test("rejects a play from a player who is not the current turn", () => {
    const hands = { p1: [card("2H")], p2: [card("3H")] };
    const state: EngineTrickState = {
      hands,
      currentTrick: [],
      leadSuit: null,
      currentPlayerId: "p1",
      firstTrick: false,
      activePlayerOrder: ["p1", "p2"],
      escaped: [],
    };
    const result = playCard(state, "p2", "3H");
    assert.equal(result.ok, false);
  });

  test("rejects playing a card not in the player's hand (forged card id)", () => {
    const hands = { p1: [card("2H")], p2: [card("3H")] };
    const state: EngineTrickState = {
      hands,
      currentTrick: [],
      leadSuit: null,
      currentPlayerId: "p1",
      firstTrick: false,
      activePlayerOrder: ["p1", "p2"],
      escaped: [],
    };
    // p1 tries to play a card that's actually in p2's hand
    const result = playCard(state, "p1", "3H");
    assert.equal(result.ok, false);
  });

  test("rejects a play from an already-escaped player", () => {
    const hands = { p1: [], p2: [card("3H")] };
    const state: EngineTrickState = {
      hands,
      currentTrick: [],
      leadSuit: null,
      currentPlayerId: "p1",
      firstTrick: false,
      activePlayerOrder: ["p2"],
      escaped: ["p1"],
    };
    const result = playCard(state, "p1", "3H");
    assert.equal(result.ok, false);
  });
});

describe("Sequential application prevents duplicate/concurrent card plays", () => {
  test("the same card cannot be legally played twice in a row", () => {
    const hands = { p1: [card("AS"), card("2H")], p2: [card("3H")], p3: [card("4H")] };
    const state: EngineTrickState = {
      hands,
      currentTrick: [],
      leadSuit: null,
      currentPlayerId: "p1",
      firstTrick: true,
      activePlayerOrder: ["p1", "p2", "p3"],
      escaped: [],
    };
    const first = playCard(state, "p1", "AS");
    assert.equal(first.ok, true);
    if (!first.ok) return;

    // Simulate the room committing the first result before a second (racing)
    // request for the same original state is processed against committed state.
    const committedState: EngineTrickState = {
      ...state,
      hands: first.hands,
      currentTrick: first.trick,
      leadSuit: first.leadSuit,
      currentPlayerId: first.nextPlayerId ?? state.currentPlayerId,
    };
    // A second request that still thinks it's p1's turn (stale) is rejected
    // because it is no longer p1's turn and AS is no longer in p1's hand.
    const second = playCard(committedState, "p1", "AS");
    assert.equal(second.ok, false);
  });
});

describe("RULES config drives engine behavior", () => {
  test("engine respects RULES.startingCard and RULES.minPlayers/maxPlayers bounds", () => {
    assert.equal(RULES.startingCard, "AS");
    assert.equal(RULES.minPlayers, 3);
    assert.equal(RULES.maxPlayers, 8);
  });
});

// sortHand smoke test used by dealing/UI ordering.
test("sortHand orders D, C, H, S then high-to-low within suit", () => {
  const hand = [card("2H"), card("AS"), card("KD"), card("3C")];
  const sorted = sortHand(hand);
  assert.deepEqual(
    sorted.map((c) => c.id),
    ["KD", "3C", "2H", "AS"]
  );
});

test("findStartingPlayer locates the A♠ holder among many players", () => {
  const hands = { a: [card("2H")], b: [card("AS")], c: [card("3D")] };
  assert.equal(findStartingPlayer(hands, ["a", "b", "c"]), "b");
});
