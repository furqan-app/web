# Sidebar Surah Indicator & Active Scroll

**Type:** feature  
**Date:** 2026-08-12  
**Status:** implemented  
**Trello:** [#196](https://trello.com/c/UoGWL2UK/196-the-surah-sidebar-toggler-icon-should-be-replaced-with-page-indicator)

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
