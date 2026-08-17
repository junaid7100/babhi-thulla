import { describe, expect, it } from 'vitest'
import { makeCard } from '../cards/card'
import { createRng } from '../cards/deck'
import { chooseBotMove } from './botPolicy'

describe('chooseBotMove', () => {
  it('leads the lowest card from its longest suit', () => {
    const hand = [makeCard('A', 'S'), makeCard('9', 'S'), makeCard('K', 'H')]
    const move = chooseBotMove(hand, null, [], 1, createRng(1))
    expect(move.id).toBe('9S') // spades is the longest suit (2 cards), lowest of those is 9S
  })

  it('sluffs its lowest card overall when void in the led suit', () => {
    const hand = [makeCard('A', 'H'), makeCard('3', 'C')]
    const move = chooseBotMove(hand, 'S', [], 1, createRng(1))
    expect(move.id).toBe('3C')
  })

  it('wins cheaply when it can and is last to act', () => {
    const hand = [makeCard('K', 'S'), makeCard('9', 'S')]
    const move = chooseBotMove(hand, 'S', [makeCard('7', 'S')], 0, createRng(1))
    expect(move.id).toBe('9S') // cheapest card that still beats the 7S already on the table
  })

  it('ducks with the lowest legal card rather than burn an Ace when others remain to act', () => {
    const hand = [makeCard('A', 'S'), makeCard('2', 'S')]
    const move = chooseBotMove(hand, 'S', [makeCard('7', 'S')], 2, createRng(1))
    expect(move.id).toBe('2S') // 2S can't win (below 7S) so it's a legal duck; avoids spending the Ace
  })

  it('plays its lowest legal card when it cannot beat the current best', () => {
    const hand = [makeCard('4', 'S'), makeCard('2', 'S')]
    const move = chooseBotMove(hand, 'S', [makeCard('K', 'S')], 1, createRng(1))
    expect(move.id).toBe('2S')
  })
})
