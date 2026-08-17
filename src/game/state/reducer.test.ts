import { describe, expect, it } from 'vitest'
import { createDefaultThullaRules } from '../rules/defaultRules'
import { buildState } from './reducer'
import type { GameEvent, PlayerSetup } from './types'

const players: PlayerSetup[] = [
  { id: 'you', name: 'You', seat: 0, isUser: true },
  { id: 'ali', name: 'Ali', seat: 1, isUser: false },
  { id: 'sara', name: 'Sara', seat: 2, isUser: false },
]

const rules = { ...createDefaultThullaRules(), openingLead: { required: false } }

function gameStarted(overrides: Partial<Extract<GameEvent, { type: 'GAME_STARTED' }>> = {}): GameEvent {
  return {
    id: 'ev-start',
    type: 'GAME_STARTED',
    timestamp: 1000,
    gameName: 'Test Game',
    rules,
    players,
    userPlayerId: 'you',
    dealerPlayerId: 'you',
    startingPlayerId: 'you',
    userHandCardIds: ['7S', '9S', 'AH', '4D', '6C'],
    ...overrides,
  }
}

function played(playerId: string, cardId: string, idSuffix: string): GameEvent {
  return { id: `ev-${idSuffix}`, type: 'CARD_PLAYED', timestamp: 2000, playerId, cardId }
}

describe('buildState: GAME_STARTED', () => {
  it('computes starting hand sizes and sets up turn order', () => {
    const state = buildState([gameStarted()])
    expect(state.status).toBe('IN_PROGRESS')
    expect(state.currentPlayerId).toBe('you')
    const you = state.players.find((p) => p.id === 'you')!
    expect(you.hand.map((c) => c.id).sort()).toEqual(['4D', '6C', '7S', '9S', 'AH'].sort())
    expect(you.cardsRemaining).toBe(5)
    // 52 / 3 = 17 r 1 -> seat 0 (you) gets the extra, but user hand size is trusted from input (5) not the formula.
    const ali = state.players.find((p) => p.id === 'ali')!
    const sara = state.players.find((p) => p.id === 'sara')!
    expect(ali.cardsRemaining).toBe(17)
    expect(sara.cardsRemaining).toBe(17)
  })
})

describe('buildState: clean trick (no Thulla)', () => {
  it('discards played cards and the winner leads next', () => {
    const events = [
      gameStarted(),
      played('you', '7S', '1'),
      played('ali', 'KS', '2'),
      played('sara', '3S', '3'),
    ]
    const state = buildState(events)
    expect(state.invalidEvents).toEqual([])
    expect(state.completedTricks).toHaveLength(1)
    const trick = state.completedTricks[0]
    expect(trick.winnerPlayerId).toBe('ali')
    expect(trick.hadThulla).toBe(false)
    expect(trick.pickedUp).toBe(false)
    expect(state.playedCardIds.sort()).toEqual(['3S', '7S', 'KS'].sort())
    expect(state.currentPlayerId).toBe('ali')
    const ali = state.players.find((p) => p.id === 'ali')!
    expect(ali.tricksWon).toBe(1)
    expect(ali.cardsRemaining).toBe(16) // played 1, no pickup
  })
})

