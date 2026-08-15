-- Bhabhi Thulla schema. Applied idempotently at server boot (see pool.ts).
-- Private hand data lives only in `players.hand` and is never exposed by any
-- query path the frontend can reach — the frontend has no DB credentials at
-- all; every read goes through the server's per-player view filter.

CREATE TABLE IF NOT EXISTS games (
  id                uuid PRIMARY KEY,
  room_code         text UNIQUE NOT NULL,
  status            text NOT NULL,
  host_player_id    uuid,
  max_players       int NOT NULL,
  with_bots         boolean NOT NULL DEFAULT false,
  current_player_id uuid,
  lead_suit         text,
  current_trick     jsonb NOT NULL DEFAULT '[]',
  discard_pile      jsonb NOT NULL DEFAULT '[]',
  first_trick       boolean NOT NULL DEFAULT true,
  turn_number       int NOT NULL DEFAULT 0,
  trick_number      int NOT NULL DEFAULT 0,
  thulla_count      int NOT NULL DEFAULT 0,
  turn_deadline     timestamptz,
  escape_order      jsonb NOT NULL DEFAULT '[]',
  bhabhi_player_id  uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  started_at        timestamptz,
  finished_at       timestamptz,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS players (
  id               uuid PRIMARY KEY,
  game_id          uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_secret    text NOT NULL,
  display_name     text NOT NULL,
  seat             int NOT NULL,
  connected        boolean NOT NULL DEFAULT true,
  status           text NOT NULL DEFAULT 'ACTIVE',
  hand             jsonb NOT NULL DEFAULT '[]',
  is_bot           boolean NOT NULL DEFAULT false,
  escaped_at       int,
  finish_position  int,
  stats            jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);

CREATE TABLE IF NOT EXISTS game_events (
  id         bigserial PRIMARY KEY,
  game_id    uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  type       text NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_events_game_id ON game_events(game_id);
