# Handoff — Reading-Desk Depth for Light & Gold (and de-duplicating the reader CSS)

**Written:** 2026-07-28, at the end of the dark-theme session
**Predecessor:** `docs/plans/dark-theme-mushaf-unification.md` (implemented, committed as `71e1540`)
**Status:** brief only — the next session runs `/plan-fq-task` and writes its own plan

## Goal

Give light and gold the reading-desk treatment dark now has — lit page face, warm rim, sheet
stack, binding crease — **and** collapse the per-theme/per-band duplication that the dark work
accumulated, instead of adding two more copies of it.

## Why the refactor comes first (the user's point, and he is right)

Every request in the dark session arrived scoped: "dark only", "tablet only", "desktop only". Each
was implemented exactly that way — `:root.theme-dark` inside `@media (min-width: 1367px)`, then
again inside the tablet block. Correct per request; wrong in aggregate. The same visual idea now
exists in several places with different values and different guards, and `globals.css` is ~1200
lines.

Adding light and gold the same way makes it six copies. This already caused two real regressions,
both caught only by review, never by the code:

- The tablet card rule was **theme-agnostic**, so deleting its shadows "for dark" silently
  flattened light and gold — while a comment 60 lines below still claimed light/gold render
  byte-identically.
- `:root.theme-dark nav .text-muted-foreground { color: white !important }` was written for the
  glass nav bar, but the search dropdown renders *inside* `<nav>`, so its whole text hierarchy
  collapsed to one white.

Both are fixed in `71e1540`. The structural cause is not.

**Target shape:** define the treatment **once**, theme-agnostic — gradient geometry, rim, crease,
stack, floating chrome — and let each theme supply only *values* through the existing token
contract. Keep band scoping only for genuine layout differences (tablet is full-bleed `100dvh`;
desktop is a floating book). Values differ per theme; rules should not.

## Measured baseline — capture this again before touching anything

Modal colour of a 28×28 patch, `/ar/pages/51`, double view. Regenerate with the script below and
**diff against these numbers**.

| band | theme | page outer | page mid | page inner | spine | desk/edge |
|---|---|---|---|---|---|---|
| mobile | dark | (15,21,28) | (18,25,31) | (17,24,31) | — | (15,22,29) |
| mobile | light | (251,251,250) | (252,252,251) | (253,253,253) | — | (252,252,252) |
| mobile | gold | (245,240,230) | (247,242,232) | (247,242,232) | — | (245,240,230) |
| tablet | dark | (22,32,44) | (27,38,52) | (16,25,34) | (5,8,11) | (8,16,25) |
| tablet | light | (253,253,252) | (253,253,252) | (248,248,248) | (235,236,236) | (241,243,246) |
| tablet | gold | (246,241,230) | (246,241,230) | (241,236,226) | (219,213,201) | (236,230,214) |
| desktop | dark | (20,29,39) | (22,32,42) | (17,26,35) | (5,8,11) | (7,15,23) |
| desktop | light | (255,255,255) | (255,255,255) | (254,254,254) | (255,255,255) | (238,242,247) |
| desktop | gold | (250,249,244) | (250,249,244) | (249,248,243) | (250,249,244) | (237,230,212) |

Read it before designing anything:

- **Light and gold at desktop are completely flat.** Spine equals paper (255 vs 255; 250 vs 250) —
  there is no crease, no ramp, no stack separation at all. That band is the real gap.
- **Light and gold at tablet already have some depth** — a visible crease (235 / 219 against paper
  253 / 246) and a slight inner-edge ramp. That is the HEAD treatment restored in `71e1540`; the
  new shared design will probably replace it. Expected, not a regression — but diff it so the
  replacement is deliberate.
- **Dark is the reference and is signed off.** Its numbers must not move.

## How to actually reach the design (this is the part that matters)

The design does not live in adjectives. Ten correction rounds were lost to "make it deeper" with
nobody measuring. What finally worked, every time:

1. **Measure the current state first.** Sample pixels; do not infer from CSS.
2. **Probe by injection, not by editing.** Put candidate CSS in a file and pass it as the script's
   `extra.css` argument. Nothing is written to `globals.css` until a value is chosen.
