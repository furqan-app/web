# Fix Navbar Logo Locale Link

**Type:** bug  
**Date:** 2026-08-29  
**Status:** implemented  
**Issue:** https://github.com/furqan-app/web/issues/463  

## Summary

When navigating from a reader page back to the home page by clicking the Furqan logo in the navbar, the application unexpectedly resets the active language to the default Arabic (`/ar`). This occurs because `FurqanLogo.tsx` imports the standard Next.js `Link` (`import Link from "next/link"`) with a hardcoded `href="/"`, requesting the unlocalized root `/` path rather than using the project's `@/i18n/routing` `Link`.

## Root Cause / Approach

- **Root Cause:** In `app/components/nav/FurqanLogo.tsx`, `Link` is imported from `"next/link"`. Navigating to `href="/"` bypasses the active locale prefix (`/en` or `/ar`), and `next-intl`'s middleware defaults unlocalized root requests to `defaultLocale` (`/ar`).
- **Approach:** Update `FurqanLogo.tsx` to import `Link` from `@/i18n/routing`, adhering to `docs/standards/i18n.md`. With the routing wrapper, `<Link href="/">` resolves to `/${locale}` (e.g. `/en`), keeping the user in their selected language.
- **Verification:** Add an end-to-end regression test in `e2e/tests/settings-persistence.spec.ts` that opens the homepage in Arabic, visits a reader page, switches to English, clicks the logo to return home, and confirms the language remains English.

## Decision Tree / Algorithm

- If `FurqanLogo` is rendered in any locale, `<Link href="/">` from `@/i18n/routing` maps to `/${currentLocale}` automatically.
- No conditional branching required.

## Verified Test Cases

1. **Language switch in reader -> Return home via logo**:
   - Given user is on `/ar`, navigates to `/ar/pages/50`, and changes language in settings to English (`/en/pages/50`).
   - When user clicks `nav a[aria-label="Home"]`.
   - Then browser navigates to `/en`, `html[lang="en"]`, `body[dir="ltr"]`, and English search placeholder is visible.

## Files to Change

- `app/components/nav/FurqanLogo.tsx` — Change `import Link from "next/link"` to `import { Link } from "@/i18n/routing"`.
- `e2e/tests/settings-persistence.spec.ts` — Add regression test verifying language persistence when clicking the navbar home logo.

## Constraints

- Must follow `docs/standards/i18n.md` Routing Navigation rules: all internal app links use `@/i18n/routing`.
- Must pass Playwright E2E test on both desktop and mobile viewports.

## What NOT to Do

- Do not hardcode manual locale concatenation (`href={'/' + locale}`) — use `@/i18n/routing`'s `Link`.
- Do not modify next-intl middleware defaults.

## Decisions Made

- Standardized `FurqanLogo` to use `@/i18n/routing`'s `Link` consistent with other navbar components (`UserMenu`, `NavPillLink`, `ContinueReadingLink`).
