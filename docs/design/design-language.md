# Furqan Design Language

**Status:** derived and verified in the reader lab (Phase 0 of the [design migration](../plans/design-migration/INDEX.md)) · **Issue:** #360 · **ADR:** [0047](../architecture/adr/0047-adopt-reader-lab-design-language.md)

This is the specification the migration implements against, and the input to the canon rewrite in subtask 1.1. It is **not** the canon: [`design-principles.md`](design-principles.md) is, and it still describes the language being replaced until 1.1 rewrites it from this file.

## How to read this

Every rule states four things: **what** it is, **why** it exists, **how it changes per theme**, and **how it degrades at small screens**. A rule that cannot answer all four is not derived yet.

**Rules, not values.** Hex and HSL values live in tokens and are retuned freely; a spec full of them goes stale the first time one moves. Where a number appears here it is either a *ratio* (which is the rule) or an illustrative reference naming the token that owns it.

**Everything below was verified by sampling rendered pixels**, not by reading declarations. On the dark theme a declared shadow produces no visible pixels at all (ADR 0032), so a rule that "should" work and a rule that does are different claims. Keep it that way.

---

## 1. Character

Furqan is a **manuscript under a reading lamp**. Not a document viewer, not a dashboard, not a generic reading app with a dark mode. The interface's job is to make a printed page feel present — lit, seated on a surface, surrounded by quiet — and then get out of the way.

This inherits the previous canon's "manuscript-inspired reading app" framing and sharpens it: the manuscript is not a decorative theme applied to an app, it is the object the app exists to present. Chrome is the room around it. When the two compete, the room loses.

The word for the app's restraint is **quiet**: one live control at a time, one accent for identity and one for state, ornament that is drawn rather than typed, and no surface that draws attention it has not earned.

---

## 2. Composition

**The folio owns the optical centre.** The mushaf page — one page or a facing pair — is centred in its band, and every other element is placed relative to it rather than to the viewport.

**Surplus becomes symmetric margin, never stretch.** When the band is taller than the page needs, the page is capped at a printed-book proportion (~1:1.5, the `--rl-folio-max-h` token) and centred, so the leftover becomes equal desk above and below. A page stretched to fill its band reads as a ribbon, not a folio.

**Chrome reserves; it never overlaps the mushaf.** Any bar or rail takes its space out of the band before the page is laid out. Chrome floating over Qur'an text is not permitted at any size, in any band, for any reason.

- **Per theme:** identical. Composition is theme-invariant — switching theme changes material and colour, never placement, spacing or hierarchy. This is a hard test: if a theme switch moves anything, something is wrong.
- **Per band:** the proportion cap is a **desk-band rule only**. Below `1367px` the page is full-bleed, reaches both edges, and the cap would inset it — costing reading area and shrinking double-view text. See §11.

---

## 3. Atmosphere

**A room has a light source and it has corners.** The desk carries two inert layers: a **lamp** (a pool centred where the folio sits) and a **vignette** (a closing of the corners). Together they turn a flat fill into a lit room. Neither ever paints over a Qur'an pixel.

**The lamp's carrier channel belongs to the medium, not to the design.** This is the single most transferable finding in this document. A light source can be expressed as *lightness* or as *temperature*, and which one works is decided by measuring the headroom the surface actually has:

| Theme | Desk lightness | Headroom | Lamp is carried by |
|---|---|---|---|
| dark | ~5 | ~95 up | lightness — a hot, tight core |
| light | ~89 | ~10 up, but the desk is **cool** | **temperature** — a warm near-white at matched lightness |
| gold | ~88 | ~12 up, desk already warm | lightness — a pale warm core |

Derived, never inverted. Light's lamp adds almost no brightness and roughly 28 points of warmth; gold's adds ~15 points of brightness and no warmth, because a warmer warm on parchment says nothing.

**The pool's extent is a per-theme value too.** The lamp centres under the folio, so the only desk pixels that can carry it are the ones beside the page. A tight pool works on dark and measured **exactly zero** on light and gold, where the medium cannot take a hot core and the pool must be wide and weak instead.

**The vignette is the other half of the same rule** and is the load-bearing layer on light and gold, which have the downward headroom dark lacks. Its hue is never the lamp's.

- **Per theme:** see the table. The vignette darkens with a cool slate on light and a deep umber on gold and the void on dark.
- **Per band:** **dropped entirely below the desk band.** Both layers act on the desk, and compact and spread are full-bleed — the folio covers the stage. A vignette with nothing to darken is noise painted at the page's edge. Drop the layer; do not weaken it.

### The page's own light

The page face may be lit — ADR 0047 supersedes ADR 0032's prohibition, and the lamp is precisely why.

