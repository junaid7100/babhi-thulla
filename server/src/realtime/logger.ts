import { logGameEvent } from "../db/repository";

const EVENT_NAMES = [
  "GAME_CREATED",
  "PLAYER_JOINED",
  "GAME_STARTED",
  "CARDS_DEALT",
  "CARD_PLAYED",
  "THULLA_DETECTED",
  "TRICK_RESOLVED",
  "PLAYER_ESCAPED",
  "HOST_CHANGED",
  "PLAYER_DISCONNECTED",
  "PLAYER_RECONNECTED",
  "GAME_FINISHED",
  "ROOM_EXPIRED",
] as const;

export type GameEventName = (typeof EVENT_NAMES)[number];

/** Structured server-side event log. Never pass card identities/hands here. */
export function logGameEventSafe(gameId: string, type: GameEventName, payload: Record<string, unknown> = {}): void {
  // eslint-disable-next-line no-console
  console.log(`[game_event] ${type}`, JSON.stringify({ gameId, ...payload }));
  void logGameEvent(gameId, type, payload);
}
