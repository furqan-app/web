---
title: Add QCF V2 (Madani, 1421H) mushaf edition and make it the default
type: feature
date: 2026-09-07
status: implemented
area: rendering
issue: 601
adr: [0066]
---

# Add QCF V2 (Madani, 1421H) mushaf edition and make it the default

## Summary

Add **QCF V2** (KFGQPC "Madani" layout, 1421 H print) as a third mushaf edition under the [ADR 0033](../architecture/adr/0033-mushaf-edition-owns-word-placement.md) registry — QDC `mushaf=1`, glyph column `code_v2` (already seeded, shared with the Tajweed edition), plain non-COLRv1 per-page fonts — and promote it to the reader default (`DEFAULT_MUSHAF_ID`, from `2`).

Shipped as **one PR**. No `furqan_quran` schema change. The one non-additive change is decoupling three constants from `DEFAULT_MUSHAF_ID` so the default can move without a destructive `Word` reseed, a `Mark` migration, or a bigger first-run offline download — see [ADR 0066](../architecture/adr/0066-default-edition-independent-of-canonical-precache-seed.md).

## Approach

### Mushaf metadata

| Field | Value |
|---|---|
| Edition | KFGQPC / QPC **V2**, "1421 H print" (~2000–2001 CE), King Fahd Complex, Uthman Ṭāhā, Ḥafṣ |
| QDC API | `mushaf=1`, glyph field `code_v2` |
| Dimensions | 604 pages, 15 lines/page |
| Font | 604 per-page fonts, one glyph = one word ligature, plain outlines (not COLRv1) |
| Font assets | Vendored from `quran.com-frontend-next-testing/public/fonts/quran/hafs/v2/woff2/` (`p1.woff2`…`p604.woff2`, ~95 MB). Verified same provenance as our current `public/fonts/v1/woff2/` (V1 `p100.woff2` is byte-identical between the two repos). Licence: KFGQPC, same as the V1 set. |

### Why the four-way decoupling (ADR 0066)

Today one id (`2`) plays four roles. Promoting QCF V2 to default without breaking things means separating them:

| Role | Constant | Value after this PR | Why it does *not* follow the default |
|---|---|---|---|
| Reader opens with | `DEFAULT_MUSHAF_ID` | **1** | — |
| `verses-words.js` fetch param → the only edition `layoutFromSeededWords` is valid for | `SEEDED_WORDS_MUSHAF_ID` (new) | 2 | `verses-words.js` fetches `mushaf: "2"`; its `page_number`/`line_number` are mushaf 2's. Using the shortcut for mushaf 1 would seed mushaf 2's lines under `mushaf_id = 1`. |
| `Mark.page_number` canonical edition | (no code constant — rides on `Word.page_number` in the JSON) | 2 | Canonicalization reads each word's `Word.page_number` (the mushaf-2 mirror) from the static JSON, never the displayed page — the tajweed edition already relies on this with the same 361-word divergence. Moving it would need a `Mark` migration; leaving it does not. |
| Stored **page numbers** — plan verse-unit ranges (ADR 0038), `usePageVerseBounds` | `CANONICAL_PAGE_MUSHAF_ID` (new) | 2 | A saved "page 250" range must keep meaning the same verses. On the ~36 divergent pages, resolving it against QCF V2 instead of V1 would shift the covered verses. |
| First-run precache / post-install prompt / `OFFLINE_DOWNLOAD_MB` / SW miss-probe fallback | `PRECACHE_MUSHAF_ID` (new) | 2 | QCF V2 is ~95 MB vs V1's ~47 MB; doubling the mandatory first-run download blows the iOS quota headroom ADR 0014 is built around. |

## Decision Tree / Algorithm

### Seeder — `scripts/quran-seed/`

```
LAYOUT_MUSHAF_IDS      = [2, 1, 19]            # 1 added
GLYPH_FIELD_BY_MUSHAF  = { 2: code_v1, 1: code_v2, 19: code_v2 }   # 1 added
SEEDED_WORDS_MUSHAF_ID = 2                     # new; MUST equal verses-words.js `mushaf` param
```

`seed.js` layout loop, per `mushafId`:

| condition | layout source | pageOf |
|---|---|---|
| `mushafId === SEEDED_WORDS_MUSHAF_ID` (was `=== DEFAULT_MUSHAF_ID`) | `layoutFromSeededWords` | `v => v.page_number` |
| else (mushaf 1, mushaf 19) | `fetchMushafLayout(mushafId, …)` | `v => fetched.versePages.get(v.verse_key)` |

