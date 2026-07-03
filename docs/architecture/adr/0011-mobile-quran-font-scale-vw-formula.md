# ADR 0011: Mobile Safha sizing — width-driven font, flexbox height fill, no user scaling

**Date:** 2026-07-03
**Status:** Accepted

## Context

On mobile the Quran page should read like a physical mushaf: the Safha card fills the full viewport width and as much of the height as possible, with 15 lines spread evenly top to bottom under the site nav and no app chrome competing for space.

Three approaches were tried in sequence within the same session:

1. Font stayed a fixed `vw` literal (`text-[4.4vw]`), extended to be scale-aware so the desktop `QuranFontScale` slider (1–10) would also work on mobile.
2. Full-screen redesign: card fills the viewport, chrome (border/rounding/shadow/ornaments) removed on mobile, navigation switched to swipe gestures, Settings font-scale controls hidden on mobile. Font size derived from a `dvh`-based slot-budget formula mirroring the desktop ADR 0004 model.
3. Font size derived from line width instead of a height budget, with leftover height distributed by flexbox.

## Options Considered

**Option A — vw-per-scale (first attempt)**
Mobile keeps a `vw` unit, extended to a scale-aware formula `(baseVw + 0.2vw × (scale − 1))`, mirroring the desktop `vh`-based formula and requiring a parallel Tailwind safelist (ADR 0005). Preserves the existing scale-1 visual baseline and lets the font-scale slider work on mobile. Abandoned once the full-screen mobile redesign (Option B/C) made mobile font non-user-scalable by design — the "right" font on a full-width card is simply the one that fills the card, not a user preference.

**Option B — dvh-based budget formula**
Remove user scaling. Derive font size so exactly 15 lines + header/footer bands + spacing fit within `100dvh` minus fixed chrome (nav + paddings): `calc((100dvh - 170px) / 22.089)`, where `170px` is nav (56px) + page `py-4` (32px) + card `py-3` (24px) + header band (~28px) + footer band (~29px), and `22.089` is the ADR 0004 budget multiplier (`15 × 1.417 + 2 × 0.417`). Self-consistent vertical rhythm (font/line-gap/heading all derive from one base), matches the desktop model already proven for `md`+. Abandoned: the opaque constants (`170px`, `22.089`, an assumed `1.417` line-height ratio) require hand re-derivation on any padding/font-metric change, and in practice the width term (added later as a fix for horizontal overflow) always won on typical tall phones, so the formula never actually filled the height — leftover space just sat empty below a centered block.

**Option C — Width-driven font + flexbox height distribution (winner)**
Font size is `(100vw − padding) / 14.7`, so the widest line fills the available width with a small margin. Browser measurement (page 50, verified across all 604 pages) confirmed the two facts this rests on: every mushaf line is justified to the same width (measured ratio 14.23×font-size on page 50; 14.13–14.42 across all pages, worst on page 580 at 14.42), and a full-height flex column with `justify-content: space-between` distributes leftover vertical space for free — no `dvh`/chrome math, no slot-budget constant, no per-font line-height constant needed.

## Decision

Option C. Font size derives from the single measurable width ratio (`14.7` divisor over the `14.42` worst-case ratio, leaving ~2% margin), **capped at 28px** so it stops growing on viewports wider than a typical phone; leftover height is distributed by `justify-content: space-between` on a full-height flex column. This supersedes both earlier options; mobile font remains non-user-scalable (carried over from Option B — Settings font-scale controls stay `hidden md:block`).

**Cap for tablet-width portrait viewports.** The `md` breakpoint (768px) separates "mobile layout" from "desktop card layout," but it doesn't separate "phone" from "tablet" — a tablet in portrait (e.g. an 11.5" tablet at DPR 2 renders ~720px CSS width) still gets the mobile layout, and the uncapped width formula scaled for that width (~47px) rather than a phone's ~24–28px. `--fq-mobile-font: min(calc((100vw - 24px) / 14.7), 28px)` caps the value at what the formula produces for the widest common phone (~430px CSS width): `(430 - 24) / 14.7 ≈ 27.6px`, rounded to 28px. Below ~436px viewport width this is a no-op; above it, the justified line no longer touches both edges of the card on tablet-width viewports — accepted as strictly better than unbounded growth.

