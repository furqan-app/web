# Sidebar: Current-Surah Ayah Picker Tab

**Type:** feature
**Date:** 2026-08-26
**Status:** implemented
**Issue:** furqan-app/web#433

## Summary

A third sidebar tab (الآيات / Ayahs) offering an ayah picker that defaults to the surah currently being read, with an inline selector to retarget to any other surah. A numeric input plus a tappable grid of ayah-number chips let you pick an ayah; a separate page-number field jumps to any page 1–604. Picking an ayah jumps to its page through the persistent pager and highlights the verse. While reading Al-Kahf you reach verse 50 in two taps; you can also switch to Al-Baqarah and jump to 2:255 without leaving the tab.

## Approach

Everything needed already exists client-side — **zero new API calls**:

| Need | Source |
|---|---|
| Current surah | existing `surahs.findLast(startPage <= pageNumber)` derivation (Sidebar.tsx) |
| Ayah count | `SurahResult.verses_count`, already in the sidebar `surahs` prop |
| Ayah → page | `useVersePages()` active-edition map (ADR 0033), SW-precached |
| Landing highlight | `?highlight={s}:{v}` URL param consumed by `QuranWord` via `highlight.ts` |
| Grant reader | `jumpTo` + `useReaderBasePath` are already grant-aware |

Stacked on `feature/362-sidebar-tab-filters` (which extends the same Tabs/filter-field structure).

### Highlight mechanism decision

The overlay highlights via full `<Link href="/pages/N?highlight=…">` navigations; sidebar links use instant `jumpTo` (no URL change, so no highlight). The picker needs **jumpTo speed + highlight**. Mechanism: after `jumpTo(page)`, apply `window.history.replaceState` with `?highlight={s}:{v}&highlight-type=search`. Next ≥14.1 syncs `history.replaceState` searchParams into `useSearchParams` reactively (app runs Next 14.2.15), so `QuranWord` re-renders colored without any new prop plumbing through ReaderPager → QuranSafha → QuranWord. If live verification shows the sync not reaching `QuranSafha`'s subtree, fall back to `<Link>` navigation (`highlight.addToUrl`) exactly like the overlay — accepting RSC navigation for chip taps only. Decide by verification, not assumption.

## Decision Tree (verified with user)

| Input/action | Condition | Behavior |
|---|---|---|
| Tap chip `n` / type `n` + Enter | `1 ≤ n ≤ target.verses_count` | `page = versePages["{target.id}:{n}"]` → `jumpTo(page)` → replaceState highlight → sheet closes |
| Type out-of-range number | e.g. `999` in Al-Kahf (110) | Inline hint "١–١١٠" under input, no jump |
| Arabic-Indic digits | `٢٥٥` | Folded to 255 (shared digit normalization from nav-search) |
| Non-numeric input | `abc` | Same range hint treatment, no jump |
| Tap surah header / open selector | always | Body swaps to searchable surah list (names + numbers via shared grammar) |
| Pick a surah from the list | any of 114 | Becomes the new target; ayah view retargets; input/chips reset |
| Page input `n` + Enter | `1 ≤ n ≤ 604` | `jumpTo(n)` directly (no highlight — the page IS the address), sheet closes |
| Page input out of range | e.g. `999` | Inline hint "١–٦٠٤", no jump |
| `versePages` map not loaded yet | rare (SW-precached) | Ayah chips disabled until map lands; **page input unaffected** (no map needed) |
| Ayahs on currently-open page | inverted map lookup per chip | Subtle "you're here" tint |

The #362 adaptive filter field hides on the ayahs tab (the picker owns its inputs); it returns on surahs/rubs tabs.

## UI Sketch

```
[ السور | الأرباع | الآيات ]
┌─────────────────────────────┐
│ ۞ الكهف · ١١٠ آيات ⌄        │  ← target selector: glyph + name + count + chevron
│ [ أدخل رقم الآية…       ]   │  ← ayah number within the TARGET surah
│ [ أو رقم الصفحة…        ]   │  ← page jump 1–604, works offline (no map)
│ ─────────────────────────── │  ← hairline divider
│ [١][٢][٣][٤][٥][٦]          │  ← chips of the TARGET surah; "here" tint on
│ [٧][٨][٩]…                  │    ayahs visible on the currently-open page
└─────────────────────────────┘

Tapping the header swaps the body inline (Option A) to a searchable surah
list — names AND numbers via the shared nav-search grammar — picking one
returns to the ayah view retargeted. Defaults to the current surah on every
tab/sheet open (Radix unmounts inactive content, so state resets cleanly).
```

Inputs do NOT autofocus (mobile keyboard pop-over annoyance); Enter jumps. All follow the Escape clear-first contract. Enter in the surah list picks the first match.

## Verified Test Cases

1. Reading Al-Kahf p297 → sidebar → الآيات → tap `٥٠` → lands p298, 18:50 highlighted, sheet closed.
2. Tap the header → type `2` or `بقر` → pick Al-Baqarah → chips become 1–286 → tap `٢٥٥` → lands p422 highlighted.
3. Type `999` in ayah field → hint "١–١١٠" (or target's max), stays put.
4. Type `999` in page field → hint "١–٦٠٤", stays put.
5. Grant reader (`/mushaf/[grant]/pages/N`): same behavior, links/jumps stay inside the grant path.
6. First ayah of a surah mid-page start (e.g. tapping an-Nisā' 1 from p388 where it starts mid-page): jump resolves to the page where the verse actually sits per active edition.

## Files to Change

- `app/utils/nav-search.ts` — export `parseAyahNumber(raw): number | null` (reuses digit folding)
- `app/utils/nav-search.test.ts` — unit tests for the parser
- `app/components/nav/AyahPicker.tsx` — NEW: header selector (font-surahnames glyph + name + count + chevron), inline searchable surah list, ayah input + chip grid, page input; props `{ surah, surahs, currentPage }`
- `app/components/nav/Sidebar.tsx` — third TabsTrigger + TabsContent; hide shared filter field on ayahs tab
- `messages/ar.json`, `messages/en.json` — `sidebar.tabAyahs`, `sidebar.ayahInputPlaceholder`, `sidebar.ayahCount`, `sidebar.ayahRangeHint`
- `docs/architecture/COMPONENTS.md` — sidebar zone entry

## Constraints

- No new endpoints/fetches; no schema changes.
- Sheet sizing untouched (ADR 0044: `top`+`bottom`, `height:auto`).
- Escape contract from #362 unchanged (clear-first, then Radix close).
- Works identically in grant reader via `useReaderBasePath`.
- Eastern Arabic numerals everywhere in ar locale (`toLocaleNumeral`).

## What NOT to Do

- Do NOT auto-focus any picker input on tab open.
- Do NOT plumb highlight state as new props through ReaderPager/QuranSafha unless replaceState verification fails.
- Do NOT add a filter field placeholder for the ayahs tab — hide the shared field there.
- Do NOT add typed "surah:ayah" grammar (e.g. "البقرة ٢٥٥") to the search fields — the UI selector provides the same end result without new parser grammar.

## Decisions Made

- Location: sidebar, third tab (user choice over strip-above-tabs / under-active-card / nav overlay).
- Default target: the reader's current surah (pin-aware), with an inline list to retarget to any surah (Option A over popover / native select).
- Interaction: input + chip grid, plus a page-number field (user choice).
- Surah list filter reuses the shared `nav-search.ts` grammar so names and numbers both work.
