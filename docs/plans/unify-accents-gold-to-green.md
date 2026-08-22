# Unify Accents: Replace Gold Accents and Ornaments with Emerald Green

**Type:** design
**Date:** 2026-08-22
**Status:** implemented

## Summary

Unify the app's visual accent grammar by replacing all gold identity accents, mushaf ornaments, metadata tokens, and component highlights with emerald green (`--primary` / green scale) across all surfaces and all three themes (Light, Gold/Parchment, Dark).

## Approach

Replace all gold token derivations and CSS values with theme-calibrated emerald green values:

1. **Global Tokens (`app/globals.css` & `tailwind.config.ts`):**
   - **Delete `--gold` & `--gold-muted` completely** across all theme blocks.
   - **Delete `--rl-gold` & `--rl-gold-soft` completely** from reader-lab token blocks.
   - **Delete `colors.gold` completely** from `tailwind.config.ts`.
   - Use `--primary` directly for all accents, rules, overlines, and marks.
   - **`--mushaf-ornament` & `--mushaf-metadata`:**
     - Light theme: `#856132` / `#8a6b3c` → `#13755a` / `#0f766e` (rich emerald).
     - Gold theme: `#745225` / `#7d5c2c` → `#116850` / `#0f766e`.
     - Dark theme: `#cfa454` / `#a8853f` → `#10b981` / `#059669` (luminous emerald).
   - `.fq-rule-mark` and `.fq-overline` use `hsl(var(--primary))` directly.

2. **Component Classes (`app/components/`):**
   - Replace all `text-gold` / `border-gold` / `hover:border-gold` / `hover:text-gold` / `bg-[hsl(var(--gold)/...)]` with standard semantic classes (`text-primary`, `border-primary/25`, `hover:border-primary/40`, `hover:text-primary`, `bg-primary/10`).
     - `MarksSignedOutPrompt.tsx`, `PlansSignedOutPrompt.tsx`, `SignedOutPrompt.tsx`
     - `SectionCard.tsx` (card double border & icon pill)
     - `AccessibleMushafList.tsx`
     - `SearchQueryResults.tsx`
     - `MyMarksList.tsx`, `MyPlansList.tsx`
     - `RubList.tsx`
     - `RecitationSettingsSheet.tsx`
     - `OfflineDownloadPanel.tsx`
     - `QuranSpread.tsx` (page arrow hover)

3. **Mushaf Page Rendering (`QuranSafha.tsx`, `FontFaceInjector.tsx`):**
   - Surah headers, aya marks, and page ornaments automatically consume `--mushaf-ornament` (now emerald green).

## Decision Tree / Algorithm

| Surface / Token | Previous Role | New Treatment |
|---|---|---|
| `--gold` token | Gold / Bronze identity accent | Emerald Green (`--primary` tone per theme) |
| `--gold-muted` token | Muted gold rule / border | Soft Emerald Green tone per theme |
| `--mushaf-ornament` | Gold surah frame & page marks | Emerald Green (`#13755a` light, `#116850` gold, `#10b981` dark) |
| `--mushaf-metadata` | Gold juz / hizb text in reader | Emerald Green (`#0f766e` light/gold, `#059669` dark) |
| UI overlines & rule marks | Gold hairline & diamond | Emerald Green hairline & diamond |
| Component icon chips | `bg-[hsl(var(--gold)/0.12)] text-gold` | `bg-primary/10 text-primary` |
| Reader navigation arrows | `hover:text-gold` | `hover:text-primary` |

## Verified Test Cases

| Case | Expected Outcome |
|---|---|
| Light Theme Mushaf Reader | Surah frames, verse end marks, juz/hizb markers render in rich emerald green `#13755a` |
| Gold Theme (Parchment) | Surah frames and ornaments render in deep forest emerald `#116850` with high contrast against warm paper |
| Dark Theme Mushaf Reader | Surah frames and ornaments render in luminous emerald `#10b981` |
| Marks, Plans, Search, Hub | Overline headers, badges, and icon cards render in emerald green (`text-primary` / `bg-primary/10`) |
| Reader Navigation Arrows | Hovering side arrows glows in emerald green (`hover:text-primary`) |

## Files to Change

- `app/globals.css` — Update `--gold`, `--gold-muted`, `--mushaf-ornament`, `--mushaf-metadata`, `--rl-gold`, `--rl-gold-soft`.
- `app/components/marks/MarksSignedOutPrompt.tsx`
- `app/components/plans/PlansSignedOutPrompt.tsx`
- `app/components/plans/MyPlansList.tsx`
- `app/components/mushaf/SignedOutPrompt.tsx`
- `app/components/mushaf/SectionCard.tsx`
- `app/components/mushaf/AccessibleMushafList.tsx`
- `app/components/search/SearchQueryResults.tsx`
- `app/components/marks/MyMarksList.tsx`
- `app/components/RubList.tsx`
- `app/components/offline/OfflineDownloadPanel.tsx`
- `app/components/RecitationSettingsSheet.tsx`
- `app/components/reader/QuranSpread.tsx`

## Constraints

- Preserve readability and WCAG AA contrast (at least 4.5:1) for all text and metadata across Light, Gold, and Dark themes.
- Dark theme background remains `(7,15,23)`; Light remains `#fdfdfc`; Gold theme parchment background remains `#fdf9ee`.
- Do not modify Tajweed color rule overrides in `FontFaceInjector.tsx` (the 7 rule colors for recitation tajweed rules).

## What NOT to Do

- Do not change the theme name `gold` for the parchment background theme (the theme selector and user settings use `'light' | 'gold' | 'dark'`).
- Do not introduce conflicting hues — use the established emerald green palette.

## Decisions Made

- Unify all identity and ornament accents from gold to emerald green.
