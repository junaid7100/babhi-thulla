import type { Card, Suit } from '../cards/types'
import type { GameRules } from '../rules/types'

export interface TrickPlayInput {
  playerId: string
  card: Card
}

export interface TrickOutcome {
  winnerPlayerId: string
  hadThulla: boolean
  pickedUp: boolean
}

/** Highest card of the led suit wins. Off-suit (Thulla) cards can never win. */
export function determineTrickWinner(plays: TrickPlayInput[], leadSuit: Suit): string {
  let best: TrickPlayInput | null = null
  for (const play of plays) {
    if (play.card.suit !== leadSuit) continue
    if (!best || play.card.value > best.card.value) best = play
  }
  if (!best) {
    throw new Error('No card of the led suit was played — a trick must contain at least the lead.')
  }
  return best.playerId
}

/**
 * Resolves a trick once it's complete (either everyone active played, or a
 * Thulla cut it short). `isFirstTrick` controls the pickup exemption.
 */
export function resolveTrick(plays: TrickPlayInput[], leadSuit: Suit, rules: GameRules, isFirstTrick: boolean): TrickOutcome {
  const winnerPlayerId = determineTrickWinner(plays, leadSuit)
  const hadThulla = plays.some((p) => p.card.suit !== leadSuit)

  let pickedUp = false
  if (rules.tulla.mode === 'THULLA_EVENT' && hadThulla && rules.tulla.winnerPicksUpOnThulla) {
    pickedUp = !(isFirstTrick && rules.tulla.firstTrickPickupExempt)
  }

  return { winnerPlayerId, hadThulla, pickedUp }
}

/** A trick ends the instant a Thulla is played, or once every active player has played once. */
export function isTrickComplete(playsSoFar: number, activePlayerCount: number, justPlayedWasThulla: boolean): boolean {
  return justPlayedWasThulla || playsSoFar >= activePlayerCount
}
