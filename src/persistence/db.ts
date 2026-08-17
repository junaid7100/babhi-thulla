import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { GameEvent } from '../game/state/types'
import type { GameRules } from '../game/rules/types'

export interface StoredGame {
  gameId: string
  gameName: string
  events: GameEvent[]
  status: 'IN_PROGRESS' | 'COMPLETED'
  createdAt: number
  updatedAt: number
}

export interface RuleTemplate extends GameRules {
  savedAt: number
}

export interface AppSettings {
  key: 'app'
  theme: 'dark' | 'light' | 'high-contrast'
  simulationLevel: 'development' | 'normal' | 'high'
  debugMode: boolean
  activeGameId: string | null
  defaultUserName: string
}

interface BaaviTullaDB extends DBSchema {
  games: { key: string; value: StoredGame; indexes: { updatedAt: number } }
  ruleTemplates: { key: string; value: RuleTemplate }
  settings: { key: string; value: AppSettings }
}

let dbPromise: Promise<IDBPDatabase<BaaviTullaDB>> | null = null

function getDb() {
  dbPromise ??= openDB<BaaviTullaDB>('baavi-tulla', 1, {
    upgrade(db) {
      const games = db.createObjectStore('games', { keyPath: 'gameId' })
      games.createIndex('updatedAt', 'updatedAt')
      db.createObjectStore('ruleTemplates', { keyPath: 'id' })
      db.createObjectStore('settings', { keyPath: 'key' })
    },
  })
  return dbPromise
}

export async function saveGame(game: StoredGame): Promise<void> {
  const db = await getDb()
  await db.put('games', game)
}

export async function loadGame(gameId: string): Promise<StoredGame | undefined> {
  const db = await getDb()
  return db.get('games', gameId)
}

export async function listGames(): Promise<StoredGame[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('games', 'updatedAt')
  return all.reverse()
}

export async function deleteGame(gameId: string): Promise<void> {
  const db = await getDb()
  await db.delete('games', gameId)
}

export async function saveRuleTemplate(template: RuleTemplate): Promise<void> {
  const db = await getDb()
  await db.put('ruleTemplates', template)
}

export async function listRuleTemplates(): Promise<RuleTemplate[]> {
  const db = await getDb()
  return db.getAll('ruleTemplates')
}

export async function deleteRuleTemplate(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('ruleTemplates', id)
}

const DEFAULT_SETTINGS: AppSettings = {
  key: 'app',
  theme: 'dark',
  simulationLevel: 'normal',
  debugMode: false,
  activeGameId: null,
  defaultUserName: 'You',
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb()
  const stored = await db.get('settings', 'app')
  return stored ?? DEFAULT_SETTINGS
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDb()
  await db.put('settings', settings)
}
