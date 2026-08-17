import type { Card, Suit } from '../cards/types'
import type { GameRules } from '../rules/types'

/**
 * Pure suit-following legal-move computation. `leadSuit === null` means this
 * player is leading the trick (any card is legal, subject to the opening-lead
 * rule which is enforced separately at the action layer since it only
 * applies to the very first trick of the game).
 */
export function getLegalMoves(hand: Card[], leadSuit: Suit | null): Card[] {
  if (leadSuit === null) return hand
  const followers = hand.filter((c) => c.suit === leadSuit)
  return followers.length > 0 ? followers : hand
}

export function isLegalMove(hand: Card[], leadSuit: Suit | null, cardId: string): boolean {
  return getLegalMoves(hand, leadSuit).some((c) => c.id === cardId)
}

/** True when playing `card` given `leadSuit` counts as a Thulla (off-suit sluff). */
export function isThullaPlay(card: Card, leadSuit: Suit | null, rules: GameRules): boolean {
  if (rules.tulla.mode !== 'THULLA_EVENT') return false
  if (leadSuit === null) return false
  return card.suit !== leadSuit
}
