import type { Card, Rank, Suit } from './types'
import { RANK_VALUE, SUIT_SYMBOL } from './types'

export function makeCard(rank: Rank, suit: Suit): Card {
  return { id: `${rank}${suit}`, suit, rank, value: RANK_VALUE[rank] }
}

export function cardFromId(id: string): Card {
  const suit = id.slice(-1) as Suit
  const rank = id.slice(0, -1) as Rank
  return makeCard(rank, suit)
}

export function cardsEqual(a: Card, b: Card): boolean {
  return a.id === b.id
}

export function cardLabel(card: Card): string {
  return `${card.rank}${SUIT_SYMBOL[card.suit]}`
}

/** Sorts high-to-low within suit, suits grouped in the given order (defaults to S,H,D,C). */
export function sortCards(cards: Card[], suitOrder: Suit[] = ['S', 'H', 'D', 'C']): Card[] {
  const order = new Map(suitOrder.map((s, i) => [s, i]))
  return [...cards].sort((a, b) => {
    const sa = order.get(a.suit) ?? 99
    const sb = order.get(b.suit) ?? 99
    if (sa !== sb) return sa - sb
    return b.value - a.value
  })
}

export function compareByValue(a: Card, b: Card): number {
  return a.value - b.value
}

export function uniqueCardIds(cards: Card[]): boolean {
  return new Set(cards.map((c) => c.id)).size === cards.length
}
