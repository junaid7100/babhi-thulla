import type { Card } from '@/game/cards/types'
import { sortCards } from '@/game/cards/card'
import { PlayingCard } from './PlayingCard'

interface HandStripProps {
  cards: Card[]
  legalCardIds?: Set<string> | null
  onPlay?: (cardId: string) => void
  size?: 'sm' | 'md' | 'lg'
}

export function HandStrip({ cards, legalCardIds, onPlay, size = 'lg' }: HandStripProps) {
  const sorted = sortCards(cards)
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-1 py-2">
      {sorted.map((card) => {
        const legal = legalCardIds ? legalCardIds.has(card.id) : true
        return (
          <PlayingCard
            key={card.id}
            card={card}
            size={size}
            disabled={!legal}
            onClick={onPlay ? () => onPlay(card.id) : undefined}
          />
        )
      })}
      {sorted.length === 0 && <p className="px-2 py-4 text-sm text-slate-500">No cards.</p>}
    </div>
  )
}
