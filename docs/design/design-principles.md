# Design Principles

Aesthetic direction and UI sensibility for Furqan. Load this alongside `docs/standards/styling.md` for any UI or component task.

This is the canonical source. `DESIGN.md` at repo root is a generated token extraction for the impeccable skill — regenerate it via `/impeccable document` after changing this file, don't hand-edit it.

The full derivation behind every principle here — why it exists, how it was measured, what it does in each theme and at each screen size — is [`design-language.md`](design-language.md). This file is the distillation you apply; that file is the argument. When they disagree, the language spec is right and this file is stale.

---

## Character

Furqan is a **manuscript under a reading lamp**. Not a document viewer, not a dashboard, not a reading app with a dark mode. The interface makes a printed page feel present — lit, seated on a surface, surrounded by quiet — and then gets out of the way.

**The page is the thing; chrome is the room around it. When the two compete, the room loses.** Nearly every rule below is a consequence of that sentence.

---

## Accent colour usage

**Two accents, two jobs.** This supersedes the previous single-accent rule, which forced identity and state to share one signal and made a working control look like a decoration.

- **Identity** — the warm accent (`--gold`). Who or what this is, where you are, a page's own metadata, and all ornament.
- **State** — `--primary`. Something is happening now, is selected, is on, is live.

To place a new element, ask what it communicates:

| The element communicates… | Role |
|---|---|
| Who or what this is; where you are; a page's metadata; ornament | **Identity** — warm |
| Something is happening now, is selected, is on, succeeded, or is live | **State** — `--primary` |
| Something is wrong | Destructive. Never either accent. |
| Nothing — inert or decorative structure | Neither. A hairline or a muted tone. |

**Never both on one element.** Apply each sparingly; an accent that appears everywhere signals nothing.

The state accent is emerald in **all three themes**. Only identity is theme-warm — and on light and gold it is a deep **bronze** that separates from the surface by lightness, because a bright gold disappears into parchment. Light is no longer "deliberately not gold": every theme needs an identity accent.

## Control hierarchy

**Group the inert; let the live one stand apart.** Several secondary or inert affordances sit together in one recessed well, reading as a single dimmed cluster instead of several things that look clickable. The control that actually does something sits outside the well, warmer at rest, and is the only element on that surface allowed a state colour.

A live control expresses idle, loading, active and error from **one** state token, so it can never show two readings of itself at once.

One focus ring everywhere: a gap in the chrome colour, then the state accent.

## Cards and surfaces

- **Grouped sections with hairline rows, not stacks of identical cards.** Related rows share one surface; the group carries the border and the radius. Eight floating cards are eight competing objects.
- A section is introduced by an **overline** — small, tracked out, warm, with a rule that fades away from the label.
- A card is warranted when its content is genuinely a separate object the user might act on, move, or dismiss — not merely when several rows appear together.
- Inert values read as evidence, not controls: plain text, never button chrome.
- Rounded corners with meaningful radius — `rounded-[20px]` for primary content cards, `rounded-xl` / `rounded-lg` for secondary surfaces.
- **Layered frames**: where a double border is called for, implement it as an outer border plus an absolutely-positioned inner frame (`inset-[10px] border border-primary/20 rounded-xl pointer-events-none`), not nested padding divs.

## Depth

**Depth rules are shared by all themes; only values differ.** Never scope a depth rule by theme to serve one theme — retune that theme's tokens instead.

The brightness ladder, one order for every theme:

```
creases  <  desk  ≤  chrome  <  page face
```

**The page is the brightest surface**, because it is what the lamp is on.

Light and gold have shadow headroom, so lift is a real cast plus a white rim along the top edge. **Dark does not**: `--background` is RGB `(7,15,23)`, about 7 points from black, so a declared shadow produces no visible pixels. Dark carries the same lift with a lighter face and a warm rim, spread wide and soft rather than dropped tight.

**Never add a drop shadow to a dark surface expecting lift** — including floating dark chrome, which takes an opaque raised face and a warm rim, never a shadow and never translucent glass. This is a measurement of the medium, not a preference.

"Raised" means raised relative to its own medium: a recessed well is lighter than its bar on dark and darker than it on light. Read the rule, not the direction.