Once a line is narrower than the card, it needs to be centered rather than left hugging the RTL start edge. Row `div`s (`QuranLine.tsx`) have no explicit width, so `.fq-quran-safha`'s default `align-items: stretch` stretches them to full container width regardless of font size, and `justify-content: flex-start` inside each row then packs words toward the start edge — invisible on phones (font already fills ~98% of width) but visible as a lopsided gap once the cap holds font size below what the container width calls for. `align-items: center` on `.fq-quran-safha` makes rows shrink-wrap to their content and centers them, so the capped-width gap splits evenly instead.

**Never-wrap backstop.** The ~2% width margin is a soft guarantee — cross-device font rasterisation can still nudge a justified line a hair past the width. To ensure that never drops a word onto a second row (a visibly "broken" line, e.g. page 100's opening `يَـٰٓأَيُّهَا`), mobile rows are `flex-wrap: nowrap` and each word is `flex-shrink: 0; white-space: nowrap`. A hair of overflow then clips invisibly against the card's `overflow-hidden` instead of wrapping. The `14.7` margin keeps that clip sub-pixel in practice; the never-wrap CSS makes correctness independent of the exact divisor.

**Header/footer breathing room.** The flex text column gets `padding-block: 0.5em` (em resolves against the mobile font-size, so it scales with the text) to separate the first/last line from the header rule and footer band. `space-between` distributes the lines inside this padded box, so the padding reads as symmetric top/bottom margin without touching `--fq-line-gap` or the heading-block math.

**Pages 1–2.** These opening pages have far fewer than 15 lines; `space-between` would fling them to the card edges. They instead get `justify-content: center` with a small `gap`, so the short block sits centered as a unit.

**Full-screen chrome removal (from Option B, retained).** Card border, rounded corners, shadow, and decorative ornaments are `md:`-only; mobile is a flat edge-to-edge reading surface. Navigation is swipe-based (arrows hidden `md:flex`) via a `QuranSwipeNav` client wrapper, given plain page-order `prevHref`/`nextHref` (`pageId ∓ 1`) computed independently of the desktop arrows' `getNavigationHref` — that helper intentionally flips by `isRTL` to match the arrows' visually-reversed position, which would make "swipe right" go backward whenever the UI locale is `en` if reused for gestures. See `docs/plans/fix-mobile-swipe-direction.md`'s Code Review Fixes addendum.

## Consequences

- **+** No opaque constants to babysit: the only calibrated number is the `14.7` width divisor, a real geometric property of the mushaf fonts, verifiable by measurement; the never-wrap CSS means an imperfect divisor degrades to an invisible clip, never a broken line.
- **+** Vertical fill is exact on any phone height with zero math — the browser distributes the slack. Matches the native mushaf reference page.
- **+** Adding future page fonts needs no line-height constant; if their justified width ratio differs, only the single `14.7` divisor is revisited (and only if it exceeds the safe margin).
- **+** Scale-1 visual regression concerns from Option A are moot — mobile font is not scale-driven at all.
- **-** Font size tracks screen **width**, so a wider phone renders larger text and a narrower phone smaller — reading size is not height-controlled and not user-adjustable on mobile.
- **-** On an atypically short/wide viewport the fixed content (heading block + footer band + minimum line boxes) can exceed the height; `space-between` cannot compress below natural content height, so a few px of scroll can reappear there. Accepted — real phones are tall; this is the mobile analogue of the ADR 0006 floor.
- **-** The width ratio is a worst-case across all 604 pages, so lighter pages (fewer characters per line) leave a small right/left gap rather than touching both edges — inherent to using one shared font size per the mushaf's own justification.
