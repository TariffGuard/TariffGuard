---
kind: frontend_style
name: Tailwind CSS v4 Design System with Glassmorphism Theme
category: frontend_style
scope:
    - '**'
source_files:
    - frontend/app/globals.css
    - frontend/postcss.config.mjs
    - frontend/package.json
    - frontend/lib/utils.ts
    - frontend/components/ui/button.tsx
    - frontend/components/ui/glass_panel.tsx
    - frontend/components/ui/kpi_card.tsx
    - frontend/components/layout/app_shell.tsx
    - frontend/components/layout/sidebar.tsx
---

## Overview

The TariffGuard frontend is a Next.js 16 App Router application styled exclusively with **Tailwind CSS v4** (using `@tailwindcss/postcss` and the new `@theme` directive). There is no separate Tailwind config file — all design tokens are declared inline in `frontend/app/globals.css` via the `@theme` block, and styling is composed entirely from utility classes.

## Core Styling Stack

- **Framework**: Next.js 16 App Router (`next: 16.3.3`, React 19)
- **CSS Engine**: Tailwind CSS v4 via `@tailwindcss/postcss` plugin; no `tailwind.config.*` file exists
- **Class merging**: `clsx` + `tailwind-merge` exposed as a shared `cn()` helper in `frontend/lib/utils.ts`
- **Icons**: `lucide-react` for all iconography
- **Charts**: `recharts` for data visualization components
- **No CSS-in-JS or SCSS**: All styles are Tailwind utilities plus a small set of custom CSS classes defined in `globals.css`

## Design Tokens (`@theme`)

All visual tokens live in `frontend/app/globals.css` under a single `@theme` block:

- **Colors**: semantic palette including `--color-background`, `--color-primary` / `-soft` / `-light`, `--color-text-*`, `--color-energy`, `--color-success`, `--color-warning`, `--color-neutral`, and glass opacity tokens (`--color-glass`, `--color-glass-strong`, `--color-glass-subtle`).
- **Typography**: `--font-sans: 'Inter', system-ui, sans-serif` and `--font-mono: 'JetBrains Mono', monospace`.
- **Border radius**: `--radius-sm/md/lg/xl` (8–20px).
- **Shadows**: `--shadow-glass`, `--shadow-soft`.

Components reference these tokens directly via CSS variables (e.g. `bg-[var(--color-primary)]`, `text-[var(--color-text-secondary)]`) rather than Tailwind color names, making theme swaps centralized.

## Custom Utility Classes

A small `@layer utilities` block in `globals.css` defines reusable visual primitives:

- `.glass-panel` — frosted glass background with `backdrop-filter: blur(18px)` and semi-transparent border/shadow.
- `.glass-card` — lighter variant with 14px blur.
- `.fabric-background` — base page background using radial gradient plus a fixed `fabric.png` texture overlay at low opacity.

These are consumed by layout and UI components to maintain the glassmorphism aesthetic consistently.

## Component Library (`components/ui/`)

Reusable presentational components encapsulate styling patterns:

| Component | Purpose | Styling Approach |
|---|---|---|
| `Button` | Primary / outline / ghost variants | Variant map keyed by string, merged via `cn()` |
| `GlassPanel` | Wrapper that applies `.glass-panel` or `.glass-card` based on `asCard` prop |
| `KPICard` | Metric card with accent top-bar, composes `GlassPanel` |
| `Badge` | Small status indicator (used in sidebar) |
| `StatusDot` | Colored dot for status indicators |

Each component uses `cn(...)` from `@/lib/utils` to merge default classes with caller-supplied `className` overrides, following a shadcn-style pattern without an external generator.

## Layout System

- `AppShell` (`components/layout/app_shell.tsx`) provides the dashboard chrome: a fixed-width `Sidebar` + `Topbar` + scrollable `<main>` area, all wrapped in glass panels.
- `Sidebar` (`components/layout/sidebar.tsx`) is a client component (`'use client'`) that renders navigation links using `next/link`, highlights the active route via `usePathname()`, and fetches alert counts from the backend.
- `Topbar` completes the header row.
- The app shell uses Tailwind flexbox utilities (`flex h-screen w-full overflow-hidden`) and glass panel classes for consistent chrome.

## Page-Level Styling

Pages under `app/dashboard/*` compose the above components and rely on Tailwind utilities for spacing, typography, and responsive behavior. No per-page CSS files exist beyond the global stylesheet.

## Conventions Observed

1. **Design tokens via CSS variables** — colors, radii, shadows, and fonts are always referenced as `var(--color-*)` / `var(--radius-*)` inside Tailwind arbitrary values (e.g. `bg-[var(--color-primary)]`), never as hardcoded hex values in components.
2. **Class composition via `cn()`** — every component accepts a `className` prop and merges it with defaults through `cn(baseStyles, variantStyles[variant], className)`.
3. **Variant-driven styling** — components like `Button` define a `variant` prop mapped to class sets rather than conditional JSX branches.
4. **Glassmorphism as the visual language** — panels, cards, and the sidebar all use the `.glass-panel` / `.glass-card` utilities with `backdrop-filter` blur.
5. **Iconography via Lucide** — icons are imported as named components from `lucide-react` and sized with Tailwind `w-* h-*` utilities.
6. **Client vs server boundaries** — interactive UI (sidebar, auth context) is marked `'use client'`; pages can remain server components unless they consume browser APIs.
7. **No responsive breakpoints in custom CSS** — responsiveness is handled purely through Tailwind's responsive prefixes on utility classes.

## Constraints

- There is no `tailwind.config.*` file; all configuration is inlined in `globals.css` via `@theme`. This means adding new tokens requires editing that file directly.
- The project does not use CSS modules, Sass, or any preprocessor — only plain CSS processed by Tailwind v4's PostCSS plugin.
- Global resets are minimal: only `margin: 0`, `padding: 0`, and font/color defaults on `html`/`body`.
