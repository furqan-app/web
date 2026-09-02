---
title: Sidebar Surah Indicator & Active Scroll
type: feature
date: 2026-08-12
status: implemented
area: nav
---

# Sidebar Surah Indicator & Active Scroll

## Summary

Two changes to the surah sidebar: (1) replace the `PanelLeftOpen` icon in the nav with a compact trigger showing the current surah name, number, and a chevron (up when open, down when closed); (2) when the sidebar opens, auto-scroll to the active surah item (surah tab) or active rub item (rub tab) so the user lands already in context.

## Approach

### 1. Extend SidebarContext with current surah

Add `currentSurah: SurahSlim | null` and `setCurrentSurah` to `SidebarContext`. `SurahSlim` carries the minimum fields Nav needs:

```ts
type SurahSlim = { id: number; name_arabic: string; name_simple: string };
```

`Sidebar` (which receives the full `surahs` prop) derives the active surah from `usePathname()` and calls `setCurrentSurah` inside a `useEffect` keyed on pathname. Nav reads `currentSurah` from `useSidebar()`.

**Why Sidebar, not Nav?** Nav sits in the locale layout — it has no access to surahs. Sidebar already has `surahs` and `usePathname()` is free. Setting current-surah from Sidebar keeps the lookup co-located with the data.

**Null guard:** Sidebar is lazy-loaded (`next/dynamic`) so `currentSurah` is null until it mounts. Nav falls back to the `PanelLeftOpen` icon while null (first render on a non-cached visit).

### 2. Nav trigger

Replace the `PanelLeftOpen` `Button` (gated by `isOnPagesRoute`) with a new button that:
- Shows `currentSurah.name_arabic` (RTL locale) or `currentSurah.name_simple` (LTR) in a small text span
- Shows the surah number via `toLocaleNumeral`  
- Shows `ChevronUp` when `open`, `ChevronDown` when `!open`
- Falls back to `PanelLeftOpen` icon when `currentSurah` is null

Layout: `[number · name · chevron]` — flex row, truncated, `max-w-[7rem]` or similar to avoid crowding center.

### 3. Sidebar controlled tabs + active scroll

**Tabs:** lift `defaultValue="surahs"` to controlled state (`activeTab`, `setActiveTab`) in `Sidebar` local state. Tabs persist their last value across open/close cycles because `Sidebar` stays mounted.

**Active surah scroll:**
- In `SurahListItem`, add `data-surah-id={surah.id}` to the link element.
- In `Sidebar`, `useEffect` on `[open, currentSurah]` — when `open` transitions to `true` and `activeTab === "surahs"`, query `container.querySelector('[data-surah-id="' + currentSurah.id + '"]')` and call `.scrollIntoView({ block: 'nearest', behavior: 'instant' })`.
- Use a `ref` on the surahs `TabsContent` scroll container.

**Active rub scroll:**
- Derive `currentRub` inside Sidebar: `rubs.findLast(r => r.startVerse.page_number <= pageNumber)` where `pageNumber` is parsed from pathname.
- Add `data-rub-id={rub.id}` to each rub `Link` in `RubList`. Pass `currentRubId` as a prop (or let Sidebar do the scrolling directly via a rub-tab-content ref).
- `useEffect` on `[open, currentRub]` — when `open` and `activeTab === "rubs"`, query and `scrollIntoView`.
- Use a `ref` on the rubs `TabsContent` scroll container.

**versePages dependency for rub scroll:** `RubList` already uses `useVersePages()` to map verse keys to page numbers for the current mushaf edition. For scrolling, Sidebar needs the same lookup. Two options: (a) derive `currentRub` inside Sidebar using only `startVerse.page_number` (default edition — acceptable as an approximation for scroll position), or (b) hoist `useVersePages()` into Sidebar and pass it down. Use option (a) — scroll position accuracy is cosmetic, and the fallback default-edition page numbers are already present on the `startVerse` object.

## Decision Tree

| Condition | Trigger renders | Sidebar opens on |
|---|---|---|
| Not on pages route | Nothing (hidden) | n/a |
| Pages route, currentSurah null (lazy load pending) | `PanelLeftOpen` icon | n/a |
| Pages route, currentSurah set, sidebar closed | `[num · name · ChevronDown]` | click |
| Pages route, currentSurah set, sidebar open | `[num · name · ChevronUp]` | already open |

| Sidebar open + activeTab | Auto-scroll target |
|---|---|
| surahs | Item with `data-surah-id={currentSurah.id}` |
| rubs | Item with `data-rub-id` matching `rubs.findLast(r => r.startVerse.page_number <= pageNumber)` |

## Files to Change

