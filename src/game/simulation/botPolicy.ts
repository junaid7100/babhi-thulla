import type { Card, Suit } from '../cards/types'
import { getLegalMoves } from '../validation/legalMoves'

/**
 * A simple, explainable heuristic policy used to play out every *other*
 * decision point during a Monte Carlo rollout (opponents, and the root
 * player's own future turns later in the round). It is not meant to be a
 * perfect player — just plausible enough that rollout outcomes are a useful
 * signal for comparing the root player's *current* candidate moves.
 *
 * Rules of thumb:
 *  - Leading: play the lowest card from your longest suit (keeps short
 *    suits, which are more likely to force opponents into a Thulla, intact).
 *  - Forced to sluff (void in the led suit): give up your lowest card
 *    overall — cheapest to lose.
 *  - Following, able to win: only take the trick cheaply (not with an Ace)
 *    unless you're the last to act this trick (no one left to punish you
 *    with a later Thulla pickup) — otherwise duck with your lowest card of
 *    the led suit.
 */
export function chooseBotMove(
  hand: Card[],
  leadSuit: Suit | null,
  ledSuitCardsPlayedSoFar: Card[],
  actorsRemainingAfterMe: number,
  rng: () => number,
): Card {
  const legal = getLegalMoves(hand, leadSuit)
  if (legal.length === 0) throw new Error('chooseBotMove called with no legal moves.')

  if (leadSuit === null) {
    const bySuit = new Map<Suit, Card[]>()
    for (const c of hand) {
      const arr = bySuit.get(c.suit) ?? []
      arr.push(c)
      bySuit.set(c.suit, arr)
    }
    const groups = [...bySuit.values()]
    const longest = groups.reduce((best, cur) => (cur.length > best.length ? cur : best), groups[0] ?? hand)
    return lowest(longest)
  }

  const isVoidInLedSuit = !hand.some((c) => c.suit === leadSuit)
  if (isVoidInLedSuit) {
    return lowest(hand)
  }

  const currentBest = ledSuitCardsPlayedSoFar.reduce((max, c) => Math.max(max, c.value), -Infinity)
  const winners = legal.filter((c) => c.value > currentBest).sort((a, b) => a.value - b.value)

  if (winners.length === 0) return lowest(legal)

  const cheapestWinner = winners[0]
  const lastToAct = actorsRemainingAfterMe === 0
  if (lastToAct || cheapestWinner.value <= 12) {
    return cheapestWinner
  }
  void rng
  return lowest(legal)
}

function lowest(cards: Card[]): Card {
  return cards.reduce((min, c) => (c.value < min.value ? c : min), cards[0])
}
