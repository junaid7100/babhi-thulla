import { describe, expect, it } from 'vitest'
import { rebuild } from '../actions/gameEngine'
import { getLegalMoves } from '../validation/legalMoves'
import { buildDemoEvents } from './demoGame'

describe('buildDemoEvents', () => {
  it('replays cleanly with no invalid events', () => {
    const state = rebuild(buildDemoEvents())
    expect(state.invalidEvents).toEqual([])
  })

  it('lands on the user turn, mid-trick, needing to follow diamonds', () => {
    const state = rebuild(buildDemoEvents())
    expect(state.status).toBe('IN_PROGRESS')
    expect(state.currentPlayerId).toBe('you')
    expect(state.currentTrick?.leadSuit).toBe('D')
    const you = state.players.find((p) => p.id === 'you')!
    const legal = getLegalMoves(you.hand, 'D')
    expect(legal.map((c) => c.id).sort()).toEqual(['8D', 'KD'])
  })

  it('demonstrates a Thulla pickup (trick 1, won by you)', () => {
    const state = rebuild(buildDemoEvents())
    const trick1 = state.completedTricks[1]
    expect(trick1.hadThulla).toBe(true)
    expect(trick1.pickedUp).toBe(true)
    expect(trick1.winnerPlayerId).toBe('you')
  })

  it('demonstrates a Thulla pickup won by an opponent (trick 2, won by sara)', () => {
    const state = rebuild(buildDemoEvents())
    const trick2 = state.completedTricks[2]
    expect(trick2.hadThulla).toBe(true)
    expect(trick2.pickedUp).toBe(true)
    expect(trick2.winnerPlayerId).toBe('sara')
  })
})