**The page pool belongs to the spread, not to a page.** Each card anchors the same ellipse to its own **seam** edge so the two halves join at the gutter. One pool per card produces two pools and a bright seam, which is not what an open book does. The binding crease then darkens that seam: lit spread, shaded gutter, dimming outer edges.

- **Per theme:** the same carrier-channel rule one layer in. Dark's paper has headroom and takes a real lit pass; light's paper (~99) and gold's (~96) have none, so the pool is carried entirely by its **shading** half, with the lamp expressed as the absence of shade.
- **Per band:** unaffected. It acts on the paper, which exists in every band.

---

## 4. Depth

**Depth rules are shared by all themes; only values differ.** Scoping a depth rule by theme is how one idea became six copies and two regressions (ADR 0032). If a theme needs different depth, retune its tokens.

**The folio sits on a surface.** That rule is constant; only the amplitude moves:

- **Light and gold** have shadow headroom, so the lift is a real cast plus a white rim highlight along the page's top edge.
- **Dark** does not. `--background` is RGB `(7,15,23)` — about 7 points from black — so a declared shadow produces **no visible pixels**. Dark carries the same lift with a **lighter face and a warm rim catch-light**, spread wide and soft rather than dropped tight. Measured: the rim contributes ~19 points, the cast ~1.

**Never add a drop shadow to a dark surface expecting lift.** This is a measurement of the medium, not a style preference, and it has cost several correction rounds. The same applies to floating dark chrome: an opaque raised face and a warm rim, never a shadow and never translucent glass.

### The brightness ladder

One order, all themes, difference expressed in values only:

```
creases  <  desk  ≤  chrome  <  page face
```

**The page is the brightest surface**, because it is what the lamp is on. This supersedes ADR 0031's deliberate inversion. The *ordering discipline* is the invariant; the specific order is not, and this one replaces the old one.

- **Per theme:** measured desk / chrome / paper — dark 4/7/11, light 88/95/98, gold 87/95/96. Dark and gold both needed their paper raised to clear chrome.
- **Per band:** unchanged. The ladder is about surfaces, not sizes.

**Raised means raised relative to its own medium.** A well is *recessed*, which is lighter than the bar on dark and darker than it on light — the same word, opposite directions. Read the rule, not the direction.

---

## 5. Accent grammar

**Two accents, two jobs.** This supersedes the previous canon's "never reach for a second accent colour; one is enough". One accent forced identity and state to share a signal, which is why a settings gear and three decorative icons looked alike.

- **Identity** — warm (gold/bronze). Who or what this is, where you are, a page's own metadata, and all ornament.
- **State** — emerald. Something is happening now, is selected, is on, is live.

### The test

Every later subtask uses this to place a new element:

| The element communicates… | Role |
|---|---|
| Who or what this is; where you are; a page's metadata; ornament | **Identity** — warm |
| Something is happening now, is selected, is on, succeeded, or is live | **State** — emerald |
| Something is wrong | Destructive. Never either accent. |
| Nothing — inert or decorative structure | Neither. A hairline or a muted tone. |

**Never both on one element.**

- **Per theme:** the state accent is **emerald in all three themes**; only identity is theme-warm. On the gold theme `--primary` is itself gold, so reusing it would collapse the grammar into one colour. Identity on light and gold is a **deep bronze** that separates from the surface by lightness, not by hue — a bright gold does not survive parchment. Verified: identity reaches 4.97 / 6.42 / 7.22 contrast on light / gold / dark, and sits ~134° from the state accent.
- **Per band:** unchanged. Colour roles do not degrade with width; elements are dropped whole (§6), never recoloured to fit.

**Light is no longer "deliberately not gold".** The old canon made light a modern cool-neutral surface with no warm accent. The two-accent grammar needs an identity colour in every theme, so light gets a bronze. Recorded as a supersede, not an oversight.

---

## 6. Control hierarchy

**Inert controls are grouped; the live one stands apart and brighter.** Several secondary or inert affordances sit together in a single recessed **well**, so they read as one dimmed cluster rather than as several things that look clickable. The one control that does something sits outside the well, warmer at rest, and is the only element on that surface allowed a live-state colour.

**A live control expresses its states, and expresses each of them once.** Idle, loading, active and error are driven from a single state token so a control can never show two readings of itself at the same time.

**One focus ring, everywhere.** A two-step ring — a gap in the chrome colour, then the state accent — so focus is legible on every surface without per-component tuning.

- **Per theme:** the well inverts direction, not meaning (see §4). The focus ring's gap colour follows chrome, so it stays legible on a near-white bar and a near-black one alike.
- **Per band:** chrome loses information as width narrows; see §11. What never happens is a live control losing its distinction from an inert one.

---

