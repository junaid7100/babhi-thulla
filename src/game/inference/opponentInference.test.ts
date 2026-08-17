import { describe, expect, it } from 'vitest'
import { createDeck } from '../cards/deck'
import { createDefaultThullaRules } from '../rules/defaultRules'
import type { GameState, PlayerState } from '../state/types'
import { computeOpponentInference } from './opponentInference'

function makeState(players: PlayerState[], playedCardIds: string[] = []): GameState {
  return {
    gameId: 'g1',
    gameName: 'Test',
    rules: createDefaultThullaRules(),
    players,
    userPlayerId: 'you',
    dealerPlayerId: 'you',
    currentPlayerId: 'you',
    currentTrick: { index: 0, leadSuit: null, plays: [], activePlayerIdsAtStart: players.map((p) => p.id) },
    completedTricks: [],
    playedCardIds,
    status: 'IN_PROGRESS',
    finishOrder: [],
    roundNumber: 1,
    events: [],
    invalidEvents: [],
    createdAt: 0,
    updatedAt: 0,
  }
}

function player(overrides: Partial<PlayerState> & { id: string }): PlayerState {
  return {
    name: overrides.id,
    seat: 0,
    isUser: false,
    isDealer: false,
    hand: [],
    cardsRemaining: 0,
    cardsStarted: 0,
    cardsPlayed: [],
    tricksWon: 0,
    escaped: false,
    escapedAtTrickIndex: null,
    voidSuits: [],
    ...overrides,
  }
}

describe('computeOpponentInference', () => {
  it('splits unseen cards as possible for every opponent with open slots', () => {
    const excluded = ['2S', '3S', '4H', '5H', '6H']
    const userHand = createDeck().filter((c) => !excluded.includes(c.id))
    const you = player({ id: 'you', isUser: true, hand: userHand, cardsRemaining: userHand.length, cardsStarted: userHand.length })
    const ali = player({ id: 'ali', seat: 1, cardsRemaining: 3, cardsStarted: 3 })
    const sara = player({ id: 'sara', seat: 2, cardsRemaining: 2, cardsStarted: 2 })

    const inference = computeOpponentInference(makeState([you, ali, sara]))
    expect(inference.ali.possibleCards.map((c) => c.id).sort()).toEqual(excluded.sort())
    expect(inference.sara.possibleCards.map((c) => c.id).sort()).toEqual(excluded.sort())

    // Every unseen card's probabilities across eligible players sum to ~1.
    for (const cardId of excluded) {
      const sum = (inference.ali.probabilities[cardId] ?? 0) + (inference.sara.probabilities[cardId] ?? 0)
      expect(sum).toBeCloseTo(1, 5)
    }
  })

  it('resolves a player to fully known via elimination, cascading to others', () => {
    const excluded = ['2S', '3S', '4H', '5H', '6H']
    const userHand = createDeck().filter((c) => !excluded.includes(c.id))
    const you = player({ id: 'you', isUser: true, hand: userHand, cardsRemaining: userHand.length, cardsStarted: userHand.length })
    // Ali is void in spades, so only the 3 hearts are possible for them — exactly matching their 3 remaining cards.
    const ali = player({ id: 'ali', seat: 1, cardsRemaining: 3, cardsStarted: 3, voidSuits: ['S'] })
    const sara = player({ id: 'sara', seat: 2, cardsRemaining: 2, cardsStarted: 2 })

    const inference = computeOpponentInference(makeState([you, ali, sara]))
    expect(inference.ali.knownCards.map((c) => c.id).sort()).toEqual(['4H', '5H', '6H'])
    expect(inference.ali.possibleCards).toEqual([])
    // Once ali's hand is forced, sara's remaining candidates (2S, 3S) exactly match her 2 slots — cascades to known too.
    expect(inference.sara.knownCards.map((c) => c.id).sort()).toEqual(['2S', '3S'])
  })

  it('marks cards played by the user as impossible for every opponent', () => {
    const you = player({ id: 'you', isUser: true, hand: [], cardsRemaining: 0, cardsStarted: 1 })
    const ali = player({ id: 'ali', seat: 1, cardsRemaining: 1, cardsStarted: 1 })
    const state = makeState([you, ali], ['AS'])
    const inference = computeOpponentInference(state)
    expect(inference.ali.impossibleCards.some((c) => c.id === 'AS')).toBe(true)
    expect(inference.ali.possibleCards.some((c) => c.id === 'AS')).toBe(false)
  })

  it('gives an escaped opponent no known/possible cards', () => {
    const you = player({ id: 'you', isUser: true, hand: [], cardsRemaining: 0, cardsStarted: 1 })
    const ali = player({ id: 'ali', seat: 1, cardsRemaining: 0, cardsStarted: 1, escaped: true })
    const inference = computeOpponentInference(makeState([you, ali]))
    expect(inference.ali.knownCards).toEqual([])
    expect(inference.ali.possibleCards).toEqual([])
    expect(inference.ali.cardsRemaining).toBe(0)
  })

  it('treats directly observed (picked-up) cards as known, not just possible', () => {
    const pickedUp = createDeck().filter((c) => c.id === '7D' || c.id === '2C')
    const you = player({ id: 'you', isUser: true, hand: [], cardsRemaining: 0, cardsStarted: 1 })
    const ali = player({ id: 'ali', seat: 1, cardsRemaining: 2, cardsStarted: 2, hand: pickedUp })
    const inference = computeOpponentInference(makeState([you, ali]))
    expect(inference.ali.knownCards.map((c) => c.id).sort()).toEqual(['2C', '7D'])
    expect(inference.ali.possibleCards).toEqual([])
  })
})
