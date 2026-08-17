import type { Card } from '../cards/types'
import type { InferenceByPlayer } from '../inference/opponentInference'
import type { GameState } from '../state/types'

/**
 * Produces one concrete, constraint-respecting guess at every active
 * opponent's full hand: their already-known cards plus a random assignment
 * of the genuinely ambiguous unseen cards, weighted by how much room each
 * opponent has left. This is sampled fresh for every simulation rollout —
 * across many samples the *aggregate* behaviour approximates the
 * probability model in `inference/probabilityModel.ts`, without needing to
 * solve the exact combinatorics up front.
 */
export function sampleOpponentHands(state: GameState, inference: InferenceByPlayer, rng: () => number): Record<string, Card[]> {
  const hands: Record<string, Card[]> = {}
  const remainingSlots: Record<string, number> = {}

  const activeOpponentIds = state.players.filter((p) => !p.isUser && !p.escaped).map((p) => p.id)
  for (const id of activeOpponentIds) {
    const inf = inference[id]
    hands[id] = [...inf.knownCards]
    remainingSlots[id] = Math.max(0, inf.cardsRemaining - inf.knownCards.length)
  }

  const ambiguous = new Map<string, Card>()
  for (const id of activeOpponentIds) {
    for (const c of inference[id].possibleCards) ambiguous.set(c.id, c)
  }
  const pool = shuffleInPlace([...ambiguous.values()], rng)

  for (const card of pool) {
    const eligible = activeOpponentIds.filter((id) => remainingSlots[id] > 0 && inference[id].possibleCards.some((c) => c.id === card.id))
    if (eligible.length === 0) continue
    const chosen = weightedPick(
      eligible,
      eligible.map((id) => remainingSlots[id]),
      rng,
    )
    hands[chosen].push(card)
    remainingSlots[chosen] -= 1
  }

  return hands
}

function shuffleInPlace<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

function weightedPick<T>(items: T[], weights: number[], rng: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return items[Math.floor(rng() * items.length)]
  let r = rng() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}
