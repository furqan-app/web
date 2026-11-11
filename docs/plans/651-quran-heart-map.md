---
title: "Quran Heart Memorization Map & Visual Progress Hub"
type: feature
date: 2026-11-04
status: implemented
area: awrad
issue: 651
adr: [0077]
---

# Quran Heart Memorization Map & Visual Progress Hub (#651)

> Visual mockup: `/home/tahamohamed/Downloads/mockups/quran_heart_interactive.html`  
> Architectural Decision Record: [`docs/architecture/adr/0077-quran-heart-memorization-map.md`](../architecture/adr/0077-quran-heart-memorization-map.md)

## Summary

Adds a dedicated top-level route at `/heart` ("قلبي القرآني" / "My Quranic Heart") featuring an interactive 114-surah SVG anatomical manuscript heart map representing memorization progress. Users can view their global memorization health at a glance through the "حالة قلبي" progress card (featuring a compact donut chart and progress bar unified on a 604 physical page denominator), click any surah to open a responsive surah inspector (side-by-side on desktop, bottom sheet on mobile), and paint individual pages with memorization states (`mastered`, `needs_review`, `unmemorized`) with fast optimistic UI or perform rapid single-click bulk updates ("تطبيق على الكل"). Memorization state is stored with surah-page granularity in `furqan_app` via Prisma, and surah status/cell liquid levels are 100% derived at read time, guaranteeing that shared physical pages (e.g. Juz 30) do not cause cross-surah state pollution. The experience features complete English localization parity (`nameSimple`), high-contrast text protection via an SVG halo stroke, and a compact desktop geometry fitting comfortably within a single screen.

## Root Cause / Approach

### 1. Dedicated Route `/heart` & Responsive Workspace Architecture
- **Dedicated Page Route:** Instead of crowding `/plans` with a 4th tab, the Quran Heart Map lives at its own dedicated top-level route at `app/[locale]/heart/page.tsx` ("قلبي القرآني"), accessible from the main navigation and `UserMenu`. This keeps `/plans` strictly focused on daily awrad and learning track management (3 tabs: "أورادي", "التقدّم", "التنبيهات").
- **Desktop Layout (`lg:` breakpoint):** A responsive `max-w-6xl` workspace hosting the page header with standard `.fq-rule-mark` ornaments, side-by-side columns (Heart Map 6 cols + Surah Inspector & "حالة قلبي" retention card 6 cols), and compact padding/gaps so the entire workspace fits within a single 1080p/900p/768p desktop screen without vertical scrolling.
- **Mobile Experience (`< lg`):** The heart map occupies full width (maintaining aspect ratio 576:728). Selecting any surah opens the inspector in a responsive bottom sheet (`SheetContent`) engineered with `min-h-[48dvh]` and `pb-12 sm:pb-16` bottom clearance, ensuring single-page surahs do not stick to the floor or overlap with mobile navigation gesture bars. Header controls and toolbar are sticky (`sticky top-0 bg-background/95 backdrop-blur-sm z-10`), and `variant="embedded"` strips redundant card borders and shadows ("card in a sheet").
- **Guest / Unauthenticated Support:** Unauthenticated visitors see a standard sign-in prompt (`PlansSignedOutPrompt` with `descriptionKey="heart.signedOut"`), consistent with `/marks` and `/plans`.

### 2. Manuscript Vector Heart Map Aesthetics & Typographic Geometry
- **Clean Vector SVG Overlay:** Built upon a crisp standalone vector SVG (`viewBox="0 144 576 728"`), floating directly on the application surface without outer bounding boxes, harsh black frames, or floral illustrations.
- **Sequential Mushaf Ordering (1 to 114):** All 114 polygon cells flow top to bottom (cy 175 to 846), ordered right-to-left within each tier. Surah 1 (Al-Fatiha) starts at the top, down to Surah 114 (An-Nas) at the bottom apex.
- **Complete Surah Visibility (114/114):** All 114 surahs are rendered with readable typography (minimum font size clamped to 8.5px in Arabic, 6.2px in English), eliminating hidden surahs.
- **Symbolic Color Palette:**
  - **Mastered (`متقنة`):** Living Quranic emerald green (`#10b981` / `#047857`) — conveying mastery and vitality.
  - **Needs Review (`تحتاج تعاهداً`):** Warm golden yellow/amber (`#facc15` / `#ca8a04`) — symbolizing warmth that requires nurturing and revision.
  - **Partial (`حفظ جزئي`):** Multi-state upward liquid gradient fill stacking mastered green at the bottom and needs-review amber in the middle, clipped to the exact memorization percentage.
  - **Unmemorized (`غير محفوظة`):** Theme-compatible surface (`hsl(var(--card))` in light; `#1E2530` in dark with visible neutral stroke `dark:stroke-slate-700/60`), maintaining a crisp, recognizable anatomical heart silhouette across all themes.
