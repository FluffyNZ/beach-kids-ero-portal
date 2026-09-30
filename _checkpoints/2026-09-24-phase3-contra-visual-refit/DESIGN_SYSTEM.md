# Beach Kids UI System

Design tokens and component specification for the Beach Kids management platform, derived from the Contra (Mobbin) reference screenshots and reconciled against the existing codebase (`tailwind.config.ts`, `globals.css`, `src/components/**`).

**Status: specification only.** Nothing in this document has been implemented yet. It's the deliverable for "create a Beach Kids UI system based on these references" — the actual token/component build is a separate, subsequent step once this is approved (see **Implementation plan** at the end).

**Standing constraints this spec respects:** no schema/auth/API/route/data changes; no application logic changes; existing component `name`/FormData contracts on forms and modals are untouched — this is a presentation-layer system only.

---

## Design principle

Contra reads as premium because it gets out of the way: near-white surfaces, one neutral ink colour for almost all text, thin low-contrast borders instead of shadows to separate content, and colour spent only where it's meaningful (an active state, a status, a brand mark). Beach Kids should feel like the same category of product — a professional SaaS/CRM a compliance manager or centre director trusts — not a "childcare" website. Concretely: **burgundy is a signal, not a background.** If a burgundy (or pink/orange/yellow/blue/purple) fill shows up somewhere that isn't an active nav item, a primary button, a room tag, or a genuine status pill, it's probably wrong under this system.

---

## COLOUR

### Semantic layer (new)

The existing `tailwind.config.ts` palette (sand/ocean/kelp legacy, cream/charcoal/burgundy/pink/orange/yellow/blue/purple brand-refresh, status tones) stays in the config — nothing gets deleted, since other in-flight work may still reference it. What changes is *which* tokens the shell/dashboard/future modules are allowed to reach for by default. Two additions:

| Token | Value | Use |
|---|---|---|
| `neutral-*` | Tailwind's stock grey scale (already available, unextended) | The entire structural palette: page background, card backgrounds, borders, secondary text, hover fills, dividers, table stripes, skeletons. This replaces `sand-*`, `cream`, and `bg-charcoal/5`-style opacity hacks as the default. |
| `charcoal` | existing `#353530` | Primary text colour only (headings, body, table cell text). Not used as a background outside opacity utilities like `charcoal/5` for hover states, which stay. |
| `burgundy-500/600` | existing | The one brand accent: primary buttons, active nav pill, focus rings, links, and the small "important" badge/eyebrow. Nothing else. |
| `status.*` | existing (`ready`/`attention`/`action`/`neutral` + `*Bg`) | Unchanged — this is already the correct "genuine status" language (compliance, evidence, overdue actions) and Contra's own use of green/amber/red for pills maps directly onto it. |

Retired from *default* use in shell/dashboard/list/table chrome (still valid where explicitly sanctioned below): `sand-*`, `cream`, `pink-*`, `orange-*`, `yellow-*`, `blue-*`, `purple-*` as fills or chip backgrounds for anything that isn't a room or a status.

### Colour rules by surface

- **Page background:** `neutral-50` (already applied to `body` in Phase 1).
- **Card / panel background:** `white`, on a `neutral-50` page — this is what creates Contra's soft layering without needing shadows to do the work.
- **Borders:** `border-charcoal/10` (structural, e.g. sidebar/topbar/card) or `border-charcoal/15` (interactive, e.g. inputs, secondary buttons). No new border colour needed.
- **Primary text:** `charcoal`. **Secondary/metadata text:** `charcoal/60`. **Tertiary/placeholder:** `charcoal/40–45`. **Disabled:** `charcoal/25–30`.
- **Hover fill (neutral):** `charcoal/5` — already the Phase-1 pattern for ghost/secondary buttons and sidebar hover; extend this to table rows, list rows, dropdown items, and icon buttons.
- **Active/selected fill:** `burgundy-50` background + `burgundy-600` text/icon. This is the *only* place a tinted background is the default for a non-status, non-room element (sidebar active item, selected table row, active tab underline/fill, selected filter chip).
- **Focus ring:** `burgundy-500`, unchanged.
- **Status pills** (compliance, evidence, action priority, action status, learning-story tracker): keep `status.ready/attention/action/neutral` exactly as-is. This is real signal, not decoration.
- **Room identification** (`ROOM_COLOR_CLASSES` — kelp/blue/pink/orange room chips on the Roster): **explicitly sanctioned to stay colourful.** This is exactly the "room identification" carve-out in the brief. No change needed here.

