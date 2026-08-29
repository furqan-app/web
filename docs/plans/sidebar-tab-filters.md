# Sidebar: per-tab search filters (Surahs + Rubs tabs)

**Type:** feature
**Date:** 2026-08-25
**Status:** implemented
**Issue:** [#362](https://github.com/furqan-app/web/issues/362) (part of epic #361; sibling #363 home search already shipped in PR #420)

## Summary

Add one adaptive filter input to the Sidebar sheet, placed between the TabsList and the scrollable lists so it never scrolls away and survives Radix's TabsContent unmounting. Placeholder and semantics adapt to the active tab: Surahs filters by name (ar/en) + exact surah number; Rubs filters by juz/hizb/rub number (union on bare digits) + associated surah name. All matching is client-side over the existing `surahs`/`rubs` props via the shared `app/utils/nav-search.ts` parser, extended additively with hizb/rub prefixes — no new API endpoints, no new fetches.

## Approach

- Query state is lifted into `Sidebar` (`surahQuery`, `rubQuery` — independent per tab, preserved across tab switches and sheet open/close; Sidebar stays mounted while the sheet is closed).
- The field renders between `TabsList` and `TabsContent`, not inside either tab: `TabsContent` unmounts on switch (would drop value/focus) and is the scroll container (would scroll away).
- Escape contract inside the Radix focus trap: non-empty query → clear + `stopPropagation`; empty → bubbles, sheet closes. No autofocus (Radix default focus stays on the close button; auto-popping the mobile keyboard would destroy the scroll-to-active reveal).
- Enter activates the first filtered item: on reader routes the pager is mounted, so `jumpTo` applies — instant client-side navigation + `setOpen(false)`, matching the existing SurahListItem/RubList click pattern.
- Rubs regrouping reuses `buildJuzGroups` on the filtered array (empty groups drop naturally). The juz header's "Page N" span is computed from the **full unfiltered** rubs prop (true juz start = rub `(N-1)*8+1`) so filtered headers never lie.
- A `role="status"` result count renders while filtering (ICU plural message, count passed as number for selection + pre-converted `toLocaleNumeral` string for display — satisfies the i18n standard's numeral policy AND plural grammar).
- Per-tab empty states at sheet scale (halved padding): well-icon + one-line message + valid-range line (Surahs 1–114 · Juz 1–30 · Hizb 1–60 · Rub 1–240).

## Decision Tree / Algorithm

Per keystroke, synchronous (no debounce):

1. Fold digits (Eastern/Extended → ASCII), trim, parse via shared `parseNavQuery` — extended with `hizb|حزب` and `rub|ربع` prefixes (additive; home's juz/page handling unchanged).
2. Surahs tab (`surahQuery`):
   - Text → `surahMatchesQuery` (shared; hamza-folded both sides, lowercase, `name_arabic`/`name_simple`).
   - Bare/prefixed number → exact surah id only (juz/page prefixes yield no cards → empty state).
3. Rubs tab (`rubQuery`) — new `rubMatchesQuery(rub, parsed, surahsById)`:
   - Text → associated surah name match: `rubVerseMappings[0].chapter_number` → surah, folded contains on ar/en names.
   - Prefix `juz` → rubs with `Math.ceil(rub_number/8) === n`; `hizb` → `Math.ceil(rub_number/4) === n`; `rub` → `rub_number === n`.
   - Bare number → union of the three, deduped (same "surface every intent" answer as home).
4. Render: field + clear; while a tab's query is non-empty → count line, then filtered list (or per-tab empty state if zero). Juz headers only for non-empty groups.
5. Keyboard: Escape per contract above; Enter → first filtered card/rub page (edition-aware via existing `pageOfVerse`/`useVersePages` in RubList).

## Verified Test Cases

| Input (tab) | Result |
|---|---|
| `٥` (Surahs) | Al-Ma'idah card only (id 5 exact) |
| `kahf` (Surahs) | Al-Kahf card |
| `3` (Rubs) | union: juz 3 rubs (17–24) + hizb 3 rubs (9–12) + rub 3, deduped, under real headers |
| `جزء ٥` (Rubs) | rubs 33–40 only (juz 5) |
| `حزب ١٢` / `hizb 12` (Rubs) | rubs 45–48 |
| `ربع 200` / `rub 200` (Rubs) | rub 200 only |
| `مريم` (Rubs) | rubs starting in surah Maryam |
| `200` (Surahs) | empty state + "Surahs 1–114" range line |
| Escape with non-empty query | clears field, sheet stays open |
| Escape with empty query | sheet closes (Radix default preserved) |
| Filter → switch tabs → switch back | each tab's query and results preserved |
| Filter excludes active item | item simply absent (no orientation line — user confirmed "silent") |
| Filtered juz header | page span = true juz start from unfiltered rubs |

## Design Remediation

From `/impeccable critique` on the sidebar surface (2026-08-25, dual-agent, detector exit 0). Folded into Files to Change: close-button accessible name (`Sidebar.tsx` icon-only X has none — regressed vs sheet.tsx default), stale scroll-comment fix (`activeTab` IS in the dep array; behavior is desirable with filters — fix comment, keep behavior). Deferred to follow-up (not this task): combobox a11y semantics on filter fields, touch-target bumps (close 32px, tab triggers ~32px), hizb circle badge sizing.

## Files to Change

- `app/utils/nav-search.ts` — extend additively: `hizb|حزب` + `rub|ربع` prefixes in `parseNavQuery` (new prefix union members, no change to juz/page/home behavior); new exported `rubMatchesQuery(rub, parsed, surahs)` (surahs passed as a pre-built id→surah map by the caller).
- `app/utils/nav-search.test.ts` — new cases: hizb/rub prefixes (both locales), bare-number union dedupe, surah-name rub matching, home-grammar regression (existing cases keep passing).
- `app/components/nav/Sidebar.tsx` — lifted `surahQuery`/`rubQuery` state; adaptive field between TabsList and TabsContent (placeholder per tab); Escape stopPropagation guard; Enter-to-first-result per tab; count line; close-button aria-label; stale comment fix. Passes filtered arrays down; `SurahList`/`RubList` props otherwise unchanged.
- `app/components/RubList.tsx` — accepts optional `filteredRubs?: RubWithVerses[]` prop; rows/groups come from it while juz header pages still resolve from the full `rubs` prop. Everything else (scroll-into-view, current highlight, edition-aware pageOfVerse) untouched.
- `messages/ar.json` + `messages/en.json` — new `sidebar.filter*` keys: filterPlaceholderSurahs, filterPlaceholderRubs, filterClear, filterResultsCount (ICU plural + `{n}` pre-converted numeral), filterNoMatches, filterRangeSurahs, filterRangeRubs, plus the close-button label. Run `npm run extract-translations`.
- `docs/architecture/COMPONENTS.md` — update Sidebar/RubList lines.
- `docs/plans/home-nav-search.md` — none (do not touch; sibling task is done).

## Constraints

- Sidebar stays `next/dynamic`-loaded; filtering adds zero fetches (props are already fully loaded).
- Do not break scroll-into-view-on-open (a filtered-out active item is a natural no-op — `querySelector` finds nothing) or the pinned-surah validity logic.
- Sheet sizing contract (DECISIONS.md/ADR 0044): `top`+`bottom`+`height: auto` — the in-flow field must not reintroduce `h-full`/viewport-unit sizing anywhere.
- i18n: interpolated keys use next-intl directly (never the project wrapper); numerals pre-converted via `toLocaleNumeral` strings, plural selection via a separate numeric value.
- `dir="auto"` on the input (genuine free-text user input — the documented exception).
- Both mount points benefit unchanged: `app/[locale]/pages/layout.tsx` and `app/[locale]/mushaf/[grant]/layout.tsx` pass the same props.

## What NOT to Do

- Do not hand-roll a local matcher — extend `nav-search.ts` (a fork loses digit folding, e.g. `٥` matching nothing on an Arabic keyboard in the default locale).
- Do not put the input inside `TabsContent` (unmounts on switch; scrolls away with the list).
- Do not add `autoFocus` or override `onOpenAutoFocus`.
- Do not let filtered juz headers derive their page from the first matching rub.
- Do not auto-navigate, debounce, or add a min-length gate (same rules as home).
- Do not add a persistent orientation line while filtering (user chose "silent").
- Do not absorb deferred remediation (combobox semantics, touch targets, badge sizing).

## Decisions Made

- One adaptive field between TabsList and lists (not two per-tab inputs).
- Bare number on Rubs = union of juz/hizb/rub (consistency with home's answer to ambiguity).
- No orientation line when the active item is filtered out.
- Grammar layer shared with home via `nav-search.ts`, extended additively.
