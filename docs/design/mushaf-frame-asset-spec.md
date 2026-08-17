# Mushaf Page Frame — Designer Asset Spec

Brief for an external designer producing the ornamental border around the mushaf text block. Original commissioned art only — see Licence below.

A working prototype exists — how it was built, measured and tuned is in
[`mushaf-frame/README.md`](mushaf-frame/README.md). Read that before
commissioning: it records which properties of an asset decide whether this
technique works at all.

Read `design-principles.md` for the app's visual character. The frame is `pointer-events-none` chrome in the accent/ornament colour, consistent with the Ornamental elements section there.

---

## What the frame encloses

The **text block only** — not the whole page card. The juz/surah header band sits above the frame and the page number below it, both outside. Reference: a printed Madani mushaf spread.

## Deliver three tiles, not one frame

1. `frame-corner.svg` — one corner only, square viewBox. The other three are mirrored in CSS.
2. `frame-edge-h.svg` — the repeating unit for the top and bottom runs.
3. `frame-edge-v.svg` — the repeating unit for the left and right runs.

Plus one full-frame reference render (PNG is fine) so the tiled reconstruction can be checked against intent.

**Why tiles:** the text block's aspect ratio changes continuously with viewport height — 15 line slots, card content-sized on desktop, full-width on mobile. A single fixed-aspect frame would stretch and distort. Tiles repeat instead.

**Method:** draw the complete frame once at a real reference size, *then* slice the tiles out of that one drawing. Corner and edge drawn separately will not share band-rail positions, and the frame visibly steps at all four corners.

## Technical requirements

These are load-bearing — the art is consumed as a CSS mask, so only its alpha channel survives.

- Single flat colour, fill `#000`, transparent background. Colour comes from a theme token at runtime (light, gold, dark).
- Paths only. No `<text>`, no embedded fonts, no raster `<image>`, no filters, no gradients.
- Strokes converted to outlines (Illustrator: Object → Path → Outline Stroke; Figma: Outline Stroke). Unoutlined hairlines disappear in a mask at small sizes.
- Shapes united and flattened (Pathfinder → Unite) so overlapping subpaths don't punch fill-rule holes.
- `viewBox` origin `0 0`, ink flush to the tile bounds. No stray padding — tiles are positioned to the pixel.
- Edge tiles must seam: ink meeting the left bound must match the right bound exactly (top/bottom for the vertical tile), or every repeat shows a joint.
- **Motif period ≈ 1.0–1.5× band thickness.** This is the number a print-scale asset gets wrong, and it's the one that decides whether the frame reads as ornament. See Measured findings below.
- The single corner tile is mirrored on both axes by CSS transform, so draw it to read correctly mirrored — its diagonal should be symmetric. If the design needs four distinct corners, supply four files and say so.
- Budget ~8KB **gzipped** per tile. Ornate is fine; raw path weight matters less than it looks, since the tiles are fetched once and shared across all 604 pages.

## Measured findings

From slicing a real print-scale stock frame (Vecteezy 18715986) and rendering it through the production mask technique at true reader sizes:

- **The technique holds.** Tiles reconstruct the frame with invisible seams, mirror correctly, recolour per theme, and cost no layout.
- **Fine detail survives better than expected.** With a thinnest sliver of 0.37px at mobile width, the motif still read cleanly — the filled silhouette carries the shape, so sub-pixel slivers thin the line rather than muddying it. Absolute stroke width is not the risk.
- **Motif *density* is the real risk.** That asset's period is 0.37× its band thickness, giving ~30 repeats per edge at mobile width — it reads as a beaded pip run, not ornament. Scaling the tile up to ~10 repeats per edge made it legible, but pushed the band to 45px per side.
- **Consequence:** legible ornament needs a band of roughly 8–13% of frame width. Desktop and tablet can afford that; mobile's ~336px cannot without shrinking the text. Hence desktop/tablet first.

A second stock frame (Vecteezy 22313936, "vintage ornate seamless border") confirms what the period rule buys:

