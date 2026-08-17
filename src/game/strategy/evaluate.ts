import type { Card } from '../cards/types'
import type { InferenceByPlayer } from '../inference/opponentInference'
import { isThullaPlay } from '../validation/legalMoves'
import type { GameState } from '../state/types'

export interface StrategyFeatures {
  card: Card
  isThullaIfPlayed: boolean
  /** Unseen or opponent-held cards of this card's suit that outrank it. */
  higherCardsOutstandingInSuit: number
  /** Does the user hold an even higher card of this same suit they'd be keeping by playing this one? */
  preservesHigherCardInSameSuit: boolean
  /** If leading this suit, the average probability an active opponent is void in it (Thulla risk). */
  thullaRiskIfLeading: number | null
  cardsRemainingSelf: number
}

/** Computes the raw, explainable signals behind a candidate move — the inputs the explanation generator turns into prose. */
export function computeStrategyFeatures(state: GameState, inference: InferenceByPlayer, playerId: string, card: Card): StrategyFeatures {
  const player = state.players.find((p) => p.id === playerId)!
  const leadSuit = state.currentTrick?.leadSuit ?? null
  const isThullaIfPlayed = isThullaPlay(card, leadSuit, state.rules)

  // Count distinct cards, since the same unresolved card can appear in more than one opponent's possible set.
  const seen = new Set<string>()
  let higherCardsOutstandingInSuit = 0
  for (const inf of Object.values(inference)) {
    for (const c of [...inf.knownCards, ...inf.possibleCards]) {
      if (c.suit === card.suit && c.value > card.value && !seen.has(c.id)) {
        seen.add(c.id)
        higherCardsOutstandingInSuit++
      }
    }
  }

  const preservesHigherCardInSameSuit = player.hand.some((c) => c.id !== card.id && c.suit === card.suit && c.value > card.value)

  let thullaRiskIfLeading: number | null = null
  if (leadSuit === null) {
    const activeOpponents = Object.values(inference).filter((inf) => inf.cardsRemaining > 0)
    if (activeOpponents.length > 0) {
      const voidProbs = activeOpponents.map((inf) => {
        const suitCards = [...inf.knownCards, ...inf.possibleCards].filter((c) => c.suit === card.suit)
        if (suitCards.some((c) => inf.knownCards.some((k) => k.id === c.id))) return 0
        const probHasAtLeastOne = 1 - suitCards.reduce((acc, c) => acc * (1 - (inf.probabilities[c.id] ?? 0)), 1)
        return 1 - probHasAtLeastOne
      })
      thullaRiskIfLeading = voidProbs.reduce((a, b) => a + b, 0) / voidProbs.length
    }
  }

  return {
    card,
    isThullaIfPlayed,
    higherCardsOutstandingInSuit,
    preservesHigherCardInSameSuit,
    thullaRiskIfLeading,
    cardsRemainingSelf: player.hand.length,
  }
}
