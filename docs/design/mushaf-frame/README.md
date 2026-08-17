# Mushaf page frame — how the prototype was built

An ornamental border around the mushaf text block, matching a printed Madani
mushaf: the juz/surah header band sits *above* the frame and the page number
*below* it, so the frame encloses the text block only.

It was built, measured and tuned end to end against a real page, then reverted.
Nothing here is wired into the app. This folder exists so it can be rebuilt on
request without redoing the investigation. The designer-facing brief is
[`../mushaf-frame-asset-spec.md`](../mushaf-frame-asset-spec.md); this file is
the engineering method.

> **No artwork is committed here, deliberately.** The prototype was cut from
> Vecteezy asset **22313936** ("vintage ornate seamless border") under its Free
> License. Whether that licence permits *extracting* part of the artwork and
> redistributing it inside a product is unresolved, so neither the sliced tiles
> nor screenshots of them live in this repo — only the method, which is ours.
>
> To rebuild, re-download that asset (or any asset satisfying §2) and run the
> pipeline in §4. Shipping for real needs either commissioned original art per
> the spec, or a resolved licence.

---

## 1. Why masked SVG tiles

The constraint that rules out most approaches: **font size is derived from
available space at every breakpoint** (`--fq-mobile-font` and the tablet
double-page caps in `globals.css`). Anything that consumes content-box space
forces recalibrating those constants and re-fitting line layout across all 604
pages.

So the frame is an **out-of-flow overlay** — it adds no layout, no reflow, and
does not participate in any flex container.

A single fixed-aspect frame image is also out: the text block's aspect ratio
changes continuously with viewport height, so one frame would stretch and
distort. Hence **three tiles** — one corner, one per axis — repeated and
mirrored.

They are consumed as CSS `mask-image` over `background-color:
var(--mushaf-ornament)`, so the ornament recolours per theme (light / gold /
dark) from a single monochrome asset.

### Eight children, not eight mask layers

A CSS mask layer **cannot be mirrored** — there is no per-layer transform. The
corners and the far edges all derive from one corner tile and one tile per axis
via `scaleX(-1)` / `scaleY(-1)`, so each piece must be its own element:

| piece | tile | `mask-repeat` | `mask-size` | transform |
|---|---|---|---|---|
| corner ×4 | corner | `no-repeat` | `100% 100%` | –, `scaleX(-1)`, `scaleY(-1)`, `scale(-1,-1)` |
| top / bottom | edge-h | `repeat-x` | `auto 100%` | –, `scaleY(-1)` |
| left / right | edge-v | `repeat-y` | `100% auto` | –, `scaleX(-1)` |

Reference by `url()` from `public/`, **not** inlined via `@svgr/webpack`: the
tiles are then fetched and decoded once and shared across every mounted panel
and all 604 static pages.

---

## 2. What makes a source asset usable

Two numbers decide it, and both are measurable before any integration work.

### period / band thickness — want 1.0–1.5

This is the number print-scale stock art gets wrong, and the one that decides
whether the frame reads as ornament or as noise.

- The first asset tried (Vecteezy 18715986) has a period of **0.37× its band**.
  At mobile width that is ~30 repeats per edge and reads as a bead run. Scaling
  the tile up to ~10 legible repeats pushed the band to 45px per side — 27% of a
  336px mobile width.
- The asset used here has a period of **1.00× its band**, and reads as ornament
  at every size tried from 14px to 26px.

Corollary: legible ornament needs a band of roughly 8–13% of frame width.
Desktop and tablet can afford that; mobile's ~336px cannot without shrinking the
mushaf text. Hence the `md:` gate.

### An exact period — *not* an empty column to cut at

The intuition that a tile must be cut through blank space is wrong, and acting
on it rules out good assets. This asset has **zero** empty columns — the
medallion points touch — yet it tiles perfectly.

What actually matters is that the art is machine-drawn on an exact period. Cut
mid-motif and the two halves rejoin across every repeat, because that is what
seamless means. Measured here: period **85.29578u** horizontal, **84.90292u**
vertical, least-squares residual **< 0.02u**. Verified at 8000px with no visible
seam.

The cut position is therefore not load-bearing. `slice.py` still cuts at the
thinnest crossing, only because that is the most forgiving of sub-pixel rounding
in the browser.

A hand-drawn manuscript scan fails exactly here: every repeat differs and the
band drifts, so a cut that aligns at one x does not align at another. See the
public-domain section of the spec.

### The corner falls out of the period

Make the corner tile an exact whole number of periods (2 here) and it needs no
separate drawing and no rail alignment — the runs meet it correctly by
construction. That also gives a clean CSS constant: `corner = 2 × band`.

---

## 3. Two-tone art: punch, don't flatten

A CSS mask keeps only alpha, so a multi-colour source flattens to one
silhouette. Here that turned each medallion into a solid blob.

