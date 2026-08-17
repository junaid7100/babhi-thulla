import { cardFromId } from '../cards/card'
import type { Suit } from '../cards/types'
import { isThullaPlay } from '../validation/legalMoves'
import { isTrickComplete, resolveTrick } from '../validation/trickEvaluation'
import { startingHandSize } from './dealing'
import type { CompletedTrick, CurrentTrick, GameEvent, GameState, InvalidEventRecord, PlayerState } from './types'

function seatOrderIds(players: PlayerState[]): string[] {
  return [...players].sort((a, b) => a.seat - b.seat).map((p) => p.id)
}

/** Next id after `fromId` in a circular `order`, skipping ids in `exclude`. */
function nextInCircularOrder(order: string[], fromId: string, exclude: Set<string>): string | null {
  const idx = order.indexOf(fromId)
  if (idx === -1) return null
  for (let k = 1; k <= order.length; k++) {
    const id = order[(idx + k) % order.length]
    if (!exclude.has(id)) return id
  }
  return null
}

/** True if two seats (0-indexed, fixed at deal) sit directly next to each other around the table. */
function areNeighboringSeats(seatA: number, seatB: number, numPlayers: number): boolean {
  const diff = Math.abs(seatA - seatB)
  return diff === 1 || diff === numPlayers - 1
}

const EMPTY_STATE_ERROR = 'GameState requested before a GAME_STARTED event was applied.'

/**
 * Rebuilds the full, authoritative GameState by replaying an event log from
 * scratch. This is the *only* place game rules get applied to produce
 * derived state — undo is "drop the last event and replay"; editing history
 * is "splice the log and replay". Never patch a GameState directly.
 */
export function buildState(events: GameEvent[]): GameState {
  let state: GameState | null = null
  const invalidEvents: InvalidEventRecord[] = []

  for (const event of events) {
    if (event.type === 'GAME_STARTED') {
      state = applyGameStarted(event)
      continue
    }

    if (!state) {
      invalidEvents.push({ eventId: event.id, reason: 'Event received before GAME_STARTED.' })
      continue
    }
    if (state.status === 'COMPLETED') {
      invalidEvents.push({ eventId: event.id, reason: 'Event received after the game already completed.' })
      continue
    }

    const result: { state: GameState } | { error: string } =
      event.type === 'CARD_PLAYED' ? applyCardPlayed(state, event) : applyNeighborRequest(state, event)
    if ('error' in result) {
      invalidEvents.push({ eventId: event.id, reason: result.error })
      continue
    }
    state = result.state
  }

  if (!state) throw new Error(EMPTY_STATE_ERROR)
  return { ...state, events, invalidEvents, updatedAt: Date.now() }
}

function applyGameStarted(event: Extract<GameEvent, { type: 'GAME_STARTED' }>): GameState {
  const numPlayers = event.players.length
  const players: PlayerState[] = event.players.map((p) => {
    const cardsStarted = p.isUser ? event.userHandCardIds.length : startingHandSize(p.seat, numPlayers, event.rules.deckSize)
    return {
      id: p.id,
      name: p.name,
      seat: p.seat,
      isUser: p.isUser,
      isDealer: p.id === event.dealerPlayerId,
      hand: p.isUser ? event.userHandCardIds.map(cardFromId) : [],
      cardsRemaining: cardsStarted,
      cardsStarted,
      cardsPlayed: [],
      tricksWon: 0,
      escaped: false,
      escapedAtTrickIndex: null,
      voidSuits: [],
      owedRequestsFrom: [],
    }
  })

  const order = seatOrderIds(players)

  return {
    gameId: crypto.randomUUID(),
    gameName: event.gameName,
    rules: event.rules,
    players,
    userPlayerId: event.userPlayerId,
    dealerPlayerId: event.dealerPlayerId,
    currentPlayerId: event.startingPlayerId,
    currentTrick: { index: 0, leadSuit: null, plays: [], activePlayerIdsAtStart: order },
    completedTricks: [],
    playedCardIds: [],
    status: 'IN_PROGRESS',
    finishOrder: [],
    roundNumber: 1,
    events: [],
    invalidEvents: [],
    createdAt: event.timestamp,
    updatedAt: event.timestamp,
  }
}

function resolveCompletedTrick(trick: CurrentTrick, rules: GameState['rules']): CompletedTrick {
  const outcome = resolveTrick(
    trick.plays.map((p) => ({ playerId: p.playerId, card: p.card })),
    trick.leadSuit!,
    rules,
    trick.index === 0,
  )
  return {
    index: trick.index,
    leadSuit: trick.leadSuit!,
    plays: trick.plays,
    winnerPlayerId: outcome.winnerPlayerId,
    hadThulla: outcome.hadThulla,
    pickedUp: outcome.pickedUp,
    activePlayerIdsAtStart: trick.activePlayerIdsAtStart,
  }
}

