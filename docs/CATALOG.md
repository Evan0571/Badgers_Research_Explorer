# Research catalog

The app reads all collected public professor records from Supabase (500-row database pagination; no overall result cap), matches the entire collection, then shows every match. The separate /explore/faculty page browses every stored record with 50-row pages and department, appointment category, research evidence and verified-email filters. Search excludes emeritus-only appointments by default unless explicitly requested; the faculty catalog includes and labels them.

The base roster comes from [UW–Madison's official Guide](https://guide.wisc.edu/faculty/). Its 2026–2027 list contains 4,249 teaching appointments, including 2,851 professor-rank entries across departments. The Guide is an annual roster, not a live hiring or openings directory. Clinical, teaching, adjunct, visiting and emeritus appointments are explicitly distinguished, so this count is not interchangeable with an institutional tenure-track faculty headcount. Same-name professors in different departments have separate identities.

Research enrichment uses the university-linked [Research at UW–Madison platform](https://wisc.discovery.academicanalytics.com/), traversing all its public units. Only unambiguous name/department matches are merged. Store public research terms, short summaries and recent publication titles/years/DOIs; do not copy entire abstracts, private activities or hidden contact fields. Unmatched people remain in the roster with unknown research and contact details.

Contact discovery starts from the [official department index](https://www.wisc.edu/academics/departments-and-programs/), follows faculty directory links and pagination, and verifies matching individual-page headings. An email is retained only when explicitly published and unambiguous on that page. The restricted WhitePages bulk directory is not used. Unreachable, JavaScript-only and ambiguous pages remain pending; directory traversal bounds are reported rather than treated as complete coverage.

Apply `supabase/migrations/202609270001_research_catalog.sql` in the project's SQL editor. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the server's ignored `.env.local`. Never expose the service role through NEXT_PUBLIC variables. RLS is enabled, with no anonymous or authenticated client policies. Only public professional records enter Supabase; resumes, student information, email drafts and mailbox credentials do not.

Commands:

- `npm run catalog:sync`: copy existing verified local profiles to Supabase.
- `npm run catalog:campus` (also `catalog:seed`): reread the official university-wide roster, discover all research-platform units/people, enrich matched professor appointments, and upsert all roster entries into Supabase. Resumable sanitized evidence caches live in .data/campus-import. Fresh research evidence is reused with its original date; --all forces a new fetch.
- `npm run catalog:contacts`: discover department faculty pages and enrich public individual profile links and email evidence. Cached pages retain their original verification date. --collect collects evidence without writing the catalog; --apply merges saved evidence after another import finishes.
- `npm run catalog:departments`: legacy AI-assisted deep profile importer for the explicitly configured Statistics and Educational Psychology directories. This is supplemental, not the campus roster.
- `npm run catalog:refresh`: deeply refresh previously analyzed individual profiles with evidence older than seven days, two researchers at a time. A failed fetch or ambiguous affiliation preserves the old evidence/date and records a failure; it never claims a successful recheck.
- `npm run catalog:refresh -- --all`: explicitly refresh all profiles, including recent ones.

Weekly order is campus roster/research index, department contacts, then deep profile refresh. New web discovery remains an explicitly bounded batch of up to 24 candidates, useful for missing or newly appointed people; it is not the mechanism for establishing the campus-wide base.

Weekly execution is configured in a Codex recurring task on the local host. The machine and Codex must be available; this is not an always-on cloud worker. For production, run the same commands in a deployed worker/CI on a weekly schedule with the server's Supabase and OpenAI environment variables. Do not register a Supabase HTTP cron against localhost. Logs are output/catalog-campus-progress.json, output/catalog-contacts.json and output/catalog-refresh.json; deep refresh runs also enter catalog_refresh_runs.

Research evidence, email verification and current openings are separate checks. No publication or public email implies an available student position. Old records are preserved on source failure, and a disappeared annual-roster entry is not automatically deleted because the Guide can lag current appointments.

Search interpretation is cached separately from faculty records, so repeating a query still sees newly imported records. Evidence older than seven days is explicitly labeled; email sending continues to recheck public contact sources.

## Campus import verification — September 26, 2026 (local time)

- 2,851 professor-rank entries from the official annual roster, spanning 146 named source departments plus entries without a stated department; 2,852 active catalog identities including one separately verified professor outside that annual list.
- 2,268 active identities have research evidence; 584 remain explicitly pending. These are data coverage states, not assertions that other professors have no research.
- The research-platform traversal read all 321 positive-ID units and inspected 2,296 matched public profiles with zero failed profile reads. Public title/keyword evidence covers many disciplines.
- Department traversal checked 366 directory pages and 1,128 candidate profile links; 671 identities received individual official profile evidence. Together with preserved evidence, 637 catalog entries have a verified public email. Fourteen source URLs were unavailable or obsolete; details remain in output/catalog-contacts.json.
- Eight legacy abbreviated-name duplicates were reconciled to their original stable IDs. Superseded payloads remain as reversible aliases; same-name people in different departments remain separate. No records were permanently deleted.
- Supabase and the local mirror match across all active identities. History has 47 entries, Psychology 41, Chemistry 38, Mathematics 80 and Mechanical Engineering 61 (joint affiliations can overlap).
- A broad AI query returns all 414 matches. Its six directions contain 360, 66, 41, 43, 13 and 4 matches respectively, with overlap permitted. Matching normalizes each profile once; the cached-intent verification ran in 2.77 seconds versus 24.39 seconds before this optimization. This does not promise that a new model-generated query interpretation is equally fast.
- Production requests share a 60-second catalog snapshot. Worker/audit scripts read the cloud directly. Imports preserve original evidence dates when using cached pages.
- All 92 automated tests pass; the production build includes the new faculty directory. Audit scripts and generated coverage/identity reports are available locally. Campus import refuses identity collisions or changes to a known stable ID; --check-identities checks this without modifying the catalog.

## Earlier 54-profile snapshot (superseded by the campus import)

- Connected catalog: 54 verified public profiles, including 36 successfully imported Statistics directory profiles. The migration has been applied to the BuildFest Research Explorer Supabase project (`yobbjmdcpcttqofgqgzb`), and all 54 cloud payloads match the local catalog. Server credentials are stored in the ignored `.env.local`.
- The existing broad AI query returns 19 total matches and six exploratory directions. Selecting the language-model direction shows three; clearing filters restores all 19. No match list is truncated to six.
- `yiqiao.zhong[@]wisc[DOT]edu` was verified against the public faculty homepage and normalized to a usable email address.
- Draft polishing was exercised through preview, apply and undo without sending any email. Existing saved profiles, comparisons, background, draft and Outlook connection remain available on port 3002.
- All 77 automated tests passed; the nine catalog tests were rerun after the query-plan revision. The final production build passes, and the results page has no captured browser warnings or errors.
- A local Codex weekly task is registered for Sunday at 03:00 in the user's local timezone. Cloud database connection is verified; always-on cloud execution is not configured. A successful refresh-script run on September 26 wrote a completed cloud log with zero due profiles and zero failures because the evidence is fresh.
- Live SQL verification confirms 54 cloud records, RLS enabled, and no anonymous SELECT privilege. The restarted application reports `sharedCatalog: true`.

The live app and these changes are in the existing `codex/research-backend` worktree at `C:\Users\12482\.codex\worktrees\apple-design-preview\BuildFest_project`. The older static-preview checkout on the desktop was left unchanged.