The fix is to treat the mid-tone as a **hole**: an `<svg><mask>` *inside the tile
file* punches it out of the ink, and the highlight is redrawn on top of the
result. That recovers a ring with a floating horseshoe inside it, which reads as
engraving.

Three variants are built by `slice.py`:

| variant | what it keeps | reads as |
|---|---|---|
| `solid` | every colour flattened to ink | beaded chain, heavy |
| `engraved` | teal + gold, mid-tone punched, highlight on top | **used** — engraved medallions |
| `chain` | the outline chain only | delicate, no medallions |

Worth telling a designer: supply ornament separated into ink and cut-out layers
rather than pre-flattened.

---

## 4. The pipeline

Requires `ghostscript`, `poppler-utils` (`pdftocairo`), Python with `pillow` +
`numpy`, and the repo's Playwright for rendering.

```bash
# 1. EPS -> PDF -> SVG, plus a raster for measurement
gs -q -dNOPAUSE -dBATCH -sDEVICE=pdfwrite -dEPSCrop -sOutputFile=frame2.pdf source.eps
pdftocairo -svg frame2.pdf frame2-raw.svg
pdftocairo -png -r 288 -singlefile frame2.pdf ras

# 2. measure: ink bbox, band thickness, period, seamlessness residual
python3 measure.py          # writes bands.json

# 3. slice the three tiles
python3 slice.py engraved   # or: solid | chain -> out-<variant>/

# 4. preview at true reader sizes, before touching the app
python3 preview.py          # writes test.html
```

`slice.py` does the clipping **by viewBox, not by geometry**. Clipping bezier
paths properly is hard; instead every path intersecting the tile rect is
included whole and translated, and the SVG viewport clips it for free at render
time. This is also why overhanging ink rejoins correctly across repeats.

Coordinates are rounded to 2 decimals — that alone took the first asset's tiles
from 87.7KB to 57.7KB with no visible change.

### Measured output

| | value |
|---|---|
| source ink bbox | 1364.75 × 1785.30u |
| band thickness | 85.50u both axes |
| period | 85.29578u (h), 84.90292u (v) — LSQ residual 0.015 / 0.061 |
| period / band | 1.00 |
| corner tile | 2 periods square → `corner = 2 × band` |
| tile weight | 17.9 / 13.2 / 13.1 KB raw — **12.9 KB gzipped total** |

The 0.5% horizontal/vertical period anisotropy is why edge-h and edge-v are
separate files. The square corner box absorbs it.

---

## 5. Wiring it into the app

### Tiles must live under `public/icons/`

`middleware.ts`'s matcher excludes a fixed set of `public/` prefixes (`fonts/`,
`icons/`, `quran/`, …). A new top-level folder gets locale-redirected (307) and
**the mask silently never loads** — no console error, just no ornament. Put the
tiles under an already-excluded prefix, or add the new prefix to the matcher.

### Component

Add to `app/components/QuranSafha.tsx`, and render `<SafhaFrame />` inside the
`.fq-quran-safha` div:

```tsx
const FRAME_TILE = {
  corner: "url(/icons/frame-test/tile-corner.svg)",
  edgeH: "url(/icons/frame-test/tile-edge-h.svg)",
  edgeV: "url(/icons/frame-test/tile-edge-v.svg)",
};

const SafhaFrame = () => {
  const band = "var(--fq-frame-band)";
  const corner = `calc(${band} * 2)`;
  const mask = (img: string, repeat: string, size: string): React.CSSProperties => ({
    position: "absolute",
    backgroundColor: "var(--mushaf-ornament)",
    WebkitMaskImage: img,
    maskImage: img,
    WebkitMaskRepeat: repeat,
    maskRepeat: repeat,
    WebkitMaskSize: size,
    maskSize: size,
  });
  const cn = mask(FRAME_TILE.corner, "no-repeat", "100% 100%");
  const eh = mask(FRAME_TILE.edgeH, "repeat-x", "auto 100%");
  const ev = mask(FRAME_TILE.edgeV, "repeat-y", "100% auto");
  const cornerBox = { width: corner, height: corner };
  return (
    <div
      className="fq-frame hidden md:block pointer-events-none"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: `calc(-1 * (${band} + var(--fq-frame-clearance)))`,
        zIndex: 2,
      }}
    >
      <div style={{ ...cn, ...cornerBox, top: 0, left: 0 }} />
      <div style={{ ...cn, ...cornerBox, top: 0, right: 0, transform: "scaleX(-1)" }} />
      <div style={{ ...cn, ...cornerBox, bottom: 0, left: 0, transform: "scaleY(-1)" }} />
      <div style={{ ...cn, ...cornerBox, bottom: 0, right: 0, transform: "scale(-1, -1)" }} />
      <div style={{ ...eh, top: 0, left: corner, right: corner, height: band }} />
      <div style={{ ...eh, bottom: 0, left: corner, right: corner, height: band, transform: "scaleY(-1)" }} />
      <div style={{ ...ev, left: 0, top: corner, bottom: corner, width: band }} />
      <div style={{ ...ev, right: 0, top: corner, bottom: corner, width: band, transform: "scaleX(-1)" }} />
    </div>
  );
};
```

