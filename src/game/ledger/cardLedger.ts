import { createDeck } from '../cards/deck'
import type { Card } from '../cards/types'
import type { InferenceByPlayer } from '../inference/opponentInference'
import type { GameState } from '../state/types'

export type CardLedgerStatus =
  | 'IN_USER_HAND'
  | 'IN_OPPONENT_HAND_KNOWN'
  | 'POSSIBLY_IN_OPPONENT_HAND'
  | 'PLAYED'
  | 'DISCARDED'
  | 'UNKNOWN'

export interface CardLedgerEntry {
  card: Card
  status: CardLedgerStatus
  ownerPlayerId?: string
  possibleOwnerPlayerIds: string[]
}

export interface CardLedger {
  entries: Map<string, CardLedgerEntry>
}

/**
 * Builds the global ledger: every card in the deck has exactly one status.
 * `PLAYED` covers cards permanently removed from the game — in this
 * ruleset there's no separate lingering "discard pile" state, so
 * `DISCARDED` is reserved but currently unused (see RULES.md).
 */
export function buildCardLedger(state: GameState, inference: InferenceByPlayer): CardLedger {
  const entries = new Map<string, CardLedgerEntry>()
  const playedSet = new Set(state.playedCardIds)
  const user = state.players.find((p) => p.isUser)
  const userHandIds = new Set((user?.hand ?? []).map((c) => c.id))

  const knownOwner = new Map<string, string>()
  const possibleOwners = new Map<string, string[]>()
  for (const inf of Object.values(inference)) {
    for (const c of inf.knownCards) knownOwner.set(c.id, inf.playerId)
    for (const c of inf.possibleCards) {
      const arr = possibleOwners.get(c.id) ?? []
      arr.push(inf.playerId)
      possibleOwners.set(c.id, arr)
    }
  }

  for (const card of createDeck()) {
    if (playedSet.has(card.id)) {
      entries.set(card.id, { card, status: 'PLAYED', possibleOwnerPlayerIds: [] })
      continue
    }
    if (userHandIds.has(card.id)) {
      entries.set(card.id, { card, status: 'IN_USER_HAND', ownerPlayerId: user?.id, possibleOwnerPlayerIds: [] })
      continue
    }
    if (knownOwner.has(card.id)) {
      entries.set(card.id, {
        card,
        status: 'IN_OPPONENT_HAND_KNOWN',
        ownerPlayerId: knownOwner.get(card.id),
        possibleOwnerPlayerIds: [],
      })
      continue
    }
    const possible = possibleOwners.get(card.id)
    if (possible && possible.length > 0) {
      entries.set(card.id, { card, status: 'POSSIBLY_IN_OPPONENT_HAND', possibleOwnerPlayerIds: possible })
      continue
    }
    entries.set(card.id, { card, status: 'UNKNOWN', possibleOwnerPlayerIds: [] })
  }

  return { entries }
}

export function whoCouldHaveThisCard(ledger: CardLedger, cardId: string): string[] {
  const entry = ledger.entries.get(cardId)
  if (!entry) return []
  if (entry.status === 'IN_OPPONENT_HAND_KNOWN' && entry.ownerPlayerId) return [entry.ownerPlayerId]
  if (entry.status === 'IN_USER_HAND' && entry.ownerPlayerId) return [entry.ownerPlayerId]
  if (entry.status === 'POSSIBLY_IN_OPPONENT_HAND') return entry.possibleOwnerPlayerIds
  return []
}

/** Could `playerId` legally be the one holding (and now playing) this card, given everything currently known? */
export function isSelectableForPlayer(ledger: CardLedger, playerId: string, cardId: string): boolean {
  const entry = ledger.entries.get(cardId)
  if (!entry) return false
  switch (entry.status) {
    case 'PLAYED':
    case 'DISCARDED':
    case 'IN_USER_HAND':
      return false
    case 'IN_OPPONENT_HAND_KNOWN':
      return entry.ownerPlayerId === playerId
    case 'POSSIBLY_IN_OPPONENT_HAND':
      return entry.possibleOwnerPlayerIds.includes(playerId)
    case 'UNKNOWN':
      return true
  }
}

export function isCardAvailable(ledger: CardLedger, cardId: string): boolean {
  return ledger.entries.get(cardId)?.status !== 'PLAYED'
}

export function hasCardBeenPlayed(ledger: CardLedger, cardId: string): boolean {
  return ledger.entries.get(cardId)?.status === 'PLAYED'
}

export function cardsRemainingBySuit(ledger: CardLedger): Record<string, number> {
  const counts: Record<string, number> = { S: 0, H: 0, D: 0, C: 0 }
  for (const entry of ledger.entries.values()) {
    if (entry.status !== 'PLAYED') counts[entry.card.suit] = (counts[entry.card.suit] ?? 0) + 1
  }
  return counts
}

export function highCardsRemaining(ledger: CardLedger): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const entry of ledger.entries.values()) {
    if (entry.status === 'PLAYED') continue
    if (['A', 'K', 'Q', 'J'].includes(entry.card.rank)) {
      counts[entry.card.rank] = (counts[entry.card.rank] ?? 0) + 1
    }
  }
  return counts
}
