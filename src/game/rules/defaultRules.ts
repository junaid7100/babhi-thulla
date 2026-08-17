import { RANKS, SUITS } from '../cards/types'
import type { GameRules } from './types'

/**
 * The default, validated ruleset — classic Baavi/Bhabhi Thulla. See RULES.md.
 * No trump suit; "Thulla" is the event of sluffing off the led suit, and
 * winning a Thulla trick forces you to pick up the pile.
 */
export function createDefaultThullaRules(): GameRules {
  return {
    id: 'classic-thulla',
    name: 'Classic Baavi Tulla',
    description:
      'Standard 52-card deck. Must follow suit if able. Playing off-suit is a Thulla. ' +
      'Highest card of the led suit wins the trick. If the trick had a Thulla, the winner ' +
      'must pick up the whole trick (first trick exempt). First to empty their hand escapes; ' +
      'the last player holding cards is the Bhabhi.',
    deckSize: 52,
    suits: [...SUITS],
    ranks: [...RANKS],
    rankOrder: [...RANKS],
    minPlayers: 2,
    maxPlayers: 8,
    mustFollowSuit: true,
    openingLead: { required: true, card: 'AS' },
    turnOrder: 'SEAT_CLOCKWISE',
    tulla: {
      mode: 'THULLA_EVENT',
      winnerPicksUpOnThulla: true,
      firstTrickPickupExempt: true,
    },
    escapeOnEmptyHand: true,
    roundEndsWhenPlayersRemaining: 1,
    leaderAfterWinnerEscapes: 'NEXT_IN_ORDER',
    dealerRotates: true,
    dealerHasSpecialRole: false,
    scoring: { method: 'RANK', trackBhabhiTally: true },
    specialCards: [],
  }
}

/**
 * Alternate configurable mode with a real designated trump suit, provided for
 * completeness — not the primary/validated ruleset. See RULES.md.
 */
export function createTrumpSuitRules(): GameRules {
  const base = createDefaultThullaRules()
  return {
    ...base,
    id: 'trump-suit-variant',
    name: 'Trump Suit Variant',
    description:
      'Alternate house-rule mode with a fixed trump suit (Spades) that beats all other suits. ' +
      'Not the validated default — configure to match your table.',
    tulla: {
      mode: 'TRUMP_SUIT',
      determination: 'FIXED',
      fixedSuit: 'S',
      canChange: false,
    },
  }
}

export const RULE_TEMPLATES: GameRules[] = [createDefaultThullaRules(), createTrumpSuitRules()]
