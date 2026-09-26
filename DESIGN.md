# Research Explorer design system

Reference: [VoltAgent Claude analysis](https://getdesign.md/claude/design-md), vendored in [docs/design/claude-reference.md](docs/design/claude-reference.md) under its accompanying MIT license. This is independent inspiration, not an official Anthropic or UW design system.

## Direction

An approachable academic workspace for students finding their first research experience. Warm editorial hierarchy, generous space, restrained terracotta actions. Design variance 5, motion 2, density 4. User-selected Claude reference takes precedence over generic frontend style defaults.

## Foundations

- Canvas #faf9f5; soft #f5f0e8; card #efe9de; dark #181715; ink #141413; body #3d3d3a; muted #6c6a64; hairline #e6dfd8.
- Brand coral #cc785c; actionable small text and filled buttons use #a9583e for readable contrast. Coral itself remains the illustration and large accent color.
- Self-hosted EB Garamond 400 for editorial display; Inter 400/500/600 for interface and prose. No licensed Anthropic fonts or copied logos.
- Spacing 4, 8, 12, 16, 24, 32, 48, 64, 96 px. Desktop content 1200px maximum.
- Radius: controls 8px, content 12px, hero 16px, badges full. Touch targets at least 44px.
- Layers: normal 0, navigation 10, compare tray 20, dialog 50, notification 60.
- Dark theme follows system preference unless user overrides; warm surfaces and contrast remain consistent.

## Components

Owned React library: Button/LinkButton, IconButton, Badge, Field, Textarea, Select, Notice, EmptyState, Dialog, Brand, ThemeToggle. ResearchCard, ResearcherDialog, CompareView and MailWorkspace compose these primitives.

All controls have explicit accessible labels, visible focus, pressed/selected/disabled states. Dialog uses Radix focus trapping and Escape dismissal. Reduced motion is respected. Component gallery lives at /components.

## Product rules

Use sources and explanations instead of match scores. A missing condition is `unknown`, never supported. No fabricated openings, identities, statistics or testimonials. The catalog is explicitly a checked starter collection, not live campus-wide search. Public-source snapshots show dates. Email templates never invent experience. No send success state before provider acceptance; unavailable integration stays visibly unavailable.

## Responsive layouts

Below 768px: compact header, single-column content, comparison cards stack, mail editor stacks below draft selector. Desktop app uses a 216px navigation rail, breathable content, and contextual detail dialogs. Preserve readable type and wrap long source URLs.
