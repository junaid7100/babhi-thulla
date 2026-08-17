import { cardFromId } from '../cards/card'
import { getLegalMoves } from './legalMoves'
import type { GameState } from '../state/types'

export interface ConsistencyIssue {
  level: 'error' | 'warning'
  message: string
}

/**
 * Pre-flight checks run before a CARD_PLAYED event is created. `error`-level
 * issues must block the action (they represent a definite, provable
 * contradiction with what's already known); `warning`-level issues are
 * surfaced to the user but can be overridden, since they rely on assumptions
 * (like the opening-lead convention) that a real table might not follow.
 */
export function checkPlayCard(state: GameState, playerId: string, cardId: string): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = []

  if (state.status === 'COMPLETED') {
    issues.push({ level: 'error', message: 'This game has already ended.' })
    return issues
  }
  if (state.currentPlayerId !== playerId) {
    const expected = state.players.find((p) => p.id === state.currentPlayerId)
    issues.push({ level: 'error', message: `It's ${expected?.name ?? 'someone else'}'s turn, not this player's.` })
  }
  if (state.playedCardIds.includes(cardId)) {
    issues.push({ level: 'error', message: 'This card was already discarded earlier this game.' })
  }
  const heldElsewhere = state.players.find((p) => p.id !== playerId && p.hand.some((c) => c.id === cardId))
  if (heldElsewhere) {
    issues.push({
      level: 'error',
      message: `This move appears inconsistent with the current game state. ${cardFromId(cardId).rank}${cardFromId(cardId).suit} is already recorded as being in ${heldElsewhere.name}'s hand.`,
    })
  }

  const player = state.players.find((p) => p.id === playerId)
  if (!player) {
    issues.push({ level: 'error', message: 'Unknown player.' })
    return issues
  }
  if (player.escaped) {
    issues.push({ level: 'error', message: `${player.name} has already finished this round and cannot play.` })
  }

  const leadSuit = state.currentTrick?.leadSuit ?? null
  const isFirstTrick = state.currentTrick?.index === 0 && (state.currentTrick?.plays.length ?? 0) === 0

  if (player.isUser) {
    const inHand = player.hand.some((c) => c.id === cardId)
    if (!inHand) {
      issues.push({ level: 'error', message: 'That card is not in your recorded hand.' })
    } else {
      const legal = getLegalMoves(player.hand, leadSuit)
      if (!legal.some((c) => c.id === cardId)) {
        issues.push({
          level: 'error',
          message: `You must follow suit — you still hold a card matching the led suit.`,
        })
      }
    }
  }

  if (isFirstTrick && state.rules.openingLead.required && state.rules.openingLead.card) {
    if (player.isUser && player.hand.some((c) => c.id === state.rules.openingLead.card) && cardId !== state.rules.openingLead.card) {
      issues.push({
        level: 'warning',
        message: `This ruleset expects the first trick to be led with ${state.rules.openingLead.card}, which you hold.`,
      })
    }
  }

  if (leadSuit && !player.isUser) {
    const card = cardFromId(cardId)
    if (card.suit === leadSuit && player.voidSuits.includes(leadSuit)) {
      issues.push({
        level: 'warning',
        message: `${player.name} was previously inferred void in this suit (unless they picked up cards since). Double-check this play.`,
      })
    }
  }

  return issues
}

export function hasBlockingErrors(issues: ConsistencyIssue[]): boolean {
  return issues.some((i) => i.level === 'error')
}