## 7. Ornament

**Ornament is drawn, not typed.** A hairline rule tapering into an open diamond, rendered from CSS. Glyph characters (`✦`, `◆`) read as footnote markers at small sizes and inherit the text font's quirks. One asset, mirrored, serves both flanks of a symmetrical pair.

**Ornament is identity**, so it takes the warm accent in every theme (§5). This includes the mushaf's header-band diamonds, its footer markers, its page metadata, and the surah frame.

**The surah frame keeps exactly one colour role.** A previous three-role model needed per-theme overrides in two separate bands purely to collapse itself back to one colour. The frame reads a single ornament token, so retuning the token retunes the frame — nothing adds a second.

**Where ornament must not appear:** over Qur'an text, inside the reading column, or as a load-bearing separator where a hairline would do. Ornament closes and frames; it never divides.

- **Per theme:** warm accent per theme, deep bronze on light and gold.
- **Per band:** ornament is the **first thing dropped** as width narrows — it is decoration, and it is what the composition can most afford to lose.

---

## 8. Structure

**Grouped sections with hairline rows, not stacks of identical cards.** Related rows share one surface and are separated by hairlines; the group carries the border and the radius. A list of eight floating cards is eight competing objects, and it is what makes an inventory unscannable.

**A section is introduced by an overline** — small, tracked out, warm, with a rule that fades away from the label. This is the manuscript register, and it is what tells the eye where a group starts without a heavy heading.

**A card is warranted when** its content is genuinely a separate object the user might act on, move, or dismiss — not merely when several rows appear together.

**Inert values read as evidence, not as controls.** A row that reports state gets plain text, never button chrome.

- **Per theme:** the group surface sits one step above its panel, which is a lighter step on light and gold and on dark alike (§4).
- **Per band:** groups keep their structure; rows may drop their secondary hint text before they drop their label.

---

## 9. Type

The **reading size contract is not restated here.** It is ADR 0038 and [`quran-rendering.md`](../standards/quran-rendering.md), it is a contract rather than an aesthetic, and no rule in this document may move it. Every band was verified against production to confirm the composition costs it nothing.

The interface scale is small, dense and quiet, so that nothing in the chrome competes with the page:

| Role | Weight and treatment |
|---|---|
| Wordmark | Largest chrome element; bold |
| Page orientation (surah name) | Semibold, one step below the wordmark, truncates rather than wraps |
| Secondary orientation (juz, hizb) | Small, medium weight, tracked out, muted |
| Section overline | Smallest, heaviest tracking, warm accent |
| Row label | Small, medium weight, full-contrast |
| Row hint | One step below the label, muted |
| Chip | Smallest, semibold, tracked |

- **Per theme:** unchanged. Type is theme-invariant.
- **Per band:** **chrome loses information before it loses type size.** Reducing type to make chrome fit is not permitted — it is the same move as shrinking the mushaf, one surface removed.

---

## 10. Motion

**Motion is understated and short.** Colour, background and border transitions run ~160ms on a plain ease; a looping indicator is the only continuous animation, and it exists only while something is genuinely in progress.

**Motion never signals hierarchy.** If an element needs to be noticed, it earns that with placement, contrast or the state accent — never by moving.

**No design may depend on hover.** Hover refines; it never reveals. Anything only reachable by hover does not exist on a touch device.

**Reduced motion is a contract, not a courtesy.** Under `prefers-reduced-motion: reduce`, every animation and transition in the surface collapses to effectively zero. This is declared once for the whole surface rather than per component.

- **Per theme:** unchanged.
- **Per band:** unchanged, except that no small-screen affordance may require hover to be discovered.

---

## 11. Per-band behaviour

**Three device classes.** Production additionally splits `768–1023px` into an inset single-page band; that is a CSS implementation detail, not a device class, and this language overrides it. A portrait tablet is a tablet and gets the compact composition at full width.

> Production's CSS bands are an implementation, not a list of device classes. Deferring to them reproduced a screen nobody had designed.

| Band | Page | Surround |
|---|---|---|
| **compact** `<1024px` | one page | none — full-bleed |
| **spread** `1024–1366px` | facing pages | none — full-bleed |
| **desk** `≥1367×800` | facing pages | the desk composition |

Below a true minimum (`max-height: 400px`) a mushaf page cannot render at all, and the surface says so rather than composing badly.

**Band selection is CSS-gated**, never UA detection and never a JS breakpoint in the display path, so the correct band is painted on the first frame (ADR 0013 Addendum 4, ADR 0043). Shell height is anchored to the ICB (`position: fixed; inset: 0`), never `vh`/`dvh`, which goes stale across the installed PWA's fullscreen transition (ADR 0044).

### What changes, by rule

