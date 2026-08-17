import { describe, expect, it } from 'vitest'
import { makeCard } from '../cards/card'
import { createDefaultThullaRules } from '../rules/defaultRules'
import { getLegalMoves, isLegalMove, isThullaPlay } from './legalMoves'

describe('getLegalMoves', () => {
  it('allows any card when leading', () => {
    const hand = [makeCard('A', 'S'), makeCard('7', 'H')]
    expect(getLegalMoves(hand, null)).toEqual(hand)
  })

  it('restricts to the led suit when holding it', () => {
    const hand = [makeCard('A', 'S'), makeCard('7', 'H'), makeCard('3', 'H')]
    const legal = getLegalMoves(hand, 'H')
    expect(legal.map((c) => c.id)).toEqual(['7H', '3H'])
  })

  it('allows any card when void in the led suit', () => {
    const hand = [makeCard('A', 'S'), makeCard('7', 'C')]
    expect(getLegalMoves(hand, 'H')).toEqual(hand)
  })
})

describe('isLegalMove', () => {
  it('matches getLegalMoves', () => {
    const hand = [makeCard('A', 'S'), makeCard('7', 'H')]
    expect(isLegalMove(hand, 'H', '7H')).toBe(true)
    expect(isLegalMove(hand, 'H', 'AS')).toBe(false)
  })
})

describe('isThullaPlay', () => {
  const rules = createDefaultThullaRules()

  it('is false when leading', () => {
    expect(isThullaPlay(makeCard('A', 'S'), null, rules)).toBe(false)
  })

  it('is false when following suit', () => {
    expect(isThullaPlay(makeCard('7', 'H'), 'H', rules)).toBe(false)
  })

  it('is true when sluffing off-suit', () => {
    expect(isThullaPlay(makeCard('7', 'C'), 'H', rules)).toBe(true)
  })

  it('is always false in TRUMP_SUIT mode', () => {
    const trumpRules = { ...rules, tulla: { mode: 'TRUMP_SUIT' as const, determination: 'FIXED' as const, fixedSuit: 'S' as const, canChange: false } }
    expect(isThullaPlay(makeCard('7', 'C'), 'H', trumpRules)).toBe(false)
  })
})