function applyCardPlayed(
  prev: GameState,
  event: Extract<GameEvent, { type: 'CARD_PLAYED' }>,
): { state: GameState } | { error: string } {
  if (!prev.currentTrick) return { error: 'No trick in progress.' }
  if (prev.currentPlayerId !== event.playerId) {
    return { error: `Expected ${prev.currentPlayerId} to play, but ${event.playerId} was recorded.` }
  }
  if (prev.playedCardIds.includes(event.cardId)) {
    return { error: `${event.cardId} was already discarded earlier and cannot be played again.` }
  }
  const heldElsewhere = prev.players.find((p) => p.id !== event.playerId && p.hand.some((c) => c.id === event.cardId))
  if (heldElsewhere) {
    return { error: `${event.cardId} is already known to be in ${heldElsewhere.name}'s hand.` }
  }

  const players = prev.players.map((p) => ({
    ...p,
    hand: [...p.hand],
    cardsPlayed: [...p.cardsPlayed],
    voidSuits: [...p.voidSuits],
    owedRequestsFrom: [...p.owedRequestsFrom],
  }))
  const player = players.find((p) => p.id === event.playerId)
  if (!player) return { error: `Unknown player ${event.playerId}.` }
  if (player.escaped) return { error: `${player.name} has already escaped and cannot play.` }
  if (player.cardsRemaining <= 0) return { error: `${player.name} has no cards left to play.` }

  if (player.isUser) {
    const idx = player.hand.findIndex((c) => c.id === event.cardId)
    if (idx === -1) return { error: `${event.cardId} is not in your recorded hand.` }
    player.hand.splice(idx, 1)
  }

  const card = cardFromId(event.cardId)
  const currentTrick: CurrentTrick = { ...prev.currentTrick, plays: [...prev.currentTrick.plays] }
  const isFirstCardOfTrick = currentTrick.plays.length === 0
  const effectiveLeadSuit: Suit | null = isFirstCardOfTrick ? null : currentTrick.leadSuit
  const isThulla = isThullaPlay(card, effectiveLeadSuit, prev.rules)
  if (isFirstCardOfTrick) currentTrick.leadSuit = card.suit

  player.cardsRemaining -= 1
  player.cardsPlayed.push(card)
  if (isThulla && currentTrick.leadSuit && !player.voidSuits.includes(currentTrick.leadSuit)) {
    player.voidSuits.push(currentTrick.leadSuit)
  }
  currentTrick.plays.push({ playerId: player.id, card, isThulla })

  const finishOrder = [...prev.finishOrder]
  const finishNow = (p: PlayerState, trickIndex: number) => {
    if (!p.escaped && p.cardsRemaining === 0) {
      p.escaped = true
      p.escapedAtTrickIndex = trickIndex
      finishOrder.push(p.id)
    }
  }
  finishNow(player, currentTrick.index)

  const endRound = (): GameState => {
    const stillActive = players.filter((p) => !p.escaped)
    for (const p of stillActive) if (!finishOrder.includes(p.id)) finishOrder.push(p.id)
    return {
      ...prev,
      players,
      currentTrick: null,
      playedCardIds: prev.playedCardIds,
      completedTricks: prev.completedTricks,
      status: 'COMPLETED',
      currentPlayerId: null,
      finishOrder,
    }
  }

  if (players.filter((p) => !p.escaped).length <= prev.rules.roundEndsWhenPlayersRemaining) {
    return { state: endRound() }
  }

  const trickDone = isTrickComplete(currentTrick.plays.length, currentTrick.activePlayerIdsAtStart.length, isThulla)
  if (!trickDone) {
    const alreadyPlayed = new Set(currentTrick.plays.map((p) => p.playerId))
    const nextPlayerId = nextInCircularOrder(currentTrick.activePlayerIdsAtStart, event.playerId, alreadyPlayed)
    return {
      state: { ...prev, players, currentTrick, currentPlayerId: nextPlayerId, finishOrder },
    }
  }

  const resolved = resolveCompletedTrick(currentTrick, prev.rules)
  const completedTricks = [...prev.completedTricks, resolved]

  const winner = players.find((p) => p.id === resolved.winnerPlayerId)!
  winner.tricksWon += 1
  let playedCardIds = prev.playedCardIds
  if (resolved.pickedUp) {
    const pickedCards = resolved.plays.map((p) => p.card)
    winner.hand.push(...pickedCards)
    winner.cardsRemaining += pickedCards.length

    if (prev.rules.neighborCardRequest.enabled) {
      for (const play of resolved.plays) {
        if (!play.isThulla || play.playerId === winner.id) continue
        const offender = players.find((p) => p.id === play.playerId)!
        if (areNeighboringSeats(offender.seat, winner.seat, players.length)) {
          winner.owedRequestsFrom.push(offender.id)
        }
      }
    }
  } else {
    playedCardIds = [...playedCardIds, ...resolved.plays.map((p) => p.card.id)]
  }

  finishNow(winner, resolved.index)

  const stillActive = players.filter((p) => !p.escaped)
  if (stillActive.length <= prev.rules.roundEndsWhenPlayersRemaining) {
    for (const p of stillActive) if (!finishOrder.includes(p.id)) finishOrder.push(p.id)
    return {
      state: {
        ...prev,
        players,
        currentTrick: null,
        completedTricks,
        playedCardIds,
        status: 'COMPLETED',
        currentPlayerId: null,
        finishOrder,
      },
    }
  }

  const order = seatOrderIds(players)
  const escapedNow = new Set(players.filter((p) => p.escaped).map((p) => p.id))
  const leaderId = winner.escaped ? nextInCircularOrder(order, winner.id, escapedNow) : winner.id
  const nextTrick: CurrentTrick = {
    index: resolved.index + 1,
    leadSuit: null,
    plays: [],
    activePlayerIdsAtStart: order.filter((id) => !escapedNow.has(id)),
  }

  return {
    state: {
      ...prev,
      players,
      currentTrick: nextTrick,
      completedTricks,
      playedCardIds,
      status: prev.status,
      currentPlayerId: leaderId,
      finishOrder,
    },
  }
}

