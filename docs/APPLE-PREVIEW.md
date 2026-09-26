# Apple reference preview

This is a separate visual comparison build requested by the user. It does not replace the Claude version or introduce a new original brand direction.

## Preserved versions

- Claude source: `C:\Users\12482\Desktop\BuildFest_project`, branch `codex/research-explorer`.
- Claude immutable baseline: commit `06d4711a1afb00b143299181a0345a53d56a33c4`, tag `claude-preview-2026-09-26`.
- Claude preview: <http://127.0.0.1:3000>.
- Apple source: `C:\Users\12482\.codex\worktrees\apple-design-preview\BuildFest_project`, branch `codex/apple-design-preview`.
- Apple preview: <http://127.0.0.1:3002>; components: <http://127.0.0.1:3002/components>.
- Separate origins give each preview its own localStorage and IndexedDB. Existing Claude workspace data is not migrated or changed.

## Reference and mapping

Source: [VoltAgent / awesome-design-md / Apple](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/apple/DESIGN.md), fetched September 26, 2026. The unmodified analysis is retained in `docs/design/apple-reference.md` and used as the root `DESIGN.md`. The existing VoltAgent MIT notice remains in `docs/design/LICENSE-VoltAgent`.

This is a third-party analysis of Apple's website, not an Apple-authored React component package. Components are implemented locally against its specifications. No Apple logo or redistributed SF Pro font is included.

| Reference component | Implementation |
| --- | --- |
| global-nav | Black 44px global navigation; desktop links, mobile disclosure menu |
| sub-nav-frosted | 52px product navigation with neutral translucent background and blur |
| button-primary / secondary-pill | Action Blue `#0066cc`, white text / outlined secondary, full capsule, scale press state |
| product-tile-light / parchment / dark | Full-width square sections; white, `#f5f5f7`, and `#272729`; centered headings |
| store-utility-card | Research and comparison cards with 18px corners and thin borders, no shadows |
| configurator-option-chip | Topic choices, blue selected outline |
| search-input | White pill-shaped search field; expanded height supports the existing multiline interest input |
| floating-sticky-bar | Neutral frosted comparison action bar |
| footer | Parchment background, compact source and capability notes |

Typography follows 56px/600 hero, 40px/600 section display, 28px lead, and 17px/400 body, with the reference's smaller responsive scales. Apple platforms use their system face; Windows uses the locally hosted Inter fallback explicitly suggested in the reference. Product images are screenshots of this working application, captured with the source-checked research data and placeholder email text; they do not imply an Apple hardware integration. They are WebP, with eager hero and lazy lower-page images. Only product-preview images receive the reference's drop shadow.

## Documented gaps

The reference does not define recruitment badges, validation errors, or dark utility forms. The existing functional states are retained and mapped to neutral surfaces; validation uses an explicit error color. Dark utility mode is an extension, while the default follows the reference's light website with intentional dark sections. Native controls and Radix Dialog continue to handle interaction behavior. These are adaptations of the supplied visual rules, not claims of official Apple components.

## Functional scope

All pre-existing search, source detail, shortlist, comparison, local drafts, personalization, attachment, export, and preview logic is retained. The PRD and BRD are unchanged. No live discovery, language-model generation, UW verification, or email provider integration is added by this visual iteration. Earlier functional documentation remains in `IMPLEMENTATION.md`; earlier baseline checks remain in `VERIFICATION.md`.

## Running

```powershell
# In the Apple worktree
npm ci
npm run dev -- --port 3002
# Or production
npm run build
npm run start -- --port 3002
```

The Claude directory keeps its previous build and runs on port 3000. These are local previews; nothing was published or pushed.

## Verification, September 26, 2026

- `npm run build`: passed, all 13 static-generation entries completed; production preview running on port 3002.
- `npm run typecheck`: passed.
- `npm test`: all 11 existing domain tests passed. No implementation-mirroring tests were added for this visual iteration.
- Chrome desktop 1440px and mobile 390px: checked landing, search/results, shortlist, comparison, drafts, contact history, and component gallery. No page-width overflow or offscreen actionable controls remained in the checked states.
- Used the live interface to search robotics/accessibility, save two researchers, compare them, open research details, prepare an individual inquiry, and open the review dialog. Sending remained disabled, and placeholders were correctly reported.
- Reloaded/navigated between routes and confirmed shortlist, comparison, and the draft persisted in the isolated Apple browser origin.
- Tested mobile navigation disclosure, light/dark utility surfaces, and Escape dismissal with focus restoration in research and component dialogs.
- Final production landing: all four product-preview images decoded successfully; no JavaScript page errors during the final landing/gallery check.
- Screenshots inspected under `output/playwright/`: `apple-home-final.png`, `apple-home-final-full.png`, `apple-home-final-mobile.png`, `apple-explore-empty.png`, `apple-explore-dark-mobile.png`, `apple-mail-mobile.png`, and `apple-components-dark.png`.
- The source `DESIGN.md` and vendored Apple reference have identical hashes. Claude root remained clean at its preservation commit and returned HTTP 200 on port 3000.

These checks cover browser layout and existing preview functionality, not physical-iPhone rendering, live campus-wide search, or real email delivery.