3. **Render two or three candidates, screenshot each, and let the user pick from images.** Copy
   them somewhere he can open — `/home/tahamohamed/Desktop/cs/non-work/projects/furqan/.playwright-mcp/`
   is where he has been finding them. Give him the numbers next to the images.
4. **Apply the chosen values verbatim.** Do not "improve" them on the way in. A `--mushaf-gutter-soft`
   was once substituted for a verified `rgba(0,0,0,0.4)` — 4× weaker, silently.
5. **Re-measure after applying and confirm it reproduces the probe exactly.**

Corollary learned the hard way: **the same value does not mean the same effect.** Desktop's ramp
copied verbatim to tablet measured correctly and looked unchanged, because desktop's page reads
against a desk at 15 and tablet is full-bleed with nothing to contrast against. Expect light and
gold to need their own amplitudes — their paper is near-white, so the *direction* of the ramp
(and whether depth comes from light or shadow) is a genuine design question, not a port.

## Non-negotiables

- **Dark must come out pixel-identical.** The user signed it off. A refactor that reads beautifully
  and shifts dark by 3 points has failed. Diff every dark cell in the table above.
- **ADR 0032 currently says the depth tokens are dark-only, deliberately** — on `(7,15,23)` shadows
  produce no visible pixels, while light and gold carry depth with ordinary shadows. Sharing the
  mechanism across themes **supersedes that constraint**. That is legitimate, but it must be an
  explicit supersede in the ADR + `DECISIONS.md`, never a quiet reversal.
- `.theme-dark` and `.theme-dark.dark` stay identical **in value** — compare parsed token sets, not
  text. They have drifted twice.
- Gold stays reader-page-only; emerald stays `162 88% 41%` (ADR 0031).
- Do not touch reading typography or page sizing — ADR 0004 (viewport-fit), ADR 0011 (mobile
  formula), ADR 0005 (changing `baseScaleViewHeight` requires regenerating the
  `tailwindFontUtility` safelist in the same commit or the font silently fails).

## Traps specific to `globals.css`

- **The Tailwind utility layer beats `@layer base` on source order.** A colour declaration that a
  utility also sets will silently lose — `background-color: hsl(var(--card))` on the recitation bar
  never applied. Either raise specificity deliberately (`:root.theme-x .foo`, which does win) or
  drop the declaration; do not leave dead CSS behind.
- Rules carrying `[data-safha-view="double"]` are more specific than plain `:root.theme-dark .foo`
  and will cancel it regardless of order. One such rule had to be deleted rather than overridden.
- Several long comments in the tablet block are **historical records for rules that no longer
  exist** (Correction Rounds 3–8). They were annotated in `71e1540`, not deleted. Do not treat them
  as describing current behaviour.
- Some dark tokens are now unconsumed (`--mushaf-gutter-*`, `--mushaf-paper-shadow`,
  `--mushaf-edge` in dark). Reader review flagged them; they were left alone because deleting
  tokens the standards doc mandates is its own decision. Good candidate for this refactor.

## Tooling

```bash
node scripts/dev/reader-shot.mjs <width> <height> <theme> <out.png> [extra.css] [url]
```

Committed in `71e1540`. Drives system Chrome headless at any viewport and prints the measured card,
stack, arrow and bar rectangles as JSON.

- **The MCP/headed browser clamps at ~1600px**, so the entire tablet band (1024–1366) is
  unreachable in it. That is why this script exists. Playwright's own browsers are not installed
  (~150MB); it points at `/usr/bin/google-chrome-stable`.
- **Derive sample points from the printed geometry, never from viewport fractions.** The pager
  mounts three panels side by side; a fraction like 0.955 lands on the desk, not the paper. A whole
  round of recorded numbers was wrong this way.
- **Sample the modal colour of a patch, not a single pixel** — a lone pixel can land on glyph
  antialiasing, which is how a page centre once read as `(242,232,192)`.
- Dev server for that worktree ran on **7001**; override with `PORT`.

## Workflow

New Trello card, `/plan-fq-task` → `/start-fq-task`, own branch and worktree. This is **not** an
addendum to #148 — that task is finished and committed.

## Also open, tracked separately

Rapid swipes are silently dropped on tablet — a 300ms commit lock in `ReaderPager` swallows any
gesture starting inside the commit window. Unrelated to theming.
Trello [#153](https://trello.com/c/qkKb5UFn).
