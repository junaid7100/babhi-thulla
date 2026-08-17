import { describe, expect, it } from 'vitest'
import { createDefaultThullaRules } from '../rules/defaultRules'
import type { GameEvent, PlayerSetup } from '../state/types'
import { attemptNeighborRequest, attemptPlayCard, createNewGameEvent, editEvent, rebuild, removeEvent, undoLastEvent } from './gameEngine'

const players: PlayerSetup[] = [
  { id: 'you', name: 'You', seat: 0, isUser: true },
  { id: 'ali', name: 'Ali', seat: 1, isUser: false },
  { id: 'sara', name: 'Sara', seat: 2, isUser: false },
]
const rules = { ...createDefaultThullaRules(), openingLead: { required: false } }

function newGame(userHandCardIds = ['7S', '9S', 'AH', '4D', '6C']): GameEvent {
  return createNewGameEvent({
    gameName: 'Test',
    rules,
    players,
    userPlayerId: 'you',
    dealerPlayerId: 'you',
    startingPlayerId: 'you',
    userHandCardIds,
  })
}

describe('attemptPlayCard', () => {
  it('blocks a card not in the user hand', () => {
    const events = [newGame()]
    const state = rebuild(events)
    const result = attemptPlayCard(state, 'you', 'KS')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issues.some((i) => i.level === 'error')).toBe(true)
  })

  it('blocks playing out of turn', () => {
    const events = [newGame()]
    const state = rebuild(events)
    const result = attemptPlayCard(state, 'ali', 'KS')
    expect(result.ok).toBe(false)
  })

  it('blocks a card already known to be in another hand', () => {
    const events = [newGame()]
    const state = rebuild(events)
    // AH is in the user's hand; claiming Ali plays it should fail turn-order first,
    // but even set as current player it should fail the ownership check.
    const asAli = { ...state, currentPlayerId: 'ali' }
    const result = attemptPlayCard(asAli, 'ali', 'AH')
    expect(result.ok).toBe(false)
  })

  it('blocks the user breaking suit while still holding the led suit', () => {
    const events: GameEvent[] = [
      newGame(),
      { id: 'e1', type: 'CARD_PLAYED', timestamp: 1, playerId: 'you', cardId: '9S' },
      { id: 'e2', type: 'CARD_PLAYED', timestamp: 2, playerId: 'ali', cardId: 'KS' },
      // trick 0 complete (clean, ali wins), ali leads hearts next
      { id: 'e3', type: 'CARD_PLAYED', timestamp: 3, playerId: 'sara', cardId: '2C' },
    ]
    // Force lead suit S to complete with 3 plays; recompute state after that trick.
    const state = rebuild(events)
    expect(state.currentPlayerId).toBe('ali')
    const asYouOnHearts = {
      ...state,
      currentPlayerId: 'you',
      currentTrick: { index: 1, leadSuit: 'H' as const, plays: [], activePlayerIdsAtStart: ['you', 'ali', 'sara'] },
    }
    const result = attemptPlayCard(asYouOnHearts, 'you', '4D') // you hold AH, must follow hearts
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issues.some((i) => i.message.includes('follow suit'))).toBe(true)
  })

  it('allows a legal play and returns an appendable event', () => {
    const events = [newGame()]
    const state = rebuild(events)
    const result = attemptPlayCard(state, 'you', '7S')
    expect(result.ok).toBe(true)
    if (result.ok) {
      const next = rebuild([...events, result.event])
      expect(next.currentTrick?.plays.map((p) => p.card.id)).toEqual(['7S'])
    }
  })
})

describe('attemptNeighborRequest', () => {
  it('blocks when the house rule is disabled', () => {
    const state = rebuild([newGame()])
    const result = attemptNeighborRequest(state, 'you', 'ali')
    expect(result.ok).toBe(false)
  })

  it('blocks when no right has been earned, even with the rule enabled', () => {
    const enabledRules = { ...rules, neighborCardRequest: { enabled: true } }
    const state = rebuild([{ ...(newGame() as Extract<GameEvent, { type: 'GAME_STARTED' }>), rules: enabledRules }])
    const result = attemptNeighborRequest(state, 'you', 'ali')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issues.some((i) => i.message.includes('not earned'))).toBe(true)
  })

  it('allows a legal request once a right has been manufactured on the state', () => {
    const enabledRules = { ...rules, neighborCardRequest: { enabled: true } }
    const state = rebuild([{ ...(newGame() as Extract<GameEvent, { type: 'GAME_STARTED' }>), rules: enabledRules }])
    const withRight = {
      ...state,
      players: state.players.map((p) => (p.id === 'you' ? { ...p, owedRequestsFrom: ['ali'] } : p)),
    }
    const result = attemptNeighborRequest(withRight, 'you', 'ali')
    expect(result.ok).toBe(true)
  })
})

describe('undoLastEvent / editEvent / removeEvent', () => {
  it('undo removes the last event and rebuild reflects the prior state', () => {
    const start = newGame()
    const play: GameEvent = { id: 'e1', type: 'CARD_PLAYED', timestamp: 1, playerId: 'you', cardId: '7S' }
    const events = [start, play]
    expect(rebuild(events).currentTrick?.plays).toHaveLength(1)
    const undone = undoLastEvent(events)
    expect(undone).toEqual([start])
    expect(rebuild(undone).currentTrick?.plays).toHaveLength(0)
  })

  it('undo never removes the founding GAME_STARTED event', () => {
    const events = [newGame()]
    expect(undoLastEvent(events)).toEqual(events)
  })

  it('editEvent corrects a mis-recorded card and the whole state rebuilds around it', () => {
    const start = newGame()
    const wrong: GameEvent = { id: 'e1', type: 'CARD_PLAYED', timestamp: 1, playerId: 'you', cardId: '7S' }
    const events = [start, wrong]
    const corrected: GameEvent = { ...wrong, cardId: '9S' }
    const fixed = editEvent(events, 'e1', corrected)
    const state = rebuild(fixed)
    expect(state.currentTrick?.plays[0]?.card.id).toBe('9S')
    expect(state.players.find((p) => p.id === 'you')!.hand.some((c) => c.id === '7S')).toBe(true)
    expect(state.players.find((p) => p.id === 'you')!.hand.some((c) => c.id === '9S')).toBe(false)
  })

  it('removeEvent deletes a bad entry and the state recovers', () => {
    const start = newGame()
    const bad: GameEvent = { id: 'e1', type: 'CARD_PLAYED', timestamp: 1, playerId: 'ali', cardId: 'KS' } // out of turn
    const events = [start, bad]
    expect(rebuild(events).invalidEvents).toHaveLength(1)
    const fixed = removeEvent(events, 'e1')
    expect(rebuild(fixed).invalidEvents).toHaveLength(0)
  })
})
