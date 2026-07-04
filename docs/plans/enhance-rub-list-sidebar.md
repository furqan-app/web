# Enhanced RubList Sidebar

**Type:** feature  
**Date:** 2026-07-04  
**Status:** implemented

## Summary

Redesign `RubList` from a plain unstyled list into a rich sidebar panel matching the Figma/DC design. Each row shows a hizb-aware SVG circle badge, a short Uthmanic text snippet, surah name + ayah, and page number. Juz breaks become sticky sectioned headers. All numeric labels use Eastern Arabic numerals in the `ar` locale. The data already available on `RubWithVerses` (words, rubVerseMappings, page_number) is sufficient — no new DB queries.

## Approach

### Data available on each `RubWithVerses`

| Field | Where |
|---|---|
| Quran text snippet | `startVerse.Word` — filter `char_type_name === 'word'`, join `qpc_uthmani_hafs` |
| Page number | `startVerse.page_number` |
| Chapter number | `rubVerseMappings[0]?.chapter_number` |
| Ayah number in chapter | `rubVerseMappings[0]?.start_verse` |
| Global rub index (1–240) | `rub_number` |

Surah name is looked up in the `surahs: SurahResult[]` array already available in `Sidebar` — pass it down to `RubList` as a new prop.

### Circle badge logic

```
posInHizb   = (rub_number - 1) % 4          // 0,1,2,3
isHizbStart = posInHizb === 0
hizbNumber  = Math.ceil(rub_number / 4)      // 1–60

// Arc (non-hizb-start rows):
circumference = 2π × 17 ≈ 106.81
filledLen     = (posInHizb / 4) × circumference
strokeDasharray = `${filledLen.toFixed(2)} ${circumference.toFixed(2)}`
// SVG circle rotated -90deg around its center so arc starts at top
```

- Hizb start: 44×44 SVG, `bg-primary` filled circle, white `hizbNumber` label (Tajawal/font-tajawal or system font, weight 800).
- Regular rub: 44×44 SVG, thin `stroke-border` track circle + `stroke-primary` arc.

### Juz headers

`juzNumber = Math.ceil(rub_number / 8)`. Insert a sticky header row whenever `juzNumber` differs from the previous rub. Header shows "الجزء N" (start of juz) and the page number of the first rub in that juz.

### Color mapping (design → Tailwind tokens)

| Design var | Tailwind token |
|---|---|
| `--paper` / row bg | `bg-background` |
| `--paper-2` / header bg | `bg-muted` |
| `--gold` / accent | `text-primary` / `stroke-primary` / `fill-primary` |
| `--ink` / main text | `text-foreground` |
| `--ink-3` / secondary | `text-muted-foreground` |
| `--line` / borders | `border-border` |
| hover bg | `hover:bg-accent` |

### Eastern Arabic numerals

Add `toLocaleNumeral(n: number, locale: string): string` to `app/utils/i18n.ts`. Converts each digit to ٠١٢٣٤٥٦٧٨٩ when `locale === 'ar'`, returns the string as-is otherwise. Apply to: juz label, page number, ayah number in each row.

### New i18n key

Add `"verse": "آية"` / `"verse": "Verse"` to `messages/ar.json` and `messages/en.json` for the surah/ayah label ("سورة X، آية N").

## Files to Change

- `app/utils/i18n.ts` — add `toLocaleNumeral(n, locale)` utility function
- `app/components/RubList.tsx` — full rewrite:
  - new props: `{ rubs: RubWithVerses[], surahs: SurahResult[] }`
  - juz sticky headers
  - hizb-aware SVG circle badge per row
  - `font-uthmanic` text snippet (first ~6 words, CSS truncation)
  - surah name + ayah label
  - page number (right-aligned)
  - Eastern Arabic numerals via `toLocaleNumeral`
- `app/components/nav/Sidebar.tsx` — pass `surahs={surahs}` to `<RubList>`
- `messages/ar.json` — add `"verse": "آية"`
- `messages/en.json` — add `"verse": "Verse"`

## Constraints

- Use `font-uthmanic` (UthmanicHafs1Ver18 + `qpc_uthmani_hafs`) for the text snippet — never pair with `code_v1`.
- All colors via semantic Tailwind tokens — never hardcode hex. No `bg-gray-*` etc.
- `stroke-primary` / `fill-primary` for the SVG arc and badge — these are not default Tailwind utilities; use `stroke-[hsl(var(--primary))]` and `fill-[hsl(var(--primary))]` with the CSS variable, or add the colors as inline `style` attributes using `var(--primary)`. **Prefer inline style on the SVG elements** since `stroke-*` / `fill-*` arbitrary values can be unreliable with HSL CSS vars inside JIT — use `style={{ stroke: 'hsl(var(--primary))' }}` directly.
- The `surahs` prop lookup: `surahs.find(s => s.id === chapter_number)` — safe since `rubVerseMappings[0]?.chapter_number` is always a valid chapter ID (1–114) present in the surahs array.
- Do not truncate words in JS — show all words from `startVerse.Word` filtered to `char_type_name === 'word'`, then rely on `line-clamp-2` / `overflow-hidden` CSS for visual truncation.
- Sticky juz headers: use `sticky top-0 z-10` — the scroll container is the `TabsContent` div in Sidebar which already has `overflow-y-auto`.