- **Partial Surah Contrast Protection:** Partial surahs use `textColor = "hsl(var(--foreground))"` with an SVG `paintOrder="stroke fill"` halo stroke (`stroke="hsl(var(--card))"`, `strokeWidth=2.2`, `strokeLinejoin="round"`), guaranteeing 100% legibility whether text lands on green, gold, or the light unmemorized background in light and dark modes.
- **High-Contrast Selection Ring:** Active surah selection uses a distinct dual-ring / white outline that never collides with yellow needs-review cells.
- **English Surah Names Parity:** Uses `nameSimple` from `app/constants/surah-page-bounds.ts` for English locales, with responsive font scaling and `font-sans` typography fitting neatly within cell bounds.

### 3. Data Model & Surah-Page Independence (ADR 0077)
- Stored in `furqan_app` (`prisma/app/schema.prisma`):
```prisma
model UserSurahPageMemorization {
  id           Int      @id @default(autoincrement())
  user_id      Int
  chapter_id   Int
  page_number  Int
  status       String   // "mastered" | "needs_review"
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  @@unique([user_id, chapter_id, page_number])
  @@index([user_id, chapter_id])
  @@map("user_surah_page_memorizations")
}
```
- **Surah-Page Independence:** Records are strictly scoped to `(chapter_id, page_number)`. Marking page 604 in Al-Ikhlas (surah 112) creates a row with `chapter_id = 112`, leaving Al-Falaq (113) and An-Nas (114) unaffected even though they share the same physical page.
- **Zero Redundant Surah-Level Column:** Surah status and liquid fill percentages are 100% derived from the page records at read time. No separate `surah_status` column exists, eliminating state divergence.
- **Preserves Two-DB Split (ADR 0008):** `chapter_id` and `page_number` are stored as scalar integers with no foreign keys to `furqan_quran`.

### 4. Interactive Surah Inspector & Micro-Mushaf
- **Header & Live Retention Breakdown:** Displays surah name (`bounds.nameArabic` or `bounds.nameSimple`), surah number badge (`min-w-7.5 h-7.5 rounded-full`), revelation place, total pages, and live retention breakdown (e.g. `X متقنة · Y تحتاج تعاهداً`).
- **Unified Horizontal Toolbar:** Tool selectors (`متقنة`, `تحتاج تعاهداً`, `غير محفوظة`) with `size-9` buttons and active glowing rings, placed directly beside a single "تطبيق على الكل" ("Apply to all") bulk action button.
- **Micro-Mushaf:** Compact circular page buttons (`size-7.5 sm:size-8 rounded-full`) with centered Tajawal bold numerals, displaying 12–14 pages per row and enabling rapid optimistic UI page painting without network blocking.
- **Navigation Shortcut:** "اقرأ في المصحف" button linking to `/pages/<startPage>`.

### 5. Truthful Progress Metrics ("حالة قلبي")
- **Unified 604 Physical Page Denominator:** The compact donut chart and progress bar in the "حالة قلبي" card use a single truthful denominator of **604 physical pages**.
- **Mutual Exclusivity in Aggregate Stats:** Shared physical pages with mixed statuses across chapters are reconciled deterministically (`needs_review` takes precedence so `masteredPages + needsReviewPages === totalPagesMemorized`).
- **Blue Partial Arc Eliminated:** The donut chart renders solely emerald mastered and golden needs-review arcs matching physical page coverage; the blue arc and legend swatch are eliminated since the heart map uses green-to-gold gradients.

## Decision Tree / Algorithm

See [`docs/architecture/adr/0077-quran-heart-memorization-map.md`](../architecture/adr/0077-quran-heart-memorization-map.md).

### Surah State & Liquid Fill Derivation Algorithm
Given `chapter_id`, retrieve its total canonical pages `[P_1, P_2, ... P_n]` from `public/quran/chapters.json`.
From the user's `UserSurahPageMemorization` records for `chapter_id`:
- `masteredCount` = count of pages with `status === "mastered"`.
- `needsReviewCount` = count of pages with `status === "needs_review"`.
- `memorizedCount` = `masteredCount + needsReviewCount`.
- `totalPages` = `n`.

1. **If `memorizedCount === 0`:**
   - Surah status: `unmemorized`.
   - Fill style: Neutral card surface (`hsl(var(--card))`).
2. **If `masteredCount === totalPages`:**
   - Surah status: `mastered`.
   - Fill style: 100% solid Quranic emerald green (`#10b981`).
3. **If `needsReviewCount === totalPages`:**
   - Surah status: `needs_review`.
   - Fill style: 100% solid warm golden amber (`#facc15`).
