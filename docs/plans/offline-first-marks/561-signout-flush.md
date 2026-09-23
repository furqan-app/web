---
title: Sign-out flushes pending marks and confirms when any remain
type: feature
date: 2026-09-06
status: implemented
area: marks
issue: 561
adr: [0061]
---

# Sign-out flushes pending marks and confirms when any remain

> Umbrella: [`INDEX.md`](INDEX.md). Closes the last unowned clause of
> `decisions/marks.md` ("Marks Are Local-First"). Sequenced behind #550 — until the
> `MarkModal` wrote to the store, no record could be `pending`, so this path had nothing
> to flush.

## Summary

`decisions/marks.md` requires sign-out to flush pending marks and confirm when any remain
("You have N marks that haven't synced yet" — Sign out anyway / Stay and retry). No child of
#236 owned it. Both `signOut()` call sites in `app/components/nav/UserMenu.tsx` (the `menuRow`
disclosure branch and the `DropdownMenu` branch) now route through a flush-then-confirm handler.

## Approach

On Sign out click:

1. `getPendingCount() === 0` → `signOut()` immediately (today's behaviour, unchanged).
2. Otherwise: `await syncMarks()` once (spinner on the row), then re-read `getPendingCount()`.
   - `0` → `signOut()`.
   - `> 0` → swap the row for an inline confirm (the same inline-disclosure idiom
     `GrantedViewersList` and the UserMenu Account expander already use — **not** a `Dialog`,
     which would unmount with the closing `DropdownMenu`): a `--warning`-toned
     "N marks haven't synced yet" line + **Sign out anyway** (`signOut()`) and
     **Stay and retry** (dismiss the confirm and fire one more `syncMarks()`).

The `DropdownMenu` sign-out item calls `e.preventDefault()` in `onSelect` so the menu stays
open through the flush and the confirm. The dropdown still unmounts `SignOutControl` if the
menu is dismissed another way (Escape, outside click) — which can land mid-`await syncMarks()` —
so every post-await branch checks a `mountedRef` first and bails rather than signing the user
out (or dropping the confirm) after a "never mind" gesture. `syncMarks()` is a module
singleton, so "Stay and retry" reuses the same `flush()` helper and shows the same spinner.

## Constraints (from the issue + `decisions/marks.md`)

- **Sign-out never moves the owner stamp and never stamps `"guest"`.** Nothing here calls
  `setOwnerStamp`; `MarksSync`'s effect early-returns on `status !== "authenticated"`. A later
  sign-in as a different account is what resets the store — leave that to `setOwnerStamp`.
- **Do not wipe the store on sign-out.** The installed PWA is a single-owner device;
  `pending` records that outlive a failed flush stay for the next session's sync.
- **No offline variant of the confirmation.** Sign out is unreachable offline — `UserMenu`
  renders it only when `session` is truthy, and `useSession()` reads unauthenticated on every
  offline launch (ADR 0049). A flush that can't reach the network just leaves the count > 0,
  which surfaces the same confirm — "Stay and retry" is the offline answer.
- New strings land in **both** `messages/ar.json` and `messages/en.json`, with a full ICU
  Arabic plural (`one/two/few/many/other`) and a `toLocaleNumeral` display value, matching
  `sidebar.ayahCount`.

## Folded-in hardening (epic #236 review, 2026-09-06)

Two small items from the post-epic review, landed on this branch rather than their own:

- **`MarkModal` local save/remove path resets `isSaving` / `isRemoving`.** The grant path has
  a `finally`; the local path relied on `QuranSafha` unmounting the modal (`selectedForMark →
  null`) to drop the state. Safe today, but a stuck `true` disables Save + Remove if that mount
  condition ever changes. Reset before `close()`.
- **`applyServerPull` full-replace invariant is now commented** in `app/lib/marks/store.ts`
  and `app/api/marks/route.ts`: deleting local `synced` records absent from the pull is only
  safe because `/api/marks?all=true` is unpaginated. A partial response would silently wipe
  local marks — any future pagination needs a completeness signal first.

## Test cases from the umbrella

9 (sign-out with 3 marks still pending, online — flush attempted; failures leave them pending;
dialog offers Sign out anyway / Stay and retry).

## Done when

- Sign out with zero pending marks behaves exactly as before (immediate).
- Sign out with pending marks flushes first; if the flush clears them, it signs out with no prompt.
- If marks remain after the flush, both `UserMenu` branches show the inline confirm; "Sign out
  anyway" signs out, "Stay and retry" keeps the session and re-triggers sync.
- The owner stamp is unchanged across the whole flow.
- `messages/ar.json` and `messages/en.json` both carry the new keys.
