BEGIN;
CREATE SCHEMA IF NOT EXISTS research_app;
REVOKE ALL ON SCHEMA research_app FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS research_app.sessions (
  id text PRIMARY KEY, expires bigint NOT NULL, verified_email text,
  verified_at bigint, account_id text, email text, tokens text, oauth text
);
CREATE TABLE IF NOT EXISTS research_app.challenges (
  session_id text PRIMARY KEY, email text NOT NULL, digest text NOT NULL,
  expires bigint NOT NULL, attempts integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS research_app.limits (key text PRIMARY KEY, started bigint NOT NULL, count integer NOT NULL);
CREATE TABLE IF NOT EXISTS research_app.search_cache (key text PRIMARY KEY, payload text NOT NULL, expires bigint NOT NULL);
CREATE TABLE IF NOT EXISTS research_app.researchers (id text PRIMARY KEY, payload text NOT NULL, checked_at bigint NOT NULL);
CREATE TABLE IF NOT EXISTS research_app.jobs (
  id text PRIMARY KEY, session_id text NOT NULL, kind text NOT NULL,
  state text NOT NULL, stage text NOT NULL, payload text, error text,
  created_at bigint NOT NULL, updated_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS jobs_session ON research_app.jobs(session_id, created_at);
CREATE TABLE IF NOT EXISTS research_app.batches (
  id text PRIMARY KEY, session_id text NOT NULL, account_id text NOT NULL,
  idempotency_key text NOT NULL, fingerprint text NOT NULL, created_at bigint NOT NULL,
  UNIQUE(session_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS research_app.deliveries (
  id text PRIMARY KEY, batch_id text NOT NULL REFERENCES research_app.batches(id),
  session_id text NOT NULL, account_id text NOT NULL, sender text NOT NULL,
  draft_id text NOT NULL, snapshot text NOT NULL, attachments text NOT NULL,
  state text NOT NULL, attempt integer NOT NULL DEFAULT 0,
  error text, provider_request_id text, progress text NOT NULL DEFAULT '',
  created_at bigint NOT NULL, updated_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS deliveries_session ON research_app.deliveries(session_id, account_id, created_at);
CREATE INDEX IF NOT EXISTS deliveries_draft ON research_app.deliveries(session_id, draft_id);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['sessions','challenges','limits','search_cache','researchers','jobs','batches','deliveries'] LOOP
    EXECUTE format('ALTER TABLE research_app.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE research_app.%I FROM PUBLIC, anon, authenticated', t);
  END LOOP;
END $$;
COMMIT;
