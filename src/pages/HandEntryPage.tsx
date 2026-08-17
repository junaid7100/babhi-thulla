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
  const [openingHolderId, setOpeningHolderId] = useState<string | null>(null)
  const selectedCards = useMemo(() => sortCards([...selected].map(cardFromId)), [selected])

  useEffect(() => {
    if (!pending) navigate('new-game')
  }, [pending, navigate])

  if (!pending) return null

  const numPlayers = pending.config.players.length
  const expected = startingHandSize(0, numPlayers, pending.config.rules.deckSize)
  const countIsOff = selected.size !== expected

  // Nobody knows in advance who holds the opening card (e.g. A♠) — that's
  // only revealed once hands are actually seen. Resolve it here rather than
  // assuming a fixed "starting player" at New Game time.
  const openingCard = pending.config.rules.openingLead.required ? (pending.config.rules.openingLead.card ?? null) : null
  const userHoldsOpeningCard = openingCard ? selected.has(openingCard) : false
  const otherPlayers = pending.config.players.filter((p) => !p.isUser)
  const startingPlayerId = !openingCard
    ? pending.config.dealerPlayerId
    : userHoldsOpeningCard
      ? pending.config.userPlayerId
      : openingHolderId

  const toggle = (cardId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }

  const handleStart = () => {
    if (!startingPlayerId) return
    void startNewGame({ ...pending.config, startingPlayerId, userHandCardIds: [...selected] })
  }

  return (
    <Screen title="Your Hand" onBack={() => navigate('new-game')}>
      <div className="mb-4 lg:mb-6">
        <p className="mb-1 text-sm font-medium text-slate-300 lg:text-base">Your Hand</p>
        <div className="no-scrollbar flex min-h-[2.5rem] flex-wrap gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 p-2 lg:min-h-14 lg:gap-2 lg:rounded-2xl lg:p-3">
          {selectedCards.length === 0 && <span className="px-1 text-sm text-slate-500 lg:text-base">Tap cards below to add them</span>}
          {selectedCards.map((c) => (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className="rounded-md bg-slate-800 px-2 py-1 text-sm font-semibold text-slate-100 active:bg-slate-700 lg:rounded-lg lg:px-3 lg:py-1.5 lg:text-base lg:hover:bg-slate-700"
            >
              {cardLabel(c)} ✕
            </button>
          ))}
        </div>
        <p className={`mt-1 text-xs lg:text-sm ${countIsOff ? 'text-amber-400' : 'text-emerald-400'}`}>
          {selected.size} card{selected.size === 1 ? '' : 's'} selected
          {countIsOff ? ` — an even ${numPlayers}-way deal expects about ${expected}. Adjust if your actual hand differs.` : ' — looks right.'}
        </p>
      </div>

      <FullDeckGrid selectedIds={selected} onSelect={toggle} />

      {openingCard && (
        <div className="mt-6 rounded-2xl border border-amber-500/50 bg-amber-950/20 p-3 lg:rounded-3xl lg:p-5">
          {userHoldsOpeningCard ? (
            <p className="text-sm text-amber-300 lg:text-base">
              You hold {cardLabel(cardFromId(openingCard))} — you lead the first trick.
            </p>
          ) : (
            <>
              <p className="mb-2 text-sm font-medium text-amber-300 lg:text-base">
                You don't hold {cardLabel(cardFromId(openingCard))} — who does? They lead the first trick.
              </p>
              <div className="flex flex-wrap gap-2">
                {otherPlayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setOpeningHolderId(p.id)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium lg:px-4 lg:py-2.5 lg:text-base ${
                      openingHolderId === p.id ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-200 lg:hover:bg-slate-700'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <Button className="mt-6 w-full lg:mt-8 lg:max-w-md" disabled={selected.size === 0 || !startingPlayerId} onClick={handleStart}>
        Start Game ({selected.size} cards) →
      </Button>
    </Screen>
  )
}