### Geometry

Appended inside the final `@layer base` in `app/globals.css`:

```css
@media (min-width: 768px) {
  .fq-safha-card {
    --fq-frame-band: 16px;          /* frame thickness */
    --fq-frame-clearance: 18px;     /* text ink -> frame INNER edge */
    --fq-frame-margin: 32px;        /* frame OUTER edge -> page edge, sides */
    --fq-frame-margin-block: 6px;   /* same, top/bottom */
  }
  .fq-safha-card .fq-content {
    padding-inline: calc(
      var(--fq-frame-band) + var(--fq-frame-clearance) + var(--fq-frame-margin)
    );
  }
  .fq-safha-card .fq-quran-safha {
    margin-block: calc(
      var(--fq-frame-band) + var(--fq-frame-clearance) +
        var(--fq-frame-margin-block)
    );
  }
}
```

The frame overlay itself costs no layout, but it needs somewhere to sit: the
`padding-inline` widens the content-sized desktop card, and the `margin-block`
opens vertical room between the header and footer bands. Line count and font
size are untouched — the 15 lines just distribute through a shorter box.

**Top/bottom is a separate knob** because the header and footer bands already
contribute their own standoff. Reusing the inline value vertically over-pads it;
leaving the outer margin out entirely puts the frame visibly closer to the bands
than to the page's left and right edges, and that asymmetry reads as a mistake.

Sizes were chosen from a rendered grid rather than by eye in isolation. Below
~16px the band stops reading as ornament and collapses toward a plain rule.

---

## 6. Verification

Both scripts drive the running dev server and take the port from `$PORT`
(default 7001), so run them as e.g. `PORT=7000 node scripts/tune-vars.js` with
the repo's Playwright resolvable:

```bash
NODE_PATH="$PWD/node_modules" PORT=7000 node docs/design/mushaf-frame/scripts/check-linefit.js
```

`scripts/tune-vars.js` overrides the four custom properties live via
`page.evaluate` and screenshots each combination — much faster than editing CSS
per variant.

`scripts/check-linefit.js` is the safety check that matters. `padding-inline`
narrows the mushaf line box while the font-from-width caps derive from the
*viewport*, which is the codebase's documented "broken line" failure mode. It
reports, per page and per viewport width: row count, resolved font size, wrapped
rows, and overflowing rows.

Final state passes at 1500 / 1280 / 900px — 15 rows, 0 wrapped, 0 overflowing,
font 26 / 37.1 / 26px.

Two traps in that script's output:

- **Its `clipped` flag is noise.** It compares `scrollHeight` to `clientHeight`
  on `.fq-quran-safha`, but `SafhaFrame` is inset by `-(band + clearance)` and so
  extends past that box, inflating `scrollHeight` by exactly that amount.
  `overflow-y` there is `visible` and the rows fit. Trust `wrapped` and
  `overflowing`, not `clipped`.
- **At 1280px the two facing pages differ by ~24px in width** (525 vs 550). That
  is the pre-existing `fq-compensate-l`/`-r` stack-gap margins, not the frame —
  but once a border outlines the box it becomes visible, where before it was
  invisible whitespace.

---

## 7. Open before this can ship

1. **Licence.** The blocker. Either commission original art against
   [`../mushaf-frame-asset-spec.md`](../mushaf-frame-asset-spec.md), or resolve
   Vecteezy's attribution and extraction terms in writing.
2. **The font-from-width caps still derive from the viewport, not the padded
   box.** It renders correctly today only because the caps leave slack. A real
   implementation should feed the frame's total inset into `--fq-mobile-font`
   and the tablet double-page caps rather than leaving it implicit.
3. **Mobile.** Currently `md:`-gated off. A legible band needs 8–13% of frame
   width, which ~336px cannot spare without shrinking the mushaf text.
4. **The surah banner band** is the natural companion piece, and drawing it
   natively would close the open `app/surah-frame.svg` licence gate recorded in
   `docs/plans/fix-surah-banner-placement.md`.

## Contents

```
README.md               this file
scripts/measure.py      ink bbox, band thickness, period, seamlessness residual
scripts/slice.py        cuts the three tiles; solid | engraved | chain
scripts/preview.py      standalone reconstruction at true reader sizes
scripts/tune-vars.js    live-override the four knobs and screenshot each
scripts/check-linefit.js  wrap/overflow check across viewport widths
scripts/bands.json      measure.py output for the asset used — the numbers in §4
scripts/tiles.json      slice.py output for the same
```

`bands.json` and `tiles.json` are measurements, not artwork: they are what
`measure.py` and `slice.py` printed for asset 22313936, kept so §4's table can be
checked against a fresh run.
