import type { Card } from '@/game/cards/types'
import { SUIT_IS_RED, SUIT_SYMBOL } from '@/game/cards/types'

interface PlayingCardProps {
  card: Card
  size?: 'sm' | 'md' | 'lg'
  selected?: boolean
  disabled?: boolean
  dim?: boolean
  onClick?: () => void
  label?: string
}

const SIZE_CLASSES: Record<NonNullable<PlayingCardProps['size']>, string> = {
  sm: 'w-11 h-16 text-[11px] rounded-md lg:w-16 lg:h-24 lg:text-sm lg:rounded-lg',
  md: 'w-16 h-24 text-sm rounded-lg lg:w-24 lg:h-36 lg:text-lg lg:rounded-xl',
  lg: 'w-20 h-28 text-base rounded-xl lg:w-32 lg:h-48 lg:text-2xl lg:rounded-2xl',
}

const SYMBOL_SIZE_CLASSES: Record<NonNullable<PlayingCardProps['size']>, string> = {
  sm: 'text-xl lg:text-4xl',
  md: 'text-2xl lg:text-5xl',
  lg: 'text-3xl lg:text-6xl',
}

export function PlayingCard({ card, size = 'md', selected, disabled, dim, onClick, label }: PlayingCardProps) {
  const isRed = SUIT_IS_RED[card.suit]
  const symbol = SUIT_SYMBOL[card.suit]
  const interactive = !!onClick && !disabled

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      aria-label={`${card.rank}${symbol}${disabled ? ' (not legal)' : ''}`}
      className={[
        SIZE_CLASSES[size],
        'relative flex shrink-0 flex-col justify-between border font-bold shadow-sm transition-transform select-none',
        'bg-white text-slate-900',
        isRed ? 'text-red-600' : 'text-slate-900',
        selected ? 'border-amber-400 ring-2 ring-amber-400 -translate-y-1' : 'border-slate-300',
        disabled ? 'opacity-30 grayscale' : '',
        dim ? 'opacity-60' : '',
        interactive ? 'active:scale-95 cursor-pointer' : 'cursor-default',
      ].join(' ')}
    >
      <span className="px-1 pt-0.5 text-left leading-none lg:px-2 lg:pt-1.5">{card.rank}</span>
      <span className={`absolute inset-0 flex items-center justify-center leading-none ${SYMBOL_SIZE_CLASSES[size]}`}>{symbol}</span>
      <span className="self-end px-1 pb-0.5 leading-none lg:px-2 lg:pb-1.5">{card.rank}</span>
      {label && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1 text-[9px] font-normal text-slate-100 lg:-top-3 lg:px-1.5 lg:py-0.5 lg:text-xs">
          {label}
        </span>
      )}
    </button>
  )
}

export function CardBack({ size = 'md' }: { size?: PlayingCardProps['size'] }) {
  return (
    <div
      className={[
        SIZE_CLASSES[size ?? 'md'],
        'shrink-0 rounded-lg border border-indigo-900 bg-gradient-to-br from-indigo-700 to-indigo-950 shadow-sm',
      ].join(' ')}
    />
  )
}