- `app/contexts/SidebarContext.tsx` — add `SurahSlim`, `currentSurah`, `setCurrentSurah` to context value and provider state.
- `app/components/nav/Sidebar.tsx` — derive active surah from pathname+surahs; call `setCurrentSurah`; lift tabs to controlled state; add scroll refs and `useEffect` for auto-scroll.
- `app/components/nav/Nav.tsx` — replace `PanelLeftOpen` button with surah-indicator trigger; read `currentSurah` and `open` from `useSidebar()`.
- `app/components/SurahListItem.tsx` — add `data-surah-id={surah.id}` to the `Link`.
- `app/components/RubList.tsx` — add `data-rub-id={rub.id}` to each rub `Link`; accept optional `currentRubId` prop for forward compatibility (scroll logic stays in Sidebar via ref queries).

## Edge Cases and Decisions

- **Surah 1 (Al-Fatiha, page 1):** `findLast(startPage <= 1)` returns surah 1 — correct.
- **Page 1 in rubs:** rub 1 starts at page 1; `findLast(startVerse.page_number <= 1)` returns rub 1 — correct.
- **Multi-surah pages:** surah is whichever starts on or before current page with the highest start-page — i.e. the last surah to have started. This matches what the user considers "current surah."
- **Sidebar not yet open (initial):** `useEffect` fires only when `open` transitions to true — no scroll on mount.
- **Tab switching while open:** scroll fires only on `open` transitions, not on tab changes — no scroll when user manually switches tabs. This keeps the interaction predictable; user is free to browse other surahs/rubs without being snapped back.
- **mushaf/[grant]/ route:** Sidebar is also rendered in the mushaf layout. `currentSurah` update logic in Sidebar is pathname-agnostic (reads the page number segment), so it works on both routes.
- **RTL name display in Nav trigger:** use `name_arabic` for `ar` locale, `name_simple` for `en`. No `font-surahnames` glyph — the trigger must be legible at small text sizes.

## Constraints

- Keep `useSidebar()` hook signature additive — existing `open`/`setOpen` callers unchanged.
- Nav must not import `surahs` data directly — all surah info flows through context.
- Tabs remain on the same tab across open/close (controlled state in Sidebar local state, not lifted to context).
- Auto-scroll uses `behavior: 'instant'` — no visible scroll animation while the sheet is opening.
- Do not add `useVersePages()` to Sidebar — use `startVerse.page_number` (default edition) for rub scroll approximation.

## What NOT to Do

- Do not use the `font-surahnames` glyph font in the Nav trigger — it's decorative/large and would overflow the compact nav button.
- Do not lift tab state to `SidebarContext` — the nav doesn't need to know which tab is active.
- Do not scroll on tab switch (only on sidebar open) — avoids fighting user's manual navigation within the sidebar.
- Do not show the surah indicator on non-pages routes — same gate as the current `PanelLeftOpen` button (`isOnPagesRoute`).

## Decisions Made

- Context carries `SurahSlim` (id + name_arabic + name_simple) only — not the full `SurahResult` — to keep the context payload minimal.
- Active rub derived from `startVerse.page_number` (default edition fallback) rather than the verse-pages map, for simplicity. Scroll position is cosmetic.
- Surah name in Nav trigger: `name_arabic` for RTL, `name_simple` for LTR.
- Chevron direction: down = closed, up = open — standard disclosure pattern.

## Addendum — Wrong surah name on shared multi-surah pages (2026-08-16)