### Reconciliation — existing colourful patterns that need to move to neutral

Two places currently use decorative multi-colour palettes that are *not* status, brand-action, or room identification, and don't fit the new rule:

1. **`SECTION_ACCENTS`** (`pink`/`orange`/`burgundy`/`yellow`, rotated across the four Dashboard "By ERO section" cards via `ACCENT_CHIP` in `section-card.tsx`). This is purely decorative — the four ERO sections (Curriculum, Premises & Facilities, Health & Safety, Governance) aren't "rooms" or "statuses," they're just categories. **Recommendation:** replace the rotating accent with the section's own progress state, or a single neutral `charcoal/5` chip with `charcoal/70` text for the code (e.g. "C", "PF", "HS", "GMA") — the percentage/progress bar already carries the real signal via `status.*` tones. This turns four cards that currently read as "pink card, orange card, burgundy card, yellow card" into four cards that read as one consistent card type, which is the Contra pattern (metric cards are never colour-coded by position).
2. **`STAFF_CONTRACT_TYPE_BADGE`** (kelp/orange/blue/yellow/purple per contract type on the Staff list). Contract type is metadata, not status — a casual vs. permanent staff member isn't "worse" or "better." **Recommendation:** a single neutral badge style (`charcoal/5` background, `charcoal/70` text) for all contract types, with the label text doing the differentiation, consistent with how Contra badges categorical (non-status) metadata.

Both changes are pure `className` swaps in small, presentation-only files — no risk to data or logic — but I'm calling them out explicitly rather than just doing them, since they're a visible, opinionated change to something that already works. Flag if you'd rather keep either as-is.

---

## LAYOUT

| Token | Value | Notes |
|---|---|---|
| Sidebar width (expanded) | `16rem` (`w-64`) | Matches current `sidebar.tsx`. |
| Sidebar width (collapsed) | `4.5rem` (icon-only, tooltips on hover) | **New** — not yet built. Contra's sidebar collapses to icons with a toggle at the bottom; Beach Kids doesn't have this yet. Proposed for a later phase (shell is already useful without it), not required to ship the design system itself. |
| Topbar height | `4rem` (`h-16`) | Matches current `topbar.tsx`. |
| Max content width | `1600px` (`max-w-[1600px]`), centred | Matches current Dashboard; adopt as the standard for every page, not just Dashboard. |
| Page padding | `px-6 py-8` desktop, `px-4 py-6` mobile | Standardise across all (portal) pages — several currently vary. |
| Section vertical rhythm | `gap-8` between major page sections | Matches current Dashboard `flex flex-col gap-8`. |
| Card internal padding | `p-6` standard card, `p-4` compact/metric tile, `p-8`–`p-10` hero/feature card | Matches current usage. |
| Grid gutters | `gap-4` for card grids, `gap-3` for dense tile grids (metrics) | Matches current usage. |
| Card corner radius | `rounded-2xl` | Unchanged (`.card` class). |
| Control corner radius | `rounded-full` for all buttons and pills, `rounded-xl` for inputs/selects/textareas, `rounded-2xl` for cards and modals | Buttons and inputs already Phase-1'd; extend the same radius scale to any new component (dropdowns, drawers, toasts). |

---

## TYPOGRAPHY

