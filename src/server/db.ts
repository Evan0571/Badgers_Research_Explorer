import { DatabaseSync } from "node:sqlite";
import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, types, type PoolClient } from "pg";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config";
import { supabaseCA } from "./supabase-ca";

const databases = new Map<string, DatabaseSync>();
function sqlite() {
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
// Application timestamps fit safely in JS numbers. Never round arbitrary bigint values.
types.setTypeParser(20, (value) => {
  const number = Number(value);
  if (!Number.isSafeInteger(number))
    throw new Error("Database integer out of range");
  return number;
});
type Value = string | number | bigint | Uint8Array | null;
type Row = Record<string, string | number | null>;
const context = new AsyncLocalStorage<{
  client?: PoolClient;
  sqlite?: DatabaseSync;
}>();
let pool: Pool | undefined;
function postgres() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 15000,
      ssl: { rejectUnauthorized: true, ca: supabaseCA },
    });
    pool.on("error", () => console.error("Database connection interrupted"));
  }
  return pool;
}

/** Convert only bind markers, never quoted literals, into PostgreSQL parameters. */
export function postgresSQL(sql: string) {
  let quoted = false,
    index = 0,
    result = "";
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'") {
      if (quoted && sql[i + 1] === "'") {
        result += "''";
        i++;
        continue;
      }
      quoted = !quoted;
    }
    result += char === "?" && !quoted ? "$" + ++index : char;
  }
  // Dedicated, unexposed schema keeps auth data separate from the public catalog.
  return result.replace(
    /\b(FROM|JOIN|INTO|UPDATE)\s+(sessions|challenges|limits|search_cache|researchers|jobs|batches|deliveries)\b/gi,
    "$1 research_app.$2",
  );
}

let sqliteTail = Promise.resolve();
async function sqliteExclusive<T>(work: () => Promise<T>): Promise<T> {
  const previous = sqliteTail;
  let release!: () => void;
  sqliteTail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await work();
  } finally {
    release();
  }
}
async function query(sql: string, values: Value[] = []) {
  if (process.env.DATABASE_URL) {
    const client = context.getStore()?.client || postgres();
    const result = await client.query(
      postgresSQL(sql),
      values.map((v) => (v instanceof Uint8Array ? Buffer.from(v) : v)),
    );
    return { rows: result.rows as Row[], changes: result.rowCount || 0 };
  }
  if (process.env.VERCEL) throw new Error("DATABASE_URL is required on Vercel");
  const run = async () => {
    const statement = (context.getStore()?.sqlite || sqlite()).prepare(sql);
    if (/^\s*(SELECT|WITH)/i.test(sql))
      return { rows: statement.all(...values) as Row[], changes: 0 };
    return {
      rows: [] as Row[],
      changes: Number(statement.run(...values).changes),
    };
  };
  return context.getStore()?.sqlite ? run() : sqliteExclusive(run);
}
export function db() {
  return {
    async close() {
      if (pool) {
        await pool.end();
        pool = undefined;
      }
      for (const connection of databases.values()) connection.close();
      databases.clear();
    },
    prepare(sql: string) {
      return {
        async get(...values: Value[]) {
          return (await query(sql, values)).rows[0];
        },
        async all(...values: Value[]) {
          return (await query(sql, values)).rows;
        },
        async run(...values: Value[]) {
          return { changes: (await query(sql, values)).changes };
        },
      };
    },
    async exec(sql: string) {
      if (process.env.DATABASE_URL) {
        await (context.getStore()?.client || postgres()).query(
          postgresSQL(sql),
        );
      } else {
        const run = async () => {
          (context.getStore()?.sqlite || sqlite()).exec(sql);
        };
        if (context.getStore()?.sqlite) await run();
        else await sqliteExclusive(run);
      }
    },
  };
}
export async function transaction<T>(work: () => T | Promise<T>): Promise<T> {
  if (context.getStore()) return work();
  if (process.env.DATABASE_URL) {
    const client = await postgres().connect();
    try {
      await client.query("BEGIN");
      // Serialize short read/modify/write sections across every serverless instance.
      // External API calls must remain outside these transactions.
      await client.query("SELECT pg_advisory_xact_lock(271092026)");
      const result = await context.run({ client }, work);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
  return sqliteExclusive(async () => {
    const connection = sqlite();
    connection.exec("BEGIN IMMEDIATE");
    try {
      const result = await context.run({ sqlite: connection }, work);
      connection.exec("COMMIT");
      return result;
    } catch (error) {
      connection.exec("ROLLBACK");
      throw error;
    }
  });
}
