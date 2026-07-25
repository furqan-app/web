# ADR 0029: Immutable page font registration via the FontFace API

**Date:** 2026-07-25
**Status:** Accepted

## Context

The reader loads one font per Mushaf page (604 total), so fonts must be registered
incrementally as the persistent pager's window moves (ADR 0028). Browsers discard and
re-parse a `<style>` element's entire stylesheet whenever its text content changes —
including `appendChild(textNode)` — and every `@font-face` in the re-parsed sheet becomes a
**new `FontFace` object starting in `unloaded` status**, even if the same rule was loaded a
moment ago. With `font-display: block` (load-bearing per the Font System decision), text
rendered in a face that just reset paints invisible until the face re-resolves. Any
CSS-injection scheme that ever rewrites a live sheet therefore un-loads the fonts currently
on screen.

## Options Considered

**Option A — FontFace API registry**
Register base page fonts imperatively (`new FontFace` → `document.fonts.add` → `load`);
never touch a face after creation; evict via `document.fonts.delete(face)` per face.

**Option B — One immutable `<style>` element per page id**
Keep CSS `@font-face`, but mount a separate keyed `<style>` per page and never modify an
element after mount (React only mounts/unmounts siblings; sibling mounts don't re-parse
existing sheets).

**Option C — Readiness gating around commits**
Keep the mutating injectors and gate pager commits on font readiness signals. Ruled out
empirically: 24 logged attempts (see `docs/plans/reader-persistent-pager.md`) failed because
readiness is not monotonic — the commit itself triggers the rewrite that resets it.

## Decision

Option A for base page fonts (shared registry `app/utils/page-font-registry.ts`, used by
both the mobile path and `FontFaceInjector`), with Option B retained only for tajweed —
`@font-palette-values` has no FontFace-API equivalent, so tajweed rules live in per-page-id
keyed `<style>` elements whose content never changes after mount. `/fonts/**` is served
with `Cache-Control: immutable` (the paths are versioned) so even an accidental face
recreation costs no revalidation round-trip.

## Consequences

- **+** A loaded font can never become unloaded by loading another — the class of
  swipe-commit blank/flicker bugs is structurally impossible, not just mitigated.
- **+** `document.fonts.check()` becomes genuinely monotonic per page, so `QuranSafha`'s
  `fontReady`/skeleton contract works unmodified and the skeleton finally shows in the
  truly-not-loaded case instead of a stale-true blank.
- **+** LRU eviction is surgical (`delete` one face) instead of a whole-sheet rewrite.
- **-** Base page fonts no longer exist as CSS rules anywhere — debugging font state means
  inspecting `document.fonts`, not the Elements panel.
- **-** Font registration is client-effect-only (no SSR `@font-face`); first fetch of the
  entry page's font still relies on the `<link rel="preload">` in pager markup. (This was
  already true on the pager branch — nothing regressed, but it is now the contract.)
- **-** Two registration mechanisms coexist (registry for base, keyed styles for tajweed)
  because of the `@font-palette-values` limitation.

## The invariant

**Never mutate the text of a live stylesheet that contains `@font-face` rules the user can
currently see.** Add capability by adding new immutable units (a `FontFace` object, a new
`<style>` element); remove capability by removing whole units.
