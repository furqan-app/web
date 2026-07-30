# Reading-desk depth for light & gold — and de-duplicating the reader CSS

**Status:** implemented
**Trello:** [#154](https://trello.com/c/3ZaGY47k)
**Predecessor:** `docs/plans/dark-theme-mushaf-unification.md` (#148, merged as `4cdf129`)
**Brief:** `docs/plans/theme-depth-unification-HANDOFF.md`

## Goal

Give light and gold the reading-desk treatment dark received in #148 — lit page face, rim, sheet
stack, binding crease — **and** collapse the per-theme/per-band duplication that the dark work
accumulated, rather than adding two more copies of it.

## Why the refactor came first

Every request in the dark session arrived scoped ("dark only", "tablet only"), and each was
implemented exactly that way. Correct per request; wrong in aggregate. The same visual idea existed
in several places under different guards, which had already caused two regressions that only review
caught — most tellingly a theme-agnostic tablet rule whose shadows were deleted "for dark" and
silently flattened light and gold. Adding two more themes the same way would have made it six
copies.

The fix was to define the treatment **once**, theme-agnostically, and let each theme supply only
values through the existing token contract.

## What changed

**Token contract completed.** `--mushaf-lit-{core,mid,fade,edge}`, `--mushaf-rim-{top,side,foot}`,
`--mushaf-sheet-{face,edge}`, `--mushaf-crease{,-soft}` and `--reader-chrome-*` existed only in the
two dark blocks. They are now defined in all four theme blocks. Dark's values are untouched.

**Depth rules de-scoped.** These lost their `:root.theme-dark` prefix and now serve every theme:
the desktop lit page face + rim, the per-page `--fq-lit-x` and outer-corner radius, the sheet stack
and its deep pair, the 40px binding crease, the tablet lit face and its per-band ramp override, and
the `min-width: 768px` paper fill.

**Mirror rules deleted.** The `:root:not(.theme-dark)` copies are gone: the tablet card's
gradient + five-layer shadow stack, the sheets' 1px edge shadow, and the 150px double-gradient
light/gold gutter. All three are superseded by the shared treatment.

**Shadow-vs-light became a value.** `--reader-chrome-shadow` is `none` in dark and a real shadow in
light/gold, so the nav arrows are one rule instead of a generic rule plus a dark override.

**Dead history removed.** The tablet block's Correction Rounds 2–8 commentary described rules that
no longer exist. Its surviving conclusion lives in ADR 0032; the superseded numbers are gone.

`app/globals.css`: 1373 → 1309 lines.

### Deliberately *not* unified

The recitation bar's **background** stays `:root.theme-dark`-scoped. This is a real medium
difference, not a missed de-duplication: light and gold read as translucent glass, which produces no
lift at all over `(7,15,23)`, so dark needs an opaque face. It also cannot be token-driven from the
base layer — a plain `background-color` there loses to the JSX utility on source order, and only the
`:root.theme-*` form has the specificity to win.

The `min-width: 768px` sheet edge stays `hsl(var(--foreground) / 0.34)` rather than
`--mushaf-sheet-edge`. That expression is already theme-adaptive, and it is the only rule governing
768–1023px, where neither the tablet nor the desktop block reaches — swapping it would have moved
dark in that band.

## Chosen values

Three amplitude candidates were rendered and compared before anything was written to
`globals.css` (probed via `reader-shot.mjs`'s `extra.css` argument). Candidate **B** was chosen:

- **A** left the crease barely clearing the desk tone (light 229 against a desk at 238).
- **C** read as a harsh gray gash on light's clean white — against the light theme's stated "modern,
  entirely gray, no warm tint" intent.
- **B** gives a clear fold in both themes, and lands gold's crease at 225 against its existing
  tablet crease of 219 — so unifying the two bands is close to a no-op for gold rather than a silent
  restyle.

## Verification

Measured with `scripts/dev/reader-shot.mjs`, modal colour of 28×28 patches at points derived from
the printed geometry. The **spine** column is the darkest patch within ±26px of the card boundary.
The **desk** column is sampled tight against the viewport edge on full-bleed bands: the gutter there
is ~16px and the sheet stack peeks up to 14px into it, so a wide patch centred in the gutter
straddles the stack and reports the sheet colour as the desk (this produced one wrong reading before
it was caught).

| band | theme | page outer | page mid | page inner | spine | desk/edge |
|---|---|---|---|---|---|---|
| mobile | dark | (20,29,39) | (20,29,39) | (20,29,39) | — | (19,28,38) |
| mobile | light | (253,253,252) | (253,253,252) | (253,253,252) | — | (251,251,250) |
| mobile | gold | (247,240,222) | (247,240,222) | (247,240,222) | — | (245,238,220) |
| tablet | dark | (20,29,39) | (20,29,39) | (20,29,39) | (12,18,24) | (8,16,25) |
| tablet | light | (253,253,252) | (253,253,252) | (253,253,252) | (234,235,235) | (227,232,239) |
| tablet | gold | (247,240,222) | (247,240,222) | (247,240,222) | (212,204,186) | (232,221,192) |
| desktop | dark | (20,29,39) | (20,29,39) | (20,29,39) | (12,18,24) | (7,15,23) |
| desktop | light | (253,253,252) | (253,253,252) | (252,252,251) | (234,235,235) | (227,232,239) |
| desktop | gold | (247,240,222) | (247,240,222) | (246,239,221) | (223,215,197) | (232,221,192) |

`page outer == page mid == page inner` in every cell — the page face is flat by design (see below).

**What moved, and why it is deliberate:**

- *Desktop light and gold were flat.* Spine equalled paper (255 vs 255; 250 vs 250) — no crease, no
  ramp, no stack. The `min-width: 768px` paper rule was dark-scoped, so their cards were still the
  TSX's `md:bg-card` pure white, and no `::after` crease existed at that width at all. Both now have
  a real fold: light 217, gold 225.
- *Tablet light and gold changed by replacement.* Their old 150px `--mushaf-gutter-highlight`
  gutter gave light a 237 crease and gold 219; the shared 40px `--mushaf-crease` treatment gives
  216 and 217. Gold moves 2 points; light deepens by 21, which is the intended correction — its old
  crease was a 6% dip that barely read.

## Follow-up pass — the glare and the floating nav

Reviewing the result on a real screen surfaced two things the depth work had not addressed, both
confirmed by measurement rather than impression:

- **The nav was indistinguishable from the desk.** Not merely low-contrast — *identical*. The
  desktop surround was the app's own `bg-background` (from `ReaderPager`'s JSX), and the nav is
  `bg-background/75` glass, so it resolved to exactly the surround colour. Light measured nav
  `(238,242,247)` against desk `(238,242,247)`: a separation of **0**. Only its 1px border divided
  it from the page. Gold was 1 point, dark 1 point.
- **Light read as glaring.** The entire screen spanned 238–253 — one near-white field with nothing
  for the eye to rest against. Dark never had this problem despite the same nav defect, because its
  paper is roughly 3× its desk (21 vs 7), so the book separates on its own.

**Fix: give the reader its own desk.** `--viewer-background` was applied at desktop (it had been
tablet-only) and deepened — light `#f1f3f6` → `#e3e8ef`, gold `#ece6d6` → `#e6ddc8` — and the
desktop lit ramp was eased so the paper stops being the brightest thing on screen (light core
`#ffffff` → `#fbfbfa`, gold `#fffdf6` → `#fcf8ef`).

This needed **no nav rule at all**: once the desk sits below `--background`, the nav's own glass
reads lighter than what is under it. Separation went 0 → **9.7** points in both light and gold. A
candidate that instead added an explicit `box-shadow` under the nav was rejected — it was redundant
once the desk was deeper, and left the paper at 253.

Dark re-declares `--viewer-background` at desktop to `#070f17`, its existing `--background` value,
rather than the `#081019` it uses at tablet. Its desktop surround is signed off at `(7,15,23)` and
must not move; the rule stays shared and only the value differs, matching the tablet ramp pattern.

Because the tablet block already consumed `--viewer-background`, the tablet desk deepened for light
and gold too — intended, and it keeps the two bands consistent.

Measured after: light paper 253 → **249**, desk 238 → **227**; gold paper 252 → 249, desk 237 → 230.
Dark remains byte-identical at all three bands.

## Light and gold shade; dark lights. And the cast shadow.

Asked whether light and gold should use *shadow* where dark uses *light*. Measured against each
theme's own base `--mushaf-paper`, the page face already behaves that way:

| theme | base paper | face (outer / mid / inner) | direction |
|---|---|---|---|
| dark | 19.0 | +10.3 / +13.0 / +7.0 | lighter — adds light |
| light | 252.7 | −5.3 / −4.0 / −7.3 | darker — shades |
| gold | 239.0 | +2.0 / +5.0 / −2.0 | slight lift at centre, shades into the gutter |

Light's ramp starts at `#fbfbfa` (251), *below* its `#fdfdfc` (253) paper, so every point on the
page is a subtraction. The shared geometry is a radial gradient positioned by `--fq-lit-x`; the
*direction* relative to base paper is opposite in light and dark, which is exactly the
values-not-rules split this refactor is built on. The `--mushaf-lit-*` names describe the mechanism,
not the effect, and read as misnomers in light and gold.

**What was genuinely missing: a cast shadow under the book.** Drop shadows had been removed from the
desktop block for dark's sake — on `(7,15,23)` they produce no pixels — and when the rules were
unified, light and gold inherited a constraint that is not theirs. This is precisely the failure
mode de-duplication can introduce, and it is the one place light/gold need shadow where dark cannot
use it.

Added as `--mushaf-page-cast`: real on light and gold, `0 0 0 0 transparent` on dark, appended to
the shared card `box-shadow` after the inset rim. Desktop only — the tablet reader is full-bleed and
has no desk for a shadow to fall on.

Side effect, accepted: light's spine deepened 220 → **205**, because each page's cast shadow falls
into the gutter and compounds with the crease. Gold is unchanged at 216 (its crease already
dominated). Dark remains byte-identical.

### Correction — the ramps were still lighting, not shading

Spotted on review: gold's page centre read as washed-out white on tablet. Measured, the tablet
`--mushaf-lit-core` was `#fffdf6` (255,253,246) against gold's `#f6f1e6` (246,241,230) paper — **+9
brighter**, and warmth (R−B) fell from the paper's 16 to 9. Lighting a warm paper toward white
desaturates it, which is why it read as "too white" rather than "too bright".

Cause: when the tablet ramps were widened per band, dark's *brighter-core* pattern was carried over
literally instead of being inverted for near-white paper. Light's tablet core had the same defect
(`#ffffff`, +0 to +2 over its paper); gold's desktop core was a milder version of it (+5, warmth 13).

Fixed by setting each near-white theme's core to its own paper colour and shading outward, keeping
the warm ratio. Verified centre-vs-own-paper:

| theme | band | centre | Δ vs paper | warmth (paper) |
|---|---|---|---|---|
| gold | tablet | (244,238,225) | −3.3 | 19 (16) |
| gold | desktop | (244,239,227) | −2.3 | 17 (16) |
| light | tablet | (251,251,250) | −2.0 | 1 (1) |
| light | desktop | (249,249,248) | −4.0 | 1 (1) |

All four now shade, and gold's warmth is preserved rather than bleached. A deeper variant that put
the core *below* the paper was rejected — it read as an aged manuscript and cost reading comfort.

Knock-on: gold's desktop spine deepened to 199 (from 216), since a darker ramp compounds with the
crease and the cast shadow. An 18% drop against a 244 page face — in range, and left as is.

### Gold warmed

Gold's paper was `#f6f1e6` (246,241,230) — an R−B spread of only **16**, closer to a neutral grey
ivory than to a printed mushaf, which sits nearer 25–45. Warmed to `#f7f0de`, giving a measured
paper chroma of **27** at 57% saturation.

Three levels were rendered and compared:

| level | paper chroma | desk | nav |
|---|---|---|---|
| before | 17 | 30 | 26 |
| **1 (chosen)** | **27** | 40 | 32 |
| 2 | 38 | 51 | 39 |
| 3 | 48 | 62 | 46 |

Level 2 was applied first and rejected on review as tiring to read. The instructive part is *why*,
because contrast did not predict it: level 2 measured 12.9:1, comfortably AAA. What it did was push
the paper's **saturation** from 47% to 68% (chroma 16 → 38). A large, high-luminance field at that
saturation fatigues the eye regardless of contrast ratio — contrast measures luminance difference
and says nothing about chroma load.

Level 1 keeps the warmth legible (chroma 27, S 57%, L 90.8%) without the yellow glare. A separate
set of lower-chroma/lower-lightness variants (chroma ~20, reaching warmth by dimming rather than
saturating) was also rendered and measured; level 1 was preferred over all of them.

**Rule of thumb worth keeping: "warmer" is not "more saturated".** Warmth can be reached by lowering
lightness at constant chroma, and that route does not cost reading comfort. Verify chroma alongside
contrast when changing a reading surface — a WCAG pass is not evidence that a page is restful.

**Scope: the whole theme, not just the reader.** `--background`, `--card`, `--popover`, `--border`
and `--input` were warmed alongside the paper and desk. Warming only the reader would have left the
nav, dialogs and settings reading cold against a warm desk — the nav is `bg-background/75` glass, so
it inherits whatever `--background` is. Non-reader pages (home, plans, surah list) were checked
rendered.

Contrast on the final paper measures **13.1:1** for `--mushaf-text`. Note that contrast was never
the binding constraint here — see the saturation finding above.

Light and dark are byte-identical across all three bands after this change — the warming is scoped
to `.theme-gold`. ADR 0031 is untouched: gold stays reader-page-only for *ornament* semantics, and
this is a paper/surface hue change, not a new accent.

## Final direction — no added light on the page face

The lit page face was removed from **all three themes and all three width bands** at the user's
request. The page is now a flat `--mushaf-paper` fill; depth is carried entirely by its edges —
rim, sheet stack, binding crease, and the cast shadow where there is a desk to catch it.

Removed: the desktop and tablet radial ramps, and on mobile the corner catch-light plus the diagonal
lift→dip pass. **Shading was kept** — the request was to remove lighting, not depth — so mobile
retains its bottom-right corner dip and the 28px inner vignette, both darkening passes. The first
pass over-removed those two and was corrected.

Now dead and deleted: all `--mushaf-lit-*` tokens (four per theme block, plus the tablet band
overrides), `--fq-lit-x` (still being set but no longer read), and `--mushaf-paper-lift` — the pure
page-face *light* token, which by definition has no consumer once lighting is gone.
`--mushaf-paper-dip` survives with two consumers.

### Dark needed a compensating lift

Dark's separation from its desk was carried entirely by the ramp, since ADR 0032 rules out shadow
there. Flattening the page dropped it to **4** points at desktop and **2.7** at tablet (page
`(12,19,26)` against desks of `(7,15,23)` and `(8,16,25)`) — the book effectively dissolved into the
desk, outlined only by its rim.

Fixed by raising `--mushaf-paper` and `--mushaf-sheet-face` from `#0C131A` to `#141d27`. This is a
**uniform** lift, not a gradient, so it honours the request: the page is one flat colour, just a
lighter one. Separation is now 13–14 points, close to what the ramp's mid-tone used to provide.

Light and gold needed no equivalent — their papers already sit far above their desks.

## Constraints honoured

- Gold stays reader-page-only; emerald stays `162 88% 41%` (ADR 0031).
- No change to reading typography or page sizing — ADR 0004, ADR 0011, ADR 0005 untouched.
- ADR 0032's dark-only consequence is **explicitly superseded**, in the ADR and in `DECISIONS.md`.
  The `(7,15,23)` measurement, the ordering invariant and the sample-the-pixels rule all stand.

## Follow-ups not taken here

- The `.fq-carousel-*` rules in the tablet block are dead (superseded by `ReaderPager`, ADR 0028)
  and still present. Left alone — deleting them is unverified CSS surgery deserving its own pass.
- Five tokens are now consumed **zero** times after the mirror rules were deleted:
  `--mushaf-gutter-dark`, `--mushaf-gutter-soft`, `--mushaf-gutter-highlight`,
  `--mushaf-paper-shadow` and `--mushaf-edge`. (`--mushaf-paper-lift`, `-paper-dip` and
  `-paper-highlight` are still consumed by the mobile block and stay.) Deleting tokens the
  standards doc mandates for every theme is its own decision; not taken unilaterally.
