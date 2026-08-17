import { describe, expect, it } from 'vitest'
import { createDeck } from '../cards/deck'
import { computeOpponentInference } from '../inference/opponentInference'
import { createDefaultThullaRules } from '../rules/defaultRules'
import { evaluateCandidates } from '../simulation/monteCarlo'
import type { GameState, PlayerState } from '../state/types'
import { recommendMove } from './recommend'

const rules = createDefaultThullaRules()

function makeState(players: PlayerState[], trickIndex: number): GameState {
  return {
    gameId: 'g1',
    gameName: 'Test',
    rules,
    players,
    userPlayerId: 'you',
    dealerPlayerId: 'you',
    currentPlayerId: 'you',
    currentTrick: { index: trickIndex, leadSuit: null, plays: [], activePlayerIdsAtStart: players.map((p) => p.id) },
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

describe('strategy engine: leading into a known 2-player endgame', () => {
  // Ali's whole hand is directly known (picked up earlier): 3S and KH. It is
  // not the first trick, so winning a Thulla trick means picking it up.
  //
  // Candidate A: lead 2S. Ali holds a spade (3S) and follows suit — a clean
  // trick either way, cards are discarded, the user's hand simply shrinks.
  // Candidate B: lead 2D. Ali holds no diamonds, so Ali must Thulla. The
  // user, as the only diamond in the trick, automatically wins — and since
  // this isn't the first trick, the user is forced to pick the whole trick
  // back up, so their hand does NOT shrink. Leading 2S is objectively better.
  function buildScenario() {
    const aliHand = createDeck().filter((c) => c.id === '3S' || c.id === 'KH')
    const you = player({
      id: 'you',
      isUser: true,
      hand: createDeck().filter((c) => ['2S', '2D', '4C', '5C', '6C'].includes(c.id)),
      cardsRemaining: 5,
      cardsStarted: 5,
    })
    const ali = player({ id: 'ali', seat: 1, hand: aliHand, cardsRemaining: 2, cardsStarted: 2 })
    return makeState([you, ali], 1)
  }

  it('scores leading a followable suit higher than leading a suit that forces a punishing pickup', () => {
    const state = buildScenario()
    const inference = computeOpponentInference(state)
    const twoS = state.players[0].hand.find((c) => c.id === '2S')!
    const twoD = state.players[0].hand.find((c) => c.id === '2D')!

    const results = evaluateCandidates(state, inference, 'you', [twoS, twoD], { simulations: 40, seed: 5 })
    const byId = new Map(results.map((r) => [r.card.id, r]))

    expect(byId.get('2S')!.meanScore).toBeGreaterThan(byId.get('2D')!.meanScore)
    expect(byId.get('2D')!.meanFinalCardsRemaining).toBeGreaterThan(byId.get('2S')!.meanFinalCardsRemaining)
  })

  it('recommendMove picks the followable-suit lead as the best move', () => {
    const state = buildScenario()
    // Restrict the user's hand to just the two candidates under test so the
    // recommendation engine only has to compare exactly these two options.
    const restricted: GameState = {
      ...state,
      players: state.players.map((p) =>
        p.isUser ? { ...p, hand: p.hand.filter((c) => c.id === '2S' || c.id === '2D'), cardsRemaining: 2, cardsStarted: 2 } : p,
      ),
    }
    const inference = computeOpponentInference(restricted)
    const recommendation = recommendMove(restricted, inference, 'you', { simulations: 60, seed: 9 })

    expect(recommendation).not.toBeNull()
    expect(recommendation!.best.evaluation.card.id).toBe('2S')
  })
})
