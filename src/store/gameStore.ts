import { create } from 'zustand'
import { attemptPlayCard, createNewGameEvent, editEvent, rebuild, removeEvent, undoLastEvent, type NewGameConfig, type PlayCardResult } from '../game/actions/gameEngine'
import { buildCardLedger, type CardLedger } from '../game/ledger/cardLedger'
import { computeOpponentInference, type InferenceByPlayer } from '../game/inference/opponentInference'
import { SIMULATION_PRESETS } from '../game/simulation/monteCarlo'
import type { Recommendation } from '../game/strategy/recommend'
import type { GameEvent, GameState } from '../game/state/types'
import { computeRecommendationInWorker } from '../workers/strategyClient'
import {
  deleteGame as dbDeleteGame,
  getSettings,
  listGames,
  loadGame as dbLoadGame,
  saveGame,
  saveSettings,
  type AppSettings,
  type StoredGame,
} from '../persistence/db'

export type ViewName =
  | 'home'
  | 'new-game'
  | 'hand-entry'
  | 'board'
  | 'history'
  | 'summary'
  | 'rules'
  | 'debug'
  | 'settings'

interface PendingNewGame {
  config: Omit<NewGameConfig, 'userHandCardIds'>
}

interface GameStore {
  events: GameEvent[]
  state: GameState | null
  inference: InferenceByPlayer
  ledger: CardLedger | null
  recommendation: Recommendation | null
  recommendationLoading: boolean
  recommendationSimulationsPlanned: number

  savedGames: StoredGame[]
  settings: AppSettings
  hydrated: boolean

  view: ViewName
  pendingNewGame: PendingNewGame | null
  lastError: string | null

  init: () => Promise<void>
  navigate: (view: ViewName) => void
  setPendingNewGame: (p: PendingNewGame | null) => void
  startNewGame: (config: NewGameConfig) => Promise<void>
  playCard: (playerId: string, cardId: string) => PlayCardResult
  undo: () => void
  editCardEvent: (eventId: string, playerId: string, cardId: string) => void
  removeCardEvent: (eventId: string) => void
  refreshSavedGames: () => Promise<void>
  loadGame: (gameId: string) => Promise<void>
  deleteGame: (gameId: string) => Promise<void>
  deleteActiveGame: () => Promise<void>
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
  loadEvents: (events: GameEvent[]) => Promise<void>
  clearError: () => void
}

function computeDerived(state: GameState | null) {
  if (!state) return { inference: {} as InferenceByPlayer, ledger: null as CardLedger | null }
  const inference = computeOpponentInference(state)
  const ledger = buildCardLedger(state, inference)
  return { inference, ledger }
}

