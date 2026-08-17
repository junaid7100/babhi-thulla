import { useEffect, useMemo, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { Button, Screen } from '@/components/ui'
import { FullDeckGrid } from '@/components/FullDeckGrid'
import { cardFromId, cardLabel, sortCards } from '@/game/cards/card'
import { startingHandSize } from '@/game/state/dealing'

export function HandEntryPage() {
  const navigate = useGameStore((s) => s.navigate)
  const pending = useGameStore((s) => s.pendingNewGame)
  const startNewGame = useGameStore((s) => s.startNewGame)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const selectedCards = useMemo(() => sortCards([...selected].map(cardFromId)), [selected])

  useEffect(() => {
    if (!pending) navigate('new-game')
  }, [pending, navigate])

  if (!pending) return null

  const numPlayers = pending.config.players.length
  const expected = startingHandSize(0, numPlayers, pending.config.rules.deckSize)

  const toggle = (cardId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }

  const handleStart = () => {
    void startNewGame({ ...pending.config, userHandCardIds: [...selected] })
  }

  const countIsOff = selected.size !== expected

  return (
    <Screen title="Your Hand" onBack={() => navigate('new-game')}>
      <div className="mb-4">
        <p className="mb-1 text-sm font-medium text-slate-300">Your Hand</p>
        <div className="no-scrollbar flex min-h-[2.5rem] flex-wrap gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 p-2">
          {selectedCards.length === 0 && <span className="px-1 text-sm text-slate-500">Tap cards below to add them</span>}
          {selectedCards.map((c) => (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className="rounded-md bg-slate-800 px-2 py-1 text-sm font-semibold text-slate-100 active:bg-slate-700"
            >
              {cardLabel(c)} ✕
            </button>
          ))}
        </div>
        <p className={`mt-1 text-xs ${countIsOff ? 'text-amber-400' : 'text-emerald-400'}`}>
          {selected.size} card{selected.size === 1 ? '' : 's'} selected
          {countIsOff ? ` — an even ${numPlayers}-way deal expects about ${expected}. Adjust if your actual hand differs.` : ' — looks right.'}
        </p>
      </div>

      <FullDeckGrid selectedIds={selected} onSelect={toggle} />

      <Button className="mt-6 w-full" disabled={selected.size === 0} onClick={handleStart}>
        Start Game ({selected.size} cards) →
      </Button>
    </Screen>
  )
}