4. **If `memorizedCount > 0` and `memorizedCount < totalPages` (or mixed retention):**
   - Surah status: `partial`.
   - Fill style: Upward multi-state liquid gradient stacking emerald green (mastered portion) and golden amber (needs-review portion) clipped to `(memorizedCount / totalPages) * 100`.
   - Text label style: `hsl(var(--foreground))` with SVG halo stroke `paintOrder="stroke fill"` (`stroke="hsl(var(--card))"`, `strokeWidth=2.2`).

## Verified Test Cases

### Case 1: Surah Al-Ikhlas (1 page, shared physical page 604)
- **Input:** User selects Surah 112 (Al-Ikhlas), taps "متقنة" on page 604.
- **Output:** Row `(user_id, 112, 604, "mastered")` created. Al-Ikhlas derives as `mastered` (100% emerald green). Al-Falaq (113) and An-Nas (114) have 0 records and remain `unmemorized` (neutral card).

### Case 2: Surah Al-Baqarah (48 pages, pages 2–49)
- **Input:** User marks 24 pages as `mastered`, 0 as `needs_review`, and leaves 24 pages unselected.
- **Output:** Surah status derives as `partial`. `memorizedCount` = 24 / 48 (50%). Cell renders upward liquid emerald fill at 50% height with halo-protected text label.

### Case 3: Surah Maryam (8 pages, pages 305–312)
- **Input:** User marks 6 pages as `mastered` and 2 pages as `needs_review`.
- **Output:** `memorizedCount` = 8 / 8 (100%). Surah derives as `partial` (mixed retention: 75% mastered, 25% needs review). Cell renders 2-color stacked gradient (green 75%, amber 25%). Inspector shows breakdown "٦ متقنة · ٢ تحتاج تعاهداً".

### Case 4: Bulk Action "تطبيق على الكل" on Surah Ya-Sin (6 pages)
- **Input:** Active tool is `mastered`, user clicks "تطبيق على الكل".
- **Output:** Batch API updates all 6 pages (440–445) to `mastered` in a single transaction. Surah immediately turns solid emerald green.

### Case 5: Bulk Action with Eraser on Surah Ya-Sin
- **Input:** Active tool is `unmemorized`, user clicks "تطبيق على الكل".
- **Output:** Batch API deletes all records for `chapter_id = 36`. Surah immediately returns to unmemorized card surface.

### Case 6: Shared Physical Page 604 Aggregate Stats
- **Input:** Al-Ikhlas page 604 is `mastered`, Al-Falaq page 604 is `needs_review`.
- **Output:** `deriveGlobalMemorizationStats` reconciles page 604 with mutual exclusivity (`needs_review` precedence); physical page 604 counts as 1 needs_review page in global physical page count (not 2).

### Case 7: English Localization Parity (`/en/heart`)
- **Input:** User navigates to `/en/heart`.
- **Output:** Renders "My Quranic Heart", English surah names (`nameSimple`) in SVG cells and inspector header, LTR layout, and localized stat percentages.

## UI/UX & Accessibility Concerns

- **Contrast & Theme Support:** Emerald green (`#10b981`), golden amber (`#facc15`), and card surfaces ensure WCAG AA contrast against text labels. For partial surahs, `paintOrder="stroke fill"` halo stroke prevents text from vanishing against light backgrounds in both light and dark themes.
- **Touch Targets:** Micro-mushaf page circles and tool buttons maintain 40–44px minimum hit targets on touch devices.
- **RTL / LTR Parity:** Arabic is RTL default; English renders cleanly in LTR with brand sans typography for headers and Latin transliterations.
- **Reduced Motion:** Interactive liquid pulse animations on heart cells respect `prefers-reduced-motion: reduce` by disabling SVG wave oscillations.
- **Mobile Sheet Geometry:** `min-h-[48dvh]` with `pb-12 sm:pb-16` bottom clearance, `sticky top-0` header and toolbar, grab handle, and `fq-scroll-nice`.
- **One-Screen Desktop Fit:** Tightened page padding, container gaps, and compact micro-mushaf page circles (`size-7.5 sm:size-8`) ensure the full hub fits without vertical scrolling on desktop screens.

## Files to Change

### 1. Database & Schema
- `prisma/app/schema.prisma` — Add `UserSurahPageMemorization` model with `(user_id, chapter_id, page_number)` unique constraint and `(user_id, chapter_id)` index.
- `prisma/app/migrations/20261103225659_add_user_surah_page_memorizations/` — Schema migration for `furqan_app`.

