import type { GameState } from '@/game/state/types'
import { SUIT_NAME, SUIT_SYMBOL } from '@/game/cards/types'
import { PlayingCard } from './PlayingCard'

export function TrickDisplay({ state }: { state: GameState }) {
  const trick = state.currentTrick
  if (!trick) return null
  const nameOf = (id: string) => state.players.find((p) => p.id === id)?.name ?? id

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Trick #{trick.index + 1}</span>
        {trick.leadSuit && (
          <span className="text-xs text-slate-400">
            Led: {SUIT_SYMBOL[trick.leadSuit]} {SUIT_NAME[trick.leadSuit]}
          </span>
        )}
      </div>
      {trick.plays.length === 0 ? (
        <p className="py-3 text-center text-sm text-slate-500">Waiting for the first card…</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto">
          {trick.plays.map((p) => (
            <div key={p.playerId} className="flex flex-col items-center gap-1">
              <PlayingCard card={p.card} size="sm" dim={p.isThulla} />
              <span className="max-w-[3.5rem] truncate text-[10px] text-slate-400">{nameOf(p.playerId)}</span>
              {p.isThulla && <span className="text-[9px] font-semibold text-amber-400">THULLA</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
