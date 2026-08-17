import type { GameRules } from '../rules/types'
import { buildState } from '../state/reducer'
import type { GameEvent, GameState, PlayerSetup } from '../state/types'
import { checkNeighborRequest, checkPlayCard, hasBlockingErrors, type ConsistencyIssue } from '../validation/consistency'

export interface NewGameConfig {
  gameName: string
  rules: GameRules
  players: PlayerSetup[]
  userPlayerId: string
  dealerPlayerId: string
  startingPlayerId: string
  userHandCardIds: string[]
}

export function createNewGameEvent(config: NewGameConfig): GameEvent {
  return {
    id: crypto.randomUUID(),
    type: 'GAME_STARTED',
    timestamp: Date.now(),
    gameName: config.gameName,
    rules: config.rules,
    players: config.players,
    userPlayerId: config.userPlayerId,
    dealerPlayerId: config.dealerPlayerId,
    startingPlayerId: config.startingPlayerId,
    userHandCardIds: config.userHandCardIds,
  }
}

export type PlayCardResult =
  | { ok: true; event: GameEvent; warnings: ConsistencyIssue[] }
  | { ok: false; issues: ConsistencyIssue[] }

/** Validates a candidate play against the current state and, if legal, produces the event to append. */
export function attemptPlayCard(state: GameState, playerId: string, cardId: string): PlayCardResult {
  const issues = checkPlayCard(state, playerId, cardId)
  if (hasBlockingErrors(issues)) return { ok: false, issues }
  const event: GameEvent = {
    id: crypto.randomUUID(),
    type: 'CARD_PLAYED',
    timestamp: Date.now(),
    playerId,
    cardId,
  }
  return { ok: true, event, warnings: issues }
}

export type NeighborRequestResult =
  | { ok: true; event: GameEvent; warnings: ConsistencyIssue[] }
  | { ok: false; issues: ConsistencyIssue[] }

/** Validates cashing in a Neighbor Card Request and, if legal, produces the event to append. See RULES.md. */
export function attemptNeighborRequest(state: GameState, requesterId: string, targetId: string): NeighborRequestResult {
  const issues = checkNeighborRequest(state, requesterId, targetId)
  if (hasBlockingErrors(issues)) return { ok: false, issues }
  const event: GameEvent = {
    id: crypto.randomUUID(),
    type: 'NEIGHBOR_REQUEST',
    timestamp: Date.now(),
    requesterId,
    targetId,
  }
  return { ok: true, event, warnings: issues }
}

/** Drops the most recent event and returns the log to replay. Never removes the founding GAME_STARTED event. */
export function undoLastEvent(events: GameEvent[]): GameEvent[] {
  if (events.length <= 1) return events
  return events.slice(0, -1)
}

/** Replaces one event in the log by id (e.g. correcting a mis-recorded card) and returns the new log to replay. */
export function editEvent(events: GameEvent[], eventId: string, replacement: GameEvent): GameEvent[] {
  return events.map((e) => (e.id === eventId ? replacement : e))
}

/** Removes one event from the log entirely (e.g. a duplicate/erroneous entry). */
export function removeEvent(events: GameEvent[], eventId: string): GameEvent[] {
  return events.filter((e) => e.id !== eventId)
}

export function rebuild(events: GameEvent[]): GameState {
  return buildState(events)
}
