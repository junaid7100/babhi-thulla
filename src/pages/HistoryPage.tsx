import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { Button, Card, Pill, Screen } from '@/components/ui'
import { FullDeckGrid } from '@/components/FullDeckGrid'
import { cardFromId, cardLabel } from '@/game/cards/card'

export function HistoryPage() {
  const navigate = useGameStore((s) => s.navigate)
  const state = useGameStore((s) => s.state)
  const editCardEvent = useGameStore((s) => s.editCardEvent)
  const removeCardEvent = useGameStore((s) => s.removeCardEvent)
  const undo = useGameStore((s) => s.undo)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPlayerId, setEditPlayerId] = useState<string | null>(null)

  if (!state) {
    return (
      <Screen title="History" onBack={() => navigate('home')}>
        <p className="text-sm text-slate-500">No active game.</p>
      </Screen>
    )
  }

  const nameOf = (id: string) => state.players.find((p) => p.id === id)?.name ?? id

  return (
    <Screen title="Game History" onBack={() => navigate('board')}>
      <div className="lg:mx-auto lg:max-w-3xl">
      {state.invalidEvents.length > 0 && (
        <div className="mb-3 rounded-lg bg-red-900/60 px-3 py-2 text-xs text-red-100">
          {state.invalidEvents.length} event(s) couldn't be applied. Edit or remove the highlighted entries below.
        </div>
      )}

      <Button variant="secondary" className="mb-4 w-full" onClick={undo} disabled={state.events.length <= 1}>
        ↩ Undo Last Move
      </Button>

      <div className="flex flex-col gap-2">
        {state.events.map((event) => {
          const invalid = state.invalidEvents.some((i) => i.eventId === event.id)
          if (event.type === 'GAME_STARTED') {
            return (
              <Card key={event.id} className="text-sm text-slate-400">
                Game started · {event.players.length} players · dealer {nameOf(event.dealerPlayerId)}
              </Card>
            )
          }
          if (event.type === 'NEIGHBOR_REQUEST') {
            return (
              <Card key={event.id} className={invalid ? 'border-red-700' : ''}>
                <div className="flex items-center justify-between">
                  <p className="text-sm">
                    <span className="font-medium">{nameOf(event.requesterId)}</span> requested{' '}
                    <span className="font-medium">{nameOf(event.targetId)}</span>'s entire hand
                  </p>
                  <button className="text-xs text-red-400 underline" onClick={() => removeCardEvent(event.id)}>
                    Remove
                  </button>
                </div>
                {invalid && <Pill tone="bad">Inconsistent with current state</Pill>}
              </Card>
            )
          }
          const isEditing = editingId === event.id
          return (
            <Card key={event.id} className={invalid ? 'border-red-700' : ''}>
              <div className="flex items-center justify-between">
                <p className="text-sm">
                  <span className="font-medium">{nameOf(event.playerId)}</span> played{' '}
                  <span className="font-semibold">{cardLabel(cardFromId(event.cardId))}</span>
                </p>
                <div className="flex gap-2 text-xs">
                  <button
                    className="text-amber-400 underline"
                    onClick={() => {
                      setEditingId(isEditing ? null : event.id)
                      setEditPlayerId(event.playerId)
                    }}
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                  <button className="text-red-400 underline" onClick={() => removeCardEvent(event.id)}>
                    Remove
                  </button>
                </div>
              </div>
              {invalid && <Pill tone="bad">Inconsistent with current state</Pill>}

              {isEditing && (
                <div className="mt-3 border-t border-slate-800 pt-3">
                  <p className="mb-1 text-xs font-medium text-slate-400">Who actually played?</p>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {state.players.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setEditPlayerId(p.id)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                          editPlayerId === p.id ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-200'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                  <p className="mb-1 text-xs font-medium text-slate-400">Which card?</p>
                  <FullDeckGrid
                    selectedIds={new Set([event.cardId])}
                    onSelect={(cardId) => {
                      if (!editPlayerId) return
                      editCardEvent(event.id, editPlayerId, cardId)
                      setEditingId(null)
                    }}
                  />
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {state.completedTricks.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Trick Summary</p>
          <div className="flex flex-col gap-1">
            {state.completedTricks.map((t) => (
              <p key={t.index} className="text-xs text-slate-400">
                Trick {t.index + 1}: won by <span className="text-slate-200">{nameOf(t.winnerPlayerId)}</span>
                {t.hadThulla ? (t.pickedUp ? ' — Thulla, picked up' : ' — Thulla (first trick, exempt)') : ' — clean'}
              </p>
            ))}
          </div>
        </div>
      )}
      </div>
    </Screen>
  )
}
