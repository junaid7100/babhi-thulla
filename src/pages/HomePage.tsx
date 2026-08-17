import { useGameStore } from '@/store/gameStore'
import { Button, Card, Screen } from '@/components/ui'
import { buildDemoEvents } from '@/game/demo/demoGame'

export function HomePage() {
  const navigate = useGameStore((s) => s.navigate)
  const setPendingNewGame = useGameStore((s) => s.setPendingNewGame)
  const state = useGameStore((s) => s.state)
  const savedGames = useGameStore((s) => s.savedGames)
  const loadGame = useGameStore((s) => s.loadGame)
  const deleteGame = useGameStore((s) => s.deleteGame)
  const loadEvents = useGameStore((s) => s.loadEvents)
  const settings = useGameStore((s) => s.settings)

  const inProgress = savedGames.filter((g) => g.status === 'IN_PROGRESS')
  const completed = savedGames.filter((g) => g.status === 'COMPLETED')

  return (
    <Screen title="Baavi Tulla">
      <p className="mb-6 text-sm text-slate-400">Your real-time AI strategy co-pilot for the Baavi Tulla card game.</p>

      <div className="flex flex-col gap-3">
        <Button
          onClick={() => {
            setPendingNewGame(null)
            navigate('new-game')
          }}
        >
          + New Game
        </Button>

        {state && state.status === 'IN_PROGRESS' && (
          <Button variant="secondary" onClick={() => navigate('board')}>
            Continue "{state.gameName}"
          </Button>
        )}

        <Button
          variant="secondary"
          onClick={() => {
            void loadEvents(buildDemoEvents())
          }}
        >
          ▶ Load Demo Game
        </Button>

        <Button variant="ghost" onClick={() => navigate('rules')}>
          Rule Validation
        </Button>
        <Button variant="ghost" onClick={() => navigate('settings')}>
          Settings
        </Button>
        {settings.debugMode && (
          <Button variant="ghost" onClick={() => navigate('debug')}>
            Debug
          </Button>
        )}
      </div>

      {inProgress.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">In progress</h2>
          <div className="flex flex-col gap-2">
            {inProgress.map((g) => (
              <Card key={g.gameId} className="flex items-center justify-between">
                <button className="text-left" onClick={() => void loadGame(g.gameId)}>
                  <p className="font-medium">{g.gameName}</p>
                  <p className="text-xs text-slate-500">{new Date(g.updatedAt).toLocaleString()}</p>
                </button>
                <button className="text-xs text-red-400" onClick={() => void deleteGame(g.gameId)}>
                  Delete
                </button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Game history</h2>
          <div className="flex flex-col gap-2">
            {completed.map((g) => (
              <Card key={g.gameId} className="flex items-center justify-between">
                <button className="text-left" onClick={() => void loadGame(g.gameId)}>
                  <p className="font-medium">{g.gameName}</p>
                  <p className="text-xs text-slate-500">{new Date(g.updatedAt).toLocaleString()}</p>
                </button>
                <button className="text-xs text-red-400" onClick={() => void deleteGame(g.gameId)}>
                  Delete
                </button>
              </Card>
            ))}
          </div>
        </section>
      )}
    </Screen>
  )
}