describe('buildState: Thulla', () => {
  it('ends the trick immediately, before every active player has played', () => {
    const events = [
      gameStarted(),
      played('you', '7S', '1'),
      played('ali', '3H', '2'), // ali can't follow spades -> Thulla, cuts the trick short
    ]
    const state = buildState(events)
    expect(state.invalidEvents).toEqual([])
    expect(state.completedTricks).toHaveLength(1)
    const trick = state.completedTricks[0]
    expect(trick.plays).toHaveLength(2) // sara never got a turn
    expect(trick.hadThulla).toBe(true)
    expect(trick.winnerPlayerId).toBe('you') // only led-suit (S) card
    // first trick is exempt from pickup by default
    expect(trick.pickedUp).toBe(false)
    expect(state.currentPlayerId).toBe('you') // winner leads next
  })

  it('forces the winner to pick up the trick on a non-first-trick Thulla', () => {
    const events = [
      gameStarted(),
      played('you', '7S', '1'),
      played('ali', 'KS', '2'),
      played('sara', '3S', '3'), // trick 0: clean, ali wins, ali leads next
      played('ali', 'QH', '4'), // trick 1: ali leads hearts
      played('sara', '2D', '5'), // sara thullas -> trick ends, ali wins (only heart), picks up
    ]
    const state = buildState(events)
    expect(state.invalidEvents).toEqual([])
    const trick1 = state.completedTricks[1]
    expect(trick1.hadThulla).toBe(true)
    expect(trick1.pickedUp).toBe(true)
    expect(trick1.winnerPlayerId).toBe('ali')
    const ali = state.players.find((p) => p.id === 'ali')!
    expect(ali.hand.map((c) => c.id).sort()).toEqual(['2D', 'QH'].sort())
    expect(ali.cardsRemaining).toBe(17) // 17 start -1 (KS) -1 (QH) +2 (pickup) = 17
    const sara = state.players.find((p) => p.id === 'sara')!
    expect(sara.voidSuits).toEqual(['H'])
    // 'you' never got a turn in trick 1
    expect(state.players.find((p) => p.id === 'you')!.cardsRemaining).toBe(4)
  })
})

describe('buildState: escape and round end', () => {
  it('escapes a player the instant their hand empties, mid-trick, if others remain active', () => {
    const events = [gameStarted({ userHandCardIds: ['7S'] }), played('you', '7S', '1')]
    const state = buildState(events)
    const you = state.players.find((p) => p.id === 'you')!
    expect(you.cardsRemaining).toBe(0)
    expect(you.escaped).toBe(true)
    expect(state.status).toBe('IN_PROGRESS')
    expect(state.currentPlayerId).toBe('ali') // trick continues to the next active player
  })

  it('ends the round once only one player still holds cards, marking them the Bhabhi', () => {
    const tinyPlayers: PlayerSetup[] = [
      { id: 'you', name: 'You', seat: 0, isUser: true },
      { id: 'ali', name: 'Ali', seat: 1, isUser: false },
    ]
    const events = [gameStarted({ players: tinyPlayers, userHandCardIds: ['7S'] }), played('you', '7S', '1')]
    const state = buildState(events)
    expect(state.status).toBe('COMPLETED')
    expect(state.currentPlayerId).toBeNull()
    expect(state.finishOrder).toEqual(['you', 'ali'])
  })
})

