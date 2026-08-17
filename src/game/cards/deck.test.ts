import { describe, expect, it } from 'vitest'
import { createDeck, createRng, dealCards, shuffle } from './deck'
import { uniqueCardIds } from './card'

describe('createDeck', () => {
  it('creates 52 unique cards', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(52)
    expect(uniqueCardIds(deck)).toBe(true)
  })
})

describe('createRng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    const seqA = Array.from({ length: 5 }, () => a())
    const seqB = Array.from({ length: 5 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('produces values in [0, 1)', () => {
    const rng = createRng(7)
    for (let i = 0; i < 20; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('shuffle', () => {
  it('preserves all elements', () => {
    const deck = createDeck()
    const shuffled = shuffle(deck, createRng(1))
    expect(shuffled).toHaveLength(52)
    expect(new Set(shuffled.map((c) => c.id))).toEqual(new Set(deck.map((c) => c.id)))
  })

  it('is deterministic for a seeded rng', () => {
    const deck = createDeck()
    const a = shuffle(deck, createRng(99))
    const b = shuffle(deck, createRng(99))
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id))
  })
})

describe('dealCards', () => {
  it('deals evenly when divisible', () => {
    const deck = createDeck()
    const hands = dealCards(deck, 4)
    expect(hands.map((h) => h.length)).toEqual([13, 13, 13, 13])
  })

  it('gives extras to earlier seats when not divisible', () => {
    const deck = createDeck()
    const hands = dealCards(deck, 5)
    // 52 / 5 = 10 r 2 -> seats 0 and 1 get 11, rest get 10
    expect(hands.map((h) => h.length)).toEqual([11, 11, 10, 10, 10])
  })
})
