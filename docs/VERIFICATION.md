# Backend verification — 2026-09-26

- `npm run typecheck`: passed.
- `npm test`: 47 tests passed across 3 files. Provider-boundary tests use mocks and cannot establish live model quality or email delivery.
- `npm run build`: passed; all pages and 12 API route families compile. Node prints its expected experimental SQLite warning. The earlier dynamic database-path tracing warning has been resolved.
- `git diff --check`: passed.
- Actual source fetch: UW Computer Sciences research groups page retrieved successfully, 14,879 readable characters and 100 links. No OpenAI request was made without a key.
- Actual HTTP checks: missing OpenAI configuration -> 503; wrong Origin -> 403; missing verification service -> 503; absent code challenge -> 400; unverified history -> 401; TXT resume extraction -> 200 with expected text.
- Browser with explicitly mocked OpenAI/job responses: new dynamic research data renders; save, compare, navigation and reload retain it; AI draft API flow renders a draft; a manual edit survives reload; a subsequent search failure preserves previous results; unconfigured sending stays disabled.
- Browser with explicitly mocked identity/mail responses: preview displays actual platform From and verified Reply-To; one confirmed request contains the reviewed body; history displays Accepted by email service. No real email was sent and no mock message was inserted into the production database.
- Mobile viewport 390 x 844: document width 390, no horizontal page overflow. Desktop review and mobile screenshots inspected. Test screenshots are under ignored `output/playwright/` and labeled test fixtures.
- Clean production browser at 3002: history shows the real unconfigured verification notice, zero console errors and warnings. Home, explore, history and capabilities return 200; removed components page returns 404. Claude original at 3000 still returns 200 and its Git checkout is unchanged.
- Final production preview running at http://127.0.0.1:3002. The temporary development server and mocked QA browser were stopped.

Live OpenAI answers, actual verification-code arrival, sender-domain configuration, real email delivery and production hosting remain unverified until credentials and an authorized test mailbox are supplied. Optional platform sending is disabled pending the user's transport choice. Setup and limitations: [BACKEND.md](BACKEND.md).

---

> Historical frontend baseline below. Current backend implementation, configuration requirements, and user decisions are documented in [BACKEND.md](BACKEND.md). The four-record local search, local-only generation, and Microsoft authorization descriptions below describe the earlier build, not the current backend.

# Verification record

Date: 2026-09-26. Scope: first frontend implementation, source-checked starter collection, local draft workflow. This is not acceptance of all PRD P0 requirements.

## Automated checks

- `npm run typecheck`: passed.
- `npm test`: 11 tests passed. Coverage includes cross-department results, unknown conditions, union versus intersection, Chinese keywords, named researcher lookup, rejecting unrelated queries, closed/form-only contact rules, truthful draft content, placeholder and address validation, recipient deduplication, personalization preview isolation, and schema-validated recovery.
- `npm run build`: passed. All page routes and API handlers compiled; no TypeScript errors.
- `git diff --check`: passed.
- Dependency installation audits: zero reported vulnerabilities at installation time. Not a full security audit.

## Browser checks

Playwright CLI with Chromium; desktop 1440 × 1000 and mobile 390 × 844. Production console after final navigation: zero errors and zero warnings.

| Flow                              | Observed result                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Landing Get Started               | Enters exploration without registration or résumé requirement                                                   |
| Broad AI query                    | Direction cards and four source-backed records are shown; collection limitation is visible                      |
| Chinese robotics query            | Relevant researcher appears and the overview changes to Chinese; the rest of the interface remains English      |
| Unknown credit filter             | Unknown record is excluded and the excluded count is explained; no false affirmative condition                  |
| Save and compare two researchers  | Counts, selected state, shortlist and same-dimension comparison work                                            |
| Create two drafts                 | Two separate messages, each with its own correct researcher and public email                                    |
| Manual draft edits and refresh    | Edited name/body survived reload; second draft remained separate                                                |
| Explicit per-draft PDF attachment | Filename and stored file survived reload; no automatic résumé attachment                                        |
| Final preview                     | Complete body, address, subject, attachments and selection displayed; unfinished placeholders blocked selection |
| Send state                        | Disabled; server POST returned 503 with MAIL_NOT_CONFIGURED, no sent records                                    |
| Dialog Escape                     | Closes dialog and restores focus to the triggering button, verified on both preview and research detail         |
| Mobile                            | Homepage, email workspace, and research detail visually checked; document width equals viewport width           |
| Dark theme                        | Component gallery visually checked; readable warm surface/text hierarchy retained                               |

Screenshots and snapshots are under ignored `output/playwright/`: `home-final.png`, `home-mobile.png`, `components-dark.png`, `detail-mobile.png`, `compare-desktop.png`, `mail-desktop.png`, `mail-mobile.png`, and corresponding YAML snapshots. Some screenshots precede the final font-loading optimization; the design is unchanged.

## Résumé handler

Synthetic fixtures only, no personal documents. Actual server requests verified TXT, text PDF and DOCX extraction (200). File contents were returned as review text, not interpreted as confirmed personal facts. No OAuth or email provider was called.

Limits: 10 MB per file, 20 PDF pages, 50,000 extracted characters. Oversized or unreadable documents are rejected with a recoverable message. OCR is not implemented. The production-facing hardening items in IMPLEMENTATION.md remain necessary before public deployment.

## Lighthouse

Final local production homepage report: `output/playwright/lighthouse-final.json`.

- Performance: 92.
- Accessibility: 100.
- Best practices: 100.
- Largest Contentful Paint: 3.4 s in Lighthouse's simulated mobile profile; further performance optimization is still appropriate.
- Cumulative Layout Shift: 0 after font preloading and metric-adjusted fallback.

The JSON report completed with `runtimeError: null`. The Lighthouse CLI subsequently exited with a Windows `EPERM` error while cleaning up its own temporary Chrome profile. This does not represent an application error, but the CLI command itself is not recorded as a clean exit. Automated accessibility checks do not prove complete accessibility compliance.

## Not verified / not complete

Real campus-wide discovery; model-generated analysis/drafts; UW verification codes; Microsoft tenant consent; real batch submissions; durable sending/reconciliation; delivery or replies; source freshness at time of sending; cross-account isolation. No actual professor was contacted. No claims of FR-14/FR-15 or AC-20 to AC-23 completion are made.
