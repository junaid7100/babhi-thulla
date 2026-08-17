import { useGameStore } from '@/store/gameStore'
import { Card, Screen } from '@/components/ui'
import { getLegalMoves } from '@/game/validation/legalMoves'
import { cardLabel } from '@/game/cards/card'

export function DebugPage() {
  const navigate = useGameStore((s) => s.navigate)
  const state = useGameStore((s) => s.state)
  const inference = useGameStore((s) => s.inference)
  const ledger = useGameStore((s) => s.ledger)
  const recommendation = useGameStore((s) => s.recommendation)

  if (!state || !ledger) {
    return (
      <Screen title="Debug" onBack={() => navigate('home')}>
        <p className="text-sm text-slate-500">No active game.</p>
      </Screen>
    )
  }

  const currentPlayer = state.players.find((p) => p.id === state.currentPlayerId)
  const legalMoves = currentPlayer ? getLegalMoves(currentPlayer.hand, state.currentTrick?.leadSuit ?? null) : []
  const ledgerCounts: Record<string, number> = {}
  for (const e of ledger.entries.values()) ledgerCounts[e.status] = (ledgerCounts[e.status] ?? 0) + 1

  return (
    <Screen title="Debug" onBack={() => navigate('home')}>
      <div className="flex flex-col gap-3 text-xs">
        <Card>
          <p className="mb-1 font-semibold text-amber-400">Current State</p>
          <p>Status: {state.status} · Current player: {currentPlayer?.name} · Trick #{(state.currentTrick?.index ?? -1) + 1}</p>
          <p>Lead suit: {state.currentTrick?.leadSuit ?? '(leading)'}</p>
          <p>Invalid events: {state.invalidEvents.length}</p>
        </Card>

        <Card>
          <p className="mb-1 font-semibold text-amber-400">Legal Moves ({currentPlayer?.name})</p>
          <p>{legalMoves.length > 0 ? legalMoves.map(cardLabel).join(', ') : '(none — not a card-holding player)'}</p>
        </Card>

        <Card>
          <p className="mb-1 font-semibold text-amber-400">Card Ledger Summary</p>
          {Object.entries(ledgerCounts).map(([status, count]) => (
            <p key={status}>
              {status}: {count}
            </p>
          ))}
        </Card>

        <Card>
          <p className="mb-1 font-semibold text-amber-400">Known / Possible Hands</p>
          {state.players
            .filter((p) => !p.isUser)
            .map((p) => (
              <div key={p.id} className="mb-2">
                <p className="font-medium text-slate-300">{p.name}</p>
                <p>Remaining: {inference[p.id]?.cardsRemaining ?? p.cardsRemaining}</p>
                <p>Known: {inference[p.id]?.knownCards.map(cardLabel).join(', ') || '—'}</p>
                <p>Possible: {inference[p.id]?.possibleCards.length ?? 0} candidates</p>
                <p>Void suits: {p.voidSuits.join(', ') || '—'}</p>
              </div>
            ))}
        </Card>

        {recommendation && (
          <Card>
            <p className="mb-1 font-semibold text-amber-400">Last Recommendation</p>
            <p>
              Level: {recommendation.simulationLevel} ({recommendation.simulationsRun} sims)
            </p>
            <p>Best: {cardLabel(recommendation.best.evaluation.card)}</p>
            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-950 p-2 text-[10px] text-slate-400">
              {JSON.stringify(
                [recommendation.best, ...recommendation.alternatives].map((r) => ({
                  card: cardLabel(r.evaluation.card),
                  meanScore: r.evaluation.meanScore,
                  winProb: r.evaluation.winCurrentTrickProb,
                  thullaProb: r.evaluation.thullaProb,
                  bhabhiProb: r.evaluation.bhabhiProb,
                  confidence: r.confidence,
                })),
                null,
                2,
              )}
            </pre>
          </Card>
        )}

        <Card>
          <p className="mb-1 font-semibold text-amber-400">Raw Event Log</p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-950 p-2 text-[10px] text-slate-400">
            {JSON.stringify(state.events, null, 2)}
          </pre>
        </Card>
      </div>
    </Screen>
  )
}
