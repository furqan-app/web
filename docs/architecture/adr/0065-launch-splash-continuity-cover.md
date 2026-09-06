# 0065 — Reader Cold-Launch Splash-Continuity Cover

**Status:** accepted (implemented 2026-09-07, issue #586)
**Date:** 2026-09-06
**Issue:** #586
**Related:** [ADR 0042](0042-pwa-launch-resolves-before-first-paint.md), [ADR 0014](0014-pwa-offline-architecture.md) Addenda 6–10, [`decisions/pwa.md`](../decisions/pwa.md) ("App Launch & Back Navigation")

## Context

ADR 0042 moved the launch-time navigation decision before first paint: the OS
opens `launch.html`, which synchronously redirects to the last-read reader page,
so the OS splash stays up until the reader itself paints. That fixed the home
flash and the page-1 flash — but it exposed the next seam. The splash drops at
the destination document's first paint, and that first paint is not the Quran
page: it is the `QuranSafha` loading skeleton (font wait and/or content wait),
followed by the browser's own document/subresource loading indicator, and only
then the settled page. On a mobile standalone PWA the user therefore watches
splash → skeleton → top progress bar → page on every cold launch, even with a
fully downloaded offline cache (issue #586, verified on both mushaf editions).

The OS controls the splash and ends it at first paint; nothing in `launch.html`
can extend it past the navigation. The only surface that can visually continue
the splash is the destination document itself.

## Decision

Reader documents paint a splash-continuity cover as part of their first paint
and lift it when the current pair is actually ready.

- **Shape.** A static, edition-agnostic, locale-agnostic full-viewport layer in
  the reader SSR HTML: manifest `background_color` (`#16232F`) plus the Furqan
  mark as inline markup only (styled text/SVG — no `<img>`, no fetched asset,
  zero extra network requests, honouring the root-layout network budget).
  `aria-hidden`, plain `<div>` — not a Radix Dialog: it blocks no choice, so it
  must take no focus trap and no scroll lock.
- **Scope.** Mobile/tablet standalone only (`standalone && !isDesktopUp`, the
  same scope as the `launch.html` redirect, read via the existing
  `useIsStandaloneMobileOrTablet` hook client-side). Desktop and plain browser
  tabs keep today's behaviour. SSR renders the markup unconditionally (a static
  route cannot know display mode); a parse-time inline script — the same pattern
  as the `fq-pending-jump` gate in `ReaderPage` — reveals it only when the
  standalone-mobile/tablet media queries match, so non-standalone first paint is
  pixel-identical to today with no one-frame cover flash.
- **Removal signal.** The cover lifts when the currently visible pair is ready:
  React Query data present for the visible page(s) under the active `mushafId`
  (which resolves offline via `networkMode: "always"` + the SW `CacheFirst`
  rules) AND `pageFontsReady()` resolved for the visible font ids (the same
  helper Stage A prefetching already waits on — no second font subsystem). It
  composes with, never replaces, the `fq-pending-jump` trio: the jump class is
  lifted unconditionally in the pager's correction layout effect, while the
  cover lifts later in a passive effect once correction AND readiness both
  land — so the cover window is always a superset of the jump window and no
  intermediate state is ever exposed. The ready path additionally waits for
  `QuranMushafContext.hydrated`, so a stored non-default edition never lifts
  the mount-once cover on the SSR default edition's signals (the ADR 0033
  first-flip rule).
- **Bounded reveal.** A mount-side safety timer (starting value 5000ms, ~2× the
  SW navigation race window plus hydration headroom; tunable with on-device
  measurement) lifts the cover unconditionally. A failed readiness signal
  resolves to the reader's own loading state, never a permanent splash-coloured
  blank — the same guarantee the jump gate's 2s timer makes.
- **Motion.** Opacity-only fade (≤250ms, entering `ease-out`), instant when
  `prefers-reduced-motion` is set. Animate only `opacity`, per the styling
  standard.
- **Stacking.** Below the Radix ceiling (`z-40`, never `z-50+`), so the
  first-run `OfflineSetupGate` dialog and every sheet/toast render above it. For
  a fresh install the order is splash → cover → gate on top; dismissing the gate
  reveals the cover (not the skeleton) until the pair is ready.

## Alternatives Considered

**Extend `launch.html` to wait.** Rejected: the OS ends the splash at the
destination's first paint regardless of what the launch document does, and ADR
0042 caps that script at "decide a URL and navigate" — every added line is
untype-checked logic in the most sensitive pre-paint slot.

**Preload the page font earlier (SSR `<link rel=preload>`) instead of a cover.**
Kept as an investigatory companion, not the fix: the server cannot know the
active edition (it lives in `localStorage`), and the SSR words are the default
edition, so an unconditional preload spends bytes for Tajweed users with no
benefit. Ship it only if an edition-safe shape is found (e.g. preload gated on
a cookie/marker the worker already maintains); the cover is the guaranteed win
either way.

**Hold the cover until neighbours prefetch (Stage A/B).** Rejected: the current
pair is what the user sees; waiting on lookahead trades a bounded short cover
for an unbounded one coupled to network speed.

## Consequences

- Cold launch reads as one continuous splash → page transition on standalone
  mobile/tablet; the skeleton spread and the document loading indicator are
  never visible there.
- Browser tabs and desktop are byte-identical to today (cover markup inert,
  never revealed).
- The cover adds no network requests, no service-worker changes, no cache
  version bumps, and no consent-gate interaction (it never starts a download).
- `ReaderPage`'s inline-script count grows by one small parse-time script; like
  the jump-gate script it must stay small enough to verify by reading.
- e2e specs that assert reader content keep passing unchanged (they already
  wait on positive content, not on skeleton absence); the gate focus-trap spec
  is unaffected (cover takes no focus, sits below the dialog).
