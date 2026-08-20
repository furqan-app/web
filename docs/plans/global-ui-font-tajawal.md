# Plan: Set `font-tajawal` globally on app root & Tailwind `sans`

## Goal Description
Ensure `IBM_Plex_Sans_Arabic` (`--tajawal`) is applied globally as the default `sans` font stack for the entire application, overriding Tailwind's default Preflight `font-sans` (`ui-sans-serif, system-ui...`).

## Root Cause Analysis
1. Tailwind CSS Preflight (`@tailwind base`) applies `font-family: theme('fontFamily.sans')` to `<html>`.
2. `tailwind.config.ts` did not define `fontFamily.sans`, causing Tailwind Preflight to output `ui-sans-serif, system-ui, sans-serif...` on `<html>`.
3. Font variable classes (`ibmPlexSansArabic.variable`) were applied on `<body>`, meaning `<html>` did not have `--tajawal` defined when Preflight computed font families.
4. Next.js `next/font/google` generates an automated fallback `@font-face` for `IBM_Plex_Sans_Arabic` that defaults to `Times New Roman` when no explicit `fallback` array is configured. On Linux, this resolves to `Liberation Serif` / `DejaVu Sans`.

## Proposed Changes

### Configuration & Root Layout

#### [MODIFY] [tailwind.config.ts](file:///home/tahamohamed/Desktop/cs/non-work/projects/furqan/tailwind.config.ts)
- Add `sans: ["var(--tajawal)", "system-ui", "sans-serif"]` to `theme.extend.fontFamily`.

#### [MODIFY] [layout.tsx](file:///home/tahamohamed/Desktop/cs/non-work/projects/furqan/app/layout.tsx)
- Add `fallback: ["system-ui", "sans-serif"]` to `IBM_Plex_Sans_Arabic` loader options to prevent Next.js from falling back to `Times New Roman` when font is loading or offline.
- Move font variable classes (`ibmPlexSansArabic.variable`, `uthmanic.variable`, `surahNames.variable`) to `<html>` element so CSS custom properties are available document-wide (including for `html` Preflight rules and portals).
- Ensure `<body>` retains `font-sans antialiased`.

## Verification Plan

### Automated Tests
- Run `npm run lint` to check linting.
- Run `npm run build` to verify Next.js build compilation.

### Manual Verification
- Inspect any UI element in browser DevTools to confirm computed `font-family` does not fall back to `Times New Roman`, and uses `IBM Plex Sans Arabic` or `system-ui, sans-serif`.

