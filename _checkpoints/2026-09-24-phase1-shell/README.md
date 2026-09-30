# Checkpoint — before Phase 1 shell rebuild (2026-09-24)

This folder holds the exact pre-change contents of the 5 existing files touched by the Phase 1 application-shell rebuild (new sidebar IA, header primitive, design primitives), taken immediately before any edits.

I don't have terminal/git access on this machine from this session, so I can't create a real `git commit` checkpoint myself — this folder is the fallback: a straight copy-based revert point. **If you also run a real git commit before/after reviewing this, that's the better, more complete checkpoint (covers the whole repo, not just these 5 files) — I'd recommend it:**

```
git add -A
git commit -m "Checkpoint before Phase 1 shell rebuild"
```

## To revert Phase 1 by hand (if git isn't an option)

Copy each file below back over its live counterpart, then delete the two brand-new files and this `_checkpoints` folder:

- `src/lib/constants.ts` → `beach-kids-ero-portal/src/lib/constants.ts`
- `src/components/icons.tsx` → `beach-kids-ero-portal/src/components/icons.tsx`
- `src/components/sidebar.tsx` → `beach-kids-ero-portal/src/components/sidebar.tsx`
- `src/components/topbar.tsx` → `beach-kids-ero-portal/src/components/topbar.tsx`
- `src/app/(portal)/layout.tsx` → `beach-kids-ero-portal/src/app/(portal)/layout.tsx`

Then delete these Phase 1 additions (safe to delete, nothing else references them yet):

- `src/components/ui/icon-button.tsx`
- `src/components/ui/avatar.tsx`
- `src/components/ui/page-header.tsx`

No database, auth, route, or page-content files were touched by this phase, so reverting the 5 files above (and deleting the 3 new ones) fully undoes it.
