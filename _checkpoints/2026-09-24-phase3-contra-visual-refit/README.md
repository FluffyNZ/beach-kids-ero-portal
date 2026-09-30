# Checkpoint — before Phase 3 Contra visual refit (2026-09-24)

This folder holds the exact pre-change contents of every file that could be touched by the Phase 3 visual-only pass (removing card shadows, reducing corner radius, rebuilding the sidebar's active state, adding a persistent global header, recomposing the Home dashboard, restyling the shared modal), taken immediately before any edits.

Same as the Phase 1/2 checkpoints: no terminal/git access from this session, so this is a straight copy-based revert point rather than a real `git commit`. This repo does have a `.git` folder, so if you have `git` on this machine, a real commit is still the better, more complete checkpoint (covers the whole repo):

```
git add -A
git commit -m "Checkpoint before Phase 3 Contra visual refit"
```

## Files actually changed in this phase

Copy each of these back over its live counterpart to revert:

- `tailwind.config.ts` — colour tokens (`charcoal` near-black, new `lilac` accent), removed the pill-radius overrides, removed card drop shadows.
- `src/app/globals.css` — `.btn` back to moderate radius (was `rounded-full`), `.btn-primary` charcoal instead of burgundy, new unused-by-default `.btn-brand` (burgundy), focus rings moved off burgundy.
- `src/lib/constants.ts` — added `getPageTitle()` (new export, additive only — nothing existing removed).
- `src/components/sidebar.tsx` — rectangular pale-lilac active state instead of the burgundy pill, quieter section labels, bordered "workspace" box at the top instead of a plain logo lockup.
- `src/components/ui/avatar.tsx` — default avatar chip colour: lilac/charcoal instead of burgundy.
- `src/components/topbar.tsx` — full rewrite: now a persistent header on every page/screen size (title left, Search/Notifications/mobile-sign-out right), not the old mobile-only user pill.
- `src/app/(portal)/layout.tsx` — `<Topbar />` no longer takes a `userName` prop (the new Topbar derives its own content).
- `src/components/ui/icon-button.tsx` — focus ring colour only.
- `src/components/dashboard/home-header.tsx` — Search/Notifications removed (now in the global header), greeting shrunk.
- `src/components/dashboard/today-summary.tsx` — `TodaySummaryGrid` (4 cards) replaced with `TodaySummaryInline` (one inline metrics row). **Note the export name changed** — `src/app/(portal)/dashboard/page.tsx` was updated to match.
- `src/components/dashboard/rooms-today.tsx` — card grid replaced with a table (same export name, same props).
- `src/app/(portal)/dashboard/page.tsx` — Today at Beach Kids + Rooms today merged into one bordered surface; import updated for the today-summary.tsx rename above.
- `src/components/ui/modal.tsx` — neutral backdrop/title colour instead of the legacy `ocean-*` palette, narrower width band. Props/API unchanged.
- `DESIGN_SYSTEM.md` — Phase 2 and Phase 3 status sections appended, documenting what superseded the original spec's burgundy/pill-button/ocean-modal notes.

## Files backed up here as a precaution but NOT actually edited

`src/components/status-badge.tsx`, `src/components/mobile-nav.tsx`, `src/components/ui/page-header.tsx`, `src/components/dashboard/needs-attention.tsx`, `src/components/dashboard/stat-tile.tsx`, `src/components/dashboard/readiness-ring.tsx`, `src/components/dashboard/section-card.tsx`, `src/components/dashboard/quick-create-menu.tsx`, `src/components/dashboard/upcoming-panel.tsx`, `src/components/dashboard/recent-activity-panel.tsx` — these were staged in case they needed direct changes, but they already used the shared `.card`/`.btn-*`/`status.*` classes correctly, so they pick up the new look automatically from the token changes above with no edits of their own. Restoring them from here is a safe no-op.

Two other files were checked but never staged into this folder at all because nothing about them needed to change: `src/components/children/new-child-modal.tsx` and `src/components/staff/new-staff-modal.tsx` — both already call `.btn-primary` for their submit button, so they also pick up the new charcoal colour automatically.

## What this phase did NOT touch

No database schema, no database records, no API contracts, no routes, no authentication logic — this was a visual-only pass. The legacy `ocean-*`-styled pages (Checklist body, Records, Policies, etc.) inherit the token-level changes (near-black text/borders, no shadows, smaller radius) but haven't been individually recomposed to Contra's layout patterns yet — that's flagged as a follow-up in `DESIGN_SYSTEM.md`, not done here.
