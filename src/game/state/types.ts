import type { Card, Suit } from '../cards/types'
import type { GameRules } from '../rules/types'

export interface PlayerSetup {
  id: string
  name: string
  seat: number
  isUser: boolean
}

export type GameEvent =
  | {
      id: string
      type: 'GAME_STARTED'
      timestamp: number
      gameName: string
      rules: GameRules
      players: PlayerSetup[]
      userPlayerId: string
      dealerPlayerId: string
      startingPlayerId: string
      /** The user's own starting hand — the only hand the app is ever told in full. */
      userHandCardIds: string[]
    }
  | {
      id: string
      type: 'CARD_PLAYED'
      timestamp: number
      playerId: string
      cardId: string
    }
  | {
      id: string
      type: 'NEIGHBOR_REQUEST'
      timestamp: number
      /** Must be the current leader, cashing in a right earned against `targetId`. */
      requesterId: string
      targetId: string
    }

export type GameStatus = 'IN_PROGRESS' | 'COMPLETED'

export interface TrickPlayRecord {
  playerId: string
  card: Card
  isThulla: boolean
}

export interface CompletedTrick {
  index: number
  leadSuit: Suit
  plays: TrickPlayRecord[]
  winnerPlayerId: string
  hadThulla: boolean
  pickedUp: boolean
  activePlayerIdsAtStart: string[]
}

export interface CurrentTrick {
  index: number
  leadSuit: Suit | null
  plays: TrickPlayRecord[]
  /** Players expected to play in this trick, captured when it started. */
  activePlayerIdsAtStart: string[]
}

export interface PlayerState {
  id: string
  name: string
  seat: number
  isUser: boolean
  isDealer: boolean
  /**
   * Cards definitively known to be in this player's hand right now. Always
   * the complete truth for the user. For opponents this is only the subset
   * revealed by events (e.g. picking up a Thulla trick) — `cardsRemaining`
   * is the ground-truth count, which may exceed `hand.length` when some of
   * an opponent's cards are still unknown.
   */
  hand: Card[]
  cardsRemaining: number
  cardsStarted: number
  cardsPlayed: Card[]
  tricksWon: number
  escaped: boolean
  escapedAtTrickIndex: number | null
  /** Suits this player has proven void in by sluffing off-suit. */
  voidSuits: Suit[]
  /**
   * Neighbor Card Request rights this player has earned but not yet used —
   * one entry per qualifying incident, each redeemable for that specific
   * neighbor's entire hand the next time this player leads. See RULES.md.
   */
  owedRequestsFrom: string[]
}

export interface InvalidEventRecord {
  eventId: string
  reason: string
}

export interface GameState {
  gameId: string
  gameName: string
  rules: GameRules
  players: PlayerState[]
  userPlayerId: string
  dealerPlayerId: string
  /** null once the game is completed. */
  currentPlayerId: string | null
  currentTrick: CurrentTrick | null
  completedTricks: CompletedTrick[]
  playedCardIds: string[]
  status: GameStatus
  /** Player ids in the order they escaped; the last player standing (the Bhabhi) is appended when the game completes. */
  finishOrder: string[]
  roundNumber: number
  events: GameEvent[]
  invalidEvents: InvalidEventRecord[]
  createdAt: number
  updatedAt: number
}
