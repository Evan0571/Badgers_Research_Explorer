# Vercel and Supabase deployment

Production URL: https://researchexplorer.online

The `badgers-research-explorer` Vercel project belongs to `evan0571s-projects` on the Hobby plan. The server runs in `iad1`, near the existing Supabase project in US East. DNS remains on Cloudflare. Hosting uses free plans; OpenAI usage and domain renewal remain separate costs.

## Persistent storage

Production uses `DATABASE_URL` and the Supabase transaction pooler on port 6543. Passwords in connection URIs must be percent-encoded. TLS validates the Supabase CA. Each function instance uses at most one connection and does not use named prepared statements.

`supabase/migrations/202609270002_application_state.sql` creates eight application tables in the private `research_app` schema. The schema is unavailable to the browser API roles. Existing `public.research_catalog` records remain the shared public-source catalog; catalog reads do not copy thousands of rows on every cold start. Short read/modify/write transactions use a database advisory lock to protect verification, rate limits, job claims, and batch idempotency across instances.

Local development and unit tests still use SQLite when `DATABASE_URL` is absent. Production never falls back to an ephemeral SQLite file. Existing local sessions and histories are not imported into the new website. Browser-saved drafts and favorites remain specific to the browser and website origin.

Run the schema migration with server credentials in the ignored `.env.local`:

```powershell
npx tsx scripts/migrate-database.ts
```

Back up the database and `APP_ENCRYPTION_KEY` together. Changing that key makes existing encrypted Outlook tokens, message snapshots, and attachments unreadable.

## Environment and account configuration

Set these server-only production environment variables in Vercel:

- `APP_ORIGIN=https://researchexplorer.online`
- `APP_ENCRYPTION_KEY`, `DATABASE_URL`
- `OPENAI_API_KEY`, `OPENAI_MODEL`
- `RESEND_API_KEY`, `VERIFICATION_FROM`
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

Never set any of these secrets under `NEXT_PUBLIC_*`. `.vercelignore` excludes all environment files, local databases, and QA output from uploads. `.env.deploy.local` is only a local password-entry helper and is not part of the deployment.

Microsoft Entra must register `https://researchexplorer.online/api/outlook/callback` as a **Web** redirect URI, while preserving the existing localhost callback. The app still requires UW mailbox verification and the user's delegated Microsoft authorization. Deployment does not authorize or send emails on a user's behalf.

Cloudflare's apex CNAME points to `1b72699e0e6af6ad.vercel-dns-017.com`, **DNS only**. Vercel issues HTTPS automatically. Keep the existing Resend DKIM, `rsend`, `send`, and DMARC records.

## Free-plan execution limits

- Functions allow 300 seconds; search and draft jobs stop at 270 seconds and preserve completed partial results.
- Next.js `after()` handles request follow-up work. This is not an independent permanent worker: interrupted jobs require an explicit retry.
- A mail batch stops starting additional messages after its first minute, leaving room for source checks and submission. Remaining messages stay `queued`, show a pause reason, and can be resumed individually from contact history. Ambiguous submissions remain `unknown` and cannot be retried automatically.
- Resume uploads are limited to 3 MiB. Message attachments total at most 2 MiB per batch to fit Vercel's request size limit after Base64 encoding.

## Verification and redeployment

```powershell
npm ci
npm run typecheck
npm test
npm run build
npx tsx scripts/check-cloud-database.ts
$sourceCommit = git rev-parse HEAD
npx vercel deploy --prod --yes --scope evan0571s-projects --build-env "SOURCE_COMMIT_SHA=$sourceCommit"
```

Deploy committed code so the homepage footer's revision link identifies the exact source being published. `SOURCE_COMMIT_SHA` is a public commit identifier captured during the build; Git-triggered builds can instead use Vercel's `VERCEL_GIT_COMMIT_SHA`. If neither contains a valid full commit SHA, the footer still links to the repository and omits the revision badge.

The cloud check creates a unique synthetic test namespace, verifies cross-process rate limits, rollback, one-time verification, persisted jobs, batch idempotency, single-worker submission claims, and reconnect persistence, then removes only its own test records. Its sender is simulated; it never sends real emails or calls OpenAI.

After deploying, verify the HTTPS page, catalog, session cookie, and a catalog-only search job on the actual domain. `/api/capabilities` reports configured integrations, not proof that a provider credential or a user's mailbox authorization works. Real verification email delivery and Outlook sending require the user to perform their normal account flow.
