import { readFileSync } from "fs";
import path from "path";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "";

export const dbEnabled = connectionString.length > 0;

export const pool = dbEnabled
  ? new Pool({
      connectionString,
      ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
      max: 10,
    })
  : null;

let schemaReady: Promise<void> | null = null;

/** Idempotently creates the schema. Safe to call on every boot. */
export function ensureSchema(): Promise<void> {
  if (!pool) return Promise.resolve();
  if (!schemaReady) {
    const sql = readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    schemaReady = pool.query(sql).then(() => undefined);
  }
  return schemaReady;
}