Single sans family throughout (`Inter`, current `font-sans`). **`font-display` (Bitter/serif) is dropped from the design system** — Contra's whole system is one grotesque/sans family with weight and size doing the hierarchy work, and a serif display face reads as "editorial/lifestyle brand," which cuts against the neutral-SaaS goal. It's currently used inconsistently already (Dashboard's h1/h2 and stat percentages were already de-serif'd in Phase 1; `section-card.tsx` and `readiness-ring.tsx` still use it) — this spec proposes finishing that removal everywhere as part of implementation, not introducing something new.

| Role | Size / weight | Tailwind |
|---|---|---|
| Page title (h1) | 30–36px, bold, tight tracking | `text-3xl md:text-4xl font-bold tracking-tight text-charcoal` |
| Section title (h2) | 18px, semibold | `text-lg font-semibold text-charcoal` |
| Card title (h3) | 16px, semibold | `text-base font-semibold text-charcoal` |
| Body | 14px, regular | `text-sm text-charcoal` |
| Secondary body / description | 14px, `charcoal/60` | `text-sm text-charcoal/60` |
| Small metadata (timestamps, counts, helper text) | 12px, `charcoal/50` | `text-xs text-charcoal/50` |
| Table header label | 12px, semibold, uppercase, wide tracking, `charcoal/45` | `text-xs font-semibold uppercase tracking-wide text-charcoal/45` |
| Table cell text | 14px, regular | `text-sm text-charcoal` |
| Form label | 12px, medium, uppercase, `charcoal/50` | Matches existing `.label` class exactly. |
| Metric / stat number | 24–30px, bold, tight tracking | `text-2xl md:text-3xl font-bold tracking-tight` |
| Nav item | 14px, medium | `text-sm font-medium` |
| Nav group label | 11px, semibold, uppercase, wide tracking, `charcoal/35` | Matches current `sidebar.tsx` exactly. |
| Badge / pill text | 12px, medium–semibold | `text-xs font-medium` |

---

## COMPONENTS

Everything below is a *specification* — proposed shared components/classes, most not yet built. Where something already exists and matches, that's noted; where it needs a new shared component (currently hand-rolled per-page), that's flagged as **new shared component**.

