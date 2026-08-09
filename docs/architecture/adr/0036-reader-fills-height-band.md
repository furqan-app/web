# ADR 0036: The desktop reader fills its height band, and the leftover height becomes line rhythm

**Date:** 2026-08-02
**Status:** Accepted

## Context

[ADR 0004](0004-quran-safha-viewport-fit.md) sized the mushaf page so 15 line-slots always fit the viewport, with every vertical measurement derived from the same `vh` scale as the reading font. That guarantee held, but it produced a page whose height was decided purely by its content: at 1440×900 the card measured 686px inside an 828px band, so 142px of the reader was empty background above and below the book while the lines sat at the flat `--fq-line-gap` floor (0.40 em). Mobile never had this problem — [ADR 0011](0011-mobile-quran-font-scale-vw-formula.md) gives its lines a full-height flex column with `space-between`, so the browser turns leftover height into inter-line spacing.

The desktop spread deliberately used `flex-start` + a fixed `gap` instead (ADR 0013 Addendum 3): when the card was content-driven there was ~0 surplus on a full page, and `flex-start` kept the surplus on a *shorter* stretched page from stretching its gaps unevenly against its facing page.

Two things then changed. The recitation player moved to a right-edge rail at ≥1367px + ≥800px, giving back the 104px band that was reserved for the horizontal bar. And the user asked for the airier line rhythm mobile has (Trello #172), noting the same complaint at every font scale — which rules out any fix that leans on a scale-specific constant.

## Decision

At **md+ and ≥800px viewport height**, the spread stretches to the reader's full height band and the text column distributes the surplus with `justify-content: space-between`, keeping `gap: var(--fq-line-gap)` as a floor. Reading font size is not touched.

**The stretch must travel by `align-items: stretch`, never by percentage heights.** `height: 100%` inside a flex-grown box resolves to `auto`, so the chain from the spread container down to the page wrapper drops its explicit `md:h-full` heights instead of adding more; below the page wrapper the box is definitely sized and its own `h-full` children resolve normally. A `fq-spread-col` marker class exists on the spread column purely so this chain can be addressed without positional selectors.

**`gap` under `space-between` is the floor, not decoration.** Flexbox only ever distributes positive free space, so a page taller than the band degrades to `flex-start` with the floor intact rather than overlapping lines — which is also why the loading skeleton mirrors the same distribution.

**Gated on height, because the surplus is what pays for it.** Below 800px the 15 `vh`-derived lines already fill the band; stretching there buys no gap and only pushes the card under the fixed recitation bar. Those viewports keep the previous layout exactly. Where the bar is still a bottom bar (below the rail's gate), the reader reserves 76px for it.

Two spacing knobs were then tuned in the browser with the user: a **desk margin** on the spread container (64px at ≥1367px, 16px at 768–1023px) so the book does not touch the nav and the viewport floor, and a **page side margin** (`.fq-content` `padding-inline` 28px → 56px at ≥1367px) so the paper reads wider around the same line.

**Tablet (1024–1366px) is untouched.** It is full-bleed by design and already fills its 100dvh card through its own `space-between`; its bottom-reserve override keeps it that way.

## Consequences

- **+** Line gap at 1440×900 goes 11.2px → 13.3px (0.40 → 0.48 em) and 19.4px (0.61 em) at 768×1024, with no change to reading size and no new calibrated constant — the browser computes the distribution, exactly as mobile has since ADR 0011.
- **+** Both facing pages stay row-for-row aligned: every page is 15 slots of `1em` (banner and Bismillah included), so the same free space divides the same way on both. Verified on a surah-banner page across all pager panels.
- **+** Short viewports, tablet, mobile, and the standalone `QuranSafha` (`/pages/vertical`, no `.fq-spread` ancestor) are provably unaffected — every rule is scoped and height-gated.
- **−** **Supersedes** two earlier positions: `flex-start` for the desktop spread (ADR 0013 Addendum 3), and "short opening pages are not forced to full screen height" — pages 1–2 now sit as a centred block inside a full-height card. Both confirmed with the user; the alternative left the opening spread a different size from every other spread.
- **−** Page height, text size and line gap are now visibly one budget: the card holds 15 line boxes plus 14 gaps plus fixed chrome, so shortening the page or enlarging the text comes straight out of the rhythm (at 1440×900, +2.7px of font costs ~2.9px of gap). Anyone tuning one of the three has to re-measure the other two.
- **−** The 76px bottom-bar reserve is a measured constant tracking the horizontal recitation bar's 57px height. It has to move if that bar's height does.

## Not an option: distributing space between words

A wider page does not produce a wider line. Furqan's mushaf lines self-justify through kashida baked into the per-page font's glyphs at points the original typesetter chose, so the ink width is fixed at ≈14.2× the font size. Filling a wider column with `justify-content: space-between` inserts gaps at word boundaries instead, shifting every word off its printed position — already tried and reverted for the tajweed font (see the mushaf-justification entry in DECISIONS.md). Extra page width is therefore margin, and only a larger font makes a line physically longer.