### 2. Assets & Data Constants
- `public/images/plans/heart-bg.png` — High-resolution anatomical manuscript heart background.
- `app/constants/quran-heart-data.ts` — Contains 114 surah SVG polygons, centroid coordinates, and `nameSimple` display metadata ordered sequentially 1 to 114.
- `app/constants/surah-page-bounds.ts` — Enriched with `nameSimple` for all 114 surahs.
- `app/lib/plans/memorization-derivation.ts` — Pure derivation functions for surah status, liquid fill percentages, and 604-page summary metrics. Backed by unit tests.

### 3. API Routes & Service Worker
- `app/api/plans/memorization/route.ts` — `GET` caller's memorization map. Protected by session auth.
- `app/api/plans/memorization/batch/route.ts` — `POST` batch page updates/deletions within a single `appPrisma.$transaction`.
- `app/sw.ts` — Add `isMemorizationApi` matcher under `NetworkOnly` to prevent stale caching.

### 4. UI Components
- `app/[locale]/heart/page.tsx` — Dedicated route entry point with responsive header and layout.
- `app/components/plans/QuranHeartMapTab.tsx` — Dedicated view container uniting Heart Map, "حالة قلبي" stats card, and responsive inspector sheet.
- `app/components/plans/QuranHeartMap.tsx` — Interactive SVG vector heart map rendering 114 surah polygon paths, multi-state liquid gradients, text halo contrast, and keyboard accessibility (`fq-focus-ring`).
- `app/components/plans/SurahInspector.tsx` — Responsive surah inspector with live retention breakdown, active tool selector, and bulk action button.
- `app/components/plans/MicroMushafGrid.tsx` — Responsive micro-mushaf grid with compact circular page buttons and optimistic painting.
- `app/components/nav/UserMenu.tsx` — Add "قلبي القرآني" navigation link with `<Heart className="size-4" />`.

### 5. Translations & i18n
- `messages/ar.json` & `messages/en.json` — Add translation keys under `heart.*` and `plans.heart.*`.

## Constraints

- **ADR 0008 (Two-DB Split):** `furqan_app` stores scalar `chapter_id` and `page_number` only. Never add cross-DB foreign keys or relations to `furqan_quran`.
- **ADR 0077 (Pure Derivation):** Surah status and liquid fill percentages are derived at read time from page records. Never store a duplicate `surah_status` column.
- **Vector SVG Presentation:** Clean floating vector heart silhouette directly on the application surface without outer floral clutter.
- **604 Physical Page Denominator:** Global progress metrics use physical page count as single source of truth.
- **Online-First in v1:** Direct DB writes via `POST /api/plans/memorization/batch`. Offline queueing deferred to future plans offline work.

## What NOT to Do

- Do NOT store a global physical page table (`page_number` 1–604 only) without `chapter_id` scoping — this pollutes neighboring surahs sharing a page (e.g. Juz 30).
- Do NOT persist surah status separately from page records — causes state divergence.
- Do NOT include vector toggle or outer floral illustrations from the raw mockup.
- Do NOT implement automated wird generation in this task (reserved for #652).
- Do NOT allow `defaultCache` in Service Worker to cache `/api/plans/memorization`.
- Do NOT add confirmation dialogs or undo friction to the bulk 'Apply to all' action (user confirmed fast single-click action is desired).
- Do NOT disable or alter the toggle-to-erase behavior when clicking an already-matching page button.
- Do NOT use blue arc or blue color for partial surahs (use green-to-gold vertical gradients).
- Do NOT set plain `#ffffff` text on partial surah cells without a protective contrast halo.
- Do NOT nest the feature as a 4th tab inside `/plans` (superseded by dedicated `/heart` route).

## Decisions Made

- Adopted ADR 0077: Surah-scoped page records with pure read-time derivation.
- Replaced 4th `/plans` tab with dedicated route `/heart` ("قلبي القرآني").
- Replaced ruby crimson palette with living Quranic emerald green (`#10b981` / `#047857`) and warm golden amber (`#facc15` / `#ca8a04`).
- Unified global retention stats denominator to 604 physical pages.
- Sequential Mushaf ordering (1 to 114) flowing top to bottom, right to left.
- Complete 114/114 surah visibility with clamped readable fonts.
- Partial surah label contrast protection via SVG `paintOrder="stroke fill"` halo stroke.
- Compact viewport geometry and mobile sheet `min-h-[48dvh]` with `pb-12` clearance.
- English surah names parity via `nameSimple` across inspector and SVG map.

## Revision History

- **2026-11-11**: Folded all implementation addenda into main body. **4th tab on `/plans` superseded by dedicated `/heart` route** ("قلبي القرآني"); **ruby crimson palette superseded by living Quranic emerald green**; **blue partial arc and mixed metrics superseded by unified 604 physical page progress denominator**; added sequential 1–114 ordering, complete 114 surah visibility, partial surah contrast halo stroke, mobile bottom sheet `min-h-[48dvh]` / `pb-12` clearance, and English surah names parity.
