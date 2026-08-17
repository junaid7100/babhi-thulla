import { describe, expect, it } from 'vitest'
import { createDefaultThullaRules } from '../rules/defaultRules'
import type { GameState, PlayerState } from '../state/types'
import { buildSimWorld, simStep } from './simWorld'

function makeState(players: PlayerState[], trickIndex = 0): GameState {
  return {
    gameId: 'g1',
    gameName: 'Test',
    rules: createDefaultThullaRules(),
    players,
    userPlayerId: 'you',
    dealerPlayerId: 'you',
    currentPlayerId: players[0].id,
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

describe('simStep', () => {
  it('resolves a clean trick with no pickup and advances the leader', () => {
    const you = player({ id: 'you', seat: 0, isUser: true, hand: cards(['7S', '2D']) })
    const ali = player({ id: 'ali', seat: 1, hand: cards(['KS', '2H']) })
    const sara = player({ id: 'sara', seat: 2, hand: cards(['3S', '2C']) })
    const world = buildSimWorld(makeState([you, ali, sara]), {})

    let step = simStep(world, world0Rules(), 'you', '7S')
    step = simStep(step.world, world0Rules(), 'ali', 'KS')
    step = simStep(step.world, world0Rules(), 'sara', '3S')

    expect(step.resolvedTrick).toEqual({ winnerPlayerId: 'ali', pickedUp: false, hadThulla: false })
    expect(step.world.currentPlayerId).toBe('ali')
    expect(step.world.players.find((p) => p.id === 'ali')!.hand).toHaveLength(1)
  })

  it('forces a pickup on a non-first-trick Thulla and cuts the trick short', () => {
    const you = player({ id: 'you', seat: 0, isUser: true, hand: cards(['7S', '2D']) })
    const ali = player({ id: 'ali', seat: 1, hand: cards(['3H', '2C']) })
    const sara = player({ id: 'sara', seat: 2, hand: cards(['9S', '2S']) })
    const world = buildSimWorld(makeState([you, ali, sara], 1), {})

    let step = simStep(world, world0Rules(), 'you', '7S')
    step = simStep(step.world, world0Rules(), 'ali', '3H') // Thulla, cuts the trick short before sara plays

    expect(step.resolvedTrick).toEqual({ winnerPlayerId: 'you', pickedUp: true, hadThulla: true })
    const youAfter = step.world.players.find((p) => p.id === 'you')!
    expect(youAfter.hand.map((c) => c.id).sort()).toEqual(['2D', '3H', '7S'])
    expect(step.world.players.find((p) => p.id === 'sara')!.hand).toHaveLength(2) // never got a turn
  })

  it('completes the round the instant only one player has cards left', () => {
    const you = player({ id: 'you', seat: 0, isUser: true, hand: cards(['7S']) })
    const ali = player({ id: 'ali', seat: 1, hand: cards(['3S']) })
    const world = buildSimWorld(makeState([you, ali]), {})
    const step = simStep(world, world0Rules(), 'you', '7S')
    expect(step.world.completed).toBe(true) // 'you' just emptied their hand; ali is left holding cards
    expect(step.world.finishOrder).toEqual(['you', 'ali'])
  })
})

function world0Rules() {
  return createDefaultThullaRules()
}

function cards(ids: string[]) {
  return ids.map((id) => ({ id, suit: id.slice(-1) as never, rank: id.slice(0, -1) as never, value: rankValue(id.slice(0, -1)) }))
}

function rankValue(rank: string): number {
  const order = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
  return order.indexOf(rank) + 2
}
