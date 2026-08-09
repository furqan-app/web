# Save Last Read Page + Navbar Link to Resume

**Type:** feature
**Date:** 2026-07-31
**Status:** implemented
**Trello:** #64 https://trello.com/c/VyjOZyfn (merged from #63, archived)

## Summary

Always persist the mushaf page the user was last reading, and add a navbar link that jumps back
to it so they can resume where they left off. Desktop double-page view saves the right-hand page
(the odd member of the pair), per the ticket. No saved page yet → link defaults to page 1
(Al-Fatiha).

## Approach

Reuse `ReaderPageContext.visiblePages` (`app/contexts/ReaderPageContext.tsx`) — already published
on every pager commit by `ReaderPageSync` (`app/components/reader/ReaderPageSync.tsx`) for the
Awrad plans widget (`visiblePages = isDouble ? [rightPage, leftPage] : [anchor]`). A new
null-rendering leaf, `LastReadPageSync`, subscribes to that same context and persists
`visiblePages[0]` on every change. It excludes the shared-mushaf grant reader via `usePathname()`,
mirroring `Nav.tsx`'s existing `isOnPagesRoute` check.

**Persistence is a small dedicated context (`LastReadPageContext`), not a bare `localStorage`
read in the navbar link — this was tried first and found broken by live testing** (see "What NOT
to Do"): `Nav` never remounts while navigating inside the app, so a component that reads
`localStorage` once on mount goes stale the instant `LastReadPageSync` writes a new value, and
clicking the stale link then overwrites real progress with whatever page it stale-pointed to.
`LastReadPageContext` holds `lastReadPage` as live React state, initialized from `localStorage` on
mount (client-only, hydration-safe) and updated — both the state and `localStorage` together — via
its `setLastReadPage`. `LastReadPageSync` calls that setter instead of touching `storage` directly;
`ContinueReadingLink` reads `lastReadPage` from the context, so it's always current no matter how
much in-app browsing happened since the last full page load. `localStorage` itself still follows
the existing client-preference pattern (`quranSafhaView`, `quranFontScale`, `quranMushafId` in
`app/utils/storage.ts`) — device-local, no schema/API change, works signed-in or signed-out.

The page number is stored plain (not resolved through a verse-key/edition map). `MushafSwitchSync`
already establishes that a URL page number is always read as "a page of the *active* edition" —
the same convention any deep link uses — so this saved page behaves exactly like a bookmark: it
means whatever page N is in the mushaf edition that happens to be active when the link is opened.

A new `ContinueReadingLink` navbar item (same shape as `MarksLink`/`PlansLink`/`SharedMushafLink`)
reads `lastReadPage` from `LastReadPageContext` and links to `/pages/{lastReadPage}`.

## Decision Tree / Algorithm

**Which page gets saved** (`LastReadPageSync`, fires on every `visiblePages` change):

| Condition | Page saved |
|---|---|
| `visiblePages` is `null` (not in the reader) | no-op |
| Current route is the grant reader (`pathname` includes `/mushaf/`) | no-op — not the user's own reading position |
| Single-page view (`visiblePages.length === 1`) | `visiblePages[0]` (the anchor page itself) |
| Double-page view (`visiblePages.length === 2`) | `visiblePages[0]` (`rightPage` — `ReaderPageSync` always orders `[rightPage, leftPage]`) |

**Navbar link target** (`ContinueReadingLink`):

| State | Link target |
|---|---|
| No `lastReadPage` in storage yet | `/pages/1` |
| `lastReadPage` present | `/pages/{lastReadPage}` |

## Verified Test Cases

1. Mobile, swipe to page 47 → `visiblePages = [47]` → `lastReadPage = 47`. Link → `/pages/47`.
2. Desktop double-view landing on pair (299, 300) → `visiblePages = [299, 300]` → saves `299`
   (right page), not `300`.
3. Desktop toggled to single-view, viewing page 300 alone → `visiblePages = [300]` → saves `300`
   (not 299 — the pair's right member isn't the visible page here).
4. User opens a shared mushaf via a grant link (`/mushaf/[grant]/pages/...`) and browses it →
   nothing written; the owner's own `lastReadPage` from their last self-reading session is
   untouched.
5. Fresh browser / cleared storage, never opened the reader → navbar link renders and points to
   `/pages/1`.

## Files to Change

- `app/utils/storage.ts` — add `lastReadPage: number` to `StorageKey`/`StorageValueType`.
- `app/contexts/LastReadPageContext.tsx` — **new**. `{ lastReadPage: number, setLastReadPage }`,
  `lastReadPage` starts at `1`, adopted from `storage.get("lastReadPage")` in a mount-only
  `useEffect` (hydration-safe). `setLastReadPage` updates both the React state and `localStorage`
  together, so every consumer re-renders live.
- `app/components/reader/LastReadPageSync.tsx` — **new**. Null-rendering leaf: reads
  `visiblePages` from `useReaderPage()`, `pathname` from `usePathname()`, and `setLastReadPage`
  from `useLastReadPage()`; on change, if `visiblePages` is non-null and `pathname` doesn't
  include `/mushaf/`, calls `setLastReadPage(visiblePages[0])`.
- `app/[locale]/layout.tsx` — wrap `<LastReadPageProvider>` around `<Nav />` / `{children}` /
  `<LastReadPageSync />` (inside `ReaderPageProvider`, alongside `<PlansWidget />`) so both the
  writer and the navbar reader share the same context instance.
- `app/components/nav/ContinueReadingLink.tsx` — **new**, mirrors `MarksLink`/`PlansLink`: `Link`
  to `/pages/{lastReadPage}`, reading `lastReadPage` straight from `useLastReadPage()` — no local
  state, no separate `localStorage` read. Icon: `BookOpen` (lucide, unused elsewhere in the nav so
  far). Translation key: `continueReading.navLink`.
- `app/components/nav/Nav.tsx` — render `<ContinueReadingLink />` in the always-visible icon
  group, before `<SharedMushafLink />`.
- `messages/ar.json` / `messages/en.json` — add `continueReading.navLink` (e.g. ar: "متابعة
  القراءة", en: "Continue Reading").

## Constraints

- `LastReadPageSync` must consume `ReaderPageContext`, not duplicate `getPagePair`/`isDouble`
  logic — `visiblePages[0]` is already exactly the right page to save in both view modes; a
  second implementation of that logic would drift from `ReaderPageSync`'s.
- Do not persist while on the grant reader (`/mushaf/[grant]/pages/...`) — that route reuses the
  same `ReaderPager`/`ReaderPageContext` machinery as the self reader (per ADR 0012), so this
  exclusion is required, not incidental.
- `ContinueReadingLink`'s initial render must match server and client (start at page `1` in both)
  to avoid a hydration mismatch — only update after mount, per the `QuranMushafContext` pattern
  already established in this codebase.
- The navbar link must read *live* state, never a one-shot `localStorage.get()` — `Nav` persists
  across in-app navigation without remounting, so a one-shot read goes stale as soon as
  `LastReadPageSync` writes again, and a click on the stale link then overwrites real progress
  with the stale page (confirmed live, see "What NOT to Do").
- Keep the stored value a **plain page number** — do not add verse-key/edition resolution for
  this feature (see "What NOT to Do").

## What NOT to Do

- Do not build DB-backed/per-user persistence (new table, API route) for this — explicitly
  scoped out; `localStorage` matches the existing reader-preference pattern and the ticket's
  ask.
- Do not gate the save on a `visibilitychange`/`pagehide`/inactivity event — save continuously
  on every `visiblePages` change instead (simpler, always fresh, not dependent on an unload event
  firing reliably across mobile backgrounding/bfcache).
- Do not resolve the saved position through a verse-key/edition map (unlike
  `MushafSwitchSync`/recitation-follow) — this is a plain bookmark-style deep link, explicitly
  decided against the ADR 0033-style verse-key precision as unnecessary complexity for this
  feature.
- Do not add the link only when a saved page exists — it must always render, defaulting to page 1
  per the merged ticket's original title ("Alfateha or last saved").
- Do not read `localStorage` directly in `ContinueReadingLink` (or any other one-shot-on-mount
  pattern) — tried first, confirmed broken by scripted browser testing: landing on `/pages/47`
  correctly wrote `47` to storage, but the already-mounted link kept showing `/pages/1`; landing
  on `/pages/80` correctly wrote `79` (right page of the pair), but the link still showed the
  *previous* page's value. Clicking a stale link navigates to the stale page and then persists
  *that* page as the new `lastReadPage`, silently discarding real reading progress. Use
  `LastReadPageContext`'s live state instead.

## Decisions Made

- Storage: `localStorage`-only, no DB/API (user-confirmed).
- Save trigger: on every page change via `ReaderPageContext`, not an inactivity/unload event
  (user-confirmed).
- Precision: plain page number, not verse-key/edition-resolved (user-confirmed).
- Fallback: default to page 1 / Al-Fatiha when nothing is saved yet (user-confirmed).
- Desktop double-view saves the right page (`visiblePages[0]`, per `ReaderPageSync`'s existing
  `[rightPage, leftPage]` ordering) — directly satisfies the ticket's "save the page on the
  right" requirement with no new logic.
- Grant/shared-mushaf reader is excluded from saving — this is the reader's own position, not
  whichever shared mushaf they last viewed.
