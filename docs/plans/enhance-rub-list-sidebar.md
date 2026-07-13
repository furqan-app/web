# Enhanced RubList Sidebar

**Type:** feature
**Date:** 2026-07-04
**Status:** implemented

## Summary

Redesign `RubList` from a plain list into a rich sidebar panel. Each row shows a hizb-aware SVG circle badge, a short Uthmanic text snippet, a surah-name pill badge + `آية`/`Verse` label + ayah number, and page number. Juz breaks become sticky sectioned headers. All numeric labels use Eastern Arabic numerals in the `ar` locale.

## Approach

### Data available on each `RubWithVerses`

| Field | Source |
|---|---|
| Quran text snippet | `startVerse.Word` filtered `char_type_name === 'word'`, joined `qpc_uthmani_hafs` |
| Page number | `startVerse.page_number` |
| Chapter number | `rubVerseMappings[0]?.chapter_number` (always the earliest chapter, see Constraints) |
| Ayah number | `rubVerseMappings[0]?.start_verse` |
| Global rub index (1–240) | `rub_number` |

`surahs: SurahResult[]` already available in `Sidebar` — passed as a new prop to `RubList` (no new DB query).

### Circle badge logic

```
posInHizb   = (rub_number - 1) % 4
isHizbStart = posInHizb === 0
hizbNumber  = Math.ceil(rub_number / 4)

// Arc stroke for non-hizb-start:
circumference = 2π × 17 ≈ 106.81
filledLen     = (posInHizb / 4) × circumference
strokeDasharray = `${filledLen.toFixed(2)} ${circumference.toFixed(2)}`
// circle rotated -90deg so arc starts at top
```

- Hizb start: 44×44 SVG, `bg-primary` filled circle, white `hizbNumber` label.
- Regular rub: 44×44 SVG, thin `stroke-border` track + `stroke-primary` arc.

Use `style={{ stroke: 'hsl(var(--primary))' }}` inline on SVG elements — `stroke-*` arbitrary Tailwind values with HSL CSS vars are unreliable in JIT.

### Juz headers

`juzNumber = Math.ceil(rub_number / 8)`. Group rubs by juz before rendering. Each juz is a `<div key={juzNumber}>` containing the sticky header followed by all that juz's Link rows as direct children — this makes the header's sticky range span the full juz height. (Per-rub div containment breaks sticky since the range is only one row's height.)

```jsx
<div key={juzNumber}>         {/* sticky range = full juz height */}
  <div className="sticky top-0 z-10 bg-muted ...">Juz N</div>
  <Link>rub 1</Link>
  <Link>rub 2</Link>
</div>
```

Juz page number from `group.rubs[0].startVerse.page_number`.

### Row metadata format

```
[Al-Baqarah] · آية ٢٦
```

Surah name in a pill badge (`bg-muted border border-border rounded text-[10px] font-medium px-1.5 py-0.5`), then `·`, then `t("verse", "Verse")`, then the ayah number.

### Eastern Arabic numerals

```ts
// app/utils/i18n.ts
function toLocaleNumeral(n: number, locale: string): string
// Converts digits to ٠١٢٣٤٥٦٧٨٩ when locale === 'ar', else returns string as-is.
```

Apply to: juz label, page number, ayah number.

### Color mapping

| Design | Token |
|---|---|
| row bg | `bg-background` |
| header bg | `bg-muted` |
| accent | `text-primary` / `stroke-primary` / `fill-primary` (via inline style) |
| main text | `text-foreground` |
| secondary | `text-muted-foreground` |
| borders | `border-border` |
| hover | `hover:bg-accent` |

## Files to Change

- `app/utils/i18n.ts` — add `toLocaleNumeral(n, locale)`
- `app/components/RubList.tsx` — full rewrite: juz-grouped rendering, SVG badges, surah pill, `font-uthmanic` snippet, Eastern Arabic numerals
- `app/hooks/get-rubs.ts` — change `rubVerseMappings: true` to `rubVerseMappings: { orderBy: [{ chapter_number: 'asc' }, { start_verse: 'asc' }] }` so `[0]` is always the rub's actual start (not implicit/undefined order)
- `app/components/nav/Sidebar.tsx` — pass `surahs={surahs}` to `<RubList>`
- `messages/ar.json`, `messages/en.json` — add `"verse": "آية"` / `"verse": "Verse"`

## Constraints

- Use `font-uthmanic` / `qpc_uthmani_hafs` for the text snippet — never `code_v1`.
- All colors via semantic Tailwind tokens — no hardcoded hex.
- Use inline `style={{ stroke: 'hsl(var(--primary))' }}` on SVG elements, not Tailwind arbitrary `stroke-*`.
- Do not truncate words in JS — rely on `line-clamp-2`/`overflow-hidden` CSS.
- `rubVerseMappings` must have explicit `orderBy: [{ chapter_number: 'asc' }, { start_verse: 'asc' }]` — Prisma does not guarantee related-record order without it; `[0]` on an unordered result can return the second chapter's mapping on cross-chapter rubs.
- Sticky juz headers must group rubs by juz in rendering (not per-rub divs) — per-rub containment limits the sticky range to one row's height.