Add a run-time assertion in `seed.js` or `mushaf-layout.js`: `SEEDED_WORDS_MUSHAF_ID` must equal the `mushaf` value `verses-words.js` uses (import/export the literal from one place if practical; otherwise assert against a re-exported constant).

**No new integrity check.** An earlier draft added a "mushaf 1 == mushaf 2 page boundaries" assertion; that invariant is false (QCF V2 diverges from QCF V1 on the same 56 verses / 361 words as the tajweed edition — the spike's V1-vs-V2 comparison was buggy). `fetchMushafLayout`'s existing "every seeded word has a placement" + `validateLayout` checks are sufficient. Marks are safe regardless — see the decoupling table above.

### Static page JSON — `scripts/quran-json/generate.js`

No code change — it iterates `LAYOUT_MUSHAF_IDS`. Produces `public/quran/pages/1/*.json` (604) + `public/quran/verse-pages/1.json`. Acceptance: `pages/1/{77,342,555}.json` line grouping matches QDC `mushaf=1`, **not** `mushaf=19` (those three pages diverge ~50% from mushaf 19 — a one-line shift; most pages match 0–3%).

### Font-size calibration — QCF V2 takes the Tajweed compact sizing

QCF V2 and the QCF V4 tajweed font are the **same glyph family** (tajweed = V2 + baked-in colour layers), drawn ~10% wider per em than QCF V1. Measured line-width/font-size ratio across all 604 pages: V1 mean **14.2**, V2 mean **15.6**, V4-tajweed mean **16.1** (V2 CV 2.1%, same as tajweed — uniformly wider, not erratic). The reader derives the mushaf `font-size` by dividing available width by a hardcoded `14.7` (V1's ratio), so at V1's calibration V2 overflows ~6% and clips the trailing edge of most lines.

Fix mirrors `fix-tajweed-font-size.md`: `QuranSafha` applies `.fq-mushaf-v2` (for the edition where `usesColorGlyphs || id === QCF_V2_MUSHAF_ID`); the four `globals.css` **sizing** selectors that were `.fq-tajweed` become `.fq-mushaf-v2` (`0.85×` desktop/tablet, `0.88×` mobile, line-gap `0.5607×` to hold page height at `20.6fs`, `padding-block-start: 1em` mobile). The three `.theme-* .fq-tajweed { font-palette }` **colour** selectors stay `.fq-tajweed` (V2 is not a colour font). Line centering is already edition-independent (ADR 0033), so V2 centres like tajweed when a line falls short. Skeleton top-padding gate switches from `usesColorGlyphs` to the same `compactMetrics` flag.

### Render registry — `app/utils/mushaf-editions.ts`

Add `MUSHAF_EDITIONS[1]`:

| field | value |
|---|---|
| `name` | "QCF V2 (Madani)" — final copy via i18n key, see below |
| `fontFamily` | `p => \`quran-p${p}-v2\`` |
| `fontUrl` | `p => \`/fonts/v2/woff2/p${p}.woff2\`` |
| `pageJsonUrl` | `p => \`/quran/pages/1/${p}.json\`` |
| `pagesCount` | 604 |
| `linesPerPage` | 15 |
| `usesColorGlyphs` | **false** — routes through the normal `FontFace` registry, no `FontFaceInjector` branch (spike confirmed) |
| `fontIdPattern` | `/^\/fonts\/v2\/woff2\/p([0-9]+)\.woff2$/` |
| `downloadSizeMb` | measured (≈97) — re-measure on-disk WOFF2 + gzipped JSON, record the note like the other editions |
| `thumbnailUrl` | `/mushaf-previews/1.png` |

`DEFAULT_MUSHAF_ID = 1`. `MUSHAF_EDITION_IDS = [2, 1, 19]` (display order — V1, V2, Tajweed; confirm ordering with design if it matters). Add `QCF_V2_MUSHAF_ID = 1` export.

### Offline / SW

- `app/constants/offline.ts`: add `PRECACHE_MUSHAF_ID = 2`. `OFFLINE_DOWNLOAD_MB = getMushafEdition(PRECACHE_MUSHAF_ID).downloadSizeMb`.
- `app/components/offline/OfflineSetupGate.tsx`, `OfflineInstallPrompt.tsx`: precache call + size copy use `PRECACHE_MUSHAF_ID`, not `DEFAULT_MUSHAF_ID`.
- `app/sw.ts`: `isPageFont` regex → add `v2/woff2` (`/^\/fonts\/(v1|v2|v4\/colrv1)\/woff2\/p[0-9]+\.woff2$/`). Reader-HTML-miss probe fallback edition (Addendum 9 / `/__fq-active-mushaf` absent path) → `PRECACHE_MUSHAF_ID`.
- Settings "Mushaf Layout" list (`MushafLayoutSection` / `MushafLayoutRow`) picks up mushaf 1 automatically from `MUSHAF_EDITION_IDS` — verify its download row (sentinel, progress, `downloadSizeMb` label) works.
- Gate / Settings copy: a short line telling a user whose edition is V2 that offline reading of V2 needs a separate download (the "also nudge" answer from planning).

### i18n — `messages/{en,ar}.json`

`mushafLayout.editions.1.name`. Check every other `editions.*` consumer renders (next-intl throws on a missing key).

### Thumbnail — `scripts/generate-mushaf-thumbnails.js`

Add mushaf 1 to `EDITIONS`; generate `public/mushaf-previews/1.png` (committed).

### e2e — `scripts/e2e-fixture/generate.js` + Playwright snapshots

- Fixture generator uses `DEFAULT_MUSHAF_ID` — decide: follow the flip (fixtures become V2) or pin to `PRECACHE_MUSHAF_ID`. Recommend **follow the flip** so e2e exercises the real default.
- Re-baseline reader visual snapshots (they now render V2). Run `npm run e2e:serve` locally (production build — never `next dev`).

## Verified Test Cases

| Case | Expectation |
|---|---|
| `/en/pages/1` fresh reader, no localStorage | renders QCF V2 (default) |
| `/en/pages/77`, `/en/pages/342`, `/en/pages/555` | line grouping matches QDC `mushaf=1` (one-line-tighter top vs mushaf 19), not mushaf 19's rows |
| Any V2 page, desktop + mobile + spread | text scaled `0.85×`/`0.88×`, 15 lines fill page height, no trailing-edge clip; lines centre when short (like tajweed) — verified pages 105/106 `/en` + `/ar`, mobile 375px |
| Any page, switch edition V2 → V1 → Tajweed in Settings | verse preserved across switch (`MushafSwitchSync`); footer page number shifts ±1 on the ~36 pages where editions disagree — same for V1↔V2 as for V1↔Tajweed |
| Existing user with `quranMushafId = 2` in localStorage | stays on V1 (hydration migration unchanged) |
| Existing user with `quranMushafId = 19` | stays on Tajweed |
| Existing mark stored at `Mark.page_number = N` (canonical mushaf 2) | still resolves — mushaf 1 page N == mushaf 2 page N |
| New installed PWA user (default V2), taps first-run Download | downloads **V1** (`PRECACHE_MUSHAF_ID`), ~48 MB — unchanged size. Offline reader then shows page-1 shell for uncached V2; online is V2. |
| Same user, downloads "QCF V2 (Madani)" row in Settings | V2 available offline (~95 MB), independent sentinel; the active-row "download to read offline" hint disappears |
| Existing mark on a divergent page (e.g. word whose canonical page is 121, shown on QCF V2 page 120) | mark still renders — `useMarks([120, 121])` span-reads, `Mark.page_number` unchanged |

## Files to Change

**Seeder / data**
- `scripts/quran-seed/mushaf-layout.js` — `QCF_V2_MUSHAF_ID`, `SEEDED_WORDS_MUSHAF_ID`, `LAYOUT_MUSHAF_IDS = [2,1,19]`, `GLYPH_FIELD_BY_MUSHAF[1]="code_v2"`, exports
- `scripts/quran-seed/verses-words.js` — imports `SEEDED_WORDS_MUSHAF_ID`, `mushaf: String(SEEDED_WORDS_MUSHAF_ID)` (single source, no literal)
- `scripts/quran-seed/seed.js` — loop condition `=== SEEDED_WORDS_MUSHAF_ID`; log line adds `seeded_words_mushaf=`
- `scripts/e2e-fixture/generate.js` — same `SEEDED_WORDS_MUSHAF_ID` split (had the identical `=== DEFAULT_MUSHAF_ID` bug)
- `scripts/dev/populate-qcf-v2-local.js` — **dev-only** helper: inserts `mushaf_id=1` rows via `fetchMushafLayout(1)` without the destructive full reseed, so `generate:quran-json` can run locally. Canonical path stays `npm run seed:quran -- --force`.
- `npm run generate:quran-json` → commit `public/quran/pages/1/*.json` (604) + `public/quran/verse-pages/1.json`. Verify `pages/{2,19}/` and `verse-pages/{2,19}.json` are byte-unchanged.
- regenerate `e2e/fixtures/quran-fixture.sql` (needs mushaf 1 rows or `next build` renders empty default pages in CI E2E)

**Fonts**
- `public/fonts/v2/woff2/p1.woff2` … `p604.woff2` (vendored, ~95 MB, committed)
- provenance + licence note in this plan / ADR 0066

**Render**
- `app/utils/mushaf-editions.ts` — `QCF_V1_MUSHAF_ID`, `QCF_V2_MUSHAF_ID`, `CANONICAL_PAGE_MUSHAF_ID`, `MUSHAF_EDITIONS[1]`, `DEFAULT_MUSHAF_ID = QCF_V2_MUSHAF_ID`, `MUSHAF_EDITION_IDS = [2,1,19]`
- `app/hooks/get-page-words.ts` — its own `GLYPH_FIELD` map (DB-backed API route, 3rd copy of the glyph-field pairing) gets `1: "code_v2"`
- `app/components/QuranSafha.tsx` — `compactMetrics` flag (`usesColorGlyphs || id === QCF_V2_MUSHAF_ID`) → `.fq-mushaf-v2` class + skeleton top-padding gate. The `fontReady` / `document.fonts` mechanism is unchanged — QCF V2 loads through the same non-colour `FontFace` registry path as QCF V1.
- `app/globals.css` — 4 `.fq-tajweed` **sizing** selectors → `.fq-mushaf-v2` (mobile/desktop/spread font-size + `:has()` line-gap); 3 `.theme-* .fq-tajweed` **colour** selectors unchanged
- `messages/en.json`, `messages/ar.json` — `mushafLayout.editions.1.name`, `mushafLayout.activeNeedsDownload`
- `scripts/generate-mushaf-thumbnails.js` — `EDITIONS`; commit `public/mushaf-previews/1.png`

**Plans (stored page numbers stay canonical — ADR 0066)**
- `app/hooks/use-plan-verse-index.ts`, `app/hooks/use-page-verse-bounds.ts` — `DEFAULT_MUSHAF_ID` → `CANONICAL_PAGE_MUSHAF_ID`
- `app/lib/plans/verse-index.ts` — comment only (already hardcodes `verse-pages/2.json`)

**Offline**
- `app/constants/offline.ts` — `PRECACHE_MUSHAF_ID = QCF_V1_MUSHAF_ID`, `OFFLINE_DOWNLOAD_MB` off it
- `app/components/offline/OfflineSetupGate.tsx`, `app/components/offline/OfflineInstallPrompt.tsx` — `usePwaPrecache(PRECACHE_MUSHAF_ID)`
- `app/components/mushaf/MushafLayoutRow.tsx` — "your current layout — download to read offline" hint on the active non-precache row
- `app/sw.ts` — `isPageFont` regex adds `v2`; `readActiveMushafId` fallback → `PRECACHE_MUSHAF_ID`
- `app/hooks/use-recitation-download.ts` — **no change**: follows `DEFAULT_MUSHAF_ID` (per-surah downloads, small; self-consistent — a V2 reader gets V2 pages)
- `PAGES_CACHE_VERSION` — **not bumped**: no cached V1/V19 output changes; bumping would force every installed user to re-download 48 MB (ADR 0014 warns against this)

**e2e**
- `scripts/e2e-fixture/generate.js` — `SEEDED_WORDS_MUSHAF_ID` split; regenerate `e2e/fixtures/quran-fixture.sql` (adds mushaf 1 rows — `next build` in CI E2E renders empty default pages without them)
- `e2e/tests/settings-persistence.spec.ts` — the QCF V1 row locator now disambiguates on the "1405H" year (the new QCF V2 row shares the "مجمع الملك فهد" name prefix)
- No screenshot snapshots exist — the visual e2e suite is behavioral, nothing to re-baseline

**Docs** (already written on this branch)
- `docs/architecture/adr/0066-default-edition-independent-of-canonical-precache-seed.md`
- `docs/architecture/decisions/rendering.md`, `decisions/pwa.md`, `DECISIONS.md`

## Constraints

- No `furqan_quran` schema change. If the implementation seems to need one, stop — the model has regressed (ADR 0033).
- `SEEDED_WORDS_MUSHAF_ID` must equal `verses-words.js`'s `mushaf` param — `verses-words.js` imports the constant so the two cannot drift.
- Never seed mushaf 1's layout from the `layoutFromSeededWords` shortcut — it only holds mushaf 2's placement.
- `code_v2` is unchanged and shared with mushaf 19 (ADR 0023's core finding holds) — do not add a `code_v3` column.
- Non-COLRv1 edition → normal `FontFace` registry path only. Do not route mushaf 1 through `FontFaceInjector`'s keyed-`<style>` / `@font-palette-values` path.
- Do not add `v2/woff2` to `globPublicPatterns` in `next.config.mjs` (ADR 0014 — every visitor would download it ungated). It is reached only by the runtime `CacheFirst` `isPageFont` rule and the consent-gated Settings download.
- `PRECACHE_MUSHAF_ID` and `CANONICAL_PAGE_MUSHAF_ID` stay `2`. Do not point any first-run/offline surface, plan-range resolver, or `Word` mirror at `DEFAULT_MUSHAF_ID`.
- `useMarks` already span-reads (`Mark.page_number` is the canonical mushaf-2 page, carried per-word in the JSON) — no change needed there.
- Verify locally with a production build (`npm run e2e:serve` / `build:local && start`), never `next dev` — Serwist and the offline paths are dev-disabled.

## What NOT to Do

- Do not reseed `Word.page_number` / `Word.line_number` from mushaf 1 — the mirror stays mushaf 2, and no app code reads the line mirror.
- Do not migrate `Mark.page_number` — canonicalization rides on `Word.page_number` in the JSON, not the displayed page (same as tajweed today).
- Do not make QCF V2 the install-time / first-run precached edition — that was explicitly rejected in planning (iOS quota). V2 offline is Settings-opt-in only.
- Do not subset or re-compress the vendored V2 fonts in this PR — accept ~95 MB; subsetting is a separate future task if V2 ever needs to be the precached default.
- Do not split this into multiple PRs — decided as one PR.
- Do not reuse mushaf 19's `pages/19/*.json` or layout rows for mushaf 1 — line grouping genuinely differs (pages 77/342/555).
- Do not add a new `code_v3` glyph column or any `MushafWordLayout` schema field.
- Do not change `MUSHAF_EDITION_IDS` order without checking the Settings list and any thumbnail/preview ordering.

## Decisions Made

- **One PR, one destructive reseed.** (User, planning.)
- **Fonts sourced from the local `quran.com-frontend-next-testing` V2 WOFF2 set** — pre-converted, verified same provenance as our V1 set. No TTF→WOFF2 step needed.
- **QCF V2 is the reader default, but not the offline/precache default.** `PRECACHE_MUSHAF_ID = 2`. New PWA users' mandatory download is unchanged; V2 offline is opt-in. (User, planning — "Default edition V2, precache stays V1".)
- **Add a Settings/gate nudge** for V2 users about the separate offline download. (User, planning.)
- **New ADR (0066)** rather than amending 0033 + 0014. (User, planning.)
- **`Word` mirror + canonical mark edition + `CANONICAL_PAGE_MUSHAF_ID` stay mushaf 2** — marks canonicalize via the per-word `Word.page_number` in the JSON (works today for tajweed's identical divergence); plan page-ranges pin to `CANONICAL_PAGE_MUSHAF_ID` so a saved "page N" keeps its verses.
- **QCF V2 page boundaries ≠ QCF V1** — QCF V2 diverges from V1 on the same 56 verses / 361 words as the tajweed edition (my spike's "0 diffs" was a buggy comparison). Correction folded into ADR 0066 / rendering.md before implementation.
- **Line grouping is mushaf 1's own** (pages 77/342/555 ≈ 50% one-line shift vs tajweed; most pages 0–3%) — mushaf 1 fetches its own layout with `mushaf=1`.
- **QCF V2 = the tajweed glyph family minus colour** (user, 2026-09-08) — so it takes the Tajweed compact font-size treatment (`.fq-mushaf-v2`), not V1's sizing. Measured V2 lines are ~10% wider per em than V1; shipping V2 with `usesColorGlyphs:false` and nothing else clipped every line. The colour-palette CSS stays tajweed-only.
