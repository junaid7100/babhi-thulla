import { describe, expect, it } from 'vitest'
import { createDeck } from '../cards/deck'
import { computeOpponentInference } from '../inference/opponentInference'
import { createDefaultThullaRules } from '../rules/defaultRules'
import { recommendMove } from '../strategy/recommend'
import type { GameState, PlayerState } from '../state/types'
import { explainAdvanced, explainCandidate } from './explainMove'
import { renderStars } from './confidence'

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

describe('explainCandidate', () => {
  it('mentions the Thulla / pickup risk for a card that would force one', () => {
    const aliHand = createDeck().filter((c) => c.id === '3S' || c.id === 'KH')
    const you = player({
      id: 'you',
      isUser: true,
      hand: createDeck().filter((c) => ['2S', '2D'].includes(c.id)),
      cardsRemaining: 2,
      cardsStarted: 2,
    })
    const ali = player({ id: 'ali', seat: 1, hand: aliHand, cardsRemaining: 2, cardsStarted: 2 })
    const state: GameState = {
      gameId: 'g1',
      gameName: 'Test',
      rules: createDefaultThullaRules(),
      players: [you, ali],
      userPlayerId: 'you',
      dealerPlayerId: 'you',
      currentPlayerId: 'you',
      currentTrick: { index: 1, leadSuit: null, plays: [], activePlayerIdsAtStart: ['you', 'ali'] },
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
    const inference = computeOpponentInference(state)
    const recommendation = recommendMove(state, inference, 'you', { simulations: 60, seed: 4 })
    expect(recommendation).not.toBeNull()

    const worst = [recommendation!.best, ...recommendation!.alternatives].find((r) => r.evaluation.card.id === '2D')!
    const bullets = explainCandidate(state, worst)
    expect(bullets.some((b) => b.toLowerCase().includes('thulla'))).toBe(true)

    const advanced = explainAdvanced(state, worst)
    expect(advanced.mainRisk).toBeTruthy()
    expect(advanced.mainAdvantage).toBeTruthy()
    expect(advanced.strategicObjective).toBeTruthy()
  })
})

describe('renderStars', () => {
  it('renders filled and empty stars', () => {
    expect(renderStars(3)).toBe('★★★☆☆')
    expect(renderStars(5)).toBe('★★★★★')
  })
})
