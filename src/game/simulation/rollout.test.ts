import { describe, expect, it } from 'vitest'
import { makeCard } from '../cards/card'
import { createRng } from '../cards/deck'
import { createDefaultThullaRules } from '../rules/defaultRules'
import type { GameState, PlayerState } from '../state/types'
import { runRollout } from './rollout'
import { buildSimWorld } from './simWorld'

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
    ...overrides,
  }
}

describe('runRollout', () => {
  it('plays a small game to completion and reports a valid outcome for the root player', () => {
    const you = player({ id: 'you', seat: 0, isUser: true, hand: [makeCard('7', 'S'), makeCard('9', 'H')] })
    const ali = player({ id: 'ali', seat: 1, hand: [makeCard('K', 'S'), makeCard('2', 'C')] })
    const state = makeState([you, ali])
    const world = buildSimWorld(state, {})
    const rng = createRng(3)

    const outcome = runRollout(world, state.rules, 'you', makeCard('7', 'S'), rng)

    expect(outcome.rootFinalCardsRemaining).toBeGreaterThanOrEqual(0)
    expect(outcome.rootEscapeRank === null || outcome.rootEscapeRank >= 1).toBe(true)
    expect(outcome.wonCurrentTrick).toBe(false) // KS beats 7S
  })

  it('is deterministic for a fixed seed', () => {
    const you = player({ id: 'you', seat: 0, isUser: true, hand: [makeCard('7', 'S'), makeCard('9', 'H'), makeCard('4', 'D')] })
    const ali = player({ id: 'ali', seat: 1, hand: [makeCard('K', 'S'), makeCard('2', 'C'), makeCard('5', 'D')] })
    const state = makeState([you, ali])
    const world = buildSimWorld(state, {})

    const a = runRollout(world, state.rules, 'you', makeCard('7', 'S'), createRng(11))
    const b = runRollout(world, state.rules, 'you', makeCard('7', 'S'), createRng(11))
    expect(a).toEqual(b)
  })
})
