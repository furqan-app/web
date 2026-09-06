---
title: Offline Quran Search Foundation (Index, Offline Engine, Paginated API)
type: feature
date: 2026-09-06
status: implemented
area: search
issue: 537
adr: [0062]
---

# Offline Quran Search Foundation (Index, Offline Engine, Paginated API)

## Summary

Phase 1 of epic #536 (covers #537 fully and the API half of #538): precache a committed static
Quran search index (`public/quran/search-index.json`, ~2.4 MB raw / ~0.7 MB gzip wire) so verse
search works offline in the installed PWA; teach `useSearch` to fall back to it when offline or on
fetch failure with pixel-identical rows; and migrate both search routes to the `jsonResponse()`
envelope with `take`/`skip` pagination plus `total` counts. No overlay visual changes — the overlay
keeps `take: 10` and the "More results" button ships with the phase-2 results page (#539), so this
phase lands no dead affordance.

## Root Cause / Approach

Verse search is online-only Prisma `contains` on `text_imlaei_simple` returning raw
`{ results }` capped at 10 with no total — offline shows nothing and no full-results UI is
possible. The approach: committed static index (same `scripts/quran-*/generate.js` pattern as
`chapters.json`), precached at install; offline engine in `useSearch` with identical normalization
and paging; envelope migration (cleanest, per user decision — not the cheapest) so phase 2's
infinite scroll pages through bounded chunks. Display-column choice was settled by a reverted
browser experiment + DB/font forensics (see Verified Test Cases); the why lives in ADR 0062.

## Decision Tree / Algorithm

`useSearch(query, take = 10, skip = 0)`:

| # | Condition | Source | Shape returned |
|---|---|---|---|
| 1 | Query invalid (trimmed < 2 chars) | none — query disabled | `{ results: [], total: 0 }`, no network, no index read |
| 2 | Online, API fetch succeeds | `GET /api/search/verses?q&take&skip` → `{ data: { results, total } }` | online rows (`Word[]` join for display), `total` = full match count |
| 3 | Offline (`navigator.onLine === false`) or fetch rejects | precached `quran/search-index.json`, same normalization as the online route (hamza→alif only on the verse path — no digit fold, `text_imlaei_simple` has no digits), paginated client-side with same `take`/`skip` | rows carry pre-joined `display_uthmani` instead of `Word[]`; overlay renders `Word`-join when present, `display_uthmani` otherwise |
| 4 | Surahs, any connectivity | online: `/api/search/chapters` envelope; offline: filter precached `quran/chapters.json` in memory (strict `contains` + numeric-id match preserved) | same `SurahResult[]`, no pagination (114 rows) |
| 5 | Index not yet in cache on first offline search | loading until `cache.match` resolves; if absent → existing no-results state, never a throw | — |

API: `take` default 10, server max-`take` 50 (the `Word[]` eager-load is what makes the cap
load-bearing); `orderBy: { id: 'asc' }` + `skip` on both routes; `isSearchQueryValid` enforced
server-side and client-side on both paths.

## Verified Test Cases

- Display-column experiment (dev server, reverted, `git status` clean after): rows for A
  (`text_imlaei_simple`/Tajawal), B (`verse.text_uthmani`), C (`words.text_uthmani` join) vs current
  (qpc join), query `الحمد لله`. Result: only current renders correctly — A has simplified
  alif/hamza (user-rejected on sight); B/C render waqf codepoints as plain circles. Font-cmap
  forensics: all 69 verse-level + 81 word-level distinct codepoints present in
  `UthmanicHafs1Ver18` (0 missing), and `verses.text_uthmani` holds zero ۞/۝ across 6,236 rows —
  so the circles are the font's intended shapes, not tofu, and there is nothing strippable.
  Stripping real waqf orthography was explicitly rejected.
- DB-measured index budget (2026-09-06, local `:3307`): imlaei ~733 KB + qpc-joined display
  ~1.35 MB + keys ~30 KB + JSON overhead ≈ **~2.4 MB raw, ~0.6–0.8 MB gzip wire**.
- Walk-throughs agreed with user: (a) `الرحمن` online → API `total` (50+) + first 10 `Word[]`
  rows; same query offline → identical `total`, `display_uthmani` rows pixel-identical; (b) `ا`
  (1 char) → no fetch, no index read, idle state; (c) airplane mode mid-typing → index fallback,
  no error flash.
- Cross-edition (user question): word text is edition-agnostic (placement lives in
  `MushafWordLayout`; Tajweed is a font/stylesheet layer) — no match/display issue. Page
  navigation resolves via the active edition's `verse-pages/{mushafId}.json` (ADR 0033), never the
  index (which stores no page number by design).

## Files to Change

- `scripts/quran-search-index/generate.js` (new) — rows `{ k, t, d, c }` from `Verse` +
  ordered `Word.qpc_uthmani_hafs` join; sync-note header per `quran-chapters` pattern.
- `package.json` — `generate:quran-search-index` script.
- `public/quran/search-index.json` (new, committed) — generated output.
- `next.config.mjs` — `globPublicPatterns` += `quran/search-index.json` (one entry; app-shell pin
  otherwise unchanged).
- `app/api/search/verses/route.ts` — `jsonResponse({ data: { results, total } })`, `take`/`skip`
  params (default 10, max 50), `count` alongside `findMany`, same `where`/`orderBy`/select.
- `app/api/search/chapters/route.ts` — same envelope + `total` (no pagination; 114 rows).
- `app/hooks/use-search.ts` — envelope readers, `take`/`skip` args, offline branch (index load via
  `cache.match`/fetch once + in-memory, `normalizeArabicQuery` parity with the online verse route,
  `normalizeDigits` on the chapters path only, client-side `take`/`skip` slicing, chapters fallback
  over `chapters.json`).
- `app/types/index.ts` — `VerseResult` gains optional `display_uthmani?: string`; new
  `SearchPage<T> = { results: T[]; total: number }` (or inline type).
- `app/components/search/SearchQueryResults.tsx` — prop-passing only (`data.results`); verse row
  renders `Word`-join when present else `display_uthmani`; zero visual change.
- `app/components/search/SearchBar.tsx` — prop-passing only (`data.results`).
- `docs/architecture/adr/0062-precached-search-index-offline-engine.md` (new) + `decisions/search.md`
  "Offline Search Index" section (both in this change).

## Constraints

- `globPublicPatterns` stays otherwise pinned — this adds the single search-index entry; page
  fonts/JSON stay consent-gated (decisions/pwa.md). The ~0.7 MB wire cost hits every production
  visitor's install manifest (accepted; lazy-load rejected for failing first-ever-search-offline).
- Root-Layout Network Budget (ADR 0049): the index is never fetched on layout mount — only on
  search intent (overlay open + valid query) or via SW precache.
- `take: 10` overlay default, server max-`take` 50, `orderBy id asc`, min-length gate — all
  load-bearing, none removable as cleanup (decisions/search.md).
- Match column stays `text_imlaei_simple` + query-only normalization (ADR 0007); display string
  never matched against. No `page_number`/surah names in the index (ADR 0033).
- Paginated `GET /api/search/*` stays on `defaultCache` (display-only read; 24h staleness
  tolerable, 16-entry LRU churn accepted) — no `NetworkOnly` rule; offline path never hits network.
- No overlay button, no new route, no locale-string changes in this phase (button + page = phase 2).

## What NOT to Do

- Do not display `text_imlaei_simple` or `text_uthmani`/`words.text_uthmani` in any search UI —
  settled by experiment (simplified orthography; circle-rendered waqf), supersede only with a new
  visual proof, never silently.
- Do not strip waqf/pause codepoints from display text to "fix" rendering — data corruption.
- Do not use `Word[]`-per-verse rows in the index (C variant) — same payload as online, defeats it.
- Do not add `page_number`/surah names to the index as a convenience — cross-edition
  misnavigation (56 verses paginate differently).
- Do not keep the raw `{ results }` shape alongside the envelope "for compat" — single cutover.
- Do not ship the overlay "More results" button here — it belongs to the phase-2 page PR (#539).

## Decisions Made

- One-shot whole-epic PR rejected (user-agreed split): phase 1 = #537 + API half of #538; phase 2
  = overlay button + #539 page. Rationale: SW precache manifest + DB payload + new route in one
  review/rollback unit is too coarse; #538's button without its target page is a dead link.
- Precache over lazy-load (user-leaned, confirmed): offline must work with zero prior online
  search. Cost (~0.7 MB install manifest) accepted and recorded.
- Envelope migration over shape-preserving append (user: "cleanest not cheapest"):
  `{ data: { results, total } }` via `jsonResponse()` on both routes, readers updated together.
- Sweep (3b) findings: `e2e/tests/search.spec.ts` 10-cap assertion (`toHaveCount(10)` for `الله`)
  stays green — overlay keeps `take: 10`; no spec mocks the raw API shape (UI-level), so the
  envelope cutover is transparent to e2e. No unit specs cover `useSearch`. No SW rule touches
  search reads; no state derives from `useSession()`/`onLine` beyond the online/offline branch,
  which degrades to local data, never data loss. "Overlay unchanged" claim verified against
  `SearchQueryResults.tsx`/`SearchBar.tsx` — prop-passing edits required (`data.results`), recorded
  above, no visual delta.
