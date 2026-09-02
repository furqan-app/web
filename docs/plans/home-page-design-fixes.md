---
title: Home Page Design Fixes
type: feature
date: 2026-08-13
status: implemented
area: theming
---

# Home Page Design Fixes

## Summary

A design-critique pass on `app/[locale]/page.tsx` found three things worth fixing on the home surah-list surface:

1. **Two WCAG contrast failures** on the surah-list card in dark theme.
2. **Generic card depth** on `SurahListItem` (the entry point to the mushaf).
3. **A boilerplate hero** that displaced content for returning users.

Plus a fourth item — an unlabelled mobile nav row — which triggered a long nav restructuring that ended up **outside this plan**: the current top nav is a flat header with every control directly accessible; `NavOverflowMenu` was built, iterated, and then deleted entirely. See `restructure-navigation.md` and the Revision History below; the nav is **not** part of this plan's end state.

## Root Cause / Approach

### 1. Dark-theme contrast

`.theme-dark`'s `--accent-foreground` (mirrored from `--primary`) on `--accent` measured 2.4:1; `--muted-foreground` on `--card` measured 4.1:1. Both need ≥4.5:1 (WCAG AA). Per **Dark Theme Color Semantics** (ADR 0031) the badge stays emerald — no gold exception.

**Fix (revised during implementation):** `--accent-foreground` is deliberately mirrored to `--primary` in every theme, and `--primary` had just been retinted (`brand-mark-icons.md`) to keep white-on-primary button text at 5.09:1 — bumping `--primary` to fix the badge would drop that to ~2.7:1, and no single `--primary` lightness satisfies both. So **decouple `--accent-foreground` from `--primary` in dark theme only** (independent value `169 88% 39%`, 5.0:1 against `--accent`); bump `--muted-foreground` to `206 9% 56%` (5.0:1 against `--card`). `--primary` and the light/gold blocks are untouched. Computed via the WCAG relative-luminance formula against the real HSL values.

### 2. `SurahListItem` card depth

`SurahListItem` is shared between the home grid and the reader sidebar — the fix applies **everywhere it renders**, one visual language, no home-only variant. Scope: replace generic `shadow-sm`/`hover:shadow-md` with the DESIGN.md standard card-lift shadow token, stronger on hover. **No ornament** — a 4-corner star SVG and a single-corner rosette PNG were both tried and rejected by the user; `design-principles.md` is unchanged.

### 3. Hero — reverted to unconditional

A `HomeHero` client component was built to collapse the hero (title + a prominent Continue Reading button, no tagline) for returning users, detected via `LastReadPageContext`. After seeing it rendered the user reverted it entirely: `app/[locale]/page.tsx` renders the full hero inline again (title + tagline, **no badge**) for every visitor in every state. `HomeHero.tsx` was deleted; the home page no longer reads `LastReadPageContext` at all. The Arabic tagline's `max-width` was loosened slightly to avoid an awkward 4-line wrap.

### Non-fixes