- **Buttons** — `.btn-primary` (burgundy fill), `.btn-secondary` (white, bordered), `.btn-ghost` (text only), `.btn-danger` (status-action fill). All fully rounded, `text-sm font-medium`, `px-4 py-2`. Already exists in `globals.css`, Phase-1'd to pill shape. No change needed beyond the colour reconciliation above.
- **Icon buttons** — **new shared component.** Square-ish, `rounded-full`, `p-2`, icon only, `text-charcoal/60` default → `text-charcoal` + `bg-charcoal/5` on hover. Used today ad hoc (e.g. modal close ✕); should become one `<IconButton>` component so hover/focus/disabled states are consistent everywhere (table row actions, topbar icons, drawer close).
- **Cards** — `.card` (`rounded-2xl border border-charcoal/10 bg-white shadow-card`). Exists, unchanged.
- **Metric cards** — matches `StatTile`: small tone-dot + label row above a bold number. Keep as-is; this already matches the Contra "metric tile" pattern well.
- **Search field** — **new shared component.** Pill or `rounded-xl` input with a leading search icon at `charcoal/40`, `bg-neutral-50` idle → `bg-white border-charcoal/15` on focus. Not yet built anywhere in the app (list pages currently have no search).
- **Filters** — **new shared component.** A `<FilterBar>` row combining search + a "Filters" button (opens a dropdown or inline chip row) + a view/sort control, sitting directly above tables/lists — this is the toolbar pattern from nearly every Contra list screen. Not yet built; list pages currently have plain headers.
- **Tabs** — **new shared component.** Horizontal, underline-style (`border-b-2 border-burgundy-500` on the active tab, `text-charcoal/50` inactive → `text-charcoal` hover), optional trailing count badge per tab (`charcoal/5` pill with a number). Needed for detail pages (e.g. a future Staff or Child detail view) — not built yet.
- **Dropdown menus** — **new shared component.** White panel, `rounded-xl border border-charcoal/10 shadow-cardHover`, items `px-3 py-2 text-sm hover:bg-charcoal/5 rounded-lg`, optional secondary description line under an item label in `text-xs text-charcoal/50` (Contra pattern for menus like "Export → CSV / description line"). Not built yet — no dropdown menus exist in the app currently beyond native `<select>`.
- **Status badges** — matches existing `.badge` + `status.*` tones (ready/attention/action/neutral backgrounds and text). Exists, unchanged, this is correct as-is.
- **Category/metadata badges** (non-status, e.g. contract type) — neutral `charcoal/5` / `charcoal/70` variant of `.badge`, per the colour reconciliation above.
- **Avatars** — **new shared component.** Circular, initials-based (no photo-upload requirement for this), `bg-charcoal/10 text-charcoal/70 text-xs font-semibold`, sizes `sm` (24px, table rows) / `md` (32px, cards) / `lg` (48px, profile headers). Staff/child photo uploads already exist as a separate upload feature — this is just the small circular *display* chip used in lists, e.g. "assigned staff," and should degrade to initials when there's no photo.
- **Avatar groups** — **new shared component.** Overlapping stack of up to 3–4 avatars with a `+N` neutral chip for overflow, `-space-x-2` overlap, thin white ring between avatars (`ring-2 ring-white`) so they read as separate. Needed wherever multiple staff/children are shown compactly (e.g. roster room assignment).
- **Tables** — **new shared component.** A `<Table>` shell: `charcoal/45` uppercase header row on a `neutral-50` or plain white header background with a `border-b border-charcoal/10`, rows `border-b border-charcoal/5` (last row none), row hover `bg-charcoal/[0.02]`, selected row `bg-burgundy-50/50`. No column-customization ("Lists"/column picker) in scope yet — flagged as a nice-to-have, not part of this pass. Several pages currently render ad hoc tables/lists with their own markup; consolidating to one shared table is the single highest-leverage new component for consistency.
- **Lists** (non-tabular row lists, e.g. Needs Attention) — matches current `NeedsAttention` pattern: row with leading icon/tone-dot, label, trailing metadata, `hover:bg-neutral-50`. Keep as-is.
- **Empty states** — **new shared component.** Centred, `py-12`, a large neutral icon (`charcoal/20`, 40–48px), `text-sm font-medium text-charcoal` heading, `text-xs text-charcoal/50` supporting line, optional `.btn-secondary` call to action. Currently each page that needs one (if any) improvises; standardise into one `<EmptyState>`.
- **Modals** — existing `Modal` component (`rounded-2xl bg-white p-6 shadow-cardHover`, dark backdrop) is already close to the target look; update its internals (title styling, close button) to the neutral/no-serif rules above, but the component's props/API stay untouched since forms depend on it.
- **Drawers / slide-overs** — **new shared component.** Right-anchored panel, full height, `w-full max-w-md` (or `max-w-lg` for denser content), `bg-white shadow-cardHover`, slides in from the right, same dark backdrop as Modal. Useful for "quick view" flows (e.g. viewing a criterion or evidence item without leaving the list) — not built yet, proposed as a sibling to `Modal` rather than a replacement.
- **Tooltips** — **new shared component.** Small dark `bg-charcoal text-white text-xs rounded-lg px-2 py-1`, on hover/focus, mainly for icon-only buttons and truncated text. Not built yet.
- **Notifications / toasts** — **new shared component.** Bottom-right or top-right stack, `bg-white border border-charcoal/10 shadow-cardHover rounded-xl`, coloured left accent bar using `status.*` tones (success/error/info), auto-dismiss. Not built yet — Server Actions currently rely on redirect/refresh rather than toast feedback, so this is a genuinely new interaction pattern, not a restyle.
- **Activity items** — **new shared component.** Timeline-style row: small tone dot or avatar, one-line description with bolded actor/subject, trailing relative timestamp in `text-xs text-charcoal/45`. There's an `activity_log` table already in the schema (per the README) — this would be its first UI surface, so it's a new build against existing data, not a restyle.