| Rule | compact | spread | desk |
|---|---|---|---|
| Composition (§2) | full-bleed, one page | full-bleed, facing pages | capped folio, centred, symmetric margin |
| Desk atmosphere (§3) | **dropped** | **dropped** | lamp + vignette |
| Page pool (§3) | kept | kept | kept |
| Depth (§4) | kept | kept | kept |
| Accent grammar (§5) | kept | kept | kept |
| Page arrows | **dropped** — no gutter to sit in; swipe navigates (ADR 0027) | **dropped** | present, in the gutter |
| Recitation transport | bottom bar | bottom bar | right-hand column |
| Ornament (§7) | dropped | dropped | present |
| Wordmark, lab badge, inert well | dropped | present | present |
| Secondary orientation (juz, hizb) | dropped | present | present |
| Tertiary transport utilities | dropped | present | present |
| Reading size | **unchanged in every band** | | |

**The transport moves; the book never gets inset.** Below the desk band there is no lateral whitespace for a column, so the same three zones relay into a bottom bar — reserving **height**, never width, so line length is untouched. Its physical-right placement does not survive the move and should not: a full-width bar has no side, so its zones lay out logically and mirror correctly in both directions. The transport stays pinned to the bar's true midpoint, exactly as it is pinned to the rail's on desk — the same rule, one axis rotated.

**The chrome-shedding order** is by how much each element earns its width: ornament first, then the wordmark, lab badge and inert well, then secondary orientation and tertiary utilities. The identity mark and the one live control survive every band.

---

## 12. Rules that did not survive derivation

Recorded rather than silently dropped, per the 0.4 test cases.

| Rule as first derived | What happened |
|---|---|
| One lamp geometry for all themes | **Failed.** A tight pool measured exactly zero on light and gold. The pool's extent is a per-theme value. |
| Identity as a bright gold in every theme | **Failed on parchment.** It collapses into the gold theme's surface. Identity on light and gold is a deep bronze separating by lightness. |
| Each theme's own `--primary` as its state accent | **Rejected.** The gold theme's `--primary` is gold, which would make identity and state one colour. State is emerald in all three themes. |
| The identity medallion follows its theme | **Rejected.** It is a struck seal — a material, not a tint — and inverting it on light both erases that reading and leaves the white logo mark invisible. It stays dark in every theme. |
| Desk atmosphere everywhere | **Dropped below the desk band.** No surround to act on. |
| The rail is physically right | **Desk only.** Re-decided per band; a bottom bar has no side. |
| The folio proportion cap everywhere | **Desk only.** Below it the page is full-bleed by design. |
| Production's `768–1023` inset band | **Rejected by the user on sight.** Neither phone, tablet nor desktop. |
| Light is deliberately not gold | **Superseded.** The grammar needs an identity accent in every theme. |
| The page is not the brightest surface (ADR 0031) | **Superseded.** The page is what the lamp is on. |
| Do not light the page face (ADR 0032) | **Superseded** by ADR 0047, which is the explicit decision that rule required. |

**Carried forward untouched**, because these are measurements of the medium rather than taste: dark's `(7,15,23)` headroom, pixel-sampled verification of every depth and lighting change, WCAG AA contrast pairs, the mushaf's no-overlap / line-rhythm / font-size invariants, and `--mushaf-text` — the ink, which no subtask has been given a decision to change.

---

## Verification notes

Method, not decoration — each of these caught a real error during Phase 0:

- **Sample rendered pixels, never declarations.** A shadow can be mathematically present and visually absent.
- **Sample paper in the card's inner margin**, between the card edge and the text column. A pixel taken inside the column lands on a glyph as often as on paper, and produced a whole round of wrong numbers.
- **For a ladder comparison, sample the page's lit body**, not its shaded outer edge — that is the pool's dark end and reports the page as darker than the chrome it clearly sits above.
- **Comparing lab geometry to production is a proportional test, not a constant-offset one.** The lab's capped folio scales every gap; an offset model reported a clean 0.86× scale as a rhythm defect.
- **Every theme block declares the whole token family.** One omitted token silently inherits the base block's value — a missing paper token rendered the light page near-black with nothing in the markup to hint why.
- **Never scope a shared rule by theme to fix one theme.** A theme-scoped ornament fix repaired dark alone and left light's ornament rendering in the state accent — the exact one-accent look this grammar replaces.
- **Place order-dependent `!important` overrides deliberately.** Two rules at equal specificity are resolved by source order; grouping by topic put a band override above the rule it was meant to beat, and rendered two unreadable columns at 375px.
- **The tablet band cannot be reached by the MCP browser** (it clamps at 1600px). Use a headless script or `scripts/dev/reader-shot.mjs`.
