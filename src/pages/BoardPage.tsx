import { useEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { Button, Card, Pill, Screen } from '@/components/ui'
import { TrickDisplay } from '@/components/TrickDisplay'
import { RecommendationPanel } from '@/components/RecommendationPanel'
import { HandStrip } from '@/components/HandStrip'
import { FullDeckGrid } from '@/components/FullDeckGrid'
import { CardCountingPanel } from '@/components/CardCountingPanel'
import { OpponentDashboard } from '@/components/OpponentDashboard'
import { getLegalMoves } from '@/game/validation/legalMoves'
import { isSelectableForPlayer } from '@/game/ledger/cardLedger'

export function BoardPage() {
  const navigate = useGameStore((s) => s.navigate)
  const state = useGameStore((s) => s.state)
  const inference = useGameStore((s) => s.inference)
  const ledger = useGameStore((s) => s.ledger)
  const recommendation = useGameStore((s) => s.recommendation)
  const recommendationLoading = useGameStore((s) => s.recommendationLoading)
  const recommendationSimulationsPlanned = useGameStore((s) => s.recommendationSimulationsPlanned)
  const playCard = useGameStore((s) => s.playCard)
  const undo = useGameStore((s) => s.undo)

  const [showCounting, setShowCounting] = useState(false)
  const [showOpponents, setShowOpponents] = useState(false)
  const [playError, setPlayError] = useState<string | null>(null)

  useEffect(() => {
    if (state?.status === 'COMPLETED') navigate('summary')
  }, [state?.status, navigate])

  if (!state || !ledger) {
    return (
      <Screen title="Game" onBack={() => navigate('home')}>
        <p className="text-sm text-slate-500">No active game.</p>
      </Screen>
    )
  }

  const you = state.players.find((p) => p.id === state.userPlayerId)!
  const currentPlayer = state.players.find((p) => p.id === state.currentPlayerId)
  const isYourTurn = state.currentPlayerId === state.userPlayerId
  const leadSuit = state.currentTrick?.leadSuit ?? null
  const legalIds = new Set(getLegalMoves(you.hand, leadSuit).map((c) => c.id))

  const handlePlay = (playerId: string, cardId: string) => {
    const result = playCard(playerId, cardId)
    if (!result.ok) {
      setPlayError(result.issues.map((i) => i.message).join(' '))
    } else {
      setPlayError(null)
    }
  }

  const opponentDisabled = (cardId: string) =>
    !currentPlayer || !isSelectableForPlayer(ledger, currentPlayer.id, cardId)

  return (
    <Screen
      title={state.gameName}
      onBack={() => navigate('home')}
      right={
        <button className="text-xs text-slate-400 underline" onClick={() => navigate('history')}>
          History
        </button>
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <Pill tone="warn">
          {state.rules.tulla.mode === 'THULLA_EVENT' ? 'THULLA MODE — no trump' : `TRUMP: ${state.rules.tulla.mode}`}
        </Pill>
        <p className="text-sm font-medium">{isYourTurn ? 'Your turn' : `${currentPlayer?.name}'s turn`}</p>
      </div>

      {playError && (
        <div className="mb-3 rounded-lg bg-red-900/60 px-3 py-2 text-xs text-red-100">
          {playError}
          <button className="ml-2 underline" onClick={() => setPlayError(null)}>
            dismiss
          </button>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[1fr_400px] lg:items-start lg:gap-8">
        <div className="min-w-0">
          <div className="mb-4">
            <TrickDisplay state={state} />
          </div>

          {isYourTurn ? (
            <>
              <RecommendationPanel
                state={state}
                recommendation={recommendation}
                loading={recommendationLoading}
                simulationsPlanned={recommendationSimulationsPlanned}
                onPlay={(cardId) => handlePlay(you.id, cardId)}
              />
              <p className="mb-1 text-xs font-medium text-slate-400 lg:text-sm">Or pick manually — dimmed cards aren't legal right now:</p>
              <HandStrip cards={you.hand} legalCardIds={legalIds} onPlay={(cardId) => handlePlay(you.id, cardId)} />
            </>
          ) : (
            <Card className="mb-4">
              <p className="mb-2 text-sm font-medium text-slate-300 lg:text-base">What did {currentPlayer?.name} play?</p>
              <FullDeckGrid onSelect={(cardId) => currentPlayer && handlePlay(currentPlayer.id, cardId)} disabledIds={disabledSet(ledger, currentPlayer?.id, opponentDisabled)} />
            </Card>
          )}

          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={undo} disabled={state.events.length <= 1}>
              ↩ Undo Last Move
            </Button>
          </div>

          <p className="mt-6 text-center text-[10px] text-slate-600 lg:text-left lg:text-xs">
            Your hand: {you.hand.length} card{you.hand.length === 1 ? '' : 's'} · Round {state.roundNumber}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:mt-0 lg:gap-4">
          {/* Mobile: collapsible toggles to save space. Desktop: always-visible sidebar. */}
          <div className="flex flex-col gap-2 lg:hidden">
            <button className="text-left text-xs font-medium text-slate-400 underline" onClick={() => setShowCounting((v) => !v)}>
              {showCounting ? 'Hide' : 'Show'} card counting
            </button>
            {showCounting && <CardCountingPanel ledger={ledger} />}

            <button className="text-left text-xs font-medium text-slate-400 underline" onClick={() => setShowOpponents((v) => !v)}>
              {showOpponents ? 'Hide' : 'Show'} opponent analysis
            </button>
            {showOpponents && <OpponentDashboard state={state} inference={inference} />}
          </div>

          <div className="hidden lg:flex lg:flex-col lg:gap-4">
            <CardCountingPanel ledger={ledger} />
            <OpponentDashboard state={state} inference={inference} />
          </div>
        </div>
      </div>
    </Screen>
  )
}

function disabledSet(
  ledger: ReturnType<typeof useGameStore.getState>['ledger'],
  playerId: string | undefined,
  isDisabled: (cardId: string) => boolean,
): Set<string> {
  if (!ledger || !playerId) return new Set()
  const ids = new Set<string>()
  for (const entry of ledger.entries.values()) {
    if (isDisabled(entry.card.id)) ids.add(entry.card.id)
  }
  return ids
}
