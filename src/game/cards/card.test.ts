import { describe, expect, it } from 'vitest'
import { cardFromId, cardLabel, cardsEqual, compareByValue, makeCard, sortCards, uniqueCardIds } from './card'

describe('makeCard / cardFromId', () => {
  it('creates a card with correct id, suit, rank, value', () => {
    const card = makeCard('A', 'S')
    expect(card).toEqual({ id: 'AS', suit: 'S', rank: 'A', value: 14 })
  })

  it('round-trips through an id', () => {
    const card = makeCard('10', 'H')
    expect(cardFromId(card.id)).toEqual(card)
  })

  it('handles two-character ranks like 10', () => {
    const card = cardFromId('10D')
    expect(card.rank).toBe('10')
    expect(card.suit).toBe('D')
  })
})

describe('cardsEqual', () => {
  it('treats same-id cards as equal', () => {
    expect(cardsEqual(makeCard('K', 'C'), makeCard('K', 'C'))).toBe(true)
  })

  it('treats different cards as unequal', () => {
    expect(cardsEqual(makeCard('K', 'C'), makeCard('Q', 'C'))).toBe(false)
  })
})

describe('cardLabel', () => {
  it('renders rank + suit symbol', () => {
    expect(cardLabel(makeCard('A', 'S'))).toBe('A♠')
    expect(cardLabel(makeCard('10', 'H'))).toBe('10♥')
  })
})

describe('sortCards', () => {
  it('sorts by suit order then descending rank', () => {
    const cards = [makeCard('2', 'H'), makeCard('A', 'S'), makeCard('K', 'S'), makeCard('3', 'D')]
    const sorted = sortCards(cards, ['S', 'H', 'D', 'C'])
    expect(sorted.map((c) => c.id)).toEqual(['AS', 'KS', '2H', '3D'])
  })
})

describe('compareByValue', () => {
  it('orders ascending by value', () => {
    const cards = [makeCard('A', 'S'), makeCard('2', 'S'), makeCard('K', 'S')]
    expect([...cards].sort(compareByValue).map((c) => c.rank)).toEqual(['2', 'K', 'A'])
  })
})

describe('uniqueCardIds', () => {
  it('detects duplicates', () => {
    expect(uniqueCardIds([makeCard('A', 'S'), makeCard('A', 'S')])).toBe(false)
    expect(uniqueCardIds([makeCard('A', 'S'), makeCard('K', 'S')])).toBe(true)
  })
})
