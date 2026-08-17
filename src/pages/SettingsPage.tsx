import { requestRecommendationRefresh, useGameStore } from '@/store/gameStore'
import { Button, Card, Screen } from '@/components/ui'
import { SIMULATION_PRESETS, type SimulationLevel } from '@/game/simulation/monteCarlo'

const LEVELS: SimulationLevel[] = ['development', 'normal', 'high']

export function SettingsPage() {
  const navigate = useGameStore((s) => s.navigate)
  const settings = useGameStore((s) => s.settings)
  const updateSettings = useGameStore((s) => s.updateSettings)

  return (
    <Screen title="Settings" onBack={() => navigate('home')}>
      <div className="flex flex-col gap-5 lg:mx-auto lg:max-w-2xl lg:gap-8">
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Theme</p>
          <div className="flex gap-2">
            {(['dark', 'light', 'high-contrast'] as const).map((theme) => (
              <Button
                key={theme}
                variant={settings.theme === theme ? 'primary' : 'secondary'}
                className="flex-1 capitalize"
                onClick={() => void updateSettings({ theme })}
              >
                {theme.replace('-', ' ')}
              </Button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">Dark mode is the default, optimized for fast, low-glare, one-handed play.</p>
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Simulation Accuracy</p>
          <div className="flex flex-col gap-2">
            {LEVELS.map((level) => (
              <Card
                key={level}
                className={`flex cursor-pointer items-center justify-between ${settings.simulationLevel === level ? 'border-amber-400' : ''}`}
              >
                <button
                  className="flex flex-1 items-center justify-between text-left"
                  onClick={() => {
                    void updateSettings({ simulationLevel: level })
                    requestRecommendationRefresh()
                  }}
                >
                  <span className="text-sm font-medium capitalize">{level}</span>
                  <span className="text-xs text-slate-400">{SIMULATION_PRESETS[level]} simulations</span>
                </button>
              </Card>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Higher accuracy runs more simulated futures per recommendation — more reliable, but slower.
          </p>
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Developer</p>
          <Card className="flex items-center justify-between">
            <span className="text-sm">Debug mode</span>
            <button
              onClick={() => void updateSettings({ debugMode: !settings.debugMode })}
              className={`h-6 w-11 rounded-full transition ${settings.debugMode ? 'bg-amber-400' : 'bg-slate-700'}`}
            >
              <span
                className={`block h-5 w-5 translate-x-0.5 rounded-full bg-slate-950 transition ${settings.debugMode ? 'translate-x-5' : ''}`}
              />
            </button>
          </Card>
        </section>
      </div>
    </Screen>
  )
}
