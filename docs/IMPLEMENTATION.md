> Historical frontend baseline below. Current backend implementation, configuration requirements, and user decisions are documented in [BACKEND.md](BACKEND.md). The four-record local search, local-only generation, and Microsoft authorization descriptions below describe the earlier build, not the current backend.

# Implementation status

Date: 2026-09-26. This is the first functional frontend and component-library implementation, not completion of every PRD P0 requirement. The earlier document-only boundary in BRD/PRD is superseded by the user's explicit request to start development. Original requirements are preserved.

## Running

Node.js 22.13+ or 24; npm install, npm run dev. Production: npm run build then npm start. Default URL http://127.0.0.1:3000. No credentials are needed for the current local build.

## Implemented

- P01 landing page and P02 interest input; English interface, English/Chinese keyword input and bilingual summary selection.
- P03 directions for broad AI input, union/intersection controls, named researcher lookup, department/recruitment/explicit-credit filters, real empty states. This searches a **four-person source-checked collection only**.
- P04 accessible research dialog, plain-language explanations, labeled analogies, three-state conditions, source links/dates, contact-route-aware actions, local notes.
- P05 up to three comparisons; P06 shortlist and batch selection of email-eligible researchers.
- P07 independent local template drafts, recipient/subject/body editing, three optional personalization questions with replacement preview, per-draft attachments in IndexedDB, text export. Text exports do not contain attachment bytes.
- P08 full previews, placeholder and recipient validation, duplicate-recipient detection, attachment presence checks, persisted selections. Sending remains disabled.
- P09 truthful empty history. No fake send records or fake connected mailbox.
- Text PDF / DOCX / TXT résumé extraction, 10 MB file bound, manual text review, no auto-inferred background, no OCR. Only reviewed text persists; original résumé upload is processed transiently. Attachments require separate explicit selection.
- Visitor browser persistence with schema validation and visible storage failure. Corrupt state is left untouched rather than overwritten. Cross-device/account persistence is not implemented.
- /components interactive gallery; common components in src/components/ui; CSS tokens in src/app/tokens.css. Light and dark themes, reduced motion, mobile layouts.

## External integrations and remaining P0 work

| Area                              | Status          | Next implementation and verification                                                                                                                                                                                                                           |
| --------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Campus-wide discovery             | Not implemented | Choose search provider, source fetch/identity resolution, per-fact evidence and coverage reporting; verify cross-domain university-linked profiles. Do not silently fall back to the starter collection.                                                       |
| Model explanations and generation | Not implemented | Provider adapter, source-constrained structured output, untrusted source handling, individual generation failure/retry and user-edit versioning. Current drafts are labeled local templates.                                                                   |
| Résumé understanding              | Partial         | Text extraction works; user review/interest selection is manual. Add optional proposed background fields with explicit confirmation. No invented skills.                                                                                                       |
| UW email identity                 | Not implemented | Send actual verification code to a UW school mailbox, server-side expiring challenge, attempt limits, verified identity bound to Microsoft identity. Resolve allowed alias domains with UW policies.                                                           |
| Microsoft 365 authorization       | Not implemented | Register app, minimal delegated Mail.Send permissions, OAuth/OIDC with state and PKCE, server-side token store and secure session, verify tenant account policy. No secrets in browser persistence.                                                            |
| Real batch sending                | Not implemented | Durable database transaction for immutable per-message snapshots, account scoping, idempotency and reconciliation. Mark 202 as accepted, not delivered. Timeout must become unknown and must not be blindly retried. Test only with authorized team mailboxes. |
| Contact history                   | UI empty state  | Populate only from actual submissions; manual progress and cancellation/retry still needed.                                                                                                                                                                    |
| Source freshness                  | Manual snapshot | Revalidate recruitment and contact route before sending; expired/conflicting/unavailable evidence cannot become affirmative conditions.                                                                                                                        |
| Production hardening              | Pending         | Server-side streaming upload limits, rate limits, attachment lifecycle/quotas, account separation, session revocation, telemetry without résumé or message bodies, security review. Local preview binds to loopback.                                           |

`GET /api/capabilities` reports truthful capability flags. `POST /api/mail/send` fails closed with 503. Setting an environment variable cannot falsely enable sending. No credentials or account registration were requested or created by this implementation.

## Source collection

Four real researchers: Bilge Mutlu, Yuhang Zhao, Timothy Rogers, Sharon Li. URLs, limited paraphrases, provenance notes, and check dates are stored alongside each record in src/data/researchers.ts. Do not extend this into a claim of full campus coverage. Conflicting rank information is omitted. The 2024 Rogers project is marked as historical research context, not an opportunity. Unknown conditions remain unknown. Sharon Li's explicit no-openings statement prevents drafting.

## Design provenance

Claude's independently analyzed DESIGN.md and MIT license are retained in docs/design. Project-specific adaptations and contrast adjustments are in root DESIGN.md. No Anthropic trademarks or UW logos were copied. Self-hosted font packages include their own licenses.

Illustration: public/research-still-life.webp, generated with the built-in imagegen tool and optimized for the website. It is illustrative, not a factual representation of a UW laboratory.

Exact generation prompt:

> Create a refined editorial illustration for a university undergraduate research discovery website. Wide 3:2 composition. A delicate hand drawn charcoal ink illustration of an open field notebook in the foreground with branching botanical studies on one page and a small abstract neural network study on the other; behind it a small microscope and an elegant armillary sphere, arranged like a natural history museum still life. Warm cream background exactly close to #faf9f5. Very restrained terracotta #cc785c highlights on a few details. Thin slightly imperfect linework, sophisticated literary scientific etching, ample negative space, flat uncluttered composition, tactile but no heavy texture. No text, no letters, no logos, no people, no drop shadows, no gradients, no colorful science fiction, no UI. The image is a quiet supporting visual for curiosity across disciplines, not a diagram or factual portrayal of a particular laboratory.

## Checks

Run npm run typecheck, npm test, npm run build. Browser review and verification details will be recorded in docs/VERIFICATION.md. No real emails were sent and no Microsoft authorization was tested.
