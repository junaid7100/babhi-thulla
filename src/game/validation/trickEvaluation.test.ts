import { describe, expect, it } from 'vitest'
import { makeCard } from '../cards/card'
import { createDefaultThullaRules } from '../rules/defaultRules'
import { determineTrickWinner, isTrickComplete, resolveTrick } from './trickEvaluation'

describe('determineTrickWinner', () => {
  it('picks the highest card of the led suit', () => {
    const plays = [
      { playerId: 'p1', card: makeCard('7', 'S') },
      { playerId: 'p2', card: makeCard('K', 'S') },
      { playerId: 'p3', card: makeCard('3', 'S') },
    ]
    expect(determineTrickWinner(plays, 'S')).toBe('p2')
  })

  it('ignores off-suit cards even if numerically higher', () => {
    const plays = [
      { playerId: 'p1', card: makeCard('7', 'S') },
      { playerId: 'p2', card: makeCard('A', 'H') },
    ]
    expect(determineTrickWinner(plays, 'S')).toBe('p1')
  })

  it('throws if no card of the led suit was played', () => {
    const plays = [{ playerId: 'p1', card: makeCard('A', 'H') }]
    expect(() => determineTrickWinner(plays, 'S')).toThrow()
  })
})

describe('resolveTrick', () => {
  const rules = createDefaultThullaRules()

  it('is a clean win with no pickup when everyone follows suit', () => {
    const plays = [
      { playerId: 'p1', card: makeCard('7', 'S') },
      { playerId: 'p2', card: makeCard('K', 'S') },
    ]
    const outcome = resolveTrick(plays, 'S', rules, false)
    expect(outcome).toEqual({ winnerPlayerId: 'p2', hadThulla: false, pickedUp: false })
  })

  it('forces the winner to pick up when a Thulla occurred', () => {
    const plays = [
      { playerId: 'p1', card: makeCard('7', 'S') },
      { playerId: 'p2', card: makeCard('3', 'H') },
    ]
    const outcome = resolveTrick(plays, 'S', rules, false)
    expect(outcome).toEqual({ winnerPlayerId: 'p1', hadThulla: true, pickedUp: true })
  })

  it('exempts the first trick from pickup even with a Thulla', () => {
    const plays = [
      { playerId: 'p1', card: makeCard('A', 'S') },
      { playerId: 'p2', card: makeCard('3', 'H') },
    ]
    const outcome = resolveTrick(plays, 'S', rules, true)
    expect(outcome).toEqual({ winnerPlayerId: 'p1', hadThulla: true, pickedUp: false })
  })
})

describe('isTrickComplete', () => {
  it('completes when everyone active has played', () => {
    expect(isTrickComplete(4, 4, false)).toBe(true)
    expect(isTrickComplete(3, 4, false)).toBe(false)
  })

  it('completes immediately on a Thulla, regardless of remaining players', () => {
    expect(isTrickComplete(2, 4, true)).toBe(true)
  })
})
