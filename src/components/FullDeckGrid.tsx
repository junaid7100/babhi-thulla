import { RANKS, SUITS, SUIT_NAME, SUIT_SYMBOL, type Suit } from '@/game/cards/types'
import { makeCard } from '@/game/cards/card'
import { PlayingCard } from './PlayingCard'

interface FullDeckGridProps {
  selectedIds?: Set<string>
  disabledIds?: Set<string>
  onSelect: (cardId: string) => void
  cardLabels?: Record<string, string>
}

/** All 52 cards, grouped by suit — used for initial hand entry and for recording an opponent's card. */
export function FullDeckGrid({ selectedIds, disabledIds, onSelect, cardLabels }: FullDeckGridProps) {
  return (
    <div className="flex flex-col gap-3 lg:gap-6">
      {SUITS.map((suit) => (
        <SuitRow key={suit} suit={suit} selectedIds={selectedIds} disabledIds={disabledIds} onSelect={onSelect} cardLabels={cardLabels} />
      ))}
    </div>
  )
}

function SuitRow({ suit, selectedIds, disabledIds, onSelect, cardLabels }: FullDeckGridProps & { suit: Suit }) {
  const isRed = suit === 'H' || suit === 'D'
  return (
    <div>
      <div className={`mb-1 flex items-center gap-1 text-xs font-semibold lg:mb-2 lg:gap-2 lg:text-base ${isRed ? 'text-red-400' : 'text-slate-300'}`}>
        <span className="text-base lg:text-2xl">{SUIT_SYMBOL[suit]}</span>
        <span>{SUIT_NAME[suit]}</span>
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-13 lg:gap-3">
        {RANKS.slice()
          .reverse()
          .map((rank) => {
            const card = makeCard(rank, suit)
            return (
              <PlayingCard
                key={card.id}
                card={card}
                size="sm"
                selected={selectedIds?.has(card.id)}
                disabled={disabledIds?.has(card.id)}
                label={cardLabels?.[card.id]}
                onClick={() => onSelect(card.id)}
              />
            )
          })}
      </div>
    </div>
  )
}
