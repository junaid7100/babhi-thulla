import type { Card, Suit } from '../cards/types'
import type { GameRules } from '../rules/types'
import type { GameState } from '../state/types'
import { isThullaPlay } from '../validation/legalMoves'
import { isTrickComplete, resolveTrick } from '../validation/trickEvaluation'

export interface SimPlayer {
  id: string
  hand: Card[]
  escaped: boolean
}

export interface SimTrick {
  index: number
  leadSuit: Suit | null
  plays: { playerId: string; card: Card }[]
  activePlayerIdsAtStart: string[]
}

export interface SimWorld {
  players: SimPlayer[]
  seatOrder: string[]
  currentPlayerId: string | null
  trick: SimTrick | null
  finishOrder: string[]
  completed: boolean
  /** Cumulative cards each player has picked up via Thulla pickups during this rollout. */
  pickedUpCount: Record<string, number>
}

/** Builds the starting simulation world for one sampled deal, from the current live GameState. */
export function buildSimWorld(state: GameState, sampledOpponentHands: Record<string, Card[]>): SimWorld {
  const players: SimPlayer[] = state.players
    .filter((p) => !p.escaped)
    .map((p) => ({
      id: p.id,
      hand: p.isUser ? [...p.hand] : [...(sampledOpponentHands[p.id] ?? p.hand)],
      escaped: false,
    }))
  const seatOrder = state.players.filter((p) => !p.escaped).map((p) => p.id)
  const pickedUpCount: Record<string, number> = {}
  for (const p of players) pickedUpCount[p.id] = 0

  return {
    players,
    seatOrder,
    currentPlayerId: state.currentPlayerId,
    trick: state.currentTrick
      ? {
          index: state.currentTrick.index,
          leadSuit: state.currentTrick.leadSuit,
          plays: state.currentTrick.plays.map((p) => ({ playerId: p.playerId, card: p.card })),
          activePlayerIdsAtStart: state.currentTrick.activePlayerIdsAtStart,
        }
      : null,
    finishOrder: [...state.finishOrder],
    completed: state.status === 'COMPLETED',
    pickedUpCount,
  }
}

function nextInCircularOrder(order: string[], fromId: string, exclude: Set<string>): string | null {
  const idx = order.indexOf(fromId)
  if (idx === -1) return null
  for (let k = 1; k <= order.length; k++) {
    const id = order[(idx + k) % order.length]
    if (!exclude.has(id)) return id
  }
  return null
}

export interface SimStepResult {
  world: SimWorld
  resolvedTrick?: { winnerPlayerId: string; pickedUp: boolean; hadThulla: boolean }
}

/** Applies one legal card play to a SimWorld, mirroring the real reducer's trick/pickup/escape rules. */
export function simStep(world: SimWorld, rules: GameRules, playerId: string, cardId: string): SimStepResult {
  if (!world.trick) return { world }
  const players = world.players.map((p) => ({ ...p, hand: [...p.hand] }))
  const player = players.find((p) => p.id === playerId)!
  const idx = player.hand.findIndex((c) => c.id === cardId)
  const card = player.hand[idx]
  player.hand.splice(idx, 1)

  const trick: SimTrick = { ...world.trick, plays: [...world.trick.plays] }
  const isFirst = trick.plays.length === 0
  const effectiveLeadSuit = isFirst ? null : trick.leadSuit
  const isThulla = isThullaPlay(card, effectiveLeadSuit, rules)
  if (isFirst) trick.leadSuit = card.suit
  trick.plays.push({ playerId, card })

  const finishOrder = [...world.finishOrder]
  const pickedUpCount = { ...world.pickedUpCount }
  if (player.hand.length === 0) {
    player.escaped = true
    finishOrder.push(player.id)
  }

  const active = () => players.filter((p) => !p.escaped)

  if (active().length <= rules.roundEndsWhenPlayersRemaining) {
    for (const p of active()) if (!finishOrder.includes(p.id)) finishOrder.push(p.id)
    return { world: { ...world, players, trick: null, currentPlayerId: null, finishOrder, completed: true, pickedUpCount } }
  }

  const trickDone = isTrickComplete(trick.plays.length, trick.activePlayerIdsAtStart.length, isThulla)
  if (!trickDone) {
    const alreadyPlayed = new Set(trick.plays.map((p) => p.playerId))
    const nextPlayerId = nextInCircularOrder(trick.activePlayerIdsAtStart, playerId, alreadyPlayed)
    return { world: { ...world, players, trick, currentPlayerId: nextPlayerId, finishOrder, pickedUpCount } }
  }

  const outcome = resolveTrick(trick.plays, trick.leadSuit!, rules, trick.index === 0)
  const winner = players.find((p) => p.id === outcome.winnerPlayerId)!
  if (outcome.pickedUp) {
    winner.hand.push(...trick.plays.map((p) => p.card))
    pickedUpCount[winner.id] = (pickedUpCount[winner.id] ?? 0) + trick.plays.length
  }
  if (winner.hand.length === 0 && !winner.escaped) {
    winner.escaped = true
    finishOrder.push(winner.id)
  }

  const resolvedTrick = { winnerPlayerId: outcome.winnerPlayerId, pickedUp: outcome.pickedUp, hadThulla: outcome.hadThulla }

  if (active().length <= rules.roundEndsWhenPlayersRemaining) {
    for (const p of active()) if (!finishOrder.includes(p.id)) finishOrder.push(p.id)
    return { world: { ...world, players, trick: null, currentPlayerId: null, finishOrder, completed: true, pickedUpCount }, resolvedTrick }
  }

  const order = world.seatOrder
  const escapedNow = new Set(players.filter((p) => p.escaped).map((p) => p.id))
  const leaderId = winner.escaped ? nextInCircularOrder(order, winner.id, escapedNow) : winner.id
  const nextTrick: SimTrick = {
    index: trick.index + 1,
    leadSuit: null,
    plays: [],
    activePlayerIdsAtStart: order.filter((id) => !escapedNow.has(id)),
  }

  return { world: { ...world, players, trick: nextTrick, currentPlayerId: leaderId, finishOrder, pickedUpCount }, resolvedTrick }
}
