import { useGameStore } from '@/store/gameStore'
import { Button, Card, Pill, Screen } from '@/components/ui'

export function SummaryPage() {
  const navigate = useGameStore((s) => s.navigate)
  const state = useGameStore((s) => s.state)
  const setPendingNewGame = useGameStore((s) => s.setPendingNewGame)
  const deleteActiveGame = useGameStore((s) => s.deleteActiveGame)

  if (!state) {
    return (
      <Screen title="Game Summary" onBack={() => navigate('home')}>
        <p className="text-sm text-slate-500">No completed game to show.</p>
      </Screen>
    )
  }

  const bhabhiId = state.finishOrder[state.finishOrder.length - 1]
  const ranked = state.finishOrder.map((id, i) => ({ rank: i + 1, player: state.players.find((p) => p.id === id)! }))

  const playAgain = () => {
    setPendingNewGame({
      config: {
        gameName: state.gameName,
        rules: state.rules,
        players: state.players.map((p) => ({ id: p.id, name: p.name, seat: p.seat, isUser: p.isUser })),
        userPlayerId: state.userPlayerId,
        dealerPlayerId: state.dealerPlayerId,
      },
    })
    navigate('hand-entry')
  }

  return (
    <Screen title="Game Summary" onBack={() => navigate('home')}>
      <div className="lg:mx-auto lg:max-w-2xl">
      <Card className="mb-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">The Bhabhi is…</p>
        <p className="mt-1 text-2xl font-bold text-red-400">{state.players.find((p) => p.id === bhabhiId)?.name}</p>
      </Card>

      <div className="flex flex-col gap-2">
        {ranked.map(({ rank, player }) => (
          <Card key={player.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-6 text-center text-sm font-bold text-slate-500">#{rank}</span>
              <span className="font-medium">{player.name}</span>
              {player.id === state.userPlayerId && <Pill>You</Pill>}
              {player.id === bhabhiId && <Pill tone="bad">Bhabhi</Pill>}
            </div>
            <span className="text-xs text-slate-400">{player.tricksWon} tricks won</span>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={playAgain}>Play Again (same players)</Button>
        <Button
          variant="secondary"
          onClick={() => {
            setPendingNewGame(null)
            navigate('new-game')
          }}
        >
          New Game
        </Button>
        <Button variant="ghost" onClick={() => navigate('history')}>
          View Full History
        </Button>
        <Button variant="danger" onClick={() => void deleteActiveGame()}>
          Delete This Game
        </Button>
      </div>
      </div>
    </Screen>
  )
}