export const useGameStore = create<GameStore>((set, get) => ({
  events: [],
  state: null,
  inference: {},
  ledger: null,
  recommendation: null,
  recommendationLoading: false,
  recommendationSimulationsPlanned: 0,

  savedGames: [],
  settings: {
    key: 'app',
    theme: 'dark',
    simulationLevel: 'normal',
    debugMode: false,
    activeGameId: null,
    defaultUserName: 'You',
  },
  hydrated: false,

  view: 'home',
  pendingNewGame: null,
  lastError: null,

  init: async () => {
    const [settings, saved] = await Promise.all([getSettings(), listGames()])
    set({ settings, savedGames: saved, hydrated: true })
    if (settings.activeGameId) {
      const stored = await dbLoadGame(settings.activeGameId)
      if (stored && stored.status === 'IN_PROGRESS') {
        applyEvents(set, get, stored.events)
        set({ view: 'board' })
      }
    }
  },

  navigate: (view) => set({ view }),
  setPendingNewGame: (p) => set({ pendingNewGame: p }),

  startNewGame: async (config) => {
    const event = createNewGameEvent(config)
    await applyEvents(set, get, [event], true)
    set({ view: 'board', pendingNewGame: null })
  },

  playCard: (playerId, cardId) => {
    const { state } = get()
    if (!state) return { ok: false, issues: [{ level: 'error', message: 'No active game.' }] }
    const result = attemptPlayCard(state, playerId, cardId)
    if (result.ok) {
      const nextEvents = [...get().events, result.event]
      applyEvents(set, get, nextEvents, true)
    }
    return result
  },

  undo: () => {
    const nextEvents = undoLastEvent(get().events)
    applyEvents(set, get, nextEvents, true)
  },

  editCardEvent: (eventId, playerId, cardId) => {
    const replacement: GameEvent = { id: eventId, type: 'CARD_PLAYED', timestamp: Date.now(), playerId, cardId }
    const nextEvents = editEvent(get().events, eventId, replacement)
    applyEvents(set, get, nextEvents, true)
  },

  removeCardEvent: (eventId) => {
    const nextEvents = removeEvent(get().events, eventId)
    applyEvents(set, get, nextEvents, true)
  },

  refreshSavedGames: async () => {
    const saved = await listGames()
    set({ savedGames: saved })
  },

  loadGame: async (gameId) => {
    const stored = await dbLoadGame(gameId)
    if (!stored) {
      set({ lastError: 'That saved game could not be found.' })
      return
    }
    applyEvents(set, get, stored.events)
    await get().updateSettings({ activeGameId: gameId })
    set({ view: stored.status === 'COMPLETED' ? 'summary' : 'board' })
  },

  deleteGame: async (gameId) => {
    await dbDeleteGame(gameId)
    await get().refreshSavedGames()
  },

  deleteActiveGame: async () => {
    const { state } = get()
    if (state) await dbDeleteGame(state.gameId)
    set({ events: [], state: null, inference: {}, ledger: null, recommendation: null, view: 'home' })
    await get().updateSettings({ activeGameId: null })
    await get().refreshSavedGames()
  },

  updateSettings: async (patch) => {
    const next = { ...get().settings, ...patch }
    set({ settings: next })
    await saveSettings(next)
  },

  loadEvents: async (events) => {
    await applyEvents(set, get, events, true)
    set({ view: 'board' })
  },

  clearError: () => set({ lastError: null }),
}))

/** Rebuilds derived state from an event log, persists it, and kicks off a fresh recommendation if needed. */
function applyEvents(
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore,
  events: GameEvent[],
  persist = false,
) {
  if (events.length === 0) {
    set({ events: [], state: null, inference: {}, ledger: null, recommendation: null })
    return
  }
  const state = rebuild(events)
  const { inference, ledger } = computeDerived(state)
  set({ events, state, inference, ledger, recommendation: null })

  if (persist) {
    const record: StoredGame = {
      gameId: state.gameId,
      gameName: state.gameName,
      events,
      status: state.status,
      createdAt: state.createdAt,
      updatedAt: Date.now(),
    }
    void saveGame(record).then(() => get().refreshSavedGames())
    void get().updateSettings({ activeGameId: state.status === 'COMPLETED' ? null : state.gameId })
  }

  if (state.status === 'IN_PROGRESS' && state.currentPlayerId === state.userPlayerId) {
    void recomputeRecommendation(set, get)
  }
}

let recommendationRequestToken = 0

async function recomputeRecommendation(set: (partial: Partial<GameStore>) => void, get: () => GameStore) {
  const { state, inference, settings } = get()
  if (!state || state.currentPlayerId !== state.userPlayerId) return

  const token = ++recommendationRequestToken
  set({ recommendationLoading: true, recommendationSimulationsPlanned: SIMULATION_PRESETS[settings.simulationLevel] })

  const recommendation = await computeRecommendationInWorker(state, inference, state.userPlayerId, { level: settings.simulationLevel })

  // A newer request superseded this one (undo, edit, or another play) — drop this stale result.
  if (token !== recommendationRequestToken) return
  set({ recommendation, recommendationLoading: false })
}

/** Forces a fresh recommendation computation, e.g. after the user changes the simulation accuracy level. */
export function requestRecommendationRefresh() {
  void recomputeRecommendation(useGameStore.setState, useGameStore.getState)
}