describe('buildState: Neighbor Card Request', () => {
  const requestRules = { ...rules, neighborCardRequest: { enabled: true } }
  function requestGameStarted(overrides: Partial<Extract<GameEvent, { type: 'GAME_STARTED' }>> = {}): GameEvent {
    return { ...(gameStarted(overrides) as Extract<GameEvent, { type: 'GAME_STARTED' }>), rules: requestRules }
  }
  function requested(requesterId: string, targetId: string, idSuffix: string): GameEvent {
    return { id: `ev-${idSuffix}`, type: 'NEIGHBOR_REQUEST', timestamp: 3000, requesterId, targetId }
  }

  it('grants a right when a seat-neighbor Thullas a trick you win and pick up', () => {
    const events = [
      requestGameStarted(),
      played('you', '7S', '1'),
      played('ali', 'KS', '2'),
      played('sara', '3S', '3'), // trick 0: clean, ali wins, ali leads next
      played('ali', 'QH', '4'), // trick 1: ali leads hearts
      played('sara', '2D', '5'), // sara (seat 2, adjacent to ali seat 1) thullas -> ali wins + picks up
    ]
    const state = buildState(events)
    expect(state.invalidEvents).toEqual([])
    const ali = state.players.find((p) => p.id === 'ali')!
    expect(ali.owedRequestsFrom).toEqual(['sara'])
  })

  it('does not grant a right when the offender is not a seat-neighbor of the winner', () => {
    const fourPlayers: PlayerSetup[] = [
      { id: 'you', name: 'You', seat: 0, isUser: true },
      { id: 'ali', name: 'Ali', seat: 1, isUser: false },
      { id: 'sara', name: 'Sara', seat: 2, isUser: false },
      { id: 'ahmed', name: 'Ahmed', seat: 3, isUser: false },
    ]
    const events = [
      requestGameStarted({ players: fourPlayers, userHandCardIds: ['7S', '9D'] }),
      played('you', '7S', '1'),
      played('ali', '3S', '2'),
      played('sara', '5S', '3'),
      played('ahmed', '6S', '4'), // trick 0: clean, you win with 7S (highest spade), you lead trick 1
      played('you', '9D', '5'), // trick 1: you lead diamonds
      played('ali', '2D', '6'), // ali follows, lower
      played('sara', '9C', '7'), // sara (seat 2 — NOT adjacent to you, seat 0, in a 4-seat table) thullas -> you win + pick up
    ]
    const state = buildState(events)
    expect(state.invalidEvents).toEqual([])
    const you = state.players.find((p) => p.id === 'you')!
    expect(you.owedRequestsFrom).toEqual([])
  })

  it('cashes in a Neighbor Card Request: transfers the whole hand, target escapes, requester turn is spent', () => {
    const events = [
      requestGameStarted(),
      played('you', '7S', '1'),
      played('ali', 'KS', '2'),
      played('sara', '3S', '3'), // trick 0 clean, ali wins, leads trick 1
      played('ali', 'QH', '4'), // trick 1: ali leads hearts
      played('sara', '2D', '5'), // sara thullas -> ali wins + picks up, earns right against sara
    ]
    let state = buildState(events)
    expect(state.currentPlayerId).toBe('ali')
    const saraCardsBefore = state.players.find((p) => p.id === 'sara')!.cardsRemaining

    state = buildState([...events, requested('ali', 'sara', '6')])
    expect(state.invalidEvents).toEqual([])
    const ali = state.players.find((p) => p.id === 'ali')!
    const sara = state.players.find((p) => p.id === 'sara')!
    expect(sara.escaped).toBe(true)
    expect(sara.cardsRemaining).toBe(0)
    expect(sara.hand).toEqual([])
    expect(ali.owedRequestsFrom).toEqual([])
    expect(ali.cardsRemaining).toBe(17 + saraCardsBefore) // 17 = ali's tally after the earlier pickup
    expect(state.finishOrder).toContain('sara')
    expect(state.currentPlayerId).toBe('you') // ali's turn was spent; next active seat leads
  })

  it('rejects a request when leading has already started (mid-trick)', () => {
    const events = [
      requestGameStarted(),
      played('you', '7S', '1'),
      played('ali', 'KS', '2'),
      played('sara', '3S', '3'),
      played('ali', 'QH', '4'),
      played('sara', '2D', '5'),
      played('ali', 'AH', '6'), // ali actually leads trick 2 with a real card first
    ]
    const midTrickState = buildState([...events, requested('you', 'ali', '7')])
    // 'you' isn't even the current player here (ali just led, so it's the next player's turn) — should be flagged invalid either way.
    expect(midTrickState.invalidEvents.length).toBeGreaterThan(0)
  })

  it('rejects a request against a player with no earned right', () => {
    const state = buildState([requestGameStarted(), requested('you', 'ali', '1')])
    expect(state.invalidEvents).toHaveLength(1)
  })

  it('rejects a request when the house rule is disabled', () => {
    const state = buildState([gameStarted(), requested('you', 'ali', '1')])
    expect(state.invalidEvents).toHaveLength(1)
  })
})

describe('buildState: defensive replay', () => {
  it('flags an out-of-turn play instead of corrupting state', () => {
    const events = [gameStarted(), played('ali', 'KS', '1')]
    const state = buildState(events)
    expect(state.invalidEvents).toHaveLength(1)
    expect(state.currentPlayerId).toBe('you')
  })

  it('flags a duplicate card play instead of corrupting state', () => {
    const events = [
      gameStarted(),
      played('you', '7S', '1'),
      played('ali', 'KS', '2'),
      played('sara', '3S', '3'),
      played('ali', 'KS', '4'), // KS was already discarded
    ]
    const state = buildState(events)
    expect(state.invalidEvents).toHaveLength(1)
  })
})
