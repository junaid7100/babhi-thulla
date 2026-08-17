import { createDeck } from '../cards/deck'
import type { Card } from '../cards/types'
import type { GameState } from '../state/types'
import { estimateProbabilities } from './probabilityModel'

export interface OpponentInference {
  playerId: string
  cardsRemaining: number
  /** Cards proven to be in this player's hand (observed via pickup, or forced by elimination). */
  knownCards: Card[]
  /** Cards proven NOT to be in this player's hand. */
  impossibleCards: Card[]
  /** Cards that could still be in this player's hand (unseen, not eliminated, not yet forced known). */
  possibleCards: Card[]
  /** P(this player holds this card), for every card in `possibleCards`. */
  probabilities: Record<string, number>
}

export type InferenceByPlayer = Record<string, OpponentInference>

/**
 * Computes, for every still-active opponent, what's known/impossible/possible
 * about their hand, plus a probability estimate for the genuinely
 * undetermined cards. Recomputed fresh from `GameState` after every trick —
 * there is no separate mutable inference state to keep in sync.
 */
export function computeOpponentInference(state: GameState): InferenceByPlayer {
  const allCards = createDeck()
  const playedSet = new Set(state.playedCardIds)
  const user = state.players.find((p) => p.isUser)
  const userHandSet = new Set((user?.hand ?? []).map((c) => c.id))

  const opponents = state.players.filter((p) => !p.isUser)

  // Cards directly observed (via pickup) as belonging to a specific opponent.
  const observedOwner = new Map<string, string>()
  for (const p of opponents) {
    for (const c of p.hand) observedOwner.set(c.id, p.id)
  }

  const unseen = allCards.filter((c) => !playedSet.has(c.id) && !userHandSet.has(c.id) && !observedOwner.has(c.id))

  const active = opponents.filter((p) => !p.escaped)

  // possibleSet: unseen cards not ruled out by a proven suit-void for that player.
  const possibleSet = new Map<string, Set<string>>()
  for (const p of active) {
    const set = new Set<string>()
    for (const c of unseen) {
      if (!p.voidSuits.includes(c.suit)) set.add(c.id)
    }
    possibleSet.set(p.id, set)
  }

  const resolvedExtra = new Map<string, Card[]>(active.map((p) => [p.id, []]))
  const cardById = new Map(allCards.map((c) => [c.id, c]))

  const unresolvedSlots = (playerId: string): number => {
    const p = active.find((pl) => pl.id === playerId)!
    return p.cardsRemaining - p.hand.length - (resolvedExtra.get(playerId)?.length ?? 0)
  }

  // Fixed-point elimination: if a player's candidate pool size equals their
  // unresolved slot count, every candidate must be theirs.
  let changed = true
  let guard = 0
  while (changed && guard < active.length + 1) {
    changed = false
    guard++
    for (const p of active) {
      const slots = unresolvedSlots(p.id)
      const candidates = possibleSet.get(p.id)!
      if (slots > 0 && candidates.size === slots) {
        const forced = [...candidates]
        resolvedExtra.get(p.id)!.push(...forced.map((id) => cardById.get(id)!))
        for (const other of active) {
          if (other.id === p.id) continue
          const otherSet = possibleSet.get(other.id)!
          for (const id of forced) otherSet.delete(id)
        }
        candidates.clear()
        changed = true
      }
    }
  }

  // What remains in each possibleSet after elimination is genuinely ambiguous.
  // A player with no unresolved slots left has no room for any more unknown
  // cards, regardless of what's still sitting in their raw candidate set.
  const possibleByPlayer: Record<string, string[]> = {}
  const slotsByPlayer: Record<string, number> = {}
  for (const p of active) {
    const slots = unresolvedSlots(p.id)
    possibleByPlayer[p.id] = slots > 0 ? [...possibleSet.get(p.id)!] : []
    slotsByPlayer[p.id] = slots
  }
  const probabilities = estimateProbabilities(possibleByPlayer, slotsByPlayer)

  const result: InferenceByPlayer = {}
  for (const p of opponents) {
    if (p.escaped) {
      result[p.id] = { playerId: p.id, cardsRemaining: 0, knownCards: [], impossibleCards: allCards, possibleCards: [], probabilities: {} }
      continue
    }
    const known = [...p.hand, ...(resolvedExtra.get(p.id) ?? [])]
    const knownIds = new Set(known.map((c) => c.id))
    const possible = (possibleByPlayer[p.id] ?? []).map((id) => cardById.get(id)!)
    const possibleIds = new Set(possible.map((c) => c.id))
    const impossible = allCards.filter((c) => !knownIds.has(c.id) && !possibleIds.has(c.id))
    const probs: Record<string, number> = {}
    for (const c of possible) probs[c.id] = probabilities[c.id]?.[p.id] ?? 0

    result[p.id] = {
      playerId: p.id,
      cardsRemaining: p.cardsRemaining,
      knownCards: known,
      impossibleCards: impossible,
      possibleCards: possible,
      probabilities: probs,
    }
  }

  return result
}