## Atmosphere

A room has a light source and it has corners. The reading desk carries two inert layers — a **lamp** pooled where the page sits, and a **vignette** closing the corners — and neither ever paints over a Qur'an pixel.

**A light source is expressed in whichever channel the surface has headroom for**, and that is measured, never assumed: lightness on a dark or a warm desk, **temperature** on a light cool one where there is no room to brighten. Values for one theme cannot be ported to another.

The page face **may** be lit; the pool belongs to the **spread**, anchored at each card's seam edge so the two halves join at the gutter rather than making two pools and a bright seam.

Both desk layers are **dropped entirely** where the page is full-bleed and there is no surround to act on. A vignette with nothing to darken is noise. Drop the layer; do not weaken it.

## Ornamental elements

**Ornament is drawn, not typed.** A hairline rule tapering into an open diamond, rendered from CSS. Glyph characters (`✦`, `◆`) read as footnote markers at small sizes and inherit the text font's quirks. One asset, mirrored, serves both flanks of a symmetric pair.

Ornament is **identity**, so it takes the warm accent in every theme — including the mushaf's header-band marks, footer markers, page metadata, and the surah frame.

**The surah frame keeps exactly one colour role.** A previous three-role model needed per-theme overrides in two separate bands purely to collapse itself back to one colour.

Ornament closes and frames; it never divides, never sits inside the reading column, and never overlays Qur'an text. Ornaments are `pointer-events-none` in a high `z-index` layer.

## Type

The **reading size is a contract, not an aesthetic** — ADR 0038 and `docs/standards/quran-rendering.md`. No principle here may move it.

The interface scale is small, dense and quiet so nothing in the chrome competes with the page: a bold wordmark, a semibold page-orientation line that truncates rather than wraps, small tracked-out muted secondary orientation, and the smallest heaviest-tracked step reserved for section overlines.

## Navigation buttons

Circular `<Link>` or `<button>`, **not** icon-as-button. On the reading desk they are quiet rims that warm on hover, not filled chips — two saturated blobs flanking the page compete with it. Icon: `ChevronLeft` / `ChevronRight` from lucide-react, thin stroke.

Page arrows exist only where there is a **gutter to sit in**. Where the page is full-bleed they are dropped, not shrunk onto the page; those bands navigate by swipe.

Never use a filled or circle-wrapped icon variant (e.g. `ArrowRightCircle`, `CircleChevronRight`) — they read as too heavy.

## Icons

- Source: `lucide-react` only (per DECISIONS.md)
- Default `strokeWidth`: prefer `1.6`–`1.8` for UI chrome; `2` only where emphasis is needed
- Choose the bare shape variant over the outlined-circle variant when both exist

## Motion

Short and understated: colour, background and border transitions around 160ms on a plain ease. A looping indicator is the only continuous animation, and only while something is genuinely in progress.

**Motion never signals hierarchy** — placement, contrast or the state accent does that.

**No design may depend on hover.** Hover refines; it never reveals.

Under `prefers-reduced-motion: reduce`, every animation and transition collapses to effectively zero, declared once per surface rather than per component.

## Screen sizes

Three device classes. Band selection is **CSS-gated**, never UA detection or a JS breakpoint in the display path, so the correct band paints on the first frame.

| Band | Page | Surround |
|---|---|---|
| **compact** `<1024px` | one page | none — full-bleed |
| **spread** `1024–1366px` | facing pages | none — full-bleed |
| **desk** `≥1367×800` | facing pages | the reading desk |

**Chrome loses information as the viewport narrows; the mushaf never loses reading size.** Shed in order of what earns its width: ornament first, then wordmark and inert clusters, then secondary orientation and tertiary utilities. The identity mark and the one live control survive every band.

**Chrome reserves space; it never overlaps the mushaf.** A transport that has no room to sit beside the page moves to a bar that reserves **height**, never width, so line length is untouched.

See `design-language.md` §11 for the full per-rule table.

---

## Process

When asked to enhance or polish UI beyond a spec, use `/frontend-design` — it makes opinionated choices grounded in this document rather than defaulting to generic patterns.
