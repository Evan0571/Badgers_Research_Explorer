-- Public professional evidence only. No student resumes, messages or auth tokens.
create table if not exists public.research_catalog (
  id text primary key,
  name text not null,
  department text not null default '',
  payload jsonb not null,
  checked_at timestamptz not null,
  last_attempt_at timestamptz,
  refresh_error text,
  search_document tsvector generated always as (
    to_tsvector('simple', name || ' ' || department || ' ' || coalesce(payload->>'summary','') || ' ' || coalesce(payload->>'keywords',''))
  ) stored
);
create index if not exists research_catalog_search_idx on public.research_catalog using gin(search_document);
create index if not exists research_catalog_refresh_idx on public.research_catalog(checked_at);
alter table public.research_catalog enable row level security;
revoke all on public.research_catalog from anon, authenticated;
grant select, insert, update on public.research_catalog to service_role;
-- No browser policy: only the application's server credential can access the catalog.
create table if not exists public.catalog_refresh_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  checked integer not null default 0,
  failed integer not null default 0,
  detail text
);
alter table public.catalog_refresh_runs enable row level security;
revoke all on public.catalog_refresh_runs from anon, authenticated;
grant select, insert, update on public.catalog_refresh_runs to service_role;
