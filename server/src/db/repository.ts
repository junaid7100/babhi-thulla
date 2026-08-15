import { pool, dbEnabled } from "./pool";
import { GameRoom, PlayerRecord } from "../realtime/roomTypes";

/**
 * Best-effort durability layer. The in-memory `rooms` registry
 * (realtime/rooms.ts) is authoritative for a live process; every mutation is
 * mirrored here so a server restart can rehydrate active games instead of
 * silently losing them. If DATABASE_URL is not configured (e.g. local dev
 * without Postgres running), these all become no-ops and the game still
 * works — it just won't survive a process restart.
 */

export async function saveRoomSnapshot(room: GameRoom): Promise<void> {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO games (
         id, room_code, status, host_player_id, max_players, with_bots,
         current_player_id, lead_suit, current_trick, discard_pile,
         first_trick, turn_number, trick_number, thulla_count, turn_deadline,
         escape_order, bhabhi_player_id, created_at, started_at, finished_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20, now())
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         host_player_id = EXCLUDED.host_player_id,
         max_players = EXCLUDED.max_players,
         with_bots = EXCLUDED.with_bots,
         current_player_id = EXCLUDED.current_player_id,
         lead_suit = EXCLUDED.lead_suit,
         current_trick = EXCLUDED.current_trick,
         discard_pile = EXCLUDED.discard_pile,
         first_trick = EXCLUDED.first_trick,
         turn_number = EXCLUDED.turn_number,
         trick_number = EXCLUDED.trick_number,
         thulla_count = EXCLUDED.thulla_count,
         turn_deadline = EXCLUDED.turn_deadline,
         escape_order = EXCLUDED.escape_order,
         bhabhi_player_id = EXCLUDED.bhabhi_player_id,
         started_at = EXCLUDED.started_at,
         finished_at = EXCLUDED.finished_at,
         updated_at = now()`,
      [
        room.id,
        room.roomCode,
        room.status,
        room.hostPlayerId,
        room.maxPlayers,
        room.withBots,
        room.currentPlayerId,
        room.leadSuit,
        JSON.stringify(room.currentTrick),
        JSON.stringify(room.discardPile),
        room.firstTrick,
        room.turnNumber,
        room.trickNumber,
        room.thullaCount,
        room.turnDeadline ? new Date(room.turnDeadline) : null,
        JSON.stringify(room.escapeOrder),
        room.bhabhiPlayerId,
        new Date(room.createdAt),
        room.startedAt ? new Date(room.startedAt) : null,
        room.finishedAt ? new Date(room.finishedAt) : null,
      ]
    );

    for (const p of room.players) {
      await client.query(
        `INSERT INTO players (
           id, game_id, player_secret, display_name, seat, connected, status,
           hand, is_bot, escaped_at, finish_position, stats, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
         ON CONFLICT (id) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           connected = EXCLUDED.connected,
           status = EXCLUDED.status,
           hand = EXCLUDED.hand,
           escaped_at = EXCLUDED.escaped_at,
           finish_position = EXCLUDED.finish_position,
           stats = EXCLUDED.stats,
           updated_at = now()`,
        [
          p.id,
          room.id,
          p.playerSecret,
          p.displayName,
          p.seat,
          p.connected,
          p.escaped ? "ESCAPED" : "ACTIVE",
          JSON.stringify(p.hand),
          p.isBot,
          p.escapedAt,
          p.finishPosition,
          JSON.stringify(p.stats),
        ]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    // eslint-disable-next-line no-console
    console.error("persist_room_snapshot_failed", err);
  } finally {
    client.release();
  }
}

export async function logGameEvent(gameId: string, type: string, payload: unknown): Promise<void> {
  if (!pool) return;
  try {
    await pool.query(`INSERT INTO game_events (game_id, type, payload) VALUES ($1, $2, $3)`, [
      gameId,
      type,
      JSON.stringify(payload ?? {}),
    ]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("log_game_event_failed", err);
  }
}

export async function deleteRoomRow(gameId: string): Promise<void> {
  if (!pool) return;
  try {
    await pool.query(`DELETE FROM games WHERE id = $1`, [gameId]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("delete_room_row_failed", err);
  }
}

interface GameRow {
  id: string;
  room_code: string;
  status: string;
  host_player_id: string;
  max_players: number;
  with_bots: boolean;
  current_player_id: string | null;
  lead_suit: string | null;
  current_trick: unknown;
  discard_pile: unknown;
  first_trick: boolean;
  turn_number: number;
  trick_number: number;
  thulla_count: number;
  turn_deadline: string | null;
  escape_order: unknown;
  bhabhi_player_id: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

interface PlayerRow {
  id: string;
  game_id: string;
  player_secret: string;
  display_name: string;
  seat: number;
  connected: boolean;
  status: string;
  hand: unknown;
  is_bot: boolean;
  escaped_at: number | null;
  finish_position: number | null;
  stats: unknown;
}

function rowToRoom(gameRow: GameRow, playerRows: PlayerRow[]): GameRoom {
  const players: PlayerRecord[] = playerRows
    .sort((a, b) => a.seat - b.seat)
    .map((p) => ({
      id: p.id,
      playerSecret: p.player_secret,
      displayName: p.display_name,
      seat: p.seat,
      connected: false, // a rehydrated process has no live sockets yet
      socketId: null,
      hand: (p.hand as any) || [],
      isBot: p.is_bot,
      escaped: p.status === "ESCAPED",
      escapedAt: p.escaped_at,
      finishPosition: p.finish_position,
      disconnectedAt: Date.now(),
      stats: (p.stats as any) || { thullasCaused: 0, pilesPickedUp: 0 },
    }));

  return {
    id: gameRow.id,
    roomCode: gameRow.room_code,
    status: gameRow.status as GameRoom["status"],
    hostPlayerId: gameRow.host_player_id,
    maxPlayers: gameRow.max_players,
    withBots: gameRow.with_bots,
    players,
    currentTrick: (gameRow.current_trick as any) || [],
    discardPile: (gameRow.discard_pile as any) || [],
    leadSuit: (gameRow.lead_suit as any) || null,
    currentPlayerId: gameRow.current_player_id,
    firstTrick: gameRow.first_trick,
    turnNumber: gameRow.turn_number,
    trickNumber: gameRow.trick_number,
    thullaCount: gameRow.thulla_count,
    turnDeadline: gameRow.turn_deadline ? new Date(gameRow.turn_deadline).getTime() : null,
    escapeOrder: (gameRow.escape_order as any) || [],
    bhabhiPlayerId: gameRow.bhabhi_player_id,
    createdAt: new Date(gameRow.created_at).getTime(),
    startedAt: gameRow.started_at ? new Date(gameRow.started_at).getTime() : null,
    finishedAt: gameRow.finished_at ? new Date(gameRow.finished_at).getTime() : null,
    expiresAt: new Date(gameRow.created_at).getTime() + 3 * 60 * 60 * 1000,
  };
}

/** Rehydrates every non-finished game on boot so a restart doesn't lose live rooms. */
export async function loadActiveRooms(): Promise<GameRoom[]> {
  if (!pool) return [];
  const games = await pool.query<GameRow>(
    `SELECT * FROM games WHERE status NOT IN ('GAME_FINISHED', 'CANCELLED')`
  );
  const rooms: GameRoom[] = [];
  for (const gameRow of games.rows) {
    const players = await pool.query<PlayerRow>(`SELECT * FROM players WHERE game_id = $1`, [gameRow.id]);
    rooms.push(rowToRoom(gameRow, players.rows));
  }
  return rooms;
}

export { dbEnabled };