---

## INTERACTION

| Pattern | Spec |
|---|---|
| Hover (structural) | `hover:bg-charcoal/5` for nav items, dropdown items, icon buttons, table/list rows. |
| Hover (card) | Border/shadow lift only (`hover:shadow-cardHover`), **no** `-translate-y` lift — the translate-on-hover currently on `SectionCard` reads as a bit "consumer app"; Contra's cards stay put and just deepen the shadow/border on hover. |
| Active sidebar item | `bg-burgundy-50 text-burgundy-600`, no border/indicator needed — matches current `sidebar.tsx`. |
| Selected table row | `bg-burgundy-50/50`, persists until deselected (for any future multi-select/bulk-action list). |
| Transitions | `transition-colors` (150ms default Tailwind) for hover/active state changes; `transition-all duration-200` for card hover elevation and drawer/modal enter. No spring/bounce easing — Contra's motion is quick and flat. |
| Loading / skeleton states | **New.** Neutral pulsing blocks (`animate-pulse bg-charcoal/5 rounded-lg`) shaped like the content they replace (a table skeleton = header + N grey rows; a card skeleton = grey block matching card padding). Not built anywhere yet — currently pages just show nothing/blank until Server Component data resolves. Worth adding once real interactivity (client-side loading) exists; less critical for pages that are pure Server Components with fast queries. |
| Dropdown animation | Fade + 4px slide down over ~100ms on open, instant on close. |
| Drawer animation | Slide in from right over ~200ms, backdrop fades in simultaneously. |
| Responsive behaviour | Sidebar hides below `md`, replaced by existing mobile nav; content max-width and padding scale down per the Layout table above; card grids collapse from 4 → 2 → 1 columns; tables scroll horizontally on narrow viewports rather than reflowing to cards (matches Contra, keeps column alignment legible). |

---

## Implementation plan

This spec doesn't touch code by itself. If you'd like me to build it, the lowest-risk order is:

1. **Token pass** — extend `tailwind.config.ts` only where genuinely needed (nothing above requires new colours; it's a discipline/usage change, not new tokens) and finish the `font-display` removal + `SECTION_ACCENTS`/`STAFF_CONTRACT_TYPE_BADGE` neutralisation called out above. Pure CSS/className changes, zero logic risk.
2. **New shared components** — build the "new shared component" items above (icon button, search field, filter bar, tabs, dropdown menu, avatar/avatar group, table shell, empty state, drawer, tooltip, toast, activity item) as standalone presentational components in `src/components/ui/`, with no wiring into pages yet — so they can be reviewed in isolation before anything adopts them.
3. **Adopt progressively** — roll the new components into existing pages one at a time (list pages first, since Table/FilterBar/EmptyState give the most visible lift), same phased/approve-as-you-go approach as the shell/dashboard work already delivered.

Let me know if you want me to proceed with step 1, or if any of the specific calls above (especially the two colour reconciliations, and dropping `font-display` entirely) should go differently before I start.

---

## Phase 1 status: shipped (2026-09-24)

The application shell, sidebar, top-level navigation, header primitive and three global design primitives (icon button, avatar/avatar group, page header) are built — see the commit checkpoint at `_checkpoints/2026-09-24-phase1-shell/` in the repo for the full before/after and revert instructions, and the chat response from that session for the nav-mapping rationale (which existing route each new nav label points to, what's marked "Coming soon", and the two judgment calls flagged for your review: Stock Orders' new home, and the ERO & Compliance sub-menu). The colour reconciliation (`SECTION_ACCENTS`, `STAFF_CONTRACT_TYPE_BADGE`) and `font-display` removal from the remaining pages are still open — deferred to the page-by-page adoption phase, not part of the shell.
