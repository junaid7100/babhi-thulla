import { describe, expect, it } from 'vitest'
import { createDeck, createRng } from '../cards/deck'
import { computeOpponentInference } from '../inference/opponentInference'
import { createDefaultThullaRules } from '../rules/defaultRules'
import type { GameState, PlayerState } from '../state/types'
import { sampleOpponentHands } from './handSampling'

function makeState(players: PlayerState[]): GameState {
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
    playedCardIds: [],
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
    owedRequestsFrom: [],
    ...overrides,
  }
}

describe('sampleOpponentHands', () => {
  it('gives each active opponent exactly cardsRemaining cards, respecting void suits', () => {
    const excluded = ['2S', '3S', '4H', '5H', '6H']
    const userHand = createDeck().filter((c) => !excluded.includes(c.id))
    const you = player({ id: 'you', isUser: true, hand: userHand, cardsRemaining: userHand.length, cardsStarted: userHand.length })
    const ali = player({ id: 'ali', seat: 1, cardsRemaining: 3, cardsStarted: 3, voidSuits: ['S'] })
    const sara = player({ id: 'sara', seat: 2, cardsRemaining: 2, cardsStarted: 2 })

    const state = makeState([you, ali, sara])
    const inference = computeOpponentInference(state)
    const rng = createRng(42)

    for (let i = 0; i < 20; i++) {
      const hands = sampleOpponentHands(state, inference, rng)
      expect(hands.ali).toHaveLength(3)
      expect(hands.sara).toHaveLength(2)
      expect(hands.ali.every((c) => c.suit !== 'S')).toBe(true)
      // Every dealt card actually came from the ambiguous pool.
      const ids = new Set([...hands.ali, ...hands.sara].map((c) => c.id))
      expect([...ids].every((id) => excluded.includes(id))).toBe(true)
    }
  })

  it('always returns already-known (picked-up) cards as part of the sampled hand', () => {
    const pickedUp = createDeck().filter((c) => c.id === '7D' || c.id === '2C')
    const you = player({ id: 'you', isUser: true, hand: [], cardsRemaining: 0, cardsStarted: 1 })
    const ali = player({ id: 'ali', seat: 1, cardsRemaining: 2, cardsStarted: 2, hand: pickedUp })
    const state = makeState([you, ali])
    const inference = computeOpponentInference(state)
    const hands = sampleOpponentHands(state, inference, createRng(7))
    expect(hands.ali.map((c) => c.id).sort()).toEqual(['2C', '7D'])
  })
})
