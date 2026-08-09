# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- 02-editor: base chrome components (navbar + sidebar shell)

## Current Goal

- Build the reusable editor chrome — top navbar and left project sidebar — per `context/feature-specs/02-editor.md`. No editor page/route wiring yet; components only.

## Completed

- 01-design-system: shadcn/ui installed and configured (Tailwind v4, `base-nova` style, `neutral` base color, Base UI primitives). Added Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea to `components/ui/`. Installed `lucide-react`. `lib/utils.ts` has `cn()`. Verified: all 7 components import cleanly, `cn()` merges classes correctly, `tsc --noEmit` and `next build` pass.
- 02-editor: added the Ghost-specific design tokens from `ui-context.md` to `app/globals.css` (`--bg-base`, `--bg-surface`, `--bg-elevated`, `--bg-subtle`, `--border-default`, `--border-subtle`, `--text-primary/secondary/muted/faint`, `--accent-primary(-dim)`, `--accent-ai(-text)`, `--state-error/success/warning`) and mapped them in `@theme inline` to Tailwind utilities: `bg-base/surface/elevated/subtle`, `border-surface-border(-subtle)`, `text-copy-primary/secondary/muted/faint`, `text-brand`/`bg-brand`, `bg-accent-dim`, `text-ai`/`bg-ai`, `text-ai-text`, `*-error/success/warning`. These tokens existed only as documentation in `ui-context.md` before this — they were never wired into `globals.css` during 01-design-system, so nothing in the app could satisfy the "no raw Tailwind colors/hex, use these token names" rule in `code-standards.md` until now.
- 02-editor: `components/editor/editor-navbar.tsx` — fixed-height (`h-14`) client component with left/center/right sections, `bg-surface` background, `border-surface-border-subtle` bottom border. Left section holds a sidebar-toggle icon button (`PanelLeftOpen`/`PanelLeftClose` from lucide-react, swapped based on `isSidebarOpen` prop). Center and right sections are empty placeholders for future chapters. Controlled via `isSidebarOpen`/`onToggleSidebar` props (no internal state — the parent editor page will own this once it exists).
- 02-editor: `components/editor/project-sidebar.tsx` — floating overlay panel (`fixed`, `z-40`), positioned clear of the navbar with a small margin on all sides, `bg-elevated/95` + `backdrop-blur-sm` + `border-surface-border`, `rounded-2xl`. Slides in/out via `translate-x` transition driven by the `isOpen` prop; `pointer-events-none` + `aria-hidden` when closed. Header has "Projects" title + close button (`onClose` prop). Body uses shadcn `Tabs` ("My Projects" / "Shared"), each with an independent empty placeholder (FolderOpen icon + message). Footer has a full-width `New Project` button with a `Plus` icon.
- 02-editor: verified the existing `components/ui/dialog.tsx` (shadcn Dialog, already supports Title/Description/Footer, styled with the pre-existing shadcn tokens in `globals.css`) already satisfies the "dialog pattern ready for future use" requirement — no changes made, since actual dialogs are explicitly out of scope for this unit and `components/ui/*` is a protected foundation component.
- 02-editor: verified via `tsc --noEmit` (clean) and `eslint` (clean on new files) and by driving a temporary preview route with Playwright/Chromium against `next dev` (toggle behavior, slide animation, tab switching, empty states all confirmed visually, no console errors); the temporary route was deleted after verification.

## In Progress

- None yet.

## Next Up

- Wire `EditorNavbar` + `ProjectSidebar` into an actual editor route/page, with the shared `isSidebarOpen` state lifted to that page.
- Center/right navbar sections remain empty until a future chapter defines their content.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- shadcn/ui initialized with Base UI (not Radix) as the underlying primitive library — this is the CLI's current default, not an explicit choice in the spec.
- Dark theme is forced globally via a `dark` class on `<html>` in `app/layout.tsx`, since `globals.css` only defines a `.dark` override (activated by that class) and a default light `:root` — there was no toggle or existing dark theme to match, so this was the only way to satisfy "no default light styling appears."
- `ui-context.md` documents Ghost-specific CSS variable names (e.g. `--bg-base`) and gives a few example Tailwind utility names (`bg-base`, `text-copy-primary`, `text-copy-muted`, `border-surface-border`, `text-brand`, `bg-accent-dim`) but not an exhaustive mapping. Extended that pattern consistently for the remaining tokens (e.g. `text-copy-secondary`, `text-copy-faint`, `border-surface-border-subtle`, `text-ai`/`bg-ai`, `text-ai-text`, `text-error`/`text-success`/`text-warning`). These are additive to shadcn's existing `--primary`/`--background`/etc. tokens (kept as-is for `components/ui/*` internals) — the Ghost tokens are for app-level/feature components.

## Session Notes

- No `chromium-cli` or local `playwright` install was available in this environment; used `npx playwright@1.62.1 install chromium` + a local scratchpad install to drive a temporary route (`app/editor-preview-tmp`, deleted after use) for visual verification. If this recurs often, consider `/run-skill-generator` to capture it as a project skill.
- Running `next dev` auto-regenerates part of `AGENTS.md` (a Next.js 16 built-in "agent rules" feature — see the `<!-- END:nextjs-agent-rules -->` block). This produced an uncommitted diff to `AGENTS.md` as a side effect of dev-server verification in this session; it's expected framework behavior (per the injected note, `next dev` re-adds it every time), not a manual edit. Left uncommitted — user should decide whether to commit it or set `agentRules: false` in `next.config.ts` to disable.