- Its period is **1.00× band thickness** — the ratio this spec asks for — and at a 22px band it reads as ornament, not as a bead run, at every size tried from 14px to 26px.
- **Seamlessness beats empty columns.** This art has *no* empty column to cut at (the motifs' points touch), yet it tiles perfectly, because it is machine-drawn with an exact period (85.296 units horizontally, 84.903 vertically; least-squares residual < 0.02 units). Cutting mid-motif is safe when the period is exact — the two halves rejoin across every repeat. So the requirement is an exact period, not a gap; a designer working from a grid satisfies it automatically.
- **The corner falls out of the period.** A corner tile of exactly 2 periods needs no separate drawing and no rail alignment, and gives `corner = 2 × band` in CSS.
- **A two-tone source can keep its detail through the mask.** Flattening all four of its colours to one silhouette turned each medallion into a solid blob. Treating the mid-tone as a *hole* instead — an `<svg><mask>` inside the tile that punches it out, with the highlight redrawn on top — recovered a ring with a floating horseshoe inside it, which reads as engraving. Worth telling a designer: supply the ornament separated into ink and cut-out layers rather than pre-flattened.
- **Weight:** 12.9KB gzipped for all three tiles, vs 29KB for the denser asset.

## Public-domain scans: reference material, not a tile source (tested 2026-08-17)

Traced a CC0 British Library spread (Or 15227, ff.303v–304r, Terengganu style — an unfinished decorated frame, so the border is unobstructed by text) through deskew → local-threshold binarise → `potrace`, rendered at true reader size.

- At a 30px band the trace is illegible mush; at 45px it reads, and has more authentic character than the stock vector — but with dashed rules, ragged strokes and paper-stain artifacts traced as ink.
- **It cannot tile.** The arcade interlocks continuously with no empty column to cut at, every hand-drawn repeat differs, and the band drifts (0.9° skew on one edge) so a cut at one x doesn't align at another.
- **Resolution is the binding limit.** Source band was 41px; crisp tracing wants ~400px. Commons tops out near 4000px wide for these manuscripts, giving 80–120px — still 3–5× short. Museum IIIF endpoints (Walters, BL) serve larger originals; untested.

**Best use of a CC0 scan: give it to the designer as the reference to redraw.** That combines authentic manuscript vocabulary with clean tileable geometry, and a CC0 source leaves the commissioned derivative completely unencumbered — no attribution, no extraction clause. It also removes the main risk in commissioning, which is a designer inventing ornament with no authentic model.

## KFGQPC does not ship a page frame (searched 2026-08-17)

Negative result, recorded so nobody repeats the search. Swept every KFGQPC-derived font available locally:

- `app/fonts/surah/v1/sura_names.ttf` — 116 private-use glyphs, widest aspect 2.97: the 114 surah names plus the U+E000 band.
- `public/fonts/v1/woff2/*` — page text fonts, widest aspect 3.44 (a Quran line).
- `QCF_SurahHeader.ttf` / `_Dark.ttf` — 114 glyphs, aspect 3.5–3.8: surah header *bands*, not borders.
- 1208 QCF4 per-page fonts — **zero glyphs with aspect > 6**, so no rule or border glyph in the whole set.

KFGQPC distributes Quran text and surah header bands as glyphs. The page border on a printed Madani mushaf belongs to the page plates, not to any font. So the only KFGQPC route is tracing a page scan — precisely the "reproduce or modify" their licence forbids without written approval. Most restrictive licence, and it requires the step it prohibits. Out, absent written permission.

**Corollary worth acting on:** KFGQPC's licence permits distributing the font *as-is*. So the open gate on `app/surah-frame.svg` (an extracted outline = a reproduction) could be closed by shipping the font and rendering U+E000 as text instead — using the font as a font. Read the actual EULA before relying on this; the permission above comes from a licence summary. Note subsetting the font would itself be modification.

## Nice to have

The **surah banner band** (the horizontal ornament carrying the surah name). Drawing it natively would let us retire `app/surah-frame.svg` and close the open licence gate recorded at `docs/plans/fix-surah-banner-placement.md` Addendum 8, which already anticipates redrawing it.

## Licence

Commissioned original work, with ownership assigned to the project in writing (work-for-hire or an explicit licence grant).

Do **not** trace, adapt, or "modify slightly" existing mushaf frame art. KFGQPC's font licence permits distribution as-is only and forbids modification or reproduction without the Complex's express written approval; a modified derivative still needs rights from the original. This is why the asset is commissioned rather than sourced.

## Implementation note (not for the designer)

Consumed as 8 absolutely-positioned `pointer-events-none` children on the `.fq-quran-safha` box — 4 corners sized in `em`, 4 edges with `mask-repeat: repeat-x`/`repeat-y` — each masked by a tile over `background-color: var(--mushaf-ornament)`. Child elements rather than 8 `mask-image` layers on one overlay: a mask layer cannot be mirrored, and the corners and far edges need `transform: scaleX(-1)`/`scaleY(-1)` off a single tile. Verified working. Referenced via `url()` from `public/`, not inlined through `@svgr/webpack` — the assets are then fetched and decoded once and shared across all mounted panels and all 604 static pages.

The overlay must not consume content-box space. Font size is derived from available width at every breakpoint (`--fq-mobile-font` in `globals.css`, and the tablet double-page caps), so an inset that eats real space forces recalibrating those constants and re-fitting line layout across all 604 pages. Desktop and tablet have existing padding and slack to overlay into; mobile has ~12px gutters only.
