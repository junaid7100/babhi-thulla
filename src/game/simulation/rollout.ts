import type { Card } from '../cards/types'
import type { GameRules } from '../rules/types'
import { chooseBotMove } from './botPolicy'
import { simStep, type SimWorld } from './simWorld'

export interface RolloutOutcome {
  rootFinalCardsRemaining: number
  rootWasBhabhi: boolean
  /** 1-based finishing position (1 = escaped first); null if the horizon was hit before the round ended. */
  rootEscapeRank: number | null
  rootCardsPickedUpTotal: number
  /** Did the root player's forced move win the trick it was played into? */
  wonCurrentTrick: boolean
  currentTrickHadThulla: boolean
}

const MAX_STEPS = 400

/** Plays a forced move for the root player, then plays out the rest of the round with the heuristic bot policy. */
export function runRollout(world: SimWorld, rules: GameRules, rootPlayerId: string, forcedCard: Card, rng: () => number): RolloutOutcome {
  let current = world
  let wonCurrentTrick = false
  let currentTrickHadThulla = false

  const first = simStep(current, rules, rootPlayerId, forcedCard.id)
  current = first.world
  if (first.resolvedTrick) {
    wonCurrentTrick = first.resolvedTrick.winnerPlayerId === rootPlayerId
    currentTrickHadThulla = first.resolvedTrick.hadThulla
  }

  let steps = 0
  while (!current.completed && current.currentPlayerId && steps < MAX_STEPS) {
    steps++
    const playerId = current.currentPlayerId
    const player = current.players.find((p) => p.id === playerId)!
    const leadSuit = current.trick?.leadSuit ?? null
    const ledSuitCardsSoFar = (current.trick?.plays ?? []).filter((p) => p.card.suit === leadSuit).map((p) => p.card)
    const activeCount = current.trick?.activePlayerIdsAtStart.length ?? current.players.filter((p) => !p.escaped).length
    const playedSoFar = current.trick?.plays.length ?? 0
    const actorsRemainingAfterMe = Math.max(0, activeCount - playedSoFar - 1)

    const move = chooseBotMove(player.hand, leadSuit, ledSuitCardsSoFar, actorsRemainingAfterMe, rng)
    current = simStep(current, rules, playerId, move.id).world
  }

  const root = current.players.find((p) => p.id === rootPlayerId)
  const rootFinalCardsRemaining = root ? root.hand.length : 0
  const rank = current.finishOrder.indexOf(rootPlayerId)
  const rootEscapeRank = current.completed && rank !== -1 ? rank + 1 : null
  const rootWasBhabhi = current.completed && rank === current.finishOrder.length - 1 && current.finishOrder.length > 1

  return {
    rootFinalCardsRemaining,
    rootWasBhabhi,
    rootEscapeRank,
    rootCardsPickedUpTotal: current.pickedUpCount[rootPlayerId] ?? 0,
    wonCurrentTrick,
    currentTrickHadThulla,
  }
}
