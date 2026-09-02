# ADR 0047: Adopt the reader-lab design language app-wide, canon first

**Date:** 2026-08-21
**Status:** Accepted

> Note (2026-09-02, #494): the `/impeccable` review gate referenced in the Context and in
> point 4 below no longer exists ([ADR 0041](./0041-wire-impeccable-into-fq-workflow.md) is
> superseded). Design-language alignment is now a manual review concern — the "Design & UX"
> checklist in `docs/workflow/check-fq-standards.md`. `DESIGN.md` is hand-maintained, not
> generated. The decision itself is unchanged.

## Context

The Nocturnal Reader Lab (`docs/plans/reader-lab-nocturnal-desktop.md`) was built as a sandbox to generate a new visual direction, and its language was approved. Migrating it is not a styling pass: the language contradicts `docs/design/design-principles.md`, which is the canonical design doc and generates root `DESIGN.md`, which in turn feeds `/impeccable` — wired into plan → implement → review by [ADR 0041](./0041-wire-impeccable-into-fq-workflow.md). The lab also derived every atmospheric move against dark's `(7,15,23)` background, and covers neither light, gold, small screens, nor live control states.

## Options Considered

**Option A — Migrate code first, update the design docs afterwards**
Start with tokens and components; rewrite `design-principles.md` once the new look has settled.

**Option B — Rewrite the canon first, then migrate code**
Rewrite `design-principles.md` and regenerate `DESIGN.md` before any component or token work, so the review gate is aligned with the target from the first commit.

**Option C — Ship the new language as a fourth theme**
Leave the three existing themes untouched and let users opt in.

## Decision

**Option B.** The canon is rewritten before code, and the migration is a phased programme rather than a single change.

**1. The one-accent rule is superseded.** `design-principles.md`'s "Never reach for a second accent colour; one is enough" is replaced by a **two-accent grammar**: gold carries identity, metadata and ornament; the primary accent carries live state only. This is what makes an interface legible at a glance — in the lab it is why the settings gear reads as live while three inert icons beside it do not. Single-accent forced state and identity to share one signal.

**2. The page face is in scope, and may be lit.** ADR 0031's "the Mushaf page is deliberately NOT the brightest surface" and ADR 0032's "Do not light the page face" are superseded **by this ADR as the explicit decision that rule required**. The lab's lamp is precisely a page-lighting move, and the approved composition depends on it.

**3. Aesthetic decisions supersede freely; measurements of the medium carry forward.** These are different categories and must not be conflated:

| Carry forward — not taste | Why |
|---|---|
| Dark `--background` is `(7,15,23)`, ~7 points from black | A shadow declared there produces **no pixels**. Ignoring it yields a design that silently does not render, which is why the lab carried depth with a wide layered cast and a lit surround. |
| Depth changes verified by **sampling rendered pixels** | A shadow can be mathematically present and visually absent. This has happened repeatedly (ADR 0032). |
| WCAG AA contrast pairs | Accessibility floor, not a style preference. |
| Mushaf no-overlap, line rhythm, font-size contract | A word overlapping another word is a defect at any aesthetic. |
| Depth **rules** shared across themes; only **values** differ | Theme-scoping a depth rule produced six copies of one idea and two regressions (ADR 0032). |

**4. During the migration, visual snapshots are a diff-review artifact, not a pass/fail gate.** Every baseline fails by design once the page face changes, so `e2e/tests/visual.spec.ts` snapshots are regenerated per phase and read as before/after evidence. Mushaf correctness therefore moves to an **explicit per-phase verification step** — pixel sampling plus a hard-page spot-check — rather than being assumed covered by snapshots.

**5. All three themes migrate.** Not a fourth theme (Option C rejected: it means maintaining four token sets while the existing three never improve), and not dark-only (which would leave the app carrying two visual languages between phases).

## Consequences

- `design-principles.md` and root `DESIGN.md` must be rewritten and regenerated **before** Phase 2 opens, or the `/impeccable` gate reports every new-language change as a finding and pushes work back toward the old language.
- Light and gold need the language **re-derived**, not translated — every atmospheric value in the lab is a function of a near-black desk. This happens in the sandbox before production files are touched.
- Gold currently has **zero** visual regression coverage (`visual.spec.ts` covers light and dark only), and tablet and four routes have none either. Accepted as a known risk; baselines are regenerated wholesale rather than extended first.
- The lab remains a sandbox and still never ships (`/ar/reader-lab` stays unlinked). It gains light, gold and small-screen variants purely as a derivation surface.

## Addendum — Phase 0.1 findings (2026-08-21)

Deriving the light and gold variants in the lab produced three results the rest of the migration depends on. All are pixel-sampled at 1920×1080 on `/ar/reader-lab/3`.

**1. The lamp's carrier channel is a property of the medium, not a constant.** "A warm pool of light over the folio" is one rule, but the channel that can express it differs per theme, and the choice follows from measuring the headroom that theme actually has:

| Theme | Desk L | Headroom | Lamp is carried by | Measured |
|---|---|---|---|---|
| dark | 5 | ~95 up | lightness (hot, tight core) | +1 L — invisible, as ADR 0032 predicts; the rim does the work (+19 L) |
| light | 89 | ~10 up, but the desk is **cool** | **temperature** | +28 R−B centre vs edge, ~0 L |
| gold | 88 | ~12 up, desk already warm | lightness | +15 L centre vs edge |

The first light and gold values were built as tight pools like dark's and measured **exactly zero** — the pool's centre sits under the folio, so on a wide desk the only visible pixels fall past the falloff. The pool's *extent* is therefore a per-theme token too, not a shared constant.

**2. Gold-as-identity survives on parchment — but as bronze, not as metal.** This was the language's most likely failure. On `.theme-gold` the identity accent reaches 6.30:1 on chrome and 6.42:1 on the group surface, and sits 134° from the live accent. The mechanism changes: on dark, gold separates from its surround by hue *and* brightness; on parchment it can only separate by **lightness**, so "gold" there means a deep bronze roughly 50 points below the surface. A bright gold on a gold desk does collapse — the failure predicted was real, and the fix is the value, not the rule.

**3. The gold theme's live accent is emerald, not its own `--primary`.** `.theme-gold`'s `--primary` is warm gold (`41 57% 43%`). Keeping it would make identity and live state the same colour, which is the one thing the two-accent grammar cannot survive. The live accent is therefore emerald in all three themes; only identity is theme-warm.

A corollary: the identity medallion keeps a dark face in every theme. It is a struck seal — a material, not a tint — and inverting it on light would both erase that reading and leave the white logo mark invisible.

## Addendum — Phase 0.2 findings (2026-08-21)

Deriving the mushaf page face in the lab, in all three themes and both mushaf editions.

**1. The ladder is re-derived, and the page is now the brightest surface.** ADR 0031 deliberately inverted this ("a real page under dim light is only slightly lighter than its surroundings, not glowing"); ADR 0047 supersedes it, and the lab's own lamp is the reason — the paper is what the lamp is on. The *ordering discipline* survives intact: one order, all themes, difference expressed in values only.

```
creases  <  desk  <=  chrome  <  page face
```

Measured (desk / chrome / paper): dark 4/7/11, light 88/95/98, gold 87/95/96. Dark and gold both needed their paper raised to clear chrome (`#0C1117` → `#111820`, `#f7f0de` → `#fdf9ee`); light already satisfied it.

**2. Page lighting is one pool across the spread, not one per page.** Each card anchors the same ellipse to its own seam edge, so the two halves join at the gutter rather than producing two pools and a bright seam. The binding crease then darkens that seam — lit spread, shaded gutter, dimming outer edges, which is what an open book does. Carrier channel follows the medium exactly as in 0.1: dark takes a real lit pass (its paper has headroom), while light (L=99) and gold (L=96) have none and are carried entirely by the shading half, with the lamp expressed as the absence of shade. Measured falloff seam→outer: dark 2, light 3, gold 5.

**3. Ink is unchanged in all three themes.** `--mushaf-text` is deliberately not in the lab's override set. Print ink on lit paper was already correct, and the 0.2 plan requires a separate explicit decision to touch it. That decision has not been taken.

**4. Ornament, metadata and the surah frame take the identity accent in every theme.** This is the two-accent grammar reaching the page. The frame keeps exactly one colour role — it reads `--mushaf-ornament` from an inline style, so retuning the token retunes the frame and nothing adds a second token. Contrast on paper (ornament / metadata): dark 7.35 / 4.93, light 5.36 / 4.74, gold 6.53 / 5.65.

**Two verification lessons, both of which produced false results before being corrected:**

- **A single pixel sampled inside the text column lands on a glyph as often as on paper.** Sample the card's inner margin — the band between the card edge and the text column — and for a ladder comparison use the page's lit body, not its shaded outer edge, which is the pool's dark end and reports the page as darker than the chrome it clearly sits above.
- **When comparing lab geometry to production, the rhythm invariant is proportional, not a constant offset.** The lab caps the folio at 792px, so every gap scales by the band ratio (~0.86). On pages carrying surah frames the fixed `0.3em` frame margin means the large and small gaps *scale* rather than *shift*, so an offset model reported page 604 as a 14.8px rhythm defect in all three themes when it is a clean uniform scale. Verified against `HEAD` without the page-face change: identical, so it was never a 0.2 regression at all.

## Addendum — Phase 0.3 findings (2026-08-21)

Giving the language a small-screen form. The lab was desktop-only by construction; it now composes in every band, and the notice survives only below a true minimum (`max-height: 400px`, where a 15-line mushaf page cannot render at all).

**1. Three device classes, and production's fourth CSS contract is not one of them.** Production splits `768–1023px` into its own band — one page, stretched, but with a real desk margin and page arrows — because its desktop margin lives at `≥1367px` and `1024–1366px` is deliberately full-bleed. Building the lab to match produced a screen that is neither phone, tablet nor desktop, and the user rejected it on sight: *"I don't need this screen at all, it's desktop or tablet or mobile."*

The design recognises three:

| Band | Page | Surround |
|---|---|---|
| compact `<1024px` | one page | none — full-bleed |
| spread `1024–1366px` | facing pages | none — full-bleed |
| desk `≥1367×800` | facing pages | the desk composition |

A portrait tablet is a tablet, and it gets the compact composition at full width rather than an inset one. The lab therefore overrides production's `768–1023` treatment rather than inheriting it, which is a change 5.1 will have to carry into production. **The lesson generalises: production's CSS bands are an implementation, not a list of device classes, and deferring to them reproduced a layout nobody had designed.**

**2. Atmosphere keys off whether a desk exists.** The lamp and vignette act on the desk, and only the desk band has one — compact and spread are both full-bleed, so the folio covers the stage. A vignette with nothing to darken is noise painted at the page's edge, so both layers are dropped below `1367px` rather than weakened. The nav arrows go with them, for the same reason: an arrow needs a gutter to sit in. The page's own pool from 0.2 is unaffected in every band, because it acts on the paper rather than the desk.

**3. The rail's physical-right placement does not survive the move, and should not.** It was a desk decision about where a column belongs beside a centred folio. Below the desk band there is no lateral whitespace — a 72px column would inset the book and shrink double-view text — so the same three zones relay into a bottom transport bar, which reserves height instead of width and so costs the mushaf no line length. A full-width bar has no side, so the zones lay out logically and mirror correctly in both directions.

The transport stays pinned to the bar's true midpoint, exactly as it is pinned to the rail's on desk — the same rule, one axis rotated. Laying it out in flow instead let `space-between` push the primary control into a corner at 375px.

**4. The bar reserves 60px rather than overlaying, which is a deliberate deviation from "tablet is 100dvh edge-to-edge".** Chrome covering Qur'an lines defeats the reason edge-to-edge exists, so the vertical edge is given up and the horizontal one kept. This is safe against the reading-size contract and was verified rather than assumed: reading size is **identical to production at every band** (375 → 23.88px, 768 → 26px, 1024 and 1366 → 29.97px, 1367 → 26px). The reserve costs card height only, and the height cap is not the binding constraint in those bands. Had the font moved, the reserve would have had to go — ADR 0054's contract outranks the composition.

**5. Chrome loses information as the viewport narrows; the mushaf never loses reading size.** Dropped in order of how much each element earns its width: ornaments below 1367, then the wordmark, lab badge and inert icon well below 1024, then the juz/hizb line and the rail's five tertiary utilities below 768. The identity medallion and the one live control survive every band. No band changes type size to make chrome fit.

**Note on ordering:** two `!important` rules at equal specificity are resolved by source order, and the compact band's `display: none` for the partner page was written *above* the desk band's `display: block`, so it silently lost and 375px rendered two unreadable columns. Order-dependent overrides in this file need to be placed deliberately, not grouped by topic.

---

## Addendum — Phases 3–5 (production), 2026-08-22

The language is now on every production surface. Five findings that are consequences of *this* decision rather than of the lab, and that a future reader would not get from the code.

**1. Glass was load-bearing scaffolding, and removing it removed three hacks.** Production's chrome was `bg-background/75 backdrop-blur-md`. Over a `(7,15,23)` desk that is not a bar, it is a hole with the mushaf showing through — which is the entire reason dark carried `:root.theme-dark nav … { color: white !important }` on every descendant, plus a counter-override to hand the search dropdown its semantic tokens back, plus a dark-only face and rim for the recitation rail. Making chrome an opaque surface deleted all three, and dark's nav text measures **15.39:1** on `--foreground` alone. When a theme needs an `!important` colour override to stay legible, suspect the surface underneath it before tuning the colour.

**2. Superseding an aesthetic decision means answering its evidence, not ignoring it.** Two decisions on the reader were reversed here — the desk pool that had been added and then removed on review, and Trello #172's "leftover height becomes line gaps". Both were reversed only after their recorded objections were addressed on their own terms: the page gradient the pool competed with no longer exists and the new pool runs the other way, and #172's stretch survives untouched below the desk band, where it is still what makes the reader read like a printed mushaf. A supersede that cannot answer the original evidence is a regression with a citation.

**3. The two-accent grammar removes rules; it does not only add them.** Four theme-scoped blocks were deleted across 3.2 and 5.1, all of which existed to *prevent* something from being gold. Two of them also outranked the theme-agnostic rule meant to replace them — `:root.theme-dark .fq-spread .x` is `(0,4,0)` against `(0,3,0)` — so gold's surah glyph and every one of dark's page marks kept rendering as ink while the new rule sat in the file looking correct. Specificity, not source order, was the deciding factor, and only pixel sampling revealed it.

**4. A shared class name is an interface, and the reader already owns most of them.** `.fq-ornament` was introduced in 4.1 as a new drawn-ornament primitive. `QuranSafha.tsx` had used that exact class for its header-band and footer markers all along, so the new rule turned every one of them into a 58×10 hairline box — invisible on all four screens that introduced it and visible only once the reader was opened, two subtasks later. Grep the reader before naming anything shared.

**5. The layout traps in this codebase are silent, and they all look like content.** Three separate arrangements of the folio cap produced the *same* 654px content height in every theme at every viewport size: a percentage height inside a flex-grown box (ADR 0036), an auto cross-axis margin, and `align-items: center` — the last two cancel `align-items: stretch` outright. Separately, a word-overlap probe reported 374 escapes on a page that renders perfectly, because the pager mounts three spreads side by side and a flat `querySelectorAll` compared off-screen rows against the first card's rectangle. None of the four is visible in the declaration or in the probe's own logic; all four were caught by measuring a rendered box.

**Carried forward untouched:** `--mushaf-text`. 0.2 declined to change the ink and nothing in Phases 3–5 overrode that. Word placement, page dimension maths, the font files and ADR 0054's size contract are likewise unmodified — verified as 0 word overlaps and 0 escapes across pages 1, 2, 187, 528 and 604, at four viewport widths, in both themes.
