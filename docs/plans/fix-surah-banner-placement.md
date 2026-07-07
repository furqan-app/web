# Fix: Surah Banner Placement and Standalone Line Sizing

**Type:** bug  
**Date:** 2026-07-07  
**Status:** PARTIAL — equal-height spread (Addendum 2) + inter-line gap (Addendum 3) shipped; **banner placement + frame REVERTED and deferred** (Trello #72). See Addendum 2 → "Revert" and Addendum 3 below.  
**Trello:** https://trello.com/c/sRC6NhMS/72-surah-name-banners-render-at-end-of-page-madani-layout

## Summary

Two bugs, shipped together because Bug 2's fix is a prerequisite for Bug 1's correctness (Opus agent review confirmed).

**Bug 1:** The madani mushaf places surah name banners at specific page-level positions — never inline mid-text. The app currently renders glyph + bismillah together as an inline block at the first word of verse 1 (`QuranLine.tsx:21`), causing wrong positioning and unequal page heights in the double-page spread.

**Bug 2:** The glyph and bismillah are crammed into a single `--fq-heading-h` block using `0.371`/`0.629` fractions. After Bug 1's fix, each becomes a standalone 1-slot line and must be sized with `1em` — the only sizing token that tracks correctly across mobile, single, and double-page view modes.

## Root Cause

`QuranLine` renders the surah header inline using `shouldRenderSurahHeader = verseNumber === 1 && wordNumber === 1`. There is no page-level awareness of whether a surah starts at slot 1 or whether a page ends with space for a next-surah banner.

## Approach: Algorithmic Derivation from Existing Data

Banner positions are fully derivable from the `lines` prop already available in `QuranSafha` — no DB schema changes, no user-provided data, no seeder changes needed.

### Three Cases

| Case | Condition | What to render |
|------|-----------|----------------|
| **End banner** | Last word on page ends a surah (`lastVerseNum === chapter.verses_count`) AND `wordLineCount < 15` | Append next surah's glyph banner as last slot inside `.fq-quran-safha` |
| **Start banner** | First word on page is `X:1:1` AND `wordLineCount + headerSlots === 15` (where `headerSlots` = 2 with bismillah, 1 without) | Render glyph (slot 1) + bismillah if applicable (slot 2) before word lines; suppress inline header in QuranLine for surah X |
| **Bismillah only** | First word on page is `X:1:1` AND `wordLineCount === 15` when counting only the bismillah slot (i.e. `wordLineCount + 1 === 15` and surah has bismillah) | Render bismillah only (slot 1) before word lines; suppress inline header in QuranLine for surah X |
| **Both** | Start banner AND last word ends a different surah with `wordLineCount < 15` | Start banner at top + end banner at bottom simultaneously (e.g. page 586: At-Takwir starts, Al-Infitar banner ends) |

Mid-page surah starts (none of the above conditions match) keep the existing inline rendering.

### Derivation Logic (inside `QuranSafha`)

```ts
const lineKeys = Object.keys(lines).sort((a, b) => Number(a) - Number(b));
const wordLineCount = lineKeys.length;

// --- Start / bismillah-only detection ---
const firstWord = lines[lineKeys[0]]?.[0];
const firstLocParts = firstWord?.location.split(":");
const firstIsVerseOneWordOne = firstLocParts?.[1] === "1" && firstLocParts?.[2] === "1";
const startSurahId = firstIsVerseOneWordOne ? Number(firstLocParts![0]) : null;

const hasBismillah = startSurahId != null &&
  !CHAPTERS_WITHOUT_BISMILLAH.includes(`${startSurahId}`);
const headerSlots = startSurahId != null ? (hasBismillah ? 2 : 1) : 0;

// start_banner: first word is verse-1-word-1 AND word lines + header slots = 15
const isStartBanner = startSurahId != null && wordLineCount + headerSlots === 15;
// bismillah_only: first word is verse-1-word-1 AND word lines alone = 15
// (glyph was on the previous page's end banner) — only if surah has a bismillah
const isBismillahOnly = startSurahId != null && !isStartBanner &&
  hasBismillah && wordLineCount + 1 === 15;

// --- End banner detection ---
const lastLineWords = lines[lineKeys[lineKeys.length - 1]];
const lastWord = lastLineWords?.[lastLineWords.length - 1];
const lastVerseKeyParts = lastWord?.verse_key.split(":");
const lastVerseNum = lastVerseKeyParts ? Number(lastVerseKeyParts[1]) : null;
const endingSurahVersesCount = lastWord?.verse.chapter.verses_count ?? null;
const endingSurahId = lastVerseKeyParts ? Number(lastVerseKeyParts[0]) : null;

// Account for slots already used by start header when checking room for end banner
const slotsUsed = wordLineCount + (isStartBanner ? headerSlots : isBismillahOnly ? 1 : 0);
const isEndBanner = lastVerseNum === endingSurahVersesCount &&
  endingSurahId !== null && endingSurahId < 114 &&
  slotsUsed < 15;

const endBannerSurahId = isEndBanner ? endingSurahId! + 1 : null;
```

### Rendering (inside `.fq-quran-safha`)

All banner elements must be **direct children of `.fq-quran-safha`** (the flex container) so mobile `space-between` counts them as real slots.

```tsx
{/* Start banner: glyph ± bismillah before word lines */}
{isStartBanner && <SurahBannerLine surahId={startSurahId!} />}
{(isStartBanner || isBismillahOnly) && hasBismillah && <BismillahLine />}

{/* Word lines — suppress inline header for surah handled above */}
{lineKeys.map((line) => (
  <QuranLine
    key={line}
    words={lines[line]}
    marks={marks ?? {}}
    onWordClicked={wordClicked}
    suppressInlineHeaderForSurahId={
      isStartBanner || isBismillahOnly ? startSurahId! : undefined
    }
  />
))}

{/* End banner: next surah's glyph after word lines */}
{isEndBanner && <SurahBannerLine surahId={endBannerSurahId!} />}
```

### Standalone line helpers (local to `QuranSafha`)

```tsx
// 1em sizes against .fq-quran-safha's font-size — correct in all three layout
// modes (mobile --fq-mobile-font, single vh, double-view min() cap).
// Never use --fq-word-base (single-view only) or --fq-heading-h fractions (2-slot block).
const SurahBannerLine = ({ surahId }: { surahId: number }) => (
  <div className="text-center text-black dark:text-white"
    style={{ marginBottom: "var(--fq-line-gap)" }}>
    <span translate="no"
      style={{ fontFamily: "var(--surah-names)", fontSize: "1em", lineHeight: 1 }}>
      {`${surahId}`.padStart(3, "0")}
    </span>
  </div>
);

const BismillahLine = () => (
  <div className="flex justify-center text-black dark:text-white"
    style={{ marginBottom: "var(--fq-line-gap)" }}>
    <BismillahSVG style={{ height: "1em", width: "auto" }} />
  </div>
);
```

## Files to Change

- `app/components/QuranSafha.tsx` — add `BismillahSVG` + `CHAPTERS_WITHOUT_BISMILLAH` imports; add `SurahBannerLine` and `BismillahLine` helpers; compute banner positions from `lines`; render banner slots inside `.fq-quran-safha`; pass `suppressInlineHeaderForSurahId` to `QuranLine`
- `app/components/QuranLine.tsx` — add `suppressInlineHeaderForSurahId?: number` prop; when set and matches the line's surah, skip the inline heading block

**No changes to:** Prisma schema, DB, seeder, `getPageWords`, `app/types/prisma.ts`, `PageMetadata`.

## Constraints

- Banner elements must be direct children of `.fq-quran-safha`, not the header or footer band.
- Use `1em` for standalone banner/bismillah heights. Never `var(--fq-word-base)` (single-view literal, wrong in double-view) or `--fq-heading-h` fractions (sized for the 2-slot combined block).
- The existing inline 2-slot heading block in `QuranLine` is kept intact for mid-page surahs (`suppressInlineHeaderForSurahId` not set or non-matching).
- Surahs 1 and 9 are in `CHAPTERS_WITHOUT_BISMILLAH` — skip `BismillahLine` for them.
- `endBannerSurahId = endingSurahId + 1` is correct because mushaf chapter order is sequential (1–114) and surah 114 is the last (guarded by `endingSurahId < 114`).
- The `wordLineCount` used for the end-banner room check must account for any slots already consumed by the start header.
- `lineKeys` must be sorted numerically before use — `Object.keys()` on a record does not guarantee order.

## Decisions Made

- Algorithmic derivation over pre-seeded data: banner positions are fully computable from the `lines` prop (word locations + verse chapter data already fetched by `getPageWords`). No DB fields, no user-provided lists, no seeder involvement.
- `1em` for standalone line height (Opus agent review): inherits `.fq-quran-safha`'s effective font-size across all three layout modes. `--fq-word-base` does not track the double-view cap.
- Computation runs in `QuranSafha` (client component): acceptable since the data is already available there and the logic is O(15 line groups).

## What NOT to Do

- Do not add DB fields to `PageMetadata` for banner positions (original approach, reverted).
- Do not render banner elements outside `.fq-quran-safha`.
- Do not use `var(--fq-word-base)` or `--fq-heading-h` fractions for standalone line heights.
- Do not resize the existing inline 2-slot heading block — it is still needed for mid-page surahs.

## Reference

- ADR 0016: `docs/architecture/adr/0016-surah-banner-position-denormalized-fields.md` (superseded by this approach — can be archived or deleted)
- Trello #72: https://trello.com/c/sRC6NhMS

---

## Addendum 1 — Equal-height spread, banner frame, and line-height fix (2026-07-07)

### Three follow-on issues found after implementation

**Bug A — `SurahBannerLine` outer div takes 1.5em instead of 1em:**
The outer `<div>` in `SurahBannerLine` inherits Tailwind's body `line-height: 1.5`. Only the inner `<span>` has `lineHeight: 1`. The CSS strut mechanism makes the div's height = max(1.5em strut, 1em span line-box) = **1.5em**. Meanwhile `QuranWord`'s outer div has `leading-none` (line-height: 1), so word rows are exactly **1em**. Fix: add `leading-none` (or `style={{ lineHeight: 1 }}`) to the outer div of `SurahBannerLine`. Same fix applies to `BismillahLine` as a precaution.

**Feature B — Decorative frame around the surah name glyph:**
Add a simple rectangular border frame around the surah name. To leave room for inner padding, shrink the glyph to ~0.8em so glyph + padding fits within the 1em slot. Use themed border color (`border-border` or a warm gold for the gold theme) so it adapts to light/dark/gold. No corner ornaments — just a clean border for now.

**Root fix C — Equal-height spread via fill-parent (preferred approach):**
Instead of fighting individual slot heights, make both QuranSafha cards fill the same fixed parent height on desktop. Since `.fq-spread` already has `items-stretch`, both wrapper divs are already the same height — but `md:h-auto` on the card chain collapses them to content height. The fix is to propagate `h-full` through the chain AND give the spread a concrete external height.

### Height chain for desktop spread

```
ReaderPage background div
  min-h-[calc(100dvh-3.5rem)] → add md:h-[calc(100dvh-3.5rem)] (fixed, not just min)
  flex-col → items already in place

Row div (below QuranSafhaViewToggle)
  add md:flex-1 md:min-h-0  → takes all remaining height in the flex column

QuranSpread root div
  add md:h-full md:items-stretch  → fills the row div

.fq-spread div
  add md:h-full  → fills the spread root (items-stretch already there)

Page wrapper divs (inside .fq-spread)
  add md:h-full  → both get the same height from items-stretch

fq-full-safha (QuranSafha.tsx outermost div)
  add md:h-full

Relative wrapper div (currently h-[calc(100dvh-5.5rem)] md:h-auto)
  md:h-auto → md:h-full

Card div (currently h-full md:h-auto)
  md:h-auto → md:h-full

fq-content div (currently flex flex-col h-full md:block md:h-auto)
  remove md:block md:h-auto → flex flex-col h-full applies on all breakpoints

fq-quran-safha div
  add md:flex-1 md:min-h-0 → fills space between header and footer
  extend mobile flex+space-between to desktop (spread-scoped CSS)
```

### CSS changes (globals.css) — new @media (min-width: 768px) block

```css
/* Desktop spread: distribute lines via space-between, same as mobile.
   Scoped to .fq-spread so standalone QuranSafha (VerticalQuranPages) is unaffected. */
@media (min-width: 768px) {
  .fq-spread .fq-quran-safha {
    flex: 1 1 0%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    padding-block: 0.5em;
  }
  .fq-spread .fq-quran-safha > * {
    margin-bottom: 0 !important;
  }
  .fq-spread .fq-quran-safha > .fq-safha-row {
    flex-wrap: nowrap;
  }
  .fq-spread .fq-quran-safha > .fq-safha-row > div {
    flex-shrink: 0;
    white-space: nowrap;
  }
}
```

These rules mirror the mobile `@media (max-width: 767px)` block identically, scoped to `.fq-spread`. The existing double-view `@media (min-width: 1024px)` rules (`font-size: min(...)`, `--fq-line-gap: min(...)`) still apply on top and remain correct.

### SurahBannerLine (updated, includes Bug A fix + Feature B frame)

```tsx
const SurahBannerLine = ({ surahId }: { surahId: number }) => (
  <div
    className="leading-none text-center text-black dark:text-white"
    style={{ marginBottom: "var(--fq-line-gap)" }}
  >
    <span
      translate="no"
      className="inline-block border border-border px-[0.3em] py-[0.05em]"
      style={{ fontFamily: "var(--surah-names)", fontSize: "0.8em", lineHeight: 1 }}
    >
      {`${surahId}`.padStart(3, "0")}
    </span>
  </div>
);
```

`leading-none` on the outer div fixes Bug A. `border border-border` provides the frame using the theme's border token. `fontSize: "0.8em"` + `px-[0.3em] py-[0.05em]` keeps the total slot at ≤ 1em.

### BismillahLine (precautionary fix)

```tsx
const BismillahLine = () => (
  <div
    className="leading-none flex justify-center text-black dark:text-white"
    style={{ marginBottom: "var(--fq-line-gap)" }}
  >
    <BismillahSVG style={{ height: "1em", width: "auto" }} />
  </div>
);
```

### Files to change (this addendum)

| File | Change |
|------|--------|
| `app/components/QuranSafha.tsx` | `SurahBannerLine`: add `leading-none`, shrink glyph to 0.8em, add border frame. `BismillahLine`: add `leading-none`. Height chain: `fq-full-safha` → `md:h-full`; relative wrapper → `md:h-full`; card → `md:h-full`; `fq-content` → remove `md:block md:h-auto`. |
| `app/components/reader/QuranSpread.tsx` | Spread root div: add `md:h-full md:items-stretch`. `.fq-spread` div: add `md:h-full`. Both page wrapper divs: add `md:h-full`. |
| `app/components/reader/ReaderPage.tsx` | Background div: add `md:h-[calc(100dvh-3.5rem)]`. Row div (below toggle): add `md:flex-1 md:min-h-0`. |
| `app/globals.css` | New `@media (min-width: 768px)` block with `.fq-spread .fq-quran-safha` flex+space-between rules. |

### Constraints

- Scope all new `md:` CSS rules to `.fq-spread` — do not touch standalone `QuranSafha` (VerticalQuranPages).
- The existing double-view `@media (min-width: 1024px)` block must not be removed or reordered — it applies on top of the new `md:` block and is still correct.
- `--fq-line-gap` is still used for header `marginBottom` and footer `marginTop` — do not remove the variable or the header/footer margin styles.
- `SurahBannerLine` glyph must stay at a size where it visually reads as a surah name, not too small. 0.8em at typical desktop font sizes (3–4vh ≈ 20–30px) → glyph renders at ~16–24px, which is readable.
- `BismillahLine` SVG stays at `height: "1em"` — just add `leading-none` to the wrapper div.
- Do not add `h-full` to `fq-full-safha` on mobile — mobile already has its own height via the card chain's `h-[calc(100dvh-5.5rem)]`.

### What NOT to do

- Do not try to fix the equal-height problem by pixel-correcting individual slot heights — the fill-parent approach is the correct architectural fix.
- Do not give `.fq-spread` a hardcoded pixel height — derive from the viewport via the background div's fixed height.
- Do not apply `space-between` to `.fq-quran-safha` globally (outside `.fq-spread`) — this would break the VerticalQuranPages standalone layout.

### Implementation notes (added during /start-fq-task)

- Added one rule beyond the plan's CSS block: `.fq-spread .fq-quran-safha.fq-safha-center { justify-content: center; gap: 0.55em; }` — mirrors the existing mobile rule so short opening pages (1–2, e.g. Al-Fatiha) center their few lines with a modest gap instead of stretching edge-to-edge in the now-full-height card.
- QuranSpread `md:h-full` was added to the root, the `.fq-spread` row, and both page-wrapper divs; the root also gets `md:items-stretch` so the nav arrows and spread fill the height (chevrons stay centered via each arrow's own `items-center`).
- Verified with Playwright at 1440×900, double view: pages 75/76, 77/78, and 1/2 all render both cards at identical height (758px), the banner frame renders in both start-banner (page 2 top) and end-banner (page 76 / page 1 bottom) positions, in both light and dark themes. Standalone vertical reader unaffected (all new CSS scoped to `.fq-spread`; shared `h-full` classes resolve to `auto` under the auto-height Virtuoso item).

---

## Addendum 2 — Correct the equal-height approach (content-driven, not viewport-pinned) (2026-07-07)

User feedback on Addendum 1's implementation flagged three problems. Two are the same root cause; the third is deferred.

### Bug A (was #1) — Fixed viewport height doesn't adapt to font size

Addendum 1 pinned the spread parent to a hard `md:h-[calc(100dvh-3.5rem)]` and forced every page to fill it. That's viewport-derived, not content-derived, so when the reading font changes (`quranFontScale`) the card stays viewport-tall while its content grows/shrinks — mismatch.

**Correct model (user's):** the two pages already share one flex parent with `items-stretch` (on the `.fq-spread` row). If we simply *don't* pin a viewport height and let the row size to its **taller** child, `items-stretch` stretches the shorter page to match — equal height, adaptive to any font size. All the machinery from Addendum 1 (the `h-full` propagation chain from `fq-full-safha` down, and the `@media (min-width: 768px)` `.fq-spread .fq-quran-safha` flex+`space-between` block) is exactly what's needed to make the shorter card *fill* the stretched height and distribute its lines. Only the viewport pin was wrong.

### Bug B (was #3) — Opening pages (1–2) forced to full viewport height

Same root cause: the viewport pin stretched the short Al-Fatiha / start-of-Baqarah pages to full screen height, leaving a tall, narrow strip. Removing the pin makes them size to their (short) content; `.fq-safha-center` continues to center their few lines. (Their narrow width is inherent to Al-Fatiha's short centered lines — out of scope here.)

### The fix — remove exactly the viewport pin

`app/components/reader/ReaderPage.tsx` only:
- Background div: remove `md:h-[calc(100dvh-3.5rem)]` (keep `min-h-[calc(100dvh-3.5rem)]` so short spreads stay vertically centered via `md:justify-center`, and tall spreads can still grow/scroll).
- Row div (below the toggle): remove `md:flex-1 md:min-h-0` (these forced the row to fill the now-removed fixed height).

Everything else from Addendum 1 stays: `items-stretch` (the equalizer, on `.fq-spread`), the `h-full` chain (`fq-full-safha` → relative wrapper → card → `fq-content`), and the `@media (min-width: 768px)` CSS block. With the pin gone, `.fq-spread`'s height becomes content-driven (= the taller child), `items-stretch` gives the shorter wrapper a definite stretched height, the `h-full` chain resolves against it, and `flex:1` + `space-between` fills and distributes. The QuranSpread `md:h-full` / `md:items-stretch` classes become harmless no-ops against the now-auto-height ancestors (left in place; the real equalizer is `.fq-spread`'s own `items-stretch`).

### Revert (2026-07-07) — the broken banner/frame code was removed, not just documented

Deferring #2 meant the broken start/end banner logic was still rendering wrong banners. Per user direction it was **removed**, falling back to the original inline surah-name rendering:
- `app/components/QuranSafha.tsx` — deleted the `SurahBannerLine` / `BismillahLine` helpers, the entire banner-position derivation (`isStartBanner` / `isEndBanner` / `isBismillahOnly` and supporting vars), the banner-slot JSX, and the now-unused `BismillahSVG` / `CHAPTERS_WITHOUT_BISMILLAH` imports. Kept the sorted `lineKeys`.
- `app/components/QuranLine.tsx` — removed the `suppressInlineHeaderForSurahId` prop and `isBannerHandled`; `shouldRenderSurahHeader` alone drives the inline header again (glyph + bismillah, **no frame** — user chose "drop frame for now").

Net effect: surah names render inline where each surah starts (always positionally correct), no frames, no phantom end-banners. The equal-height spread (Addendum 2) is unaffected — verified pages 1/2 equal at 474/474 and 75/76 full-height with no leftover banner. Addendum 1's frame (Feature B) and banner line-height (Bug A) are moot now (the banner components they targeted are gone). ADR 0016 stays superseded.

### Deferred (was #2) — Banner placement is derived from a wrong assumption

Documented on Trello #72 for a later dedicated pass. Summary of the investigation:
- Current placement logic (`wordLineCount + headerSlots === 15`, `slotsUsed < 15`) does arithmetic on the *count* of word-lines and assumes every page is exactly 15 lines with at most one surah start (checked only at the page's first word). It structurally cannot represent a surah starting **mid-page**, or **multiple** surahs on one page (start + middle + end).
- Key finding: every `Word` already carries its true `line_number` (1–15) in the DB (`prisma/quran/schema.prisma`), and `getPageWords` groups by it. The **gaps** between occupied line numbers are exactly where the surah-name / bismillah lines sit — including mid-page. So position-accurate placement is derivable from data already fetched, with no schema change. There is no `line_type` field (the never-ingested gap from Trello #72).
- Two options for the later pass: (a) derive banner positions from `line_number` gaps (no new data, this repo only); (b) ingest the canonical 15-lines-per-page layout (`line_type: ayah|surah_name|bismillah`) via scraper + DB + seeder and render straight from it (bulletproof, cross-repo).

### Files to change (this addendum)

| File | Change |
|------|--------|
| `app/components/reader/ReaderPage.tsx` | Background div: remove `md:h-[calc(100dvh-3.5rem)]`. Row div: remove `md:flex-1 md:min-h-0`. |
| `app/components/reader/QuranSpread.tsx` | Both page-wrapper divs: remove the `md:h-full` prefix added in Addendum 1 (revert to `className={isPartner ? "fq-safha-partner" : undefined}`). See implementation note below. |

Banner placement (Bug #2) is intentionally untouched here.

### Implementation note (found during verification)

Removing only the ReaderPage viewport pin was **not** sufficient. The two `.fq-spread` page-wrapper divs still carried `md:h-full` (from Addendum 1). A flex item with an explicit height (`height: 100%`) is **not** stretched by `align-items: stretch`, and `100%` resolves to `auto` against the now content-height parent — so the shorter page collapsed to its own content height instead of matching the taller one (measured: 518 vs 474 on the Al-Fatiha spread). Removing `md:h-full` from the two page wrappers lets `items-stretch` do the equalizing; the `h-full` chain **below** the wrapper (`fq-full-safha` → relative wrapper → card → `fq-content`) still resolves correctly because a stretched flex item has a definite cross-size.

Verified with Playwright at 1440×900, double view:
- Pages 75/76 (normal 15-line pair): both cards **565px**, equal — and no longer the old viewport-locked 758px, i.e. content-driven.
- Page 1/2 (Al-Fatiha opening spread): both cards **518px**, equal, **58% of viewport height** (not stretched full-height — fixes #3). Spines aligned; surah-name frames intact.
- Font-scale adaptivity (#1 core): at `quranFontScale = 8` the same 75/76 spread grows to **764px**, both cards still equal — proving height now tracks the font, which the fixed-viewport approach did not.

---

## Addendum 3 — Restore inter-line spacing lost by the equal-height spread (2026-07-07)

**Type:** bug (regression from Addendum 2)
**Status:** implemented
**Trello:** #72 (same card — this is a follow-on to Root fix C / equal-height spread)

### Symptom

User feedback: in double-page mode the two pages are now equal height, but the Quran lines sit flush against each other with no visible gap between them. There should be a little space between each line.

### Root cause

The equal-height spread block (`@media (min-width: 768px) .fq-spread .fq-quran-safha`, from Addendum 1/2) delegates **all** inter-line spacing to `justify-content: space-between` and explicitly zeroes the per-line margin:

```css
.fq-spread .fq-quran-safha { justify-content: space-between; }
.fq-spread .fq-quran-safha > * { margin-bottom: 0 !important; } /* kills --fq-line-gap */
```

`space-between` only produces gaps when the container is **taller** than the sum of its children. After Addendum 2 the spread became **content-driven** — the row height equals the taller page's *natural content height*, which (with margins zeroed) is exactly the sum of the line heights. So on a full 15-line page `space-between` has ≈0 surplus to distribute and the lines touch.

This is why the bug is double-mode-only: on **mobile** the card is pinned to `h-[calc(100dvh-5.5rem)]` (taller than the text), so `space-between` there still has room to spread the lines. The desktop spread lost that headroom when it became content-driven.

### Fix (user chose: uniform gap, top-aligned)

In the `@media (min-width: 768px)` `.fq-spread .fq-quran-safha` rule:
- Add `gap: var(--fq-line-gap);` — a real minimum inter-line gap, matching the header's `margin-bottom` / footer's `margin-top` (both already `var(--fq-line-gap)`), so spacing is consistent across the whole card.
- Change `justify-content: space-between` → `justify-content: flex-start` — every line keeps the exact same `--fq-line-gap`; on the shorter (stretched) page the surplus collects at the bottom instead of stretching the gaps unevenly.
- Keep `.fq-spread .fq-quran-safha > * { margin-bottom: 0 !important; }` — the `gap` is now the single source of inter-line spacing, so per-line margins stay off (no double spacing).

Because the taller page's natural content height now **includes** the gaps, it defines a slightly taller row; `items-stretch` stretches the shorter wrapper to match, and `flex-start` top-aligns its lines with the same gap. Equal height is preserved (it comes from `.fq-spread`'s `items-stretch` + the `h-full` chain + `flex:1`, all orthogonal to `justify-content`).

`gap` only affects children of `.fq-quran-safha` (the `.fq-safha-row` word rows and any `.text-center` surah heading) — the header and footer are siblings inside `.fq-content`, not children of `.fq-quran-safha`, so their spacing is unchanged.

### Files to Change

| File | Change |
|------|--------|
| `app/globals.css` | In the `@media (min-width: 768px)` `.fq-spread .fq-quran-safha` rule: add `gap: var(--fq-line-gap);` and change `justify-content: space-between` → `flex-start`. |

### Constraints

- **Do not touch the mobile block** (`@media (max-width: 767px) .fq-quran-safha`). It keeps `space-between`; the mobile card is viewport-pinned and taller than its content, so `space-between` there produces the desired distribution. Switching mobile to `flex-start` would top-align and leave a large gap at the bottom — a regression.
- Keep the `> * { margin-bottom: 0 !important; }` rule — spacing now comes from `gap`, not margins.
- `.fq-spread .fq-quran-safha.fq-safha-center` (opening pages 1–2) already sets its own `justify-content: center; gap: 0.55em` at higher specificity — leave it as-is; it correctly overrides both new properties for short opening pages.
- `--fq-line-gap` resolves per breakpoint (inline `max(...)` at md, overridden by the lg double-view `min(...)` block). `gap: var(--fq-line-gap)` inherits that automatically — no separate value needed.

### What NOT to Do

- Do not re-introduce per-line `margin-bottom` — use `gap` so it composes cleanly with the flex model.
- Do not change the equal-height machinery (`items-stretch`, the `h-full` chain, `flex:1`) — it is correct; only the spacing model needs the gap floor.
- Do not add a hardcoded pixel gap — reuse `--fq-line-gap` so spacing tracks the font scale.

### Verification (Playwright, 1440×900, double view)

Pages 75/76: both `.fq-quran-safha` now report `justify-content: flex-start` and `gap: 11.61px` (= the resolved `--fq-line-gap`). Both cards measure **728px, equal height** — the equalizer is untouched. The measured vertical distance between the first two word rows is **11.61px** (was ≈0 before). Page 75 (14 word rows) and page 76 (15 rows) stay equal height, with page 75's surplus collecting at the bottom (flex-start), matching the chosen "uniform gap, top-aligned" model. `npm run lint` clean.
