# Stabilize Tajweed Stylesheet Injection and Extend Swipe Hover Suppression

**Type:** bug
**Date:** 2026-08-23
**Status:** implemented

## Summary

Three separately-scoped perf items under the tajweed swipe-flicker epic (#371), following #372
(font pre-warming) and #373 (skeleton flash/layout jump), both already shipped. This is not a
re-investigation of the swipe flicker's confirmed root cause (`docs/plans/fix-tajweed-swipe-flicker.md`,
ADR 0023 Addendum 8: `:hover` filter/transform cost on multi-layer COLRv1 glyphs, fixed by suppressing
the filter during an active drag) — that stands. #371 scopes "stylesheet injection churn stabilization"
and "extend swipe hover suppression" as their own goals, distinct from the flicker diagnosis. Addendum
8's "not CSS `<style>`-insertion recalc cost" finding ruled the insertion churn out as *the flicker's
driver* (equal-magnitude longtask cost with or without the mutation) — it did not establish the churn
as free, and this issue targets it on its own merits.

## Root Cause / Approach

**1. `FontFaceInjector` stylesheet churn — AND a pre-existing ADR 0029 violation found during
implementation.** `app/components/reader/FontFaceInjector.tsx` mounted one `<style>` DOM element per
LRU-kept page id (cap 24), added/removed by React as the persistent pager's window shifts on swipe.
ADR 0029 documented this as safe ("React only mounts/unmounts siblings; sibling mounts don't re-parse
existing sheets"). **That claim was empirically false.** Live instrumentation against the real running
app (`document.fonts` status polling across real page turns, not a synthetic test) showed every single
swipe reset **every already-loaded tajweed `FontFace` doc-wide** to `unloaded` the instant a new page's
`<style>` mounted — not just the newly-mounted id's. This is the exact "structurally impossible" class
of bug ADR 0029 exists to prevent, silently present in production. Two further variants were tested
before landing on a fix:
- A shared `CSSStyleSheet` (via `document.adoptedStyleSheets`) mutated with targeted `insertRule`/
  `deleteRule` — confirmed to reset every face in the shared sheet on **both** insert and remove. Worse
  than the original design, not better. Rejected.
- **Separate `CSSStyleSheet` objects, one per id, added via `document.adoptedStyleSheets.push()`** —
  confirmed via the same live measurement to cause **zero** resets on insertion (the common case, under
  the 24-id cap). Removal (eviction past the cap) still resets every other adopted sheet — no worse than
  today, just not improved on that path. **This is the fix implemented.**

Fixed: `FontFaceInjector` now creates one `CSSStyleSheet` per page id (via `sheet.replaceSync()` once,
at creation — safe, since a brand-new sheet has no prior CSS-connected face to reset), tracked in a
`useRef<Map<number, CSSStyleSheet>>`, adopted via `document.adoptedStyleSheets.push()` for entering ids
and removed via array-filter reassignment for evicted ids. No more `<style>` DOM elements at all.
Verified live: 8 real page turns under the 24-cap produced **zero** `loaded → unloaded` transitions
across 22 tracked tajweed families (previously: every swipe reset all of them).

**2. `.fq-dragging` removed before its settle animation finishes.** `ReaderPager.tsx`'s touch handlers
strip `.fq-dragging` (the class gating off the Addendum-8 hover suppression, `globals.css`) the instant
touch lifts, in `onTouchEnd`/`onTouchCancel` — before either the 300ms commit slide (`animateCommit`,
`EXIT_MS`) or the 200ms sub-threshold snap-back (`SNAP_BACK_MS`) has actually finished animating the
strip. During that still-animating window, a touch-primary browser's synthetic hover-on-tap can
re-trigger the expensive filter on a COLRv1 glyph. Fix: move the class removal to fire where each
settle path actually completes, not where the touch handler happens to run.

**3. No root-level touch guard.** `QuranWord.tsx`'s `hover:` utilities compile to a plain `:hover`
selector (Tailwind's default, unconfigured in `tailwind.config.ts`) — no `@media (hover: hover)` guard
exists anywhere, so pure-touch devices have no protection against the filter beyond drag-state timing.
Fix: a scoped `@media (hover: none)` override in `globals.css`, next to the existing `.fq-dragging`
rule — not a global Tailwind `hover` variant redefinition, which would change hover behavior on every
hoverable element app-wide, including things explicitly out of scope (desktop mouse hover UX).

## Decision Tree / Algorithm

**Item 1 — FontFaceInjector sheet lifecycle:**

| Event | Action | Resets sibling ids' FontFace status? |
|---|---|---|
| Page id enters the LRU-kept window | New `CSSStyleSheet`, `replaceSync()` once at creation, adopted via `document.adoptedStyleSheets.push()` | No — measured live, zero resets across 22 families over 8 real swipes |
| Page id evicted from the LRU-kept window (past `MAX_KEPT`=24) | Its sheet removed via `document.adoptedStyleSheets = document.adoptedStyleSheets.filter(...)` | Yes — same as the pre-existing (and, it turns out, already-present) behavior; not solved, not worsened |
| Edition switches away from `usesColorGlyphs` | All of this instance's adopted sheets removed and its tracking `Map` cleared | N/A — full teardown, not a partial diff |
| FontFaceInjector unmounts | Same full teardown, via a separate mount-only effect (`deps: []`) so its cleanup doesn't fire on every ordinary id-list change | N/A |
| Non-colour-glyph edition (`!edition.usesColorGlyphs`) | No sheet ever adopted — unchanged from the original early return | N/A |

**Item 2 — `.fq-dragging` removal, by settle path:**

| Path | Today | Fix |
|---|---|---|
| Commit slide (`animateCommit` → `EXIT_MS` timeout → `commitTo`) | Removed synchronously in `onTouchEnd`, before the 300ms slide starts | Removed inside `commitTo`, after the transform snaps to rest — covers both the natural timeout and `settleInFlight`'s early-takeover path, since both call `commitTo` |
| Sub-threshold snap-back (`onTouchEnd`, deltaX < `COMMIT_THRESHOLD`) | Removed synchronously before the 200ms snap-back starts | Removed inside the existing `snapClearTimer` callback, alongside the existing `transition = ""` reset |
| Touch-cancel snap-back (`onTouchCancel`, was dragging, snap-back branch) | Removed synchronously before the 200ms snap-back starts | Same `snapClearTimer`-callback treatment as the sub-threshold path above |
| New touch/drag interrupts an old settle in progress | N/A today | Commit case: `onTouchStart`'s `settleInFlight()` synchronously lands via `commitTo` (which removes the class) before the new drag's `onTouchMove` can re-add it — no race. Snap-back case: found during implementation that clearing `snapClearTimer` alone was **not** sufficient — it cancels the callback that was going to remove the class, which would otherwise leave `.fq-dragging` stuck forever if the new touch never becomes a real drag. Fixed by also removing the class immediately at the same point `onTouchStart` clears the timer. |

**Item 3 — root touch guard vs. item 2, by device class:**

| Device | `hover: hover`? | Item 3 (`@media (hover: none)`) applies? | Item 2 still matters? |
|---|---|---|---|
| Pure touch (phone, tablet) | No | Yes — filter suppressed unconditionally | No — item 3 alone already suppresses it |
| Hybrid (touchscreen laptop, mouse present) | Yes | No — filter not suppressed by item 3 | Yes — a touch interaction there can still trigger synthetic hover mid-settle |
| Mouse/trackpad only (desktop) | Yes | No | N/A — no touch handlers ever run; hover behaves as today, unchanged |

## Verified Test Cases

Walked through with the user, confirmed one question at a time:

1. **Settle-path scope (item 2):** confirmed to cover all three paths — commit slide, sub-threshold
   snap-back, and touch-cancel snap-back — not just the `EXIT_MS` commit path the issue text names
   literally, since the sub-threshold and cancel paths carry the identical synthetic-hover exposure.
2. **Item 2 vs. item 3 overlap:** confirmed both are implemented as separately-scoped, complementary
   fixes per #371's explicit "In scope" list — item 3 does not replace item 2, since item 2 is still the
   only protection for hybrid (`hover: hover` true) devices during the settle window.
3. **Item 1 technique (superseded during implementation — see "Root Cause / Approach" above):** at
   planning time, confirmed `adoptedStyleSheets` + targeted `insertRule`/`deleteRule` on a *shared* sheet
   over staying with `<style>`-per-id DOM elements, on the assumption both the old design and this one
   preserved the "never touch a sibling page's rule" invariant. Live `document.fonts` instrumentation
   during implementation disproved that assumption for both — the shared-sheet variant was rejected and
   replaced with separate per-id sheets (the technique actually shipped).
4. **ADR scope tension:** confirmed via the parent epic (#371's body explicitly lists "stylesheet
   injection churn stabilization in FontFaceInjector" as its own scoped item) that item 1 is a
   deliberate, separately-scoped perf goal — not a silent override of ADR 0023 Addendum 8's "do not fix
   this by changing CSS `<style>`-injection mechanics," which was scoped to the flicker's root-cause fix
   specifically, not to future perf work on the same file. Re-verified against `origin/main` before this
   conclusion was finalized (no drift in any of the touched files or the prior plan/ADR since #395 landed).

## Files to Change

- `app/components/reader/FontFaceInjector.tsx` — replaced per-id `<style>` elements with one
  `CSSStyleSheet` per id (own `replaceSync()` at creation only), tracked in a `useRef<Map>`, adopted via
  `document.adoptedStyleSheets.push()`/removed via filter-reassignment as the LRU window shifts. Component
  now returns `null` unconditionally — no JSX render path left for tajweed rules at all.
- `app/components/reader/ReaderPager.tsx` — moved `.fq-dragging` removal out of `onTouchEnd`/
  `onTouchCancel`'s synchronous body into `commitTo` (commit path) and the `snapClearTimer` callback
  (both snap-back paths); also added an explicit class removal to `onTouchStart`'s existing
  `snapClearTimer`-clearing block (found necessary during implementation — see the decision tree above).
- `app/globals.css` — added the `@media (hover: none), (pointer: coarse)` override for
  `.fq-qword:hover`/`.fq-ayah-end:hover`, next to the existing `.fq-dragging` rule — the negation of the
  project's documented `(hover: hover) and (pointer: fine)` hover-gating convention (`ui-motion` skill).
- `docs/architecture/adr/0023-tajweed-mushaf-mode.md` — Addendum 9 revised in place (branch still open)
  to describe the technique actually implemented and verified, not the originally-planned one.
- `docs/architecture/adr/0029-immutable-page-font-registration.md` — amended: Option B's "sibling mounts
  don't re-parse existing sheets" claim is corrected (empirically false), and the tajweed path's move to
  per-id adopted sheets is recorded as superseding Option B for that case.
- `docs/architecture/DECISIONS.md` — Tajweed Mushaf Mode section updated with the corrected summary; two
  stale Font System constraint bullets describing the removed `<style>`-per-id design also corrected.
- `docs/architecture/COMPONENTS.md` — `FontFaceInjector` entry rewritten to describe the adopted-sheet
  mechanism instead of the removed keyed-`<style>` one.
- `app/utils/mushaf-editions.ts` — `usesColorGlyphs`'s doc comment corrected; it referenced the removed
  "keyed-`<style>` path in FontFaceInjector."

## Constraints

- Item 1 must never share one `CSSStyleSheet` across multiple ids, and must never call `replaceSync()`
  on a sheet that already backs a loaded face — both confirmed live to reset sibling ids' FontFace status.
  Only a brand-new, never-yet-adopted sheet's own initial `replaceSync()` is safe.
- Item 2's class removal must happen at each settle path's actual completion point (or at the point an
  interruption cancels that path), not be reintroduced as an eager removal at touch-lift time.
- Item 3's guard must stay scoped to `.fq-qword`/`.fq-ayah-end` inside `globals.css` — no changes to
  `tailwind.config.ts`'s (nonexistent) `hover` variant, and no change to desktop mouse hover UX or
  `MarkModal` activation (explicitly out of scope per the issue).
- No changes to banner SVG art, skeleton bar geometry/line count, theme palette colors, or
  `--Light`/`--Dark`/`--Gold` palette overrides — all explicitly out of scope.

## What NOT to Do

- Do not re-open the swipe flicker's root-cause investigation (ADR 0023 Addendum 8) — it is confirmed
  and unchanged; this plan's item 1 is a separate perf goal, not a new theory about the flicker.
- Do not use a shared `CSSStyleSheet` with `insertRule`/`deleteRule` for item 1 — confirmed live to reset
  every face in the sheet on both insert and remove, worse than the fix that shipped.
- Do not redefine Tailwind's global `hover` variant for item 3.
- Do not drop item 2 on the assumption item 3 makes it redundant — it remains the only guard for hybrid
  (mouse-plus-touch) devices.
- Do not trust ADR 0029's original "sibling mounts don't re-parse existing sheets" claim for Option B —
  it was empirically disproven this session; see the ADR's amendment.
- Do not restore the stale "~9-10x heavier font" or superseded per-edition hover-branch claims anywhere
  in this plan or its files — both were already corrected in the prior flicker fix.

## Decisions Made

- All three items (stylesheet-reset elimination on insertion, settle-window class-removal timing,
  root-level touch guard) are implemented as separately-scoped, complementary fixes per #371's explicit
  scope split — none supersedes or reopens another.
- Item 1 does not contradict ADR 0023 Addendum 8's "what not to do" — that constraint was scoped to the
  flicker's root-cause fix, confirmed via the parent epic's own explicit scoping of this as a distinct
  perf goal, and re-verified against `origin/main` before finalizing.
- A pre-existing ADR 0029 violation was discovered during implementation (not planning) — the documented
  "sibling mounts don't re-parse existing sheets" claim for tajweed's `<style>`-per-id design was false,
  confirmed via live `document.fonts` instrumentation on the real app, not reasoning from source. Fixed
  as part of this task per explicit user direction, rather than deferred to a separate issue.
- Fix verified live, not just by type-checking: 8 real page turns under the 24-id cap produced zero
  `loaded → unloaded` transitions across 22 tracked tajweed families (previously: every swipe reset all
  of them). Eviction past the cap still resets — unchanged from the pre-existing (if undocumented)
  behavior, not a regression.
- `/review-fq-work` delegated to OpenCode (`opencode/x-preview-f-free`, read-only `plan` agent) surfaced
  a real bug this session's own testing had missed: `ReaderPager.tsx`'s `jumpTo` (edition switch,
  sidebar/rub/continue-reading nav) cancelled a pending commit-slide's timer without removing
  `.fq-dragging`, which the settle-timing fix above made load-bearing — a `jumpTo` landing mid-slide
  would have left the hover cue stuck disabled indefinitely. Fixed in `commitTo`'s absence by removing
  the class at the same point `jumpTo` cancels `inFlight`. The review also found: a real (if minor)
  hydration-timing regression from moving stylesheet adoption into an effect (fixed — switched to
  `useIsomorphicLayoutEffect`); the `hover: none` guard should have matched the project's own documented
  `(hover: hover) and (pointer: fine)` convention rather than a narrower ad hoc condition (fixed —
  changed to `(hover: none), (pointer: coarse)`, the correct De Morgan negation); and four stale-doc
  findings (this plan's own "Verified Test Cases" item 3, two DECISIONS.md bullets, one
  `mushaf-editions.ts` comment) all still describing the removed `<style>`-per-id design — all corrected.
  A supplementary `/impeccable critique` pass (this diff has no visual/rendered changes, so scoped rather
  than run as a full dual-agent/browser critique) independently surfaced the same hover-guard convention
  gap. One latent, unreachable-today finding (FontFaceInjector's sheet cache keys by page id only, not
  id+edition — would only matter if a second colour-glyph edition is ever added) was documented in-code
  rather than fixed, since QCF V4 Tajweed is currently the only such edition.
