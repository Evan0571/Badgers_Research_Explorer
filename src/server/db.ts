import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config";

const databases = new Map<string, DatabaseSync>();
export function db() {
  const path = config().database;
  if (databases.has(path)) return databases.get(path)!;
  mkdirSync(dirname(path), { recursive: true });
  const connection = new DatabaseSync(path);
  connection.exec(`
    PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, expires INTEGER NOT NULL, verified_email TEXT,
      verified_at INTEGER, account_id TEXT, email TEXT, tokens TEXT, oauth TEXT
    );
    CREATE TABLE IF NOT EXISTS challenges (
      session_id TEXT PRIMARY KEY, email TEXT NOT NULL, digest TEXT NOT NULL,
      expires INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, started INTEGER NOT NULL, count INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS search_cache (key TEXT PRIMARY KEY, payload TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS researchers (id TEXT PRIMARY KEY, payload TEXT NOT NULL, checked_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, kind TEXT NOT NULL,
      state TEXT NOT NULL, stage TEXT NOT NULL, payload TEXT, error TEXT,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS jobs_session ON jobs(session_id, created_at);
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, account_id TEXT NOT NULL,
      idempotency_key TEXT NOT NULL, fingerprint TEXT NOT NULL, created_at INTEGER NOT NULL,
      UNIQUE(session_id, idempotency_key)
    );
    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY, batch_id TEXT NOT NULL REFERENCES batches(id),
      session_id TEXT NOT NULL, account_id TEXT NOT NULL, sender TEXT NOT NULL,
      draft_id TEXT NOT NULL, snapshot TEXT NOT NULL, attachments TEXT NOT NULL,
      state TEXT NOT NULL, attempt INTEGER NOT NULL DEFAULT 0,
      error TEXT, provider_request_id TEXT, progress TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS deliveries_session ON deliveries(session_id, account_id, created_at);
    CREATE INDEX IF NOT EXISTS deliveries_draft ON deliveries(session_id, draft_id);
  `);
  databases.set(path, connection);
  return connection;
}
export function transaction<T>(work: () => T): T {
  const connection = db();
  connection.exec("BEGIN IMMEDIATE");
  try {
    const value = work();
    connection.exec("COMMIT");
    return value;
  } catch (error) {
    connection.exec("ROLLBACK");
    throw error;
  }
}