/**
 * Cashes in an earned Neighbor Card Request (see RULES.md): the target's
 * entire hand moves to the requester, the target escapes immediately, and
 * the requester's turn is spent — the next active player leads.
 */
function applyNeighborRequest(
  prev: GameState,
  event: Extract<GameEvent, { type: 'NEIGHBOR_REQUEST' }>,
): { state: GameState } | { error: string } {
  if (!prev.rules.neighborCardRequest.enabled) {
    return { error: 'The Neighbor Card Request house rule is not enabled for this game.' }
  }
  if (!prev.currentTrick) return { error: 'No trick in progress.' }
  if (prev.currentPlayerId !== event.requesterId) {
    return { error: `Expected ${prev.currentPlayerId} to act, but ${event.requesterId} made the request.` }
  }
  if (prev.currentTrick.plays.length !== 0) {
    return { error: 'A Neighbor Card Request can only be made when leading a fresh trick.' }
  }

  const players = prev.players.map((p) => ({ ...p, hand: [...p.hand], owedRequestsFrom: [...p.owedRequestsFrom] }))
  const requester = players.find((p) => p.id === event.requesterId)
  const target = players.find((p) => p.id === event.targetId)
  if (!requester) return { error: `Unknown player ${event.requesterId}.` }
  if (!target) return { error: `Unknown player ${event.targetId}.` }
  if (target.escaped || target.cardsRemaining === 0) return { error: `${target.name} has no cards left to hand over.` }

  const owedIdx = requester.owedRequestsFrom.indexOf(event.targetId)
  if (owedIdx === -1) return { error: `You have not earned a Neighbor Card Request against ${target.name}.` }

  requester.owedRequestsFrom.splice(owedIdx, 1)
  requester.hand.push(...target.hand)
  requester.cardsRemaining += target.cardsRemaining
  target.hand = []
  target.cardsRemaining = 0

  const finishOrder = [...prev.finishOrder]
  target.escaped = true
  target.escapedAtTrickIndex = prev.currentTrick.index
  finishOrder.push(target.id)

  const stillActive = players.filter((p) => !p.escaped)
  if (stillActive.length <= prev.rules.roundEndsWhenPlayersRemaining) {
    for (const p of stillActive) if (!finishOrder.includes(p.id)) finishOrder.push(p.id)
    return {
      state: { ...prev, players, currentTrick: null, status: 'COMPLETED', currentPlayerId: null, finishOrder },
    }
  }

  const order = seatOrderIds(players)
  const escapedNow = new Set(players.filter((p) => p.escaped).map((p) => p.id))
  const nextLeader = nextInCircularOrder(order, requester.id, escapedNow)
  const nextTrick: CurrentTrick = {
    index: prev.currentTrick.index,
    leadSuit: null,
    plays: [],
    activePlayerIdsAtStart: order.filter((id) => !escapedNow.has(id)),
  }

  return {
    state: { ...prev, players, currentTrick: nextTrick, currentPlayerId: nextLeader, finishOrder },
  }
}
