import nextEnv from "@next/env";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { supabaseCA } from "../src/server/supabase-ca";
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  ssl: { rejectUnauthorized: true, ca: supabaseCA },
  connectionTimeoutMillis: 15000,
});
try {
  await pool.query(
    readFileSync(
      "supabase/migrations/202609270002_application_state.sql",
      "utf8",
    ),
  );
  const result = await pool.query(
    "SELECT count(*)::int AS tables FROM information_schema.tables WHERE table_schema='research_app'",
  );
  console.log(
    "Application database ready:",
    result.rows[0].tables,
    "private tables.",
  );
} catch (error) {
  console.error(
    "Migration failed:",
    error instanceof Error
      ? error.message.replace(
          /postgres(?:ql)?:\/\/\S+/g,
          "[connection redacted]",
        )
      : "database error",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