**Type:** bug  
**Issue:** [#320](https://github.com/furqan-app/web/issues/320)

### Bug

Tapping a surah in the sidebar's surah list navigates to the correct page, but the Nav trigger's surah name/number stays wrong whenever the target page hosts more than one surah — it shows whichever surah on that page has the highest id, not the one actually tapped. E.g. page 604 hosts surahs 112/113/114; tapping 112 or 113 both land on page 604 correctly but the trigger shows "An-Nas" (114). It never self-corrects — it stays wrong until the reader navigates off that page (a swipe/arrow to a different, unambiguous page), which only looks like a fix because the new page happens to resolve unambiguously.

### Root Cause

`Sidebar.tsx`'s `activeSurah` (Decision Tree row "Multi-surah pages" above) is derived purely from `pageNumber` via `surahs.findLast(startPage <= pageNumber)`. That heuristic is correct for swipe/arrow navigation (arriving at a page mid-read, the last surah to have started is what a reader considers current) but wrong for an explicit tap: `SurahListItem` already knows exactly which surah id was picked, and that signal is thrown away — the page number alone can't disambiguate multiple surahs starting on the same page.

### Approach

`SurahListItem`'s click already knows the target surah id. Have it "pin" that id via a new `pinnedSurahId`/`setPinnedSurahId` pair on `SidebarContext`. `Sidebar` prefers the pinned surah over the page-derived guess, but only while the current page still falls within the pinned surah's own page range — the moment the reader leaves that range by any means (swipe, arrow, another jump), the pin is invalidated and normal page-derived resolution resumes. This leaves the existing swipe-based "last surah on the page" behavior untouched (still correct for natural reading) and only overrides it for the explicit-selection case.

**Implementation gotcha (found live, not from static review):** the pin-clearing effect must be keyed on `pageNumber` alone, not on `[pinnedSurahId, pinnedSurahValid]`. `SurahListItem`'s click sets the pin in the same event handler `jumpTo` uses to call `window.history.replaceState`, but Next's app router syncs `usePathname()` to that URL change on a *later* render, not the same one. An effect keyed on the pin itself re-runs on the render where the pin is already set but `pageNumber` is still the pre-jump value — `pinnedSurahValid` reads false against that stale page and the effect clears the pin before `pageNumber` ever catches up, silently reproducing the exact bug this fix exists for. Keying on `pageNumber` alone defers the validity check to the render where `pageNumber` has actually changed. First implementation attempt shipped the naive keying and was caught by live browser verification (tapping 112 still showed 114) before this fix; see `Sidebar.tsx`'s inline comment for the same explanation at the code.

### Decision Tree (extends the existing one)

| Condition | `activeSurah` resolves to |
|---|---|
| `pinnedSurahId` set AND `pageNumber` is within that surah's `[startPage, endPage]` | the pinned surah |
| `pinnedSurahId` set but `pageNumber` outside its range | falls through to page-derived (`findLast`), and the pin clears |
| `pinnedSurahId` null | page-derived (`findLast`), unchanged from original behavior |

### Verified Test Cases

- **Tap surah 112 (Al-Ikhlas) from anywhere:** lands on page 604, pin=112, page 604 ∈ [604,604] → shows "Al-Ikhlas". (Previously showed "An-Nas".)
- **Tap surah 113 (Al-Falaq):** same page 604, pin=113 → shows "Al-Falaq". (Previously showed "An-Nas".)
- **After pinning 112, swipe backward to page 603:** page 603 ∉ [604,604] → pin clears, falls through to `findLast` → shows "Al-Masad" (111, correct page-derived answer for 603). Matches pre-existing swipe behavior.
- **After pinning 112, swipe forward within a multi-page surah's own range (not applicable to 112/604, but e.g. tapping Al-Baqarah then swiping a few pages forward while still inside pages 2–49):** pin stays valid the whole time — same surah shown, no flicker to a different surah mid-surah.
- **Tap a single-surah-page surah (e.g. 2, Al-Baqarah, page 2):** pin=2, page 2 ∈ [2,49] → shows "Al-Baqarah" — same result page-derived logic already gave; pin is a no-op here (not a regression).
- **ContinueReadingLink jump (page number only, no surah id):** doesn't set a pin — always page-derived, unchanged.

### Files to Change

- `app/contexts/SidebarContext.tsx` — add `pinnedSurahId: number | null`, `setPinnedSurahId: (id: number | null) => void` to context value and provider state.
- `app/components/nav/Sidebar.tsx` — compute `pinnedSurah` from `pinnedSurahId` + `surahs`, validate it against `[startPage, endPage]` parsed from `pinnedSurah.pages`, prefer it over the `findLast` result when valid; clear the pin (`setPinnedSurahId(null)`) once it's no longer valid for the current `pageNumber`.
- `app/components/SurahListItem.tsx` — in the same `onClick` branch that calls `jumpTo(surahStartingPage)`, also call `setPinnedSurahId(surah.id)` (read from `useSidebar()`, already imported there).

### Edge Cases and Decisions

- **Stale pin re-encountered later:** if the pin isn't cleared until the page actually leaves its range, and the user swipes back into that exact range through a different path later, the pin would still apply — this is desired (same disambiguation problem, same fix). The pin is cleared as soon as it stops matching, so it can never apply to an unrelated later visit to that page.
- **Full-page navigation (no `jumpTo`, e.g. modifier-click / pager not mounted):** `SurahListItem` falls through to a real Next navigation and never calls `setPinnedSurahId` — a fresh `Sidebar` mount has no pin and could show the same wrong-surah result on first paint for a multi-surah target page. Rare (only when the pager isn't already mounted or a modifier key is held) and out of scope for this fix.
- **RubList's analogous `currentRub = rubs.findLast(...)` pattern:** same class of bug is theoretically possible if two rubs' start-verses ever land on the same page. Not reported, rubs are evenly spaced so collision is unlikely, left out of scope for this fix.

### Constraints

- Do not change the `findLast`-based derivation itself — it stays correct for swipe/arrow navigation and is the required fallback once a pin is invalid.
- Pin only from `SurahListItem`'s explicit tap — do not set it from swipe, arrows, keyboard, or `ContinueReadingLink` (none of those carry an unambiguous "selected surah").

### What NOT to Do

- Do not "fix" this by changing `findLast` to `find` (picking the *first* surah on a shared page instead of the last) — that would just flip which swipe-arrival case is wrong (per the original Decision Tree reasoning, swipe-arrival should show the last-started surah) without fixing the tap-selection case at all.
- Do not thread a surah id through `ReaderNavigationContext`'s `jumpTo(page: number)` signature — `jumpTo` is shared by `ContinueReadingLink` (page-only, no surah concept) and would need every caller updated for no benefit; `SidebarContext` already reaches both `SurahListItem` and `Sidebar` directly.
- Do not extend this fix to `RubList`/rubs in this task — not reported, left as a noted latent risk only.
