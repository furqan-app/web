# Homepage Design & UX Elevation

**Type:** feature (design & UX)  
**Date:** 2026-08-22  
**Status:** implemented  
**Parent:** [INDEX.md](INDEX.md) · **Issue:** #360 · **ADR:** [0047](../../architecture/adr/0047-adopt-reader-lab-design-language.md)

## Summary

Elevate the Furqan homepage (`app/[locale]/page.tsx` and related components) with authentic manuscript aesthetics, senior typography, living reading resumption, and authentic Islamic geometric card craftsmanship in accordance with the emerald design migration system.

## Approach

1. **Manuscript Hero Architecture (`HomeHero.tsx`):**
   - Basmala overline (`.fq-overline`) with emerald diamond rule marks.
   - Flanked title with symmetrical emerald rule marks (`.fq-rule-mark` & `.fq-rule-mark--flip`).
   - Calibrated Tajawal typography (`text-4xl md:text-5xl font-extrabold`).

2. **Recommended Surahs Strip (`HomeRecommendedSurahs.tsx`):**
   - Curated quick-access pills for high-frequency chapters: Al-Fatihah (1), Al-Kahf (18), Ya-Sin (36), Ar-Rahman (55), Al-Waqi'ah (56), Al-Mulk (67).

3. **Living "Continue Reading" Hub Card (`HomeContinueReadingCard.tsx`):**
   - Resumption card positioned above the main grid.
   - Reads `LastReadPageContext` live to show current Surah, Juz, Page, and an emerald CTA button.

4. **4-Column Surah Lattice Grid (`SurahList.tsx` & `SurahListItem.tsx`):**
   - 4-column responsive grid (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`).
   - 8-pointed Islamic geometric star rosette medallion around the Surah number.
   - Revelation badge (`مكية` / `مدنية`).
   - Starting page number (`صفحة ١`) and verse count (`٧ آيات`).
   - Smooth hover transitions and high-contrast typography.

## Decision Tree / Algorithm

| Component | Condition | Visual / Functional Treatment |
|---|---|---|
| Hero Title | Top of home page | Framed with `.fq-rule-mark` + Basmala overline in emerald tone |
| Recommended Surahs | Below tagline | Horizontal quick-access pills (1, 18, 36, 55, 56, 67) linking directly to chapter starts |
| Continue Reading Card | Returning session / `lastReadPage` available | Live card showing Surah, Juz, Page, and direct jump CTA |
| Surah Number | Any Surah card | Enclosed in 8-pointed Islamic geometric rosette SVG with localized numeral |
| Revelation Type | `surah.revelation_place === 'makkah'` | `revelation.makkah` (`مكية` / `Meccan`) badge |
| Revelation Type | `surah.revelation_place === 'madinah'` | `revelation.madinah` (`مدنية` / `Medinan`) badge |

## Verified Test Cases

| Case | Required Outcome |
|---|---|
| Home, 3 themes (Light, Gold, Dark) | Emerald accents, high contrast (WCAG AA), crisp borders, no legacy gold |
| Locales (`ar` and `en`) | Numbers localized with `toLocaleNumeral`, Arabic calligraphy in RTL, clean transliteration in LTR |
| Recommended Surah Click | Jumps immediately to that Surah's starting page |
| Continue Reading Button | Jumps to `lastReadPage` and reflects reader updates |
| Responsive Grid | 1 col (<640px), 2 cols (640-767px), 3 cols (768-1023px), 4 cols (≥1024px) |

## Files to Change

- `app/components/home/HomeHero.tsx` [NEW]
- `app/components/home/HomeRecommendedSurahs.tsx` [NEW]
- `app/components/home/HomeContinueReadingCard.tsx` [NEW]
- `app/components/SurahList.tsx` [MODIFY]
- `app/components/SurahListItem.tsx` [MODIFY]
- `app/[locale]/page.tsx` [MODIFY]
- `messages/ar.json` & `messages/en.json` [MODIFY]

## Constraints

- Pure semantic emerald tokens (`hsl(var(--primary))`, `bg-primary/10`, `border-primary/25`).
- No legacy gold tokens.
- Maintain WCAG AA contrast across all 3 themes.
- Client components only where live context is consumed (`HomeContinueReadingCard`, `HomeRecommendedSurahs`); Server Components elsewhere.

## What NOT to Do

- Do not add complex database queries or change static generation contracts (`revalidate = 300` holds).
- Do not add artificial drop shadows on dark mode (ADR 0032).
- Do not break the static surah list JSON contract.

## Decisions Made

- Adopt 4-column responsive grid on desktop for optimal scannability and card proportion.
- Surface Recommended Surahs and Continue Reading hub card above the main index.
- Use authentic 8-pointed Islamic star medallions for Surah numbers.
