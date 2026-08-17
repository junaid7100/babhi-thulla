import { cardFromId, sortCards } from '@/game/cards/card'
import { PlayingCard } from './PlayingCard'
import { Card } from './ui'

/**
 * Cards that have permanently left the active game (a clean trick, or a
 * first-trick Thulla) — as opposed to cards that got picked back up into
 * someone's hand and are still in play.
 */
export function EscapedCardsPanel({ playedCardIds }: { playedCardIds: string[] }) {
  const cards = sortCards(playedCardIds.map(cardFromId))

  return (
    <Card>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Escaped Cards ({cards.length})</p>
      {cards.length === 0 ? (
        <p className="text-xs text-slate-500 lg:text-sm">None yet — no card has permanently left the game.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 lg:gap-2">
          {cards.map((c) => (
            <PlayingCard key={c.id} card={c} size="sm" dim />
          ))}
        </div>
      )}
    </Card>
  )
}
