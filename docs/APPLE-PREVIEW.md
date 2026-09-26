# Apple components with the original layout

The current revision keeps the Apple-style components and restores the original homepage and sidebar workspace, as requested by the user. The standalone component gallery and its navigation entries have been removed.

## Preserved versions

- Claude source: `C:\Users\12482\Desktop\BuildFest_project`, branch `codex/research-explorer`.
- Claude baseline: commit `06d4711a1afb00b143299181a0345a53d56a33c4`, tag `claude-preview-2026-09-26`.
- Claude preview: <http://127.0.0.1:3000>.
- Current source: `C:\Users\12482\.codex\worktrees\apple-design-preview\BuildFest_project`, branch `codex/apple-design-preview`.
- Previous Apple showcase layout: commit `8013714`, tag `apple-showcase-2026-09-26`.
- Current preview: <http://127.0.0.1:3002>.
- Port 3002 retains the previous Apple version's storage origin. The separate Claude origin and its browser data are unchanged.

## Reference and implementation

Source: [VoltAgent / awesome-design-md / Apple](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/apple/DESIGN.md), fetched September 26, 2026. The unmodified analysis is retained in `docs/design/apple-reference.md`; the VoltAgent MIT notice remains in `docs/design/LICENSE-VoltAgent`. Root `DESIGN.md` describes the current user-approved direction and takes precedence over the reference's marketing layouts.

This is a third-party analysis of Apple's website, not an Apple-authored React component package. The existing local components implement its visual specifications. No Apple logo or redistributed SF Pro font is included.

| Layer                 | Current implementation                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Homepage layout       | Original left introduction / right research preview; original content sections, FAQ, and footer   |
| Workspace layout      | Original sidebar and five navigation destinations; horizontal navigation on phones                |
| Typography            | System sans-serif; 56px desktop hero, 40px section headings, 17px body, responsive smaller scales |
| Buttons               | Blue primary and outlined secondary capsules with restrained press feedback                       |
| Cards and fields      | 18px research cards, thin borders, 8px form controls, rounded search field                        |
| Choices and selection | Blue outlined topics and selected-state controls                                                  |
| Comparison actions    | Neutral frosted floating action bar, centered within the workspace                                |
| Component gallery     | Removed from the application; reusable primitives remain in `src/components/ui/`                  |

Apple platforms use the system font; Windows uses the locally hosted Inter fallback suggested by the reference. The original research illustration is retained with a neutral grayscale treatment. Prior marketing screenshots remain as unused assets in the repository history/current tree; they are not displayed by the restored homepage.

The reference does not define recruitment badges, validation errors, or dark utility forms. Existing functional states remain mapped to neutral surfaces, with a distinct error color and dark-theme extension. Native controls and Radix Dialog retain their interaction behavior.

## Functional scope

Existing search, source details, shortlist, comparison, local drafts, personalization, attachments, export, and preview logic is retained. The PRD and BRD are unchanged. No live discovery, language-model generation, UW verification, or email provider integration is added. Earlier functionality and baseline records remain in `IMPLEMENTATION.md` and `VERIFICATION.md`.

## Running

```powershell
# In the Apple worktree
npm ci
npm run dev -- --port 3002
# Or production
npm run build
npm run start -- --port 3002
```

The Claude directory keeps its previous build on port 3000. These are local previews; nothing was published or pushed.

## Current layout verification, September 26, 2026

- Production build and TypeScript checks passed. The route manifest no longer includes `/components`; the production route returns HTTP 404.
- Verified the running port 3002 build has the split homepage, 216px desktop sidebar, blue pill actions, and no gallery links or JavaScript page errors in the final smoke check.
- Claude source remained clean at `06d4711`, and its port 3000 preview returned HTTP 200.
- Chrome widths 1440, 1050, 900, 390, and 320: checked homepage, exploration, shortlist, comparison, emails, and contact history. All 30 route/width combinations had no page-width overflow and no component-gallery link.
- Confirmed desktop sidebar widths and the stacked email editor at tablet/phone sizes.
- Searched robotics/accessibility, saved two researchers, selected both for comparison, opened research details, and prepared an individual inquiry through the interface. Shortlist, comparison, and the draft survived navigation/reload.
- Escape dismissed the research dialog and restored focus to its trigger. Mobile homepage navigation opened and closed with Escape.
- Inspected desktop/mobile screenshots, including dark mobile mail and homepage. No JavaScript page errors occurred during the route checks.
- Screenshots are under `output/playwright/`, including `layout-home-desktop.png`, `layout-home-mobile.png`, `layout-explore-1440.png`, `layout-mail-1440.png`, and `layout-mail-dark-mobile.png`.

These checks cover browser layout and existing preview interactions, not physical-iPhone rendering, live campus-wide search, or real email delivery.