## Decisions Made

- Pass `surahs` as a prop to `RubList` (rather than extending the Prisma query) — surahs are already loaded at layout level and passed to `Sidebar`; no DB round-trip needed.
- Eastern Arabic numerals scoped to `ar` locale only, implemented as a pure utility in `i18n.ts` (same file as other locale helpers).
- SVG inline styles for primary color (not Tailwind arbitrary `stroke-*`) to avoid JIT CSS variable resolution issues.
- Hizb number in the badge is shown in Eastern Arabic numerals when locale is `ar`.

## Addendum — Surah name badge (2026-07-04)

Drop the `t("surah")` / `t("verse")` prefix words from the metadata line in each rub row and replace with a compact pill badge wrapping just the surah name. This reclaims the horizontal space the word "Surah"/"سورة" was consuming and reads more cleanly at small sizes.

**Before:** `Surah Al-Baqarah, Verse ٢٦`  
**After:** `[Al-Baqarah] · ٢٦`

### Approach

- Replace the metadata `<p>` content in `RubList.tsx` with:
  - A `<span>` pill: `bg-muted border border-border rounded text-[10px] font-medium px-1.5 py-0.5` wrapping `{surahName}`
  - A separator `·` in `text-muted-foreground`
  - The ayah number in `toLocaleNumeral(ayah, locale)`
- Remove the `t("surah", "Surah")` and `t("verse", "Verse")` calls from the row entirely (the keys stay in the message files; they may be used elsewhere).
- The `"verse"` key added in the main plan can stay — it may be needed in future contexts.

### File to change

- `app/components/RubList.tsx` only — one block inside the metadata `<p>`.

## Addendum — Restore آية/Verse label (2026-07-04, correction)

**Root cause:** The previous addendum (surah badge) incorrectly stripped the `آية`/`Verse` label in addition to the `Surah`/`سورة` prefix. The user only asked to remove the surah word.

**Fix:** Restore `t("verse", "Verse")` before the ayah number in the separator span.

**Target output:**
- ar: `[البقرة] · آية ٢٦`
- en: `[Al-Baqarah] · Verse 26`

**File:** `app/components/RubList.tsx` — change `· {toLocaleNumeral(ayah, locale)}` back to `· {t("verse", "Verse")} {toLocaleNumeral(ayah, locale)}`.

## Addendum — Fix sticky headers + rubVerseMappings ordering (2026-07-04, bugs)

Two correctness bugs found in `/review-fq-work`.

### Bug 1 — Sticky juz headers not working

**Root cause:** Each rub is wrapped in `<div key={rub.id}>` that contains both the sticky header (when `showJuzHeader`) and the single Link row. `position: sticky` is constrained to its nearest scroll container AND its containing block. Since the header and the row share the same single-rub div, the header's sticky range is only that div's height (~one row). It immediately un-sticks after the first scroll pixel.

**Fix:** Group rubs by juz before rendering. Render each juz as a `<div key={juzNumber}>` that contains the sticky header followed by all that juz's Link rows as direct children. The sticky range then spans the full height of the juz group.

```
<div key={juzNumber}>               ← sticky range = full juz height
  <div sticky top-0>Juz header</div>
  <Link>rub 1</Link>
  <Link>rub 2</Link>
  ...
</div>
```

The juz page number in the header comes from `group.rubs[0].startVerse.page_number` (the first rub in the group, which is already sorted `asc` by `rub_number` from the DB query).

### Bug 2 — rubVerseMappings[0] relies on implicit DB order

**Root cause:** `get-rubs.ts` includes `rubVerseMappings: true` with no `orderBy`. Prisma makes no guarantee about the order of related records without an explicit sort. For rubs that span two chapters, `[0]` could return the second chapter's mapping, showing the wrong surah name and ayah.

**Fix:** In `app/hooks/get-rubs.ts`, change `rubVerseMappings: true` to `rubVerseMappings: { orderBy: [{ chapter_number: 'asc' }, { start_verse: 'asc' }] }`. This ensures `[0]` is always the earliest chapter/verse — i.e., the rub's actual start. The `RubWithVerses` type in `app/types/prisma.ts` does not need to change (the returned fields are identical; only the row order is now guaranteed).

### Files to change

- `app/components/RubList.tsx` — restructure flat `rubs.map` into juz-grouped rendering
- `app/hooks/get-rubs.ts` — add `orderBy` to `rubVerseMappings` include
