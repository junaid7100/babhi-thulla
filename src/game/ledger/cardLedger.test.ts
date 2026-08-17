import { describe, expect, it } from 'vitest'
import { createDeck } from '../cards/deck'
import { computeOpponentInference } from '../inference/opponentInference'
import { createDefaultThullaRules } from '../rules/defaultRules'
import type { GameState, PlayerState } from '../state/types'
import { buildCardLedger, cardsRemainingBySuit, hasCardBeenPlayed, isCardAvailable, whoCouldHaveThisCard } from './cardLedger'

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

describe('buildCardLedger', () => {
  it('gives every one of the 52 cards exactly one status', () => {
    const excluded = ['2S', '3S', '4S']
    const userHand = createDeck().filter((c) => !excluded.includes(c.id))
    const you = player({ id: 'you', isUser: true, hand: userHand, cardsRemaining: userHand.length, cardsStarted: userHand.length })
    const ali = player({ id: 'ali', seat: 1, cardsRemaining: 2, cardsStarted: 2 })
    const state = makeState([you, ali])
    const inference = computeOpponentInference(state)
    const ledger = buildCardLedger(state, inference)
    expect(ledger.entries.size).toBe(52)
    for (const c of excluded) {
      expect(ledger.entries.get(c)!.status).toBe('POSSIBLY_IN_OPPONENT_HAND')
    }
    expect(ledger.entries.get('5S')!.status).toBe('IN_USER_HAND')
  })

  it('marks played cards as PLAYED and unavailable', () => {
    const you = player({ id: 'you', isUser: true, hand: [], cardsRemaining: 0, cardsStarted: 1 })
    const ali = player({ id: 'ali', seat: 1, cardsRemaining: 0, cardsStarted: 1 })
    const state = makeState([you, ali], ['AS'])
    const inference = computeOpponentInference(state)
    const ledger = buildCardLedger(state, inference)
    expect(hasCardBeenPlayed(ledger, 'AS')).toBe(true)
    expect(isCardAvailable(ledger, 'AS')).toBe(false)
    expect(isCardAvailable(ledger, 'KS')).toBe(true)
  })

  it('reports known ownership for picked-up cards', () => {
    const pickedUp = createDeck().filter((c) => c.id === '7D')
    const you = player({ id: 'you', isUser: true, hand: [], cardsRemaining: 0, cardsStarted: 1 })
    const ali = player({ id: 'ali', seat: 1, cardsRemaining: 1, cardsStarted: 1, hand: pickedUp })
    const state = makeState([you, ali])
    const inference = computeOpponentInference(state)
    const ledger = buildCardLedger(state, inference)
    expect(ledger.entries.get('7D')!.status).toBe('IN_OPPONENT_HAND_KNOWN')
    expect(whoCouldHaveThisCard(ledger, '7D')).toEqual(['ali'])
  })
})

describe('cardsRemainingBySuit', () => {
  it('excludes played cards from the count', () => {
    const you = player({ id: 'you', isUser: true, hand: [], cardsRemaining: 0, cardsStarted: 1 })
    const ali = player({ id: 'ali', seat: 1, cardsRemaining: 0, cardsStarted: 1 })
    const state = makeState([you, ali], ['AS', 'KS'])
    const inference = computeOpponentInference(state)
    const ledger = buildCardLedger(state, inference)
    expect(cardsRemainingBySuit(ledger).S).toBe(11)
  })
})
