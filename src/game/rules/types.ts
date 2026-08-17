import type { Rank, Suit } from '../cards/types'

/**
 * How a trick's "Tulla" mechanic works. See RULES.md for the full explanation
 * of why this is a mode, not a hard-coded assumption.
 */
export type TullaMode = 'THULLA_EVENT' | 'TRUMP_SUIT'

export interface ThullaEventConfig {
  mode: 'THULLA_EVENT'
  /** If a Thulla occurs, does the trick winner pick up all cards played? */
  winnerPicksUpOnThulla: boolean
  /** Does the very first trick of the game get exempted from pickup? */
  firstTrickPickupExempt: boolean
}

export interface TrumpSuitConfig {
  mode: 'TRUMP_SUIT'
  /** How the trump suit is determined. */
  determination: 'FIXED' | 'DEALER_CHOICE' | 'FIRST_OFF_SUIT_CARD'
  /** Required when determination is FIXED. */
  fixedSuit?: Suit
  /** Whether the trump suit may change during the round once set. */
  canChange: boolean
}

export type TullaConfig = ThullaEventConfig | TrumpSuitConfig

export interface OpeningLeadConfig {
  /** Must the very first trick be led with a specific card? */
  required: boolean
  /** e.g. 'AS' for Ace of Spades. Required when `required` is true. */
  card?: `${Rank}${Suit}`
}

export interface ScoringConfig {
  /** Rank-based (finish order) scoring vs. custom point table. Only RANK is implemented. */
  method: 'RANK'
  /** Track a running "times been Bhabhi" tally across rounds in a session. */
  trackBhabhiTally: boolean
}

export interface GameRules {
  id: string
  name: string
  /** Human-readable description shown on the Rule Validation screen. */
  description: string

  // Deck configuration
  deckSize: 52
  suits: Suit[]
  ranks: Rank[]
  /** Low-to-high strength order; last entry is strongest. */
  rankOrder: Rank[]

  // Players
  minPlayers: number
  maxPlayers: number

  // Turn / trick rules
  mustFollowSuit: true
  openingLead: OpeningLeadConfig
  turnOrder: 'SEAT_CLOCKWISE'

  // Tulla / trump
  tulla: TullaConfig

  // Escaping & round completion
  escapeOnEmptyHand: true
  roundEndsWhenPlayersRemaining: number
  /**
   * If the trick winner's winning card empties their hand (so they escape at
   * the same moment they win), who leads the next trick? Isolated as config
   * rather than assumed. NEXT_IN_ORDER = next still-active player in seat
   * order after the escaping winner.
   */
  leaderAfterWinnerEscapes: 'NEXT_IN_ORDER'

  // Dealer
  dealerRotates: boolean
  dealerHasSpecialRole: boolean

  // Scoring
  scoring: ScoringConfig

  // Extension point for house-rule special cards/actions. Empty by default —
  // never silently assumed.
  specialCards: SpecialCardRule[]
}

export interface SpecialCardRule {
  id: string
  cardId: `${Rank}${Suit}`
  description: string
}
