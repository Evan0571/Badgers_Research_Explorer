# Undergraduate research evidence

This implementation belongs to the Apple preview worktree (`apple-design-preview/BuildFest_project`, branch `codex/research-backend`). The older Desktop checkout is a separate version.

The Supabase public research catalog remains authoritative. `npm run catalog:verify` reads every active record, discovers university/personal/lab sites through web search, follows relevant recruitment and team links, and independently checks mentoring history, application acceptance, current openings, credit and pay. Absence of evidence never means no. Former students count as mentoring evidence, not current capacity. A full lab can still have undergraduate mentoring history.

Every positive/negative finding carries an exact quote, a source ID, undergraduate audience scope, time scope and review date. Application forms and instructions appear under Next step, separately from email; explicit form-first instructions take precedence. Form contents are never submitted. Verified links can point to external form providers without being interpreted as evidence that a place is available.

Public HTML reading has a 10-page / 2-link-depth budget per professor. Pages over 100k characters, selected text sections, failures, identity ambiguity and unvisited links are recorded. A successful bounded review does not guarantee complete coverage of the internet. PDF-only and JavaScript-only information may require manual review. Unsupported conclusions remain unknown.

Commands (from this Apple worktree, using its `.env.local`):

```
npm run catalog:verify
npm run catalog:verify -- --limit=10 --workers=1 --batch=2
npm run catalog:verify -- --ids=uw-EXAMPLE --force
npm run catalog:verify -- --retry-failed
npm run catalog:refresh
```

The default job skips reviews attempted within seven days; `--force` rechecks them. All appointment categories are eligible, including unknown and roster-only records. `catalog:refresh` uses the same pipeline instead of refreshing only previously detailed profiles. Before each run, public records are backed up under `.data/undergraduate-verification/<run-id>/before.json`. Each person has a reproducible evidence/extraction JSON; `progress.json` and `latest.json` report completion and failures. These ignored files contain public-source research data, never API credentials. Interrupted jobs resume from completed cloud records. A failed write is recorded for retry. Cloud saves compare `last_attempt_at` before updating to preserve concurrent changes.

The faculty directory and search results have independent mentoring, current openings and application acceptance filters. All selected conditions are intersected (AND); each offers any, yes, no and unknown. Unknown includes unreviewed records and never means no. Search filter state persists, including migration of the original single-dropdown selection. Source review coverage is a separate directory filter. Professor details display the latest catalog snapshot and individual source quotes. Existing ingestion paths retain newer verification records. A shared summer program's closed application round is labeled on its link, without implying that the individual professor has no openings.
