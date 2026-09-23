---
title: "Complex E2E & Fix: Boundary Wrap-Arounds & Error Route Recovery Navigation"
type: feature
date: 2026-09-06
status: implemented
area: reader
issue: 475
---

# Complex E2E & Fix: Boundary Wrap-Arounds & Error Route Recovery Navigation

**GitHub Issue:** [#475](https://github.com/furqan-app/web/issues/475) — part of epic #466.

## Summary

Test and harden wrap-around navigation at Quran page extremes (Page 1 ↔ 604) and error recovery from invalid or out-of-bounds page routes. Investigation found the pager wrap logic (`stepAnchor` / `computeSpreadNav`) already correct and arrow-driven wrap plus basic 404 rendering already covered in `reader-navigation.spec.ts`; the one genuine product gap is that `Custom404` offers no "Return to Reading" recovery. This task therefore adds a small client recovery link to the 404 boundary (plain `<a>`, theme tokens, server-resolved label) and a dedicated `boundary-recovery.spec.ts` covering the untested paths: keyboard wrap, mobile-swipe wrap, the true `/605` upper edge, 404 recovery with `lastRead` non-corruption, and one grant-reader wrap test.

## Root Cause / Approach

No root-cause bug hunt was needed — this is a "Complex E2E & Fix" task and the trace showed the core is already sound:

- `app/components/reader/ReaderPager.tsx:45-99` — `stepAnchor` wraps single view (1↔604) and double view (pair 1–2 ↔ 603–604); `computeSpreadNav` wraps the SSR/no-JS arrow hrefs identically. Nothing to change.
- `app/[locale]/pages/[id]/page.tsx` — `dynamicParams = false` with static params for all 604 pages, so `/0`, `/605`, `/999`, `/abc` structurally 404. Nothing to change.
- `LastReadPageSync` early-returns when `visiblePages` is null and `ReaderPageSync` clears on unmount, so rendering a 404 can never overwrite `lastRead` — true by construction, needs an asserting test, not a fix.
- Gap: `app/not-found.tsx` (`Custom404`) renders only Home + Shared-mushaf links. The issue scopes in a "Return to Reading" recovery that restores valid reader state without corrupting `LastReadPageContext`. The link must read `lastReadPath` (the full locale-prefixed path, written by the single write site in `LastReadPageContext`) client-side, because the root 404 renders outside the locale layout with no intl provider and no context — so the label is resolved server-side via `t()` and passed as a prop.

## Decision Tree / Algorithm

| Input | Expected |
|---|---|
| Prev/Next via arrows, keyboard, or swipe on page 1 / 604 (single view) | Wrap to 604 / 1; URL (`replaceState`) + panel content follow |
| Prev/Next on pair 1–2 / 603–604 (double view, desktop) | Wrap to 603 / 1 (odd anchor of the facing pair) |
| Same on grant reader (`/mushaf/[grant]/pages/...`) | Same wrap (shared `ReaderPager`); no `lastRead` write (existing grant exclusion) |
| Direct `/pages/605`, `/0`, `/999`, `/abc` | HTTP 404 + `Custom404`; `lastReadPage`/`lastReadPath` untouched |
| 404 with stored `lastReadPath` (valid shape, 1–604) | Return-to-Reading `<a href={stored}>` renders as third button (Home stays primary) |
| 404 with no stored position (fresh browser) | Return-to-Reading links to default-locale page 1 (`/${defaultLocale}/pages/1`, `defaultLocale` imported from `i18n/routing`, never hardcoded) |
| 404 with malformed stored path (fails shape/range check) | Treated as absent → page-1 fallback (defensive; the single write site only ever writes valid paths) |
| Recovery click | Full page load to a valid reader URL; reader hydrates; nav Continue link still points at the same page (no corruption) |

## Verified Test Cases

Walked through with the user (Q1–Q3) plus code-verified facts:

1. **Empty state (Q1 → fallback to page 1):** fresh context → `/ar/pages/0` → 404 shows Return to Reading → href is `/ar/pages/1` → click lands page 1 with content, `lastRead` becomes 1 (valid state, not corruption).
2. **Seeded recovery:** visit `/ar/pages/7` (content paints, `lastRead` syncs) → visit `/ar/pages/999` → 404 shows Return to Reading with href `/ar/pages/7` → nav Continue link still targets `/ar/pages/7` → click recovery → lands `/ar/pages/7`, content paints, Continue link unchanged.
3. **Keyboard wrap (desktop, single view):** `/ar/pages/604` + ArrowLeft (forward in Quran order) → `/ar/pages/1`; ArrowRight → back to `/ar/pages/604`.
4. **Swipe wrap (mobile, forced single):** `/ar/pages/1` + swipe left (`dx<0`, backward) → `/ar/pages/604` + content; swipe right → `/ar/pages/1`.
5. **True upper edge:** `/ar/pages/605` → status 404 + `Custom404` visible (existing spec covers 999/0/invalid; 605 is the off-by-one neighbor of the last static param).
6. **Grant wrap (desktop):** viewer session via `createE2EGrant` (pattern in `e2e/tests/shared-mushaf.spec.ts` + `e2e/helpers/mushaf.ts`) → grant `/pages/1` → Previous arrow → wraps to pair 603–604 URL with content; grants excluded from `lastRead` as today.

Assumption to confirm at implementation: the locale 404 (`/ar/pages/*` out-of-range) renders inside the locale layout, so Nav + Continue link are mounted on the 404 page (App Router keeps layouts above the `not-found` segment). If live behavior shows otherwise, assert `lastReadPage` via `localStorage` evaluate instead of the nav link — same invariant, different locator.

## Files to Change

- `app/components/nav/ReturnToReadingLink.tsx` (new, `"use client"`) — reads `storage.get("lastReadPath")` on mount; validates shape `/^[a-z]{2}\/pages\/\d+$/` and range 1–604; falls back to `/${defaultLocale}/pages/1`; renders a plain `<a>` with the secondary-button styling + `fq-focus-ring` (mirrors the Shared-mushaf button); label comes in as a prop.
- `app/not-found.tsx` — resolve `t("notFound.returnToReading")` server-side, render the link as a third button after Home (Home stays primary). No other markup changes.
- `messages/ar.json`, `messages/en.json` — add `notFound.returnToReading`; run `npm run extract-translations` to keep keys in sync.
- `e2e/tests/boundary-recovery.spec.ts` (new) — the six cases above, reusing `waitForReaderContent`, `getActivePanel`, `swipeReader`, `setStoredSafhaView`, `skipNonDesktop`/`skipNonMobile` from `e2e/helpers/reader.ts` and grant/auth helpers from `e2e/helpers/mushaf.ts` + `e2e/helpers/auth.ts`. Grant test needs `test.describe.configure({ mode: "serial" })` like `shared-mushaf.spec.ts`.
- `docs/architecture/COMPONENTS.md` — one line for the new link component next to the existing 404 entries (checked at implementation; keep it to a line).

## Constraints

- 404 boundary: plain `<a>` full-load links + theme tokens only — no `next/link`, no `jumpTo` interception (decisions `api.md` 404 section; `Custom404` header comment).
- Label via server prop — the root 404 has no `NextIntlClientProvider`, so the client link cannot call `useTranslations` itself.
- `dynamicParams = false`, static generation of all 604 pages, and `commitTo`-only in-reader navigation are untouched (DECISIONS.md invariants; ADR 0028).
- E2E runs against the production build (`e2e:serve`), default 2 workers; no local full-suite runs — the new spec only, CI does the rest (decisions `testing.md`).
- New spec must not re-assert what `reader-navigation.spec.ts:56-89` (arrow wrap) and `:340-358` (999/0/invalid 404) already cover.

## What NOT to Do

- Do not touch `stepAnchor` / `computeSpreadNav` / `getPagePair` — verified correct for both parities (odd/even anchors) and both directions.
- Do not touch `LastReadPageSync` / `LastReadPageContext` — the null-guard already makes 404 visits non-corrupting.
- Do not duplicate the existing arrow-wrap or 999/0/invalid assertions into the new spec file.
- Do not add recovery-link tests for grant 404s, awrad/`/plans` integration, or server 500 handling — explicitly out of scope per the issue.
- Do not read `usePathname()` for the current page or introduce `router.push` anywhere in this change (ADR 0028).
- No new ADR — this change applies existing constraints (plain-`<a>` 404 rule, static-gen invariant); nothing architecturally novel to record.

## Decisions Made

- Q1: no stored position → link to default-locale page 1 (imported `defaultLocale`, not hardcoded `ar`); malformed stored path → same fallback. Home remains the primary button.
- Q2: new dedicated `e2e/tests/boundary-recovery.spec.ts` (mirrors #472's `overlay-stacks-history.spec.ts` precedent); existing spec file untouched.
- Q3: grant reader gets one wrap test (shared pager proves it, one test pins it); grant recovery stays out.
- Plan area `reader` (wrap-around is the headline; the 404 link is one small component), type `feature` (matches the sibling #472 plan).
- Step-3b sweep: existing 404 test asserts only the "404" text → adding a link is safe; `Custom404` has a single consumer (`app/[locale]/not-found.tsx`); no service-worker or new-endpoint surface; the recovery click is a full load so it inherits existing offline-fallback handling with no new offline logic; no removed/relocated affordance.
- Implementation refinements: path validation uses the routing config's `locales` (`routing.locales.includes(...)`) instead of the plan draft's `[a-z]{2}` — same intent, exact per the pwa.md launch contract. `npm run extract-translations` also rewrote unrelated keys (pre-existing drift: empty keys + en-filled theme names); those hunks were reverted, keeping only `notFound.returnToReading`, since en-filled strings in `ar.json` would mask missing Arabic translations.
- E2E correction: the seeded-recovery test asserts the nav Continue link on `/ar` (home), not on the reader — on pages routes the nav Continue entry is `hidden md:flex` (Nav.tsx), so a visibility assertion on the reader itself fails on mobile viewports despite a correct href.
