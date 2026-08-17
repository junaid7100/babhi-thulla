import { createDefaultThullaRules } from '../rules/defaultRules'
import type { GameEvent, PlayerSetup } from '../state/types'

const DEMO_PLAYERS: PlayerSetup[] = [
  { id: 'you', name: 'You', seat: 0, isUser: true },
  { id: 'ali', name: 'Ali', seat: 1, isUser: false },
  { id: 'sara', name: 'Sara', seat: 2, isUser: false },
  { id: 'ahmed', name: 'Ahmed', seat: 3, isUser: false },
]

/**
 * A fixed, scripted game used to sanity-check the whole pipeline end to end
 * (state, ledger, inference, Tulla tracking, legal moves, recommendations)
 * without needing a real game in front of you. See spec §40 "Demo Mode".
 *
 * Trick 0: a clean trick (everyone follows Spades) — cards discard normally.
 * Trick 1: Ali Thullas — since it's not the first trick, you (the winner)
 *          are forced to pick the trick back up.
 * Trick 2: Ahmed Thullas but Sara wins on Clubs — Sara picks up instead.
 * Trick 3: stops mid-trick, on your turn, so the board opens straight into
 *          a real "which diamond do I play?" recommendation.
 */
export function buildDemoEvents(): GameEvent[] {
  let t = Date.parse('2026-01-01T10:00:00Z')
  const next = () => (t += 1000)
  let n = 0
  const id = () => `demo-${n++}`

  const events: GameEvent[] = []

  events.push({
    id: id(),
    type: 'GAME_STARTED',
    timestamp: next(),
    gameName: 'Demo Game',
    rules: createDefaultThullaRules(),
    players: DEMO_PLAYERS,
    userPlayerId: 'you',
    dealerPlayerId: 'you',
    startingPlayerId: 'you',
    userHandCardIds: ['AS', 'KS', '7S', '4S', 'AH', '9H', '3H', 'KD', '8D', 'QC', '6C', '2C', '5C'],
  })

  const play = (playerId: string, cardId: string) => {
    events.push({ id: id(), type: 'CARD_PLAYED', timestamp: next(), playerId, cardId })
  }

  // Trick 0 — clean, everyone follows Spades. You win with the Ace.
  play('you', 'AS')
  play('ali', '9S')
  play('sara', '3S')
  play('ahmed', '6S')

  // Trick 1 — Ali Thullas on Hearts. You win but must pick up (not the first trick).
  play('you', '9H')
  play('ali', '4C')

  // Trick 2 — Ahmed Thullas on Clubs, but Sara actually wins it (highest club) and picks up.
  play('you', '6C')
  play('ali', '9C')
  play('sara', '10C')
  play('ahmed', '4H')

  // Trick 3 — Sara leads Diamonds; Ahmed follows. Stops here, on your turn.
  play('sara', '5D')
  play('ahmed', '2D')

  return events
}
