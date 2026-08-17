import { cardLabel } from '../cards/card'
import { SUIT_NAME } from '../cards/types'
import type { RankedCandidate } from '../strategy/recommend'
import type { GameState } from '../state/types'

function pct(p: number): string {
  return `${Math.round(p * 100)}%`
}

/**
 * Turns a ranked candidate's computed features and simulation results into
 * short, human-readable bullets — every sentence is generated from an
 * actual number on this specific candidate, never a generic template.
 */
export function explainCandidate(state: GameState, ranked: RankedCandidate): string[] {
  const { evaluation, features } = ranked
  const bullets: string[] = []
  const suitName = SUIT_NAME[features.card.suit]
  const label = cardLabel(features.card)
  const leadSuit = state.currentTrick?.leadSuit ?? null

  if (leadSuit !== null) {
    if (evaluation.winCurrentTrickProb >= 0.6) {
      bullets.push(`Strong probability of winning this trick (${pct(evaluation.winCurrentTrickProb)}).`)
    } else if (evaluation.winCurrentTrickProb <= 0.2 && !features.isThullaIfPlayed) {
      bullets.push(`Unlikely to win this trick (${pct(evaluation.winCurrentTrickProb)}) — a low-risk, safe play.`)
    }
  }

  if (features.isThullaIfPlayed) {
    bullets.push(
      `Playing ${label} here is a Thulla (you can't follow ${leadSuit ? SUIT_NAME[leadSuit] : suitName}) — ` +
        `if it ends up winning, you'll have to pick up the whole trick.`,
    )
  }

  if (features.preservesHigherCardInSameSuit) {
    bullets.push(`Preserves your stronger ${suitName} card(s) in hand for later.`)
  }

  if (leadSuit !== null || features.isThullaIfPlayed) {
    if (features.higherCardsOutstandingInSuit === 0) {
      bullets.push(`No higher ${suitName} cards remain unseen — ${label} is the strongest of its suit still in play.`)
    } else {
      bullets.push(`${features.higherCardsOutstandingInSuit} higher ${suitName} card(s) are still unseen among opponents.`)
    }
  }

  if (leadSuit === null && features.thullaRiskIfLeading !== null) {
    if (features.thullaRiskIfLeading >= 0.5) {
      bullets.push(
        `Opponents seem fairly likely to be void in ${suitName} (est. ${pct(features.thullaRiskIfLeading)}) — ` +
          `leading it may force a Thulla, which means picking up the trick if you end up winning it.`,
      )
    } else if (features.thullaRiskIfLeading <= 0.15) {
      bullets.push(`Opponents are likely able to follow ${suitName} (est. ${pct(1 - features.thullaRiskIfLeading)}) — a comparatively safe lead.`)
    }
  }

  if (evaluation.bhabhiProb >= 0.15) {
    bullets.push(`Carries some risk of ending as the Bhabhi (est. ${pct(evaluation.bhabhiProb)} across simulated outcomes).`)
  }

  bullets.push(`On average leaves you with about ${evaluation.meanFinalCardsRemaining.toFixed(1)} cards after this trick, across ${evaluation.simulations} simulated outcomes.`)

  return bullets
}

export interface AdvancedAnalysis {
  mainRisk: string
  mainAdvantage: string
  strategicObjective: string
}

export function explainAdvanced(state: GameState, ranked: RankedCandidate): AdvancedAnalysis {
  const { evaluation, features } = ranked
  const suitName = SUIT_NAME[features.card.suit]

  let mainRisk = 'No significant risk identified for this move.'
  if (features.isThullaIfPlayed && evaluation.bhabhiProb > 0) {
    mainRisk = `If you win with this Thulla, you must pick up the trick (est. ${pct(evaluation.bhabhiProb)} chance this line ends in a Bhabhi finish).`
  } else if (features.higherCardsOutstandingInSuit > 0) {
    mainRisk = `Opponent(s) may still hold a higher ${suitName} card (${features.higherCardsOutstandingInSuit} unseen).`
  } else if (evaluation.thullaProb > 0.3) {
    mainRisk = `Reasonable chance (${pct(evaluation.thullaProb)}) this trick becomes a Thulla.`
  }

  let mainAdvantage = 'Keeps your options open without committing a strong card.'
  if (features.higherCardsOutstandingInSuit === 0 && (state.currentTrick?.leadSuit ?? null) !== null) {
    mainAdvantage = `No stronger ${suitName} card remains unseen.`
  } else if (features.preservesHigherCardInSameSuit) {
    mainAdvantage = `Preserves a stronger ${suitName} card for a later trick.`
  } else if (evaluation.winCurrentTrickProb >= 0.6) {
    mainAdvantage = `High chance of winning this trick cleanly.`
  }

  const objective = features.cardsRemainingSelf <= 3
    ? 'Prioritize shedding your remaining cards quickly to escape before anyone else forces a pickup on you.'
    : 'Balance winning cheap, clean tricks against preserving strong cards and avoiding forced pickups.'

  return { mainRisk, mainAdvantage, strategicObjective: objective }
}
