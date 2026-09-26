# Research Explorer design direction

The current user request is to retain the Apple-style component system while returning to the previous layout. This request takes precedence over the full-page compositions in the reference.

## Layout

- Preserve the original split homepage: introduction and actions on the left, a research preview on the right.
- Retain the original principles strip, explanation section, source-transparency section, FAQ, final action, and footer.
- Use the original sidebar workspace with Explore, My shortlist, Compare, Emails, and Contact history. On phones, navigation becomes a horizontal row.
- Do not add a standalone component gallery or links to one. Shared components belong in the product screens.

## Components and appearance

Keep the current Apple analysis-based tokens and components: white and neutral gray surfaces, blue actions, system sans-serif typography, pill buttons, 18px cards, 8px form controls, thin borders, and restrained press feedback. Retain light/dark support and accessible Radix dialog behavior.

- `src/app/tokens.css`: color, font, radius, and theme tokens.
- `src/app/apple.css`: shared component styling and workflow components.
- `src/app/globals.css`: base styles and original page structure.
- `src/app/layout.css`: layout-specific sizing and responsive adaptations.
- `src/components/ui/`: reusable interaction components.

The unmodified third-party source is [Apple reference](docs/design/apple-reference.md), from [VoltAgent / awesome-design-md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/apple/DESIGN.md). This is an implementation of a design analysis, not an Apple-authored React package. No Apple logo or redistributed SF Pro font is included. Windows uses the existing locally hosted Inter fallback.

Preserve the real source-backed content, capability notices, and current application behavior. Do not add new branding or replace the requested layout with Apple's full-width marketing-page composition.

Version preservation and verification records: [Apple preview](docs/APPLE-PREVIEW.md).
