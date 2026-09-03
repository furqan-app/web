---
title: Dark Theme Visual Refinement — Unify Mushaf & App Shell Palette
type: feature
date: 2026-07-27
status: implemented
area: theming
---

# Dark Theme Visual Refinement — Unify Mushaf & App Shell Palette

## Summary

Refine `.theme-dark` (and `.theme-dark.dark`) only — light/gold themes untouched — so the
nav bar, both drawers, settings panel, player bar, and modals/overlays inherit the reader
page's color language instead of reading as a separate dashboard product. Confirmed against
a design-reference mockup the user provided (see below). This is a token-value and
small-scoped-component pass, not a redesign: Quran typography, spacing, margins, ornaments,
and responsive layout are untouched. Investigation found every chrome surface (nav, drawers,
settings, player, dialogs) already consumes pure shadcn semantic tokens with zero hardcoded
colors — so most of this is retuning `.theme-dark` token *values* in `app/globals.css`, plus
one small scoped fix to the single-page paper stack and a few new tokens for cases the
existing 9-token contract can't express (a 4th elevated surface, a Mushaf-identity gold, a
theme-aware overlay scrim).

## Reference

User-provided mockup (before/after reader spread, drawer, settings, player, surah list) with
an explicit color-system panel giving exact hex values for: 4 background steps, 3 text tiers
(only 2 adopted — see Decisions), 2 gold tones, and 3 emerald tones. All hex values below were
independently converted to HSL (the project's token format) and verified to land on
consistent, clean hue families — confirming the reference palette is internally coherent
rather than arbitrary.

## Approach — Token Table

All values below apply to `.theme-dark` and `.theme-dark.dark` identically (per the
existing constraint that these two blocks must always match — DECISIONS.md, Font System /
Design System Foundation).

### Backgrounds (new 4-step ramp — all share hue ~210-212°, darkening via lightness)

| Hex | HSL | Token(s) | Role |
|---|---|---|---|
| `#081019` | `212 52% 6%` | `--background` | App shell, nav bar, dialog/sheet base surface |
| `#0D1721` | `210 44% 9%` | `--mushaf-paper` | Reader page paper (essentially unchanged from today's ~`210 42% 9%`) |
| `#13202D` | `210 41% 13%` | `--card`, `--popover` | Drawer/dialog cards, player bar |
| `#192838` | `211 38% 16%` | `--secondary`, `--muted` | Raised nested chips (settings toggle buttons, list highlights) |

**Note — corrects an earlier draft assumption:** the Mushaf page is *not* the brightest
surface. It sits one step above the app shell, not at the top of the ramp. A real page under
dim light is only slightly lighter than its surroundings, not glowing — confirmed by the
mockup's reader thumbnail, which is visibly calmer/darker than the current implementation.
This is a deliberate, confirmed color change to `--mushaf-paper` (see What NOT to Do).

### Text (2-tier, per Decisions — the reference's 3rd "secondary" tier is not adopted)

| Hex | HSL | Token | Role |
|---|---|---|---|
| `#EDEBE5` | `45 18% 91%` | `--foreground`, `--card-foreground`, `--popover-foreground`, `--secondary-foreground`, `--primary-foreground` | Primary text, and text-on-emerald (corrected — see below) |
| `#74818B` | `206 9% 50%` | `--muted-foreground` | Muted/secondary text everywhere |

**Contrast correction:** today's `--primary-foreground` is dark navy, because the old bright
teal (`41%` lightness) was light enough for dark text to read. The new Emerald Primary is
darker (`32%` lightness) — dark-on-dark would fail contrast. `--primary-foreground` moves to
the off-white instead. This is a correctness fix, not a style choice.

### Emerald (interaction only — see ADR 0031)

| Hex | HSL | Token | Role |
|---|---|---|---|
| `#287B68` | `166 51% 32%` | `--primary`, `--ring` | Buttons, active/selected state, focus rings |
| `#163E37` | `170 48% 16%` | `--accent` | Hover/active background tint |
| `#8FD1BE` | `163 42% 69%` | `--accent-foreground` | Text/icon on top of the accent tint (new — lighter than before, for contrast against the now-darker accent bg) |

### Gold (new tokens, Mushaf-identity only — see ADR 0031)

| Hex | HSL | Token | Role |
|---|---|---|---|
| `#9B8050` | `38 32% 46%` | `--gold` | Surah-list number badge text (`SurahListItem.tsx`) |
| `#6F5E40` | `38 27% 34%` | `--gold-muted` | Surah-list number badge background |

Note: these are new, separate from the existing reader-only `--mushaf-ornament` (`#9a8256`)
and `--surah-frame-gold` (`#cdad80`), which stay **unchanged** — they're nearly identical
hues already (confirming the reference is consistent with the existing reader), but this
plan does not touch reader ink/ornament colors per "do not redesign typography."

**Implementation clarification (theme-scoping of the new gold tokens):** `SurahListItem.tsx`
is one shared component rendered under all 3 themes — its className change isn't gated by
theme, so `--gold`/`--gold-muted` must resolve to *something* in every theme block, not just
dark. Per the existing "do not change light/gold appearance" constraint: `.theme-light`
aliases `--gold`/`--gold-muted` to its own current `--accent-foreground`/`--accent` values
(badge looks exactly like today's teal accent — light theme's own comment says it's
deliberately NOT gold, so it must not gain one here). `.theme-gold` aliases them to its own
current `--accent-foreground`/`--accent` too (already warm/gold-toned, so no visible change,
and avoids a redundant second gold competing with the existing one). Only `.theme-dark` gets
the genuinely new gold hex values.

### Overlay (new token, theme-aware scrim)

| Theme | HSL | Token |
|---|---|---|
| `.theme-dark` | `212 52% 6%` (= `--background`) | `--overlay` |
| `.theme-light`, `.theme-gold` | `0 0% 0%` | `--overlay` |

Consumed as `bg-overlay/80` (Tailwind opacity-slash syntax) — visually identical to today's
`bg-black/80` in light/gold, navy-tinted in dark.

### Other tokens

- `--border`, `--input`: soften from `210 36% 17%` to `210 26% 19%` — lower saturation reads
  quieter per the nav-bar requirement ("softer borders"); lightness sits between `--card`
  (13%) and the elevated tier (16%).
- `--destructive`/`--destructive-foreground`: unchanged — out of scope.
- `--radius`, `--surah-frame-line`: unchanged.

## Component/File-Level Decisions (verified with user)

| Surface | Decision |
|---|---|
| Text tiers | Keep the existing 2-tier system (`--foreground`/`--muted-foreground`). No new `--text-secondary` token, no component changes for text tiering. |
| Gold scope | New `--gold`/`--gold-muted` touch exactly one component: the number badge in `SurahListItem.tsx` (currently `bg-accent border-accent-foreground/20 text-accent-foreground` → becomes `bg-gold-muted border-gold/20 text-gold`). Every other `bg-accent`/`text-accent-foreground` usage app-wide stays emerald. |
| Overlay | New `--overlay` token in all 3 theme blocks; `dialog.tsx`/`sheet.tsx` overlay classNames change `bg-black/80` → `bg-overlay/80`, add `backdrop-blur-sm`. |
| Single-page paper stack | **Scope corrected during implementation (verified against `globals.css`, not just the plan's original assumption):** the mushaf-paper card treatment (`background-color: var(--mushaf-paper)` + depth box-shadow) is wired up ONLY for `≤767px` (`globals.css:312`) and the narrow `1024-1366px` tablet-landscape band (`globals.css:631`). Standard desktop (`≥1367px`) and portrait-tablet/small-laptop (`768-1023px`) render the card as plain `bg-card` with zero paper texture — not "already correct like tablet," as first assumed. Confirmed with user: add a new, lower-priority `@media (min-width: 768px)` block (placed *before* the existing 1024-1366px block in source order, so the existing tablet block's declarations still win within its own range via cascade order — zero behavior change there) applying the same `--mushaf-paper` background + depth treatment at every width ≥768px. Then recolor `QuranSafha.tsx`'s stack layers (lines 327-338, currently `bg-card dark:bg-muted border-muted-foreground/30`) to `var(--mushaf-paper)`/`var(--mushaf-edge)`, and reveal the two `.fq-stack-tablet` deep layers at this wider range too (currently gated to display:none outside 1024-1366px) for a fuller stack everywhere ≥768px. Mobile (≤767px) stack treatment is unaffected. |
| Phase order | Confirmed: tokens → paper/stack → nav → drawers → settings → player → overlay/motion. One todo per phase, screenshot-verified before proceeding to the next. |

## Files to Change

1. **`app/globals.css`** — `.theme-dark`/`.theme-dark.dark` token values (table above); add
   `--gold`/`--gold-muted`/`--overlay` to all 3 theme blocks; retune `--mushaf-paper-highlight/
   -shadow/-lift/-dip/-edge/-gutter-*` proportionally for the new darker paper base (values
   tuned for `#1f2731`@16% lightness need adjusting for `#0D1721`@9% lightness to keep the
   existing depth illusion — top highlight, corner shadow, gutter curve — visible); extend the
   single-page stack-layer color rule to use `var(--mushaf-paper)`/`var(--mushaf-edge)` outside
   the tablet-only breakpoint, matching `globals.css:654-658`.
2. **`app/components/QuranSafha.tsx`** — **not touched.** The existing tablet block already
   overrides these same inline classNames (`bg-card dark:bg-muted border-muted-foreground/30`)
   via a `!important` CSS rule on `.fq-stack-layer`/`.fq-safha-card`, without ever editing the
   TSX. The new wider `:root.theme-dark` block (globals.css, inserted before the tablet block)
   follows the identical pattern — the inline classNames stay as the light/gold fallback for
   ranges/themes the new rule doesn't cover, and get `!important`-overridden by the new rule
   for dark theme at ≥768px. Editing the TSX would be redundant.
3. **`app/components/SurahListItem.tsx`** — line 28: badge `bg-accent border-accent-foreground/20 text-accent-foreground` → `bg-gold-muted border-gold/20 text-gold`.
4. **`tailwind.config.ts`** — add `gold: { DEFAULT: "hsl(var(--gold))", muted: "hsl(var(--gold-muted))" }` and `overlay: "hsl(var(--overlay) / <alpha-value>)"` to `theme.extend.colors`.
5. **`components/ui/dialog.tsx`**, **`components/ui/sheet.tsx`** — overlay `bg-black/80` → `bg-overlay/80` + `backdrop-blur-sm`; retune transition durations (see Motion below).
6. **`docs/standards/styling.md`** — extend the "Token contract" list with `--gold`, `--gold-muted`, `--overlay` (required in every theme block going forward, per Design System Foundation's existing contract-update convention).

No changes needed to `Nav.tsx`, `Sidebar.tsx`, `RecitationSettingsSheet.tsx`,
`SettingsSidebar.tsx`, `ThemeToggle.tsx`, `RecitationPlayerBar.tsx` — they already consume
tokens exclusively, so the phase 3–6 "todos" are visual verification checkpoints against the
new token values, not code changes (unless verification surfaces a specific spot that reads
wrong, to be handled as a small scoped fix within that phase).

## Motion (Phase 7)

| Element | Current | Target | New value |
|---|---|---|---|
| Dialog open | `duration-200 ease-out` | 200–240ms | `duration-[220ms]` (kept `ease-out`) |
| Dialog close | `duration-150` | 200–240ms | `duration-[200ms]` |
| Sheet open | `duration-500 ease-in-out` | 220–260ms | `duration-[260ms] ease-out` |
| Sheet close | `duration-300` | 220–260ms | `duration-[220ms]` |
| Buttons | `duration-150` (Tailwind default `transition-colors`) | 140–180ms | Already compliant — no change |

## Verified Test Cases

- **Surah badge:** ~~renders with `bg-gold-muted`/`text-gold`~~ — **reverted in Correction Round 1** (see below): back to `bg-accent`/`text-accent-foreground` (emerald). Gold is reader-page-only, no chrome exceptions (ADR 0031, revised).
- **Play button contrast:** Play/pause button (`RecitationPlayerBar.tsx`, `bg-primary text-primary-foreground`) — with `--primary` now darker (32% L vs old 41%), `--primary-foreground` must be the off-white, not dark navy, or the icon disappears. Verified as a required correction, not optional.
- **Light/gold themes:** `--overlay` addition to `.theme-light`/`.theme-gold` is `0 0% 0%` — pixel-identical to today's `bg-black/80`. No visual regression in other themes.
- **Reader ink unchanged:** `--mushaf-text`/`--mushaf-ornament`/`--mushaf-metadata`/`--surah-frame-gold`/`--surah-frame-line` values are untouched — only `--mushaf-paper` and its highlight/shadow/gutter auxiliary values change. Verifies "no typography/ornament redesign."

## Constraints

- `.theme-dark` and `.theme-dark.dark` blocks must stay identical (existing invariant).
- Every theme class must still define the full token contract (now +3 tokens) — light/gold need `--gold`/`--gold-muted` defined even if unused by any current component, and `--overlay`.
- No hardcoded hex/rgba in component `.tsx` files — new gold/overlay usage goes through Tailwind aliases backed by CSS custom properties, same pattern as existing tokens.
- Gold and emerald never both style the same element (ADR 0031).
- Quran page typography, verse positions, line spacing, margins, ornaments, responsive layout: unchanged.

## What NOT to Do

- Do not make `--mushaf-paper` the lightest tier of the ramp — verified against the mockup that it's one step above `--background`, not the top (see Approach note).
- Do not add a 3rd text tier / `--text-secondary` token — confirmed 2-tier for this pass.
- Do not use gold anywhere outside the reader page — not even the surah-list badge (Correction Round 1 reverted that exception; ADR 0031 revised). Every chrome surface, including ones referencing Mushaf content, stays emerald.
- ~~Do not touch the already-correct tablet-spread paper stack~~ — **stale**: the stack was later reduced from 4 layers to 2 (user request, see "Additional post-review fixes"), removing the `.fq-stack-tablet` mechanism entirely. There are now just 2 layers, always the same, no tablet-specific reveal.
- Do not touch reader ink/ornament tokens (`--mushaf-text`, `--mushaf-ornament`, `--mushaf-metadata`, `--surah-frame-gold`, `--surah-frame-line`) — typography/ornaments are explicitly out of scope.
- Do not change `.theme-light`/`.theme-gold` token values — only add the 3 new required tokens to their blocks with values that preserve their current appearance exactly.
- Do not fix the dead `tailwindcss-animate` classes (`animate-in`/`fade-in-0`/`slide-in-from-*`) in `sheet.tsx` while touching durations there — that's a separate latent bug (styling.md already documents the plugin isn't installed), out of scope for this visual-only pass.

## Correction Round 1 (post-implementation review)

The first implementation pass shipped and was reviewed against a design reference by the
user. Verdict: heavier and more fatiguing, not calmer — a real regression on several fronts.
Edited in place (branch still open, not an addendum) per these confirmed corrections:

1. **Gold badge reverted.** `SurahListItem.tsx` goes back to `bg-accent border-accent-foreground/20 text-accent-foreground` (emerald). Gold is reader-page-only now, no exceptions — ADR 0031 revised (Option C → Option D).
2. **Emerald reverted to its exact pre-task value**, not a new hue. The muted `#287B68`/`#163E37` read "dirty and lifeless." `--primary`/`--ring`/`--accent`/`--accent-foreground`/`--primary-foreground` in `.theme-dark`/`.theme-dark.dark` go back to what shipped before this session: `--primary`/`--ring`: `162 88% 41%`; `--primary-foreground`: `210 42% 9%` (dark navy — safe again since the bright teal is light enough for dark text, unlike the muted value that needed the off-white fix); `--accent`: `161 58% 15%`; `--accent-foreground`: `162 88% 41%`.
3. **`.fq-safha-card` box-shadow recipe overhauled** — the full-perimeter `inset 0 0 0 1px var(--mushaf-edge)` ring is removed entirely (the single biggest cause of the "boxed/framed" look); the inner vignette shrinks from a 22px/theme-edge-strength blur down to a much tighter, fainter one; the outer drop-shadow softens substantially. Applied to both the tablet-only block and the new dark-theme-wide block identically (same recipe everywhere now — no more need for them to differ).
4. **Dark theme's gutter tokens (`--mushaf-gutter-soft`, `--mushaf-gutter-highlight`) softened** — the existing gutter *design* (soft dip + rising highlights, no drawn line) was already right; only dark theme's opacity values read too strong. Light/gold gutter tokens untouched (already gentle).
5. **Nav/player translucent-glass treatment** — confirmed scope: only the contexts that already toggle-hide (tablet/mobile `NavOverlayContext` nav overlay, and the player bar's matching slide-toggle). Desktop's always-visible nav/player are unchanged (still solid `bg-background`/`bg-card`). **Superseded — see "Additional post-review fixes" below: glass is now unconditional (desktop included), and text inside both bars is forced white in dark theme.**
6. **Text tiers stay 2-tier** — the reference image's 4-tier text swatch panel is not adopted; the user's explicit problem list didn't mention text, and their "only reproduce paper realism/stack/lighting/gutter/hierarchy" instruction scopes the reference to those five things, not its exact palette.

## Correction Round 2 (gutter redesign)

Round 1's gutter fix (softening `--mushaf-gutter-soft`/`-highlight` token values) wasn't
enough — the underlying technique was wrong, not just its opacity. The old approach was a
shared 150px-wide `::after` overlay spanning both pages with two linear-gradients (a "valley"
+ "rising highlights"); rendered, it read as a visible dark stripe/rectangle stamped over the
spine. Researched conventional CSS open-book/page-fold techniques (see Sources) — the standard
approach is an asymmetric inset box-shadow on each page's own spine-facing edge (narrow blur,
signed x-offset), not a separate overlay layer. Replaced the `::after` rule with two new
selectors keyed off the existing `.fq-compensate-r`/`.fq-compensate-l` classes (which already
mark each page's outer/stack-peek side, so the spine side is just the opposite edge): a 2-3px
highlight right at the seam, then a 10-12px fast-fading dip — each page shading only its own
few innermost pixels, no shared overlay element. `app/globals.css` only; same tablet-band
scope as before (`1024-1366px` × `[data-safha-view="double"]`), not expanded.

**Files touched in this round:** `app/globals.css` (emerald revert, gutter softening, box-shadow overhaul in all 3 `.fq-safha-card` rules — mobile, the new dark-theme-wide block, and the tablet block), `app/components/SurahListItem.tsx` (badge revert), `app/components/nav/Nav.tsx` and `app/components/RecitationPlayerBar.tsx` (glass treatment gated on `isOverlayMode`, the existing tablet/mobile toggle flag from `NavOverlayContext` — desktop's always-visible bars are unchanged), `docs/architecture/adr/0031-dark-theme-gold-emerald-semantics.md` and `DECISIONS.md` (revised in place, not superseded — this ADR never shipped).

## Correction Rounds 3–7 (gutter, iterative — `app/globals.css` only)

The center-gutter effect went through five more passes after Round 2, each responding to a
fresh look at the rendered result. Round numbers below match the in-code comment above the
gutter rule (search "Binding — Correction Round 3") — read that comment block for the full
blow-by-blow; this is a condensed index.

- **Round 3** (delegated to an Opus agent, since 2 rounds of manual guessing had failed):
  diagnosed why Round 2's per-page asymmetric shadow was rendering invisible — (a) a dark
  "dip" on already-near-black paper barely moves the pixel value, and (b) a box-shadow
  `offset+spread` math error collapsed the highlight to a ~1px sliver. Rebuilt as three
  layers (crease + highlight + dip), but made the **highlight** the dominant layer — reasoning
  that dark-on-dark can't read, so the fold must be carried by light.
- **Round 4** (user correction): "the shadow should be dark, not light" — flipped Round 3's
  emphasis; the dark crease became dominant (wide, `--mushaf-gutter-dark`), highlight shrunk
  to a 2px hairline accent.
- **Round 5** (user correction): even the thin highlight hairline read as "gray in between" —
  removed it entirely. Gutter became shadow-only.
- **Round 6** (user-supplied exact values, after the user changed `--mushaf-paper` again):
  replaced the centered shadow with a **diagonal pair** — `--mushaf-gutter-dark` (repurposed to
  a near-solid near-black hex, not translucent) offset toward the spine+down, paired with
  `--mushaf-paper-highlight` (repurposed to a faint/then-opaque black tint — no longer a light
  color despite its name) offset the opposite way. Two mirrored rules, one per
  `.fq-compensate-r`/`-l`.
- **Round 7** (user-supplied exact values, after another `--mushaf-paper` change): dropped all
  directional x-offsets (every offset is `0`), so the two mirrored rules collapsed into **one
  shared rule** on `.fq-safha-card` (no more `.fq-compensate-r`/`-l` split — the recipe is
  identical for both pages now). Initial values (`spread 4px`/`blur 4px` vignette + a `-6px`
  bottom accent) again rendered invisible — delegated to a second Opus agent, which found the
  same class of bug as Round 3 (spread/blur too tight to produce a visible core against
  near-black paper) and widened to `spread 8px`/`blur 14px` for the vignette and
  `y -9px`/`blur 6px`/`spread 2px` for the bottom accent. **Current final state:**
  ```css
  :root.theme-dark[data-safha-view="double"] .fq-spread .fq-safha-card {
    box-shadow:
      inset 0px 0px 14px 8px var(--mushaf-gutter-dark),
      inset 0px -9px 6px 2px var(--mushaf-paper-highlight),
      inset 0 0 0px 0px var(--mushaf-gutter-dark);
  }
  ```
  Also fixed in this round: the user's manual edits had let `.theme-dark` and
  `.theme-dark.dark` drift on `--mushaf-paper` (`#0D1923` vs `#181d22`) — a real violation of
  the "these two blocks must stay identical" invariant. Synced both to `#181d22` (the value
  actually in effect, since `.theme-dark.dark`'s compound selector wins the cascade when both
  `dark` and `theme-dark` classes are applied together).

**Current token values** (`.theme-dark`/`.theme-dark.dark`, kept identical):
`--mushaf-paper: #0C131A` (darkened from `#181d22` on user request — sits just one step above
`--background`, per the ramp); `--mushaf-gutter-dark: #04070a`; `--mushaf-paper-highlight: rgb(0, 0, 0)`
(fully opaque; unused since Round 9 removed the box-shadow leg it fed).
`--mushaf-gutter-dark` / `--mushaf-gutter-soft` now drive the center separator (Round 10 below);
`--mushaf-gutter-highlight` stays **unused** by the dark theme (kept for the token contract and
for light/gold, which still use all three via their original `::after` overlay).

## Correction Rounds 8–10 (shadow removal → paper-stack clarity → center separator)

`app/globals.css` only, all within the `1024–1366px` tablet band, dark-theme scope.

- **Round 8** — the Round 7 four-edge inset vignette read as a boxed frame stamped on the paper.
  Reblended to the viewer background hue (`hsl(var(--background) / α)`) instead of near-black,
  then tightened (spread `2px`) and darkened (α `0.62`/`0.56`) across a few user passes.
- **Round 9 — all reader shadows removed (user request).** The card gutter shadow and the
  stack-layer edge shadow (`1px 0 2px -1px`) both dropped to `box-shadow: none`. A dark-scoped
  `:root.theme-dark .fq-spread .fq-stack-layer` override sits inside the tablet block to defeat
  the higher-specificity `min-width:768` stack rule's `!important` shadow within the tablet
  range.
- **Paper-stack clarity (edge-only).** Shadow-free, the stack peek was invisible (its inherited
  `--mushaf-edge` border is near-black on dark paper). Fixed with a soft catch-light border
  (`hsl(var(--foreground) / 0.34)`) on the dark tablet stack layers. Sheet FACES stay flush with
  `--mushaf-paper` — tinting them lighter (warm cream, then the navy `--card`/`--muted` tokens)
  was tried and reverted: underneath sheets must never out-lighten the top lit page. Clarity is
  carried by the light edge alone.
- **Round 10 — center binding separator (user request, web-researched open-book model).** New
  `:root.theme-dark[data-safha-view="double"] .fq-spread::after` draws a narrow (~36px) soft
  crease at the seam: `--mushaf-gutter-soft` fading into neutral near-black `--mushaf-gutter-dark`
  at centre, then back out. NO catch-light highlight — the `--mushaf-gutter-highlight` token is a
  cool blue-gray that read as an off-tone seam against the warm-dark paper (same "gray in
  between" rejection as Round 5). Kept narrow so it never intrudes on page text. Light/gold keep
  their own pre-existing `::after` (highlight-pair + soft valley), untouched — see the THEME NOTE
  comments in `globals.css` for where to tune them in a later light/gold pass.
- **Desktop/portrait-tablet unified with the paper (user request — "desktop looks bad").** After
  the `--mushaf-paper` darken to `#0C131A`, desktop (>1366px) and portrait-tablet (768–1023px)
  regressed: their card FACE was still the lighter `md:bg-card` (from the TSX), while Phase 2 had
  already switched the stack layers behind it to the darker paper with a near-black (invisible)
  `--mushaf-edge` border — so a lighter page floated over darker near-black stack peeks. Fixed by
  completing Phase 2 in the `@media (min-width: 768px)` dark block: the card face now uses
  `--mushaf-paper` too, and the stack layers get the tablet's soft catch-light edge
  (`hsl(var(--foreground) / 0.34)`) with `box-shadow: none` instead of the near-black border +
  shadow. Desktop, portrait-tablet, tablet-landscape, and mobile now all render the same
  `#0C131A` paper. The desktop card keeps its TSX `md:shadow` (a soft lift on the floating
  centred spread — desktop isn't edge-to-edge like tablet). The center separator stays
  tablet-scoped for now (not added to desktop).
- **Desktop reading stage (user request — premium reading-desk atmosphere).** New
  `@media (min-width: 1367px)` block: `:root.theme-dark .fq-reader-outer` gets a very soft radial
  light pool (`radial-gradient(ellipse 56% 62% at 50% 46%, hsl(var(--foreground) / 0.04) → 0.014
  → transparent)`) layered over its `bg-background` colour, so the floating desktop spread sits in
  a gentle pool of light — no glow/spotlight/visible gradient. Desktop-only (>1366px, where the
  spread floats); the edge-to-edge tablet band and full-bleed mobile are excluded. Dark-theme-only.

## Deferred — "premium reading-desk" brief (dark desktop, NOT yet done)

A later brief asked for a fuller premium-atmosphere pass. Only the **reading stage** (above) plus
the paper-unification / gutter / stack work already covered were implemented. The rest was
**deliberately not done** — each conflicts with a locked decision or contradicts the brief's own
"do not redesign / do not change layout" clauses. Confirm scope with the user before doing any:

- **Page scale +5–8%** — contradicts the brief's own "do not modify layout/spacing/responsive",
  and page size is governed by ADR 0004 / ADR 0011 (viewport-fit budget). Do not change
  `FONT_V1.baseScaleViewHeight` or the desktop card sizing without reopening those ADRs.
- **Paper stack "4–6 sheets"** — reverses the user's earlier "reduce to 2 layers" decision
  (recorded above and in DECISIONS). The stack is intentionally 2 layers now.
- **Nav "lighter" / player "floating glass, centered, content-width" / page-arrow "hover-reveal"** —
  component redesigns of `Nav.tsx`, `RecitationPlayerBar.tsx`, and the reader arrows. They touch
  shared TSX used by **all themes and breakpoints** and contradict "I do NOT want a redesign" plus
  this plan's "nav + player = full-width matched glass" decision. Should be their own planned task
  (`/plan-fq-task`), not folded into this dark-theme CSS pass.

## Additional post-review fixes (unrelated to the gutter saga)

- **Nav/player glass scope widened to desktop.** Round 1 scoped translucent glass to only the
  toggle-hide contexts (`isOverlayMode`). User later asked for it everywhere, and for the two
  bars to match exactly. `Nav.tsx` and `RecitationPlayerBar.tsx` now both use
  `bg-background/75 backdrop-blur-md border-border/50` unconditionally (`isOverlayMode` still
  gates only the slide-in/out transform, not the background). `RecitationPlayerBar.tsx` gained
  a `fq-recitation-bar` marker class for the CSS below to target.
- **Nav/player text forced to white, dark-theme-only.** New `globals.css` rule scoped to
  `:root.theme-dark` targets `nav`, `.fq-recitation-bar`, and any descendant carrying
  `.text-foreground`/`.text-muted-foreground` inside either — `color: white !important`. Not
  applied unconditionally: light/gold's own foreground tokens already read correctly against
  their light translucent background, so forcing white there would break legibility.
- **Badge pattern experiment, reverted.** Briefly tried switching `SurahListItem`'s badge (and
  the home hero pill, and `PersonAvatar`) from `bg-accent`/`text-accent-foreground` to
  `bg-primary`/`text-primary-foreground` (matching `RubList`'s solid-fill hizb badge). User said
  revert — all three files are back to matching `main` exactly (confirmed via `git diff main`).
- **Sidebar drawer now full-height, matching Settings.** `app/components/nav/Sidebar.tsx`'s
  `SheetContent` had a `top-14 h-[calc(100%-3.5rem)]` override making it start below the nav
  bar instead of using the default full-viewport-height Sheet behavior `SettingsSidebar` uses.
  Removed — Sidebar now uses the same default full height + border as Settings (verified:
  `top: 0, bottom: 900` at a 900px viewport, matching border color `rgb(36, 48, 61)` = `--border`).
- **Single-page paper stack reduced from 4 layers to 2.** `QuranSafha.tsx` had 2 "shallow"
  layers (always visible ≥768px) plus 2 "deep" layers gated behind a `.fq-stack-tablet` class
  that Phase 2 of this task had additionally revealed outside the original narrow tablet band.
  User asked for 2 only — removed the 2 deep-layer `<div>`s from `QuranSafha.tsx` and the now-
  orphaned `.fq-stack-tablet` CSS (the base `display:none` rule and both `display:block` reveal
  rules — one dark-theme-wide from Phase 2, one from the original tablet-only block).

---

# Desktop Reading-Desk Pass (dark theme, ≥1367px)

**Status:** implemented
**Supersedes:** the "Deferred — premium reading-desk brief" section above, in part. Page scale
and the nav/player/arrow redesign remain deferred and out of scope. The paper-stack item is
reopened here at 4 sheets, desktop-only.

## Summary

Make the desktop spread read as a physical book — lit paper, a visible page edge, a binding
crease — instead of the flat rectangle it currently is. Dark theme only, `≥1367px` only,
`app/globals.css` plus two decorative `<div>`s in `QuranSafha.tsx`. No typography, layout,
spacing, or responsive change. The `1024–1366px` tablet band, mobile, and light/gold themes are
untouched.

## Why the previous attempts failed (measured, not inferred)

Sampled the rendered page at 1538×820 before changing anything. The baseline page returns
`(12,19,26)` at **every** point tested — centre, inner edge, outer edge, top, bottom. It is
flat to the pixel, and sits only 5 RGB points above `--background` at `(7,15,23)`.

Two root causes, both confirmed by sampling and now recorded in
[ADR 0032](../architecture/adr/0032-dark-surface-depth-from-light.md):

1. **Shadows cannot work on this background.** Black has ~7 points of headroom below
   `(7,15,23)`. A drop shadow beside the book measured a **1-point** difference. Rounds 3, 7
   and 8 each reached for a darker shadow and got nothing visible — the declarations were
   present and correct, they simply produced no pixels.
2. **The ambient pool was geometrically occluded.** It was `ellipse 56% 62%` — a 28% radius —
   while the book's half-width is also 28% of the viewport. The entire lit zone sat behind the
   opaque page; only its dead tail was ever on screen. Measured lift: 1 point.

Depth therefore comes from **light**: the page brighter than its surround, the surround lifted
above the far background, creases below both.

## Decision Tree / Algorithm

The acceptance test is a **monotonic brightness ladder** (green channel, sampled at 1538×820).
A treatment either produces this ordering or it is wrong:

| Rank | Element | Baseline | Target |
|---|---|---|---|
| 1 (darkest) | spine crease | — | 9 |
| 2 | far background | 15 | 15 |
| 3 | stack sheet face | 16 | 19 |
| 4 | background beside book | 16 | 22 |
| 5 | page outer edge | 19 | 25 |
| 6 | page inner area | 19 | 31 |
| 7 (brightest) | page centre | 19 | 42 |

Derived ratios that must hold: page centre − surround ≥ 18; page centre − page edge ≥ 15;
surround − far background between 5 and 9 (above 9 the surround competes with the page and the
book stops separating — measured and rejected at 11).

## Verified Test Cases

Three probe rounds injected into the live page at `localhost:7001`, sampled each time. No files
were edited during probing.

| Probe | Change | Result |
|---|---|---|
| 1 | gradient + graded rim + crease + black drop shadow | Gradient read (10-pt spread). Drop shadow measured 1 pt beside the book → dead. Pool measured 1 pt → occluded. |
| 2 | shadow removed, pool widened to `78%`, opacity `0.085` | Pool read (11 pts) but overshot: surround `(19,26,34)` vs page centre `(23,35,46)` — only 4 pts apart, book stopped separating. |
| 3 | pool reduced to `0.050`, page centre raised to `#212F3E` | Ladder monotonic; centre−surround 20, centre−edge 17. **Accepted.** |

## Files to Change

1. **`app/globals.css`** — one new `@media (min-width: 1367px)` dark-theme block:
   - Page face gradient on `.fq-safha-card`, lit origin mirrored per page off the existing
     `.fq-compensate-r` / `.fq-compensate-l` classes (`62%` / `38%`):
     ```css
     radial-gradient(ellipse 128% 92% at var(--fq-lit-x) 40%,
       #212F3E 0%, #16212C 40%, #0F1720 72%, #0B121A 100%)
     ```
     `--mushaf-paper` (`#0C131A`) lands mid-ramp — it stays the reference tone rather than a
     flat fill.
   - Graded rim as inset box-shadow: top `rgba(205,173,128,0.28)`, sides `0.13`, bottom `0.05`.
     Graded, not uniform — a uniform 1px stroke on all four sides reads as a drawn frame.
   - Outer corners `border-radius: 5px`; spine-side corners stay square (pages meet flat at the
     gutter in a real open book).
   - Widen the reading-stage pool on `.fq-reader-outer` to
     `ellipse 78% 96% at 50% 45%`, stops `0.050 → 0.032 → 0.013 → transparent 88%`.
   - Binding crease: `.fq-spread::after`, 40px wide at the seam, `rgba(2,5,8,0.95)` at centre
     fading to transparent. Requires `position: relative` on `.fq-spread` at this breakpoint
     (currently `static`). It falls into the existing 12px spine gap.
   - Stack layers: warm edge `rgba(205,173,128,0.38)`, face `#0C131B`.
   - `display: none` on the two new sheets below `1367px`.
2. **`app/components/QuranSafha.tsx`** — add 2 decorative stack `<div>`s (4 total), offsets
   continuing the existing progression at ~3px steps. Empty presentational divs, no text.

All colour values go through tokens or theme-block declarations per the no-hardcoded-colour
constraint; new literals are added as tokens in `.theme-dark` **and** `.theme-dark.dark`.

## Constraints

- `.theme-dark` and `.theme-dark.dark` stay byte-identical in value. Verify with the value-only
  diff, not a text diff.
- `≥1367px` only. The `1024–1366px` band was tuned over Rounds 2–10 and is signed off — do not
  let a new rule leak into it. New TSX sheets must be hidden below the breakpoint.
- Transforms and `clip-path` may be applied **only** to decorative stack layers, never to
  `.fq-safha-card`. The card carries the text; changing its rendered geometry invalidates the
  line-width calibration in ADR 0011 (the `14.7` divisor, derived from a measured worst-case
  ratio of `14.42` across all 604 pages).
- No typography, verse position, spacing, ornament, or responsive change (ADR 0004 / 0011).
- Gold stays reader-page-only (ADR 0031). The warm rim is on the mushaf page, which is
  permitted; no gold may appear in nav, player, badges, or avatars.
- Emerald stays `162 88% 41%`.
- Verify by sampling rendered pixels against the ladder above, not by reading the CSS
  (ADR 0032).

## What NOT to Do

- Do not add a drop shadow under the spread. Measured at 1 point on this background — it is
  dead weight, and reaching for it is what cost Rounds 3, 7 and 8.
- Do not size the ambient pool at or below the book's half-width (~28% of viewport); it will be
  completely hidden behind the page.
- Do not apply a uniform-opacity rim on all four sides — that is the treatment Round 1 removed
  as "the single biggest cause of the boxed/framed look." Only a graded rim is in scope, and
  only where the page floats.
- Do not round the spine-side corners.
- Do not extend the sheet count on tablet or mobile — the 2-layer decision stands everywhere
  below `1367px`.
- Do not attempt the mockup's perspective (tapering sheet block, converging top/bottom edges).
  It needs transforms on the text-carrying card and is ruled out by ADR 0011. Out of scope,
  not deferred.
- Do not change page scale or aspect (ADR 0004 / 0011), the nav, the player bar, or the page
  arrows — all still deferred per the section above.

## Decisions Made

- **Breakpoint:** desktop only, `≥1367px`. Tablet band explicitly excluded (user).
- **Sheet stack:** 4 sheets, straight edge, no clip-path taper (user). Reverses the 2-layer
  decision on desktop only.
- **Rim:** graded warm hairline on all four sides, outer corners rounded, spine corners square
  (delegated to assistant; rationale — Round 1's objection was to a ring around an
  edge-to-edge page, where an edge reads as UI chrome; on a floating desktop page the edge is
  where the paper ends).
- **Paper lighting:** centre lifted *and* edges darkened, with `#0C131A` as the gradient's
  midpoint (delegated to assistant; rationale — there is not enough headroom below `#0C131A`
  before it collides with `--background` for a darken-only falloff to register, which is the
  failure mode of Rounds 3 and 7).
- **Drop shadow:** dropped entirely, on measurement rather than taste.
- **Token scoping (decided during implementation):** the new depth tokens live in the two dark
  blocks only, not in light/gold. Recorded as a constraint under "Dark Surface Depth" in
  DECISIONS.md — only dark-scoped rules consume them, and ADR 0032 makes the asymmetry
  deliberate rather than an omission.

## Implementation Result

Implemented and verified at 1538×820. Measured ladder reproduces the accepted probe exactly:

| Element | Target | Measured |
|---|---|---|
| spine crease | 9 | 9 |
| far background | 15 | 15 |
| stack sheet face | 19 | 19 |
| background beside book | 22 | 22 |
| page outer edge | 25 | 25 |
| page inner area | 31 | 31 |
| page centre | 42 | 42 |

All five derived checks pass: crease darkest, pool lifts the surround, centre−surround 20 (≥18),
centre−edge 17 (≥15), surround−far 7 (in 5–9).

Regression-checked, all confirmed by computed style rather than by eye:
- **Tablet 1280px** — deep sheets `display: none`, no page gradient, `box-shadow: none` (Round 9
  intact), `::after` still the tablet's own 36px separator, not the desktop 40px one.
- **Light + gold at 1538px** — no gradient, no radius, no deep sheets, no crease, no pool.
- **Mobile 390px** — both stack tiers hidden, paper colour intact, mobile's own
  `radial-gradient(85% …)` untouched, no horizontal overflow.
- **RTL handedness** — `.fq-compensate-r` resolves to the right page (highlight 62%, rounded on
  the right, square at the spine); mirrored on the left.
- `.theme-dark` / `.theme-dark.dark` value-only diff: 48 tokens each, identical.
- `npm run lint` clean; `tsc --noEmit` shows only pre-existing `vitest` module errors unrelated
  to this change.

---

# Reading-Desk Pass 2 — Light Level & Page Furniture (desktop ≥1367px)

**Status:** implemented
**Date:** 2026-07-27

## Summary

User review of Pass 1 returned two colour notes and five layout notes. The colour notes are one
change (drop the ambient pool, lower the page gradient). The layout notes turn the reader into a
centred group — spread above, floating recitation bar below — with circular navigation arrows
clear of the sheet stack. Desktop ≥1367px, reader route only, all three themes; only the
lift/shadow *technique* differs per theme.

## Verified Starting Measurements (1538×820, `/ar/pages/51`, dark)

| Fact | Measured |
|---|---|
| card | 429.672px wide, 634px tall, content-sized (`md:w-auto`, no explicit height) |
| spread | 860px, centred at x=761 — 8px left of viewport centre, from `md:ps-14 md:pe-10` |
| stack peek | 16px past the card's outer edge (card ends 1191, stack ends 1207) |
| arrow | 32×634, starts at exactly 1191 → **16px overlap**, both handednesses |
| bar | `fixed inset-x-0 bottom-0`, full 1538px, flush to the viewport bottom |
| free space | 57px above the spread, 65px below the stack |
| line block | 15 lines × 25px + 14 gaps × 10.17px = **523px intrinsic** inside a 534px box |

## Decision 1 — Light level

The pool is removed outright, not weakened: the user picked the flat probe1 surround.

| Sample | Pass 1 (shipped) | Pass 2 target |
|---|---|---|
| surround | 13,21,28 | **7,15,23** (= `--background`, no pool) |
| page centre | 29,42,56 | **22,32,42** |

Tokens (dark blocks only, both `.theme-dark` and `.theme-dark.dark`):

| Token | Pass 1 | Pass 2 |
|---|---|---|
| `--mushaf-lit-core` | `#212f3e` | `#18222d` |
| `--mushaf-lit-mid` | `#16212c` | `#121b24` |
| `--mushaf-lit-fade` | `#0f1720` | `#0d151d` |
| `--mushaf-lit-edge` | `#0b121a` | `#0a1119` |

Crease, sheet stack and warm rim are **kept unchanged** — verified present in the approved
`lightA.png` probe. Only `.fq-reader-outer`'s `background-image` is deleted.

### ADR 0032 correction

Two of Pass 1's acceptance numbers were measured at bad coordinates. Viewport fraction 0.955
lands on the desk, not the paper — the current panel's cards span 0.215–0.774. So the recorded
"page outer edge 25" was really the ambient pool, and "surround−far in 5–9" cannot survive a
deliberate no-pool design. ADR 0032's *principle* stands (depth from light, verified by sampled
pixels); its numeric ladder is replaced:

| Step | Pass 2 target |
|---|---|
| spine crease | ≤ 12 |
| far background = surround | 15 (flat, equal by design) |
| stack sheet face | 17–20 |
| page centre (x≈0.635 / 0.355) | 30–34 |

Sample points must sit inside the current (middle) panel: right card centre x≈0.635, left card
centre x≈0.355, spine x≈0.50.

## Decision 2 — Group centring, and why the card cannot shrink

The word font is `max(24px, 2.9vh)` — keyed to the **viewport**, not the container (ADR 0004) —
and the card is content-sized, so it is 634px regardless of how much room the column offers. Any
space reserved for the floating bar therefore comes out of the column's spare 57px/65px, and if
the column drops below 634px the spread overflows instead of shrinking.

At 820px tall the arithmetic works (764px column − 76px reservation = 688px ≥ 634px). Near 700px
it does not. So group centring is gated:

```
@media (min-width: 1367px) and (min-height: 800px)
```

Below the gate, desktop keeps today's behaviour: spread centred on its own, bar full-width at the
bottom edge. Above it: outer column reserves `bar height + gap`, `justify-center` then centres the
spread in what remains, and the bar floats clear of the bottom edge.

**Do not** reach for `baseScaleViewHeight` to make the page fit. Page scale is a deferred item
needing explicit go-ahead, and changing it requires regenerating the `tailwindFontUtility` safelist
in the same commit or the font silently fails (ADR 0005).

## Decision 3 — Bar width by runtime measurement

Card width is content-derived (429.672px at the default scale) and moves with the font-scale
control, so no CSS value can track it. `QuranSpread` observes its own `.fq-spread` element with a
`ResizeObserver` and publishes two custom properties on `<html>`:

- `--fq-spread-width` — the spread's pixel width
- `--fq-spread-center` — its centre x in pixels from the viewport's left edge (not the viewport
  centre: `ps-14`/`pe-10` puts the spread 8px off, and the offset flips with direction)

Three panels are mounted and all are the same width, so whichever writes last is correct; the
observer is self-healing when a panel's data arrives late. The bar falls back to
`min(860px, 100vw - 96px)` when the properties are unset (non-pager reader routes).

## Decision 4 — Lift technique per theme

Per ADR 0032, a drop shadow on `(7,15,23)` measures ~1 RGB point. So:

| Theme | Bar and arrow lift |
|---|---|
| dark | raised surface tone + warm rim (`--mushaf-rim-*`), no `box-shadow` |
| light / gold | ordinary `box-shadow` |

Verified by sampled pixels before the values are written to file, not by eye.

## Decision 5 — Arrows

Circular, vertically centred, and pulled clear of the 16px stack peek: `margin-inline` ≥ 24px from
the card edge, so the nearest arrow pixel sits ≥8px outside the deepest sheet. Total width cost is
860 + 2×44 + 96 padding = 1044px at a 1367px minimum — comfortable.

Height changes from the full 634px column to a 44px circle, so the whole-edge click target is
lost. That is intended (it matches the mockup), but it is a real reduction in target size — flag
it if it feels worse in use.

## Files to Change

- `app/globals.css` — four `--mushaf-lit-*` values in both dark blocks; delete the
  `.fq-reader-outer` pool; new `@media (min-width: 1367px) and (min-height: 800px)` block for the
  column reservation and floating bar; circular arrow rules in the existing ≥1367px block.
- `app/components/reader/QuranSpread.tsx` — `ResizeObserver` publishing `--fq-spread-width` /
  `--fq-spread-center`; arrow markup gains a shape class.
- `app/components/RecitationPlayerBar.tsx` — marker class when `isOnReaderRoute`, so the floating
  treatment is scoped to the reader and the bar keeps its full-width form elsewhere.

## Constraints

- `.theme-dark` and `.theme-dark.dark` stay byte-identical in value — verify with the value-only
  diff, not a text diff.
- Gold stays reader-page-only; emerald stays `162 88% 41%`.
- No typography, layout or responsive changes outside the ≥1367px desktop band. Tablet
  (1024–1366px) and mobile untouched — Rounds 2–10 all live in the tablet band.
- The bar is mounted app-wide; off the reader route it must keep its current full-width form.
- `isOverlayMode` is `(mobile || tablet) && reader` → false at ≥1367px, so the desktop rules
  cannot collide with the overlay's `translate-y-full`. Re-verify if that condition ever changes.
- Crease, sheet stack and warm rim from Pass 1 are kept as-is.

## What NOT to Do

- Do not weaken the ambient pool — delete it. The user picked the flat surround.
- Do not touch `baseScaleViewHeight` or any font math to make the group fit.
- Do not use `box-shadow` for lift in dark. It measures ~1 point and cost Rounds 3, 7 and 8.
- Do not centre the bar on the viewport centre — it must match the spread's centre, 8px off.
- Do not sample verification pixels at viewport fraction 0.955; that is the desk, not the paper.
- Perspective/geometry from the mockup stays out of scope (ADR 0011), not deferred.

## Decisions Made

- Light level A (page centre 22,32,42), chosen from two live probes rather than guessed.
- Layout changes apply to all three themes; only the lift technique is theme-specific.
- Bar width tracked by `ResizeObserver` rather than a fixed `max-width`, because the font-scale
  control moves the card width.
- Group centring gated at `min-height: 800px`; below it desktop keeps today's layout.
- ADR 0032's numeric ladder is superseded by the table above; its principle is unchanged.

## Implementation Result (Pass 2)

Verified at 1922×1025 dark, `/ar/pages/51`. The dev browser refused to resize, so the tablet and
short-viewport bands were verified structurally (CSSOM media-condition audit) rather than by
screenshot — every new rule sits inside `(min-width: 1367px)` or
`(min-width: 1367px) and (min-height: 800px)`, and the pre-existing tablet `.fq-nav-arrow` rule at
`(min-width: 1024px) and (max-width: 1366px)` is untouched.

| Sample | Target | Measured |
|---|---|---|
| spine crease | ≤12 | 8 |
| far background | 15 | 15 |
| surround | 15 (equal by design) | 15 |
| stack sheet face | 17–20 | 19 |
| page centre | 30–34 | 32 |
| bar face (dark) | lifted | 29 (+14 over background) |
| arrow face (dark) | lifted | 30 (+15 over background) |

Layout, measured: bar width 1046px = spread width exactly; bar centre 953 = spread centre exactly;
arrow clearance 8px past the deepest sheet on both sides; no document scroll.

Deviations from the plan, both deliberate:
- Arrow size is **52px**, not the 44px sketched in the plan — `docs/design/design-principles.md`
  already specifies circular nav buttons at `w-[52px] h-[52px]`, and the design doc is canonical.
  Its `strokeWidth: 1.8` was **not** applied: the arrows render at tablet too, and 1.6 is what that
  signed-off band ships.
- The bar's background and border **colour** are left to the existing utilities in light/gold — the
  translucent glass matching Nav is a prior correction-round decision, and the declarations lost to
  the utility layer anyway. Only dark overrides them, where translucency yields no lift.

Regression checks: `.theme-dark` / `.theme-dark.dark` value-only diff — 51 tokens each, identical.
`npm run lint` clean. `tsc --noEmit` clean apart from the pre-existing `vitest` module errors.
Light and gold verified at desktop (white/parchment circular arrows, glass bar, no page gradient,
no ambient pool).

---

# Reading-Desk Pass 3 — Tablet Band (1024–1366px, dark)

**Status:** implemented
**Date:** 2026-07-28

## Summary

Bring the desktop reading treatment to the tablet band: lit page face, warm inset rim, warm sheet
edge, and desktop's binding separator. Paint only — the tablet reader stays full-bleed.

## What was ruled out, and why

The user asked for "same background, shadow, light, borders". Two of those cannot port:

- **Background.** Tablet is deliberately full-bleed: `min-height: 100dvh !important`, nav is an
  overlay, cards run edge-to-edge with 16px of inline padding, surface is `--viewer-background`.
  Desktop's surround exists only because the book floats. Making the tablet book float would cost
  reading area and, in double view, shrink the text (the font is width-budgeted, ADR 0013). The
  user chose to keep full-bleed.
- **Shadow.** There is nothing to port: desktop has no drop shadow at all (ADR 0032), and tablet's
  shadows were removed at the user's own request — recorded three times in the tablet block. The
  desktop "shadow" people see is rim + crease + stack edge.

## Decision — amplitude is tablet-specific

Desktop's values copied verbatim produced an internal page range of 7 points and looked
near-identical to today (probe 1). Desktop's page reads because the desk beside it sits at 15;
tablet has no desk, so the eye can only compare *within* the page. Probe 2 keeps the recipe and
widens the ramp to a 17-point range, tablet-scoped so desktop is untouched.

| green channel | before | probe 1 (desktop values) | probe 2 (chosen) |
|---|---|---|---|
| page lit centre | 19 | 31 | 39 |
| page outer | 19 | 28 | 31 |
| page into spine | 18 | 24 | 22 |
| internal range | 0 | 7 | 17 |

Tablet-scoped ramp: `--mushaf-lit-core: #1f2b3a`, `-mid: #141e29`, `-fade: #0c141c`,
`-edge: #070d14`, gradient `ellipse 100% 88% at var(--fq-lit-x) 42%`.

## Decision — separator ported verbatim

Tablet's own crease is 36px with `--mushaf-gutter-*` (core `#04070a`, shoulders
`rgba(0,0,0,0.09)` at 40%/60%). Desktop's is 40px with `--mushaf-crease` (`rgba(2,5,8,0.95)`) and
`--mushaf-crease-soft` (`rgba(0,0,0,0.4)`) at 32%/68% — a far deeper valley with wider shoulders.
Measured on tablet after porting: core 8, ±6px 12, ±14px 19, ±20px 24 — a graded fold rather than
a thin line.

## Files to Change

- `app/globals.css`, tablet block only — tablet-scoped `--mushaf-lit-*` override; page gradient +
  inset rim on the dark card; stack edge/face to `--mushaf-sheet-edge` / `--mushaf-sheet-face`;
  crease widened to 40px on the crease tokens.

No TSX changes: tablet already renders 2 stack layers (the deep pair is desktop-only), which is
the "fewer layers" the user asked for.

## Constraints

- Everything stays inside `@media (min-width: 1024px) and (max-width: 1366px)` and
  `:root.theme-dark`. Desktop, mobile, light and gold must not move.
- The existing `:root.theme-dark[data-safha-view="double"] .fq-spread .fq-safha-card { box-shadow:
  none }` is more specific than the new rim rule and would kill it. Fold it into the new rule
  rather than shadowing it with `!important` and leaving a dead declaration behind.
- Drop shadows stay removed. The inset rim is edge light, not a shadow — it does not reopen the
  user's "remove all shadows on tablet" request.
- Verification cannot use the MCP browser: it clamps at 1600px, so the whole tablet band is out of
  reach. Use a throwaway headless script — the local `playwright` package pointed at system Chrome
  via `chromium.launch({ executablePath: "/usr/bin/google-chrome-stable" })` — and sample the PNG.

## What NOT to Do

- Do not inset the tablet book or add margins to create a surround — full-bleed was chosen.
- Do not reintroduce drop shadows on tablet.
- Do not change the shared `--mushaf-lit-*` values in the theme blocks; desktop is signed off.
- Do not add stack layers to tablet.

## Decisions Made

- Tablet gets its own ramp amplitude; "same as desktop" means same recipe, not same numbers, when
  the surround differs.
- The separator is ported verbatim, including width.

## Implementation Result (Pass 3)

Verified headless at 1280×800 dark (throwaway script: the local `playwright` package launched
with `executablePath: "/usr/bin/google-chrome-stable"` — the MCP browser clamps
at 1600px and cannot reach this band). All 12 sample points match the approved probe **exactly**:

| green channel | before | after |
|---|---|---|
| page lit centre | 19 | 39 |
| page outer | 19 | 31 |
| page into spine | 18 | 16 |
| rim, top edge | 18 | 27 |
| crease core → ±6 → ±14 → ±20px | 8 flat | 8 → 12 → 19 → 24 |
| stack edge (RGB) | (88,92,95) neutral | (85,77,65) warm |

Regressions, all sampled rather than reasoned about:
- **Desktop 1538×820 dark** — page centre still 32 (the Pass 2 value, not tablet's 39), surround
  flat (7,15,23), spine 9, stack face (12,19,27). Untouched.
- **Tablet light / gold** — paper (253,253,252) / (246,241,230). No dark leak.
- **Mobile 390×844** — unaffected; a token-consumer audit confirms no `--mushaf-lit-*`,
  `--mushaf-sheet-*` or `--mushaf-crease*` reference exists outside the two desktop/tablet media
  blocks.
- `.theme-dark` / `.theme-dark.dark` value-only diff: 51 tokens each, identical. `npm run lint`
  clean.

One structural change worth noting: the old
`:root.theme-dark[data-safha-view="double"] .fq-spread .fq-safha-card { box-shadow: none }` was
removed rather than overridden. Its selector was more specific than the new rim rule and would
have silently cancelled it; leaving it and forcing past it with `!important` would have left a
dead declaration behind. Drop shadows remain removed on tablet — the rim is edge light, not a
shadow.
