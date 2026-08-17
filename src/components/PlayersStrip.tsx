import type { GameState } from '@/game/state/types'
import { Pill } from './ui'

/** Always-visible row of every player's status — who's still in, who's escaped, whose turn it is. */
export function PlayersStrip({ state }: { state: GameState }) {
  const players = [...state.players].sort((a, b) => a.seat - b.seat)

  return (
    <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto lg:flex-wrap">
      {players.map((p) => {
        const isTurn = state.currentPlayerId === p.id
        return (
          <div
            key={p.id}
            className={[
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs lg:px-4 lg:py-2 lg:text-sm',
              isTurn ? 'border-amber-400 bg-amber-400/10' : 'border-slate-800 bg-slate-900/60',
              p.escaped ? 'opacity-60' : '',
            ].join(' ')}
          >
            <span className="font-medium">
              {p.name}
              {p.isUser ? ' (you)' : ''}
            </span>
            {p.isDealer && <span className="text-slate-500">D</span>}
            {p.escaped ? <Pill tone="good">Escaped</Pill> : <span className="text-slate-400">{p.cardsRemaining} cards</span>}
          </div>
        )
      })}
    </div>
  )
}
