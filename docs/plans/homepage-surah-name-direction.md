# Homepage Surah Card: Direction-Based Name Display

**Type:** feature
**Date:** 2026-08-04
**Status:** implemented
**Trello:** [#185](https://trello.com/c/Y2UHvcmY/185-enhance-the-home-page)

## Summary

The homepage surah card (`SurahListItem.tsx`) currently shows `name_simple` + `translated_name` as text in a left block, and the calligraphic `glyphCode` glyph (via `font-surahnames`) paired with verse count in a right block — regardless of locale. `translated_name` is removed entirely (it's otherwise unused anywhere in the app). The remaining name representation becomes direction-aware: English (LTR) shows `name_simple` text, Arabic (RTL) shows the glyph — never both together.

## Approach

Collapse the card to 3 slots: numeral badge, name+verse-count column (direction-dependent name), trailing chevron. The glyph moves out of its old paired block (glyph + verse count) into the name slot, replacing `name_simple` text when the locale is Arabic; verse count sits below the name/glyph in the same column (not beside it). A decorative `ChevronRight` (lucide-react) occupies the trailing flex-none slot where the verse count used to sit, rotated 180° in RTL via the existing `isRTL` boolean — matching the established chevron-affordance pattern in `AccessibleMushafList.tsx`/`PlansBrowseDialog.tsx`. It is purely visual (no separate click handler); the whole card stays one `Link`. Card visual order mirrors between locales for free — flexbox `row` direction already reorders visually under the ancestor `dir="rtl"`/`"ltr"` (set on `<html>` in `app/layout.tsx` / `app/[locale]/layout.tsx`) with no explicit `flex-row-reverse` needed, matching the existing `getLanguageDirection` convention used elsewhere (`SettingsSidebar.tsx`, `ReaderPager.tsx`).

`translated_name` is fully removed from the data pipeline, not just the JSX: `SurahResult` type, `get-surahs.ts`'s runtime validator, `scripts/quran-chapters/generate.js`'s Prisma `select`, and `public/quran/chapters.json` gets regenerated without the field.

**Addendum — grid density (2026-08-04):** with `translated_name` gone and the card narrower, the homepage grid can fit more columns before the content gets cramped. `SurahList.tsx`'s breakpoints move from `sm:2 md:3 lg:4` to `sm:2 md:4 lg:5 xl:6`. `Sidebar.tsx` passes its own override `className` to force single-column in its narrow 256px (`w-64`) panel regardless of viewport — that override is extended to also pin `xl:grid-cols-1` (previously only `sm`/`md`/`lg` were pinned), since `SurahList`'s new base `xl:grid-cols-6` would otherwise leak into the sidebar at xl+ viewport widths (Tailwind breakpoints match viewport width, not container width).

## Decision Tree / Algorithm

| locale | `isRTL` (`getLanguageDirection(locale) === "rtl"`) | Name column renders | Chevron rotation | Card visual order |
|---|---|---|---|---|
| `en` | `false` | `surah.name_simple` (top) + verse-count (below) | none | badge → name column → chevron, physical L→R |
| `ar` | `true` | glyph (top) + verse-count (below) | `rotate-180` | badge → name column → chevron, mirrored via flexbox row bidi (badge right, chevron left) — no reorder code needed |

## Verified Test Cases

- Surah 1, `locale=en`: badge "1", name column = "Al-Fatihah" then "7 Verses" stacked, trailing chevron pointing end-ward — unchanged visual order from today aside from the stack + chevron.
- Surah 1, `locale=ar`: badge "١" (existing `toLocaleNumeral` behavior, unchanged), name column = glyph `"001"` then "٧ آية" stacked — no `name_simple` Latin text anywhere on the card — chevron rotated 180°, whole row flips right-to-left automatically.
- Glyph font already maps ids 001–114 to calligraphic glyphs (established, ADR-covered) — no new font/id edge cases introduced by moving it into the name slot.
- Chevron has no `aria-label`/accessible name and no independent click handler — confirmed with the user it's decorative only, so it doesn't register as a second interactive element inside the card's `Link` (verified via the accessibility tree: each surah row is a single `link` node).

## Files to Change

- `app/components/SurahListItem.tsx` — remove `translated_name` JSX; collapse to 3-slot layout (badge, name+verse-count column, chevron); render `surah.name_simple` (LTR) or glyph (RTL) atop the verse count in the name column based on `getLanguageDirection(locale) === "rtl"`; add a trailing decorative `ChevronRight` (lucide-react), rotated in RTL.
- `app/components/nav/Sidebar.tsx` — pass `dir={getLanguageDirection(locale)}` to both `<SheetContent>` and the inner `<Tabs>`. Pre-existing bug, surfaced by this task: Radix `Tabs.Root` defaults `dir="ltr"` and renders it as a DOM attribute on its own root, which overrides the ancestor's inherited `direction: rtl` for everything nested inside (`SurahList`/`RubList`) — the chevron made this newly obvious since a rotated arrow pointing the wrong way is far more visible than the old text-only layout. `SheetContent` alone wasn't enough; `Tabs` needed its own `dir` too. Confirmed via `getComputedStyle(...).direction` + `getBoundingClientRect()` in both locales (screenshot tooling was unavailable this session).
- `app/types/index.ts` — remove `translated_name` from `SurahResult`.
- `app/hooks/get-surahs.ts` — remove `translated_name` check from `isSurahResultArray`.
- `scripts/quran-chapters/generate.js` — remove `translated_name` from the Prisma `select`.
- `public/quran/chapters.json` — regenerate via `npm run generate:quran-chapters` after the generator change.
- `app/components/SurahList.tsx` — grid breakpoints `sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4` → `sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`.
- `app/components/nav/Sidebar.tsx` — its `SurahList` override `className` gains `xl:grid-cols-1` alongside the existing `sm`/`md`/`lg:grid-cols-1`, so the sidebar's narrow panel isn't affected by the new `xl` breakpoint.

## Constraints

- Follow the existing `getLanguageDirection(locale) === "rtl"` → `isRTL` pattern used in `SettingsSidebar.tsx` / `RecitationSettingsSheet.tsx` / `ReaderPager.tsx` — don't invent a new direction-check helper.
- Do not add explicit `flex-row-reverse` or manual DOM reordering — the mirrored layout comes from flexbox row bidi under the ancestor's `dir` attribute, consistent with how the rest of the app handles RTL mirroring.
- Do not touch `app/api/search/chapters/route.ts` — it queries `quranPrisma.chapter` directly for a different purpose (search) and was already confirmed out of scope in `docs/plans/static-surah-list-json.md`.
- The chevron is decorative only — confirmed with the user. Do not give it a separate `onClick`/`href` or wrap it in its own interactive element; the card's single `Link` remains the only interactive target.
- `public/quran/chapters.json` is committed, regenerate-on-change content (per the Static Generation Strategy decision) — regenerate it as part of this change since the shape is changing, not automatically on every build.

## What NOT to Do

- Do not keep `name_simple` text visible alongside the glyph in the Arabic-locale card — confirmed with the user: glyph only, no Latin caption.
- Do not leave `translated_name` in the type/validator/generator "for now" — confirmed fully removed from the pipeline, not just unrendered.
- `RubList`/`mushaf/[grant]` layout are untouched — none of them read `translated_name`, and their `SurahResult` usage is otherwise unaffected by this shape change (they don't destructure `translated_name`). `SurahList.tsx`/`Sidebar.tsx` ARE touched, but only for grid breakpoints and the `dir` bug fix — not for anything `translated_name`-related.
- Do not add a new column count to `SurahList.tsx` without also checking `Sidebar.tsx`'s override `className` covers the same breakpoint — a gap there is exactly what caused the `xl` leak this task fixed.

## Decisions Made

- Card mirrors as a whole between locales (not just a fixed-position name swap) — achieved via flexbox row bidi, no new code needed for the mirroring itself.
- Glyph and `name_simple` are mutually exclusive per locale, never shown together.
- `translated_name` removed end-to-end: type, validator, generator, and committed JSON data.
