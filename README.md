# Beach Kids – ERO Self-Audit Portal

A private management system for Beach Kids ECE to work through the ERO
self-audit, upload and link supporting evidence, track actions, and see
overall ERO readiness — built as a real persistent web app (Next.js +
TypeScript + Supabase), not a mock-up.

## ✅ The official ERO criteria are loaded

All 111 official criteria from "Self-Audit Checklists. Updated January
2022" (ERO) are now seeded in
[`supabase/seed/seed_criteria.sql`](supabase/seed/seed_criteria.sql) —
Curriculum (16), Premises and Facilities (40), Health and Safety (34), and
Governance, Management and Administration (21) — every requirement copied
verbatim from the source document, nothing rewritten or invented. **Read
[`supabase/seed/README.md`](supabase/seed/README.md)** before relying on
this data: 13 of those codes (C14–C16, PF39–PF40, GMA13–GMA20) are Beach
Kids-assigned navigation identifiers for requirements the source document
itself never numbered, not official ERO criterion numbers — the README
explains exactly which ones and why.

The earlier file you uploaded during the build
(`Beach_Kids_ECE_Self_Audit_Checklist.pdf`) turned out to be Beach Kids' own
internal prep checklist, not the official numbered ERO document — it's
saved as
[`supabase/seed/beachkids_internal_checklist_reference.md`](supabase/seed/beachkids_internal_checklist_reference.md)
for later use as "Beach Kids readiness checklist" content under each
criterion (not yet wired up — add it whenever you're ready).

Every criterion loads as **Not Assessed** with evidence **Missing** — no
compliance status, evidence, or staff/child/parent information has been
invented; that all gets entered through the app as the self-audit proceeds.

## A note on how this was built

This project was generated in a sandboxed environment with **no access to
npm, so nothing here has been `npm install`'d, built, or run**. The code
follows current, well-established Next.js App Router + Supabase SSR
patterns throughout, but you should treat first setup as the moment this
gets its first real compile/build check — see Troubleshooting below if
`npm run build` turns up anything.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Supabase**: Postgres (with Row Level Security), Auth, and private Storage
- **Tailwind CSS** for styling
- Deploys to **Vercel** (or any Next.js-compatible host)

## 1. Create the Supabase project

1. Create a new project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the migrations **in order**:
   - `supabase/migrations/0001_init.sql` — tables, enums, indexes, triggers
   - `supabase/migrations/0002_rls.sql` — Row Level Security policies + the private `evidence` storage bucket
   - `supabase/migrations/0003_seed_sections.sql` — seeds the 4 ERO sections
   - `supabase/seed/seed_criteria.sql` — seeds all 111 official ERO criteria
     (see [`supabase/seed/README.md`](supabase/seed/README.md) for the
     breakdown and the non-official-code disclosure)

### Create the first (and, for now, only) login

Supabase Auth manages users — there's no sign-up page in this app on
purpose. Create the account in **Authentication → Users → Add user** in the
Supabase dashboard:

- Email: `ethan@beachkids.co.nz`
- Set a temporary password and share it securely; a "Change password" form
  is in **Settings** inside the app for changing it after first login.

A `profiles` row is created automatically for every new Auth user (see the
`on_auth_user_created` trigger in `0001_init.sql`), so nothing else is
needed to make that login work. To add another management account later,
repeat this step — no code or schema changes required.

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values from
**Project Settings → API** in the Supabase dashboard:

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe to
  expose to the browser; every query they make is still constrained by RLS.
- `SUPABASE_SERVICE_ROLE_KEY` — **server-only**, never exposed to the
  browser (guarded by the `server-only` package in `lib/supabase/admin.ts`).
  Not required for day-to-day use of v1; kept for future admin features.

## 3. Install and run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`, sign in with the account you created above.

## 4. Deploy

Push to a Git repo and import it in [Vercel](https://vercel.com). Add the
same three environment variables in the Vercel project settings. No other
configuration is needed — the app is a standard Next.js App Router project.

## How the pieces fit together

- **Database** (`supabase/migrations/0001_init.sql`): `ero_sections` and
  `ero_criteria` hold the official ERO structure. `criterion_assessments`
  holds the current compliance/evidence status, notes and review info for
  each criterion (one row per criterion; a missing row is treated as "Not
  Assessed" / evidence "Missing" by the app, so nothing has to be
  pre-seeded). `beachkids_checklist_items` is the internal readiness
  checklist under each criterion. `evidence` + `evidence_criteria_links`
  implement upload-once/link-to-many. `actions` and `activity_log` round it
  out.
- **Access control** (`supabase/migrations/0002_rls.sql`): this is a
  private, single-organisation system — every table and the `evidence`
  storage bucket allow full access to any authenticated user and nothing to
  anonymous requests. There's no public data path at all.
- **Evidence privacy**: the `evidence` Storage bucket is created with
  `public: false`. Every preview/download goes through
  `getSignedUrlForEvidence` (`src/lib/actions/evidence.ts`), which mints a
  5-minute signed URL server-side after Supabase has already checked the
  caller's session against the bucket's RLS policy. No storage URL is ever
  hard-coded or exposed in client-side code.
- **App structure**: `src/app/(portal)` is the authenticated shell
  (sidebar/topbar/mobile nav in `src/components`); `src/lib/data/*` are
  server-only read functions; `src/lib/actions/*` are the Server Actions
  that perform every write (status changes, notes, checklist items,
  uploads, links, actions). `src/middleware.ts` refreshes the Supabase
  session on every request and redirects unauthenticated requests to
  `/login`.

## Troubleshooting a first build

Since this hasn't been through `npm install`/`npm run build` yet, if
something doesn't compile on first try, it's most likely one of:

- A dependency version mismatch — `package.json` pins reasonably recent
  versions of `next`, `@supabase/ssr` and `@supabase/supabase-js`; bump if
  npm resolves something incompatible.
- `database.types.ts` — hand-written to match the SQL migrations. If you
  add/change a column, update this file too (or generate it properly with
  `supabase gen types typescript --project-id <ref>` once you have the
  Supabase CLI installed).

Run `npm run type-check` and `npm run lint` after `npm install` as a first
pass before `npm run dev`.
