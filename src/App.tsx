import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { HomePage } from '@/pages/HomePage'
import { NewGamePage } from '@/pages/NewGamePage'
import { HandEntryPage } from '@/pages/HandEntryPage'
import { BoardPage } from '@/pages/BoardPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { SummaryPage } from '@/pages/SummaryPage'
import { RulesPage } from '@/pages/RulesPage'
import { DebugPage } from '@/pages/DebugPage'
import { SettingsPage } from '@/pages/SettingsPage'

export default function App() {
  const hydrated = useGameStore((s) => s.hydrated)
  const view = useGameStore((s) => s.view)
  const init = useGameStore((s) => s.init)
  const lastError = useGameStore((s) => s.lastError)
  const clearError = useGameStore((s) => s.clearError)

  useEffect(() => {
    void init()
  }, [init])

  if (!hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-950 text-slate-400">
        <p className="text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-slate-950 text-slate-100">
      {lastError && (
        <div className="flex items-center justify-between gap-2 bg-red-900/80 px-4 py-2 text-sm text-red-100">
          <span>{lastError}</span>
          <button className="shrink-0 rounded bg-red-800 px-2 py-1 text-xs" onClick={clearError}>
            Dismiss
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {view === 'home' && <HomePage />}
        {view === 'new-game' && <NewGamePage />}
        {view === 'hand-entry' && <HandEntryPage />}
        {view === 'board' && <BoardPage />}
        {view === 'history' && <HistoryPage />}
        {view === 'summary' && <SummaryPage />}
        {view === 'rules' && <RulesPage />}
        {view === 'debug' && <DebugPage />}
        {view === 'settings' && <SettingsPage />}
      </div>
    </div>
  )
}