The surah-grid loading/empty state was dropped from scope — `getSurahs()` reads a static build-time-committed JSON and throws (caught by Next's error boundary) rather than ever rendering an empty grid; per the Static Generation Strategy that state structurally cannot occur.

## Decision Tree / Algorithm

The hero is unconditional — no decision tree. Contrast fix, as implemented:

| Token (`.theme-dark` / `.theme-dark.dark` only) | Was | Now | Ratio |
|---|---|---|---|
| `--accent-foreground` | mirrors `--primary` (`169 88% 26%`) | own value `169 88% 39%` | 5.0:1 vs `--accent` (was 2.4:1) |
| `--muted-foreground` | `206 9% 50%` | `206 9% 56%` | 5.0:1 vs `--card` (was 4.1:1) |
| `--primary` | — | untouched | white-on-primary button text stays 5.09:1 |

Light and gold themes unaffected.

## Verified Test Cases

- Full hero (title + tagline, no badge) renders identically for every visitor on `/en` and `/ar`, mobile and desktop, regardless of reading history.
- `SurahListItem` in the reader sidebar → same shadow treatment as the home grid, not a separate variant; `isActive` prop / sidebar usage still works.
- Dark-theme badge (5.0:1), verse-count text (5.0:1), and the existing white-on-primary button text (5.09:1, unchanged) — all computed against real rendered HSL values, all ≥4.5:1.

## Files to Change

- `app/globals.css` — `.theme-dark` / `.theme-dark.dark`: `--accent-foreground` decoupled from `--primary` (own value `169 88% 39%`); `--muted-foreground` → `206 9% 56%`. `--primary` and the light/gold blocks untouched.
- `app/components/SurahListItem.tsx` — the standard card-lift shadow token replaces `shadow-sm`/`hover:shadow-md`, stronger on hover. No ornament.
- `app/[locale]/page.tsx` — hero markup inline (plain server component): title + tagline, no badge, RTL-widened tagline `max-width`, unconditional. `HomeHero` render + import removed.
- `app/components/HomeHero.tsx` — created, then **deleted**.
- `messages/en.json` / `messages/ar.json` — removed the unused `home.badge` key.
- `docs/architecture/DECISIONS.md` — "Dark Theme Color Semantics": document the `--accent-foreground` / `--primary` decoupling and why.
- `docs/design/design-principles.md` — **not changed** (both ornament attempts were reverted).
- `docs/architecture/COMPONENTS.md` — `SurahListItem` shadow note; `HomeHero` added then removed.

## Constraints

- `SurahListItem` is a shared component — its depth change applies globally (home + sidebar), never forked into a home-only variant. The `isActive`/sidebar path must keep working.
- The contrast fix is dark-theme-only by nature of the failing values — do not touch light or gold theme tokens.
- The badge stays emerald (`--accent`/`--accent-foreground`) — do not reach for gold as a "fix" (ADR 0031: gold is reader-page-only, no exceptions in chrome).
- `--primary` must not be retuned to fix the badge — it is shared with the 5.09:1 white-on-primary button pairing. Fix via `--accent-foreground` alone, decoupled from `--primary` in dark theme only.
- No ornament on `SurahListItem`, of any kind — two attempts (4-corner star SVG, single-corner rosette PNG) both rejected. If revisited, treat both as dead ends, not partial progress.
- Do not touch `--mushaf-rim-*` / `--mushaf-sheet-*` / reader-page depth tokens — reserved for the actual mushaf reading page (Reader Surface Depth), architecturally distinct from the surah-list card.
- No `bg-white`/`text-black`/raw hex — semantic tokens only. Logical `start`/`end` Tailwind variants for anything that mirrors in RTL.

## What NOT to Do

- Do not add a second accent colour to "fix" the badge (One Accent Rule) — this is a value retune within emerald.
- Do not fork `SurahListItem` into a home-page-only variant.
- Do not add any ornament to `SurahListItem` (both attempts rejected this task).
- Do not hand-author new intricate/arabesque SVG path data for future ornament work — this codebase has a documented poor track record with it (the mushaf reader's own hand-authored corner-medallion frame, ADR 0013, was built then fully removed; the brand mark needed two hand-drawn SVG attempts abandoned for an exported PNG, `brand-mark-icons.md`).
- Do not mirror `--accent-foreground` back to `--primary` in dark theme as a "simplification" without re-deriving both contrast pairs (badge-vs-accent and button-text-vs-primary).
- Do not re-add a returning-user hero collapse — the full hero is unconditional by explicit user decision; the home page must not read `LastReadPageContext`.
- Do not add defensive UI for a surah-grid empty/loading state — it cannot occur (static build-time JSON).
- Nav restructuring is **out of scope for this plan** — see `restructure-navigation.md` for the current header. Do not re-derive the nav from this file.

## Decisions Made

- `SurahListItem`'s depth change applies globally (home + sidebar), not as a variant — user confirmed.
- Ornament iterated twice, both rejected (4-corner star SVG "doesn't present islamic shape"; single-corner rosette PNG "looks bad"). Ships with the shadow-lift only.
- Dark-theme contrast fix decouples `--accent-foreground` from `--primary` (independent `169 88% 39%`) rather than retuning `--primary` — a shared `--primary` bump would regress white-on-primary button contrast (5.09:1 → ~2.7:1), and no single `--primary` lightness satisfies both. Recorded in DECISIONS.md.
- Hero-collapse-for-returning-users was implemented, then fully reverted after the user saw it — the full hero (title + tagline, no badge) is unconditional; `LastReadPageContext` is no longer read by the home page.
- The surah-grid empty/loading state is dropped from scope — it cannot occur (Static Generation Strategy).

## Revision History

- 2026-08-13 — folded Addendum "Universal nav menu; sidebar toggle moves into Nav" (#279) and the base plan's item 4 (mobile nav collapse). The mobile nav went through several iterations here — a mobile-only `NavOverflowMenu` (a `Popover` v1, rebuilt as a bottom `Sheet` v2 with a shared `menuRow` template), then made universal at every breakpoint, with the surah-sidebar toggle relocated from a floating pill into `Nav.tsx` — each explicitly flagged "not the final design".
- 2026-08-19 — folded Addendum "Restructure Navigation & Direct Settings Access". **Supersedes the entire `NavOverflowMenu` line above** — `NavOverflowMenu.tsx` is **deleted**; `SettingsSidebar`, `NotificationBell`, `SharedMushafLink`, and `UserMenu` render directly in the top header row at all breakpoints, every control 1-click accessible, no hamburger sheet. This work is now owned by `restructure-navigation.md`. Only the contrast, `SurahListItem` shadow, and hero-revert changes above remain this plan's own.
