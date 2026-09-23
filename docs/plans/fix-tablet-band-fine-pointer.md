---
title: Fix tablet-band reader for non-touch laptops via input-capability gating
type: bug
date: 2026-09-18
status: implemented
area: reader
issue: 642
adr: [0071]
---

# Fix tablet-band reader for non-touch laptops via input-capability gating

## Summary

Non-touch laptops whose viewport falls in the 1024–1366px band are served the tablet reader experience and lose the mark modal (mouse click does nothing) plus swipe navigation. The fix splits the two concerns the width hook currently conflates: layout stays width-gated (forced double-page, full-bleed, bottom-bar chrome unchanged) while interaction (click-to-mark vs long-press, overlay tap-toggle, pointer drag) gates on a new coarse-pointer capability hook — so the band keeps its shape and fine-pointer laptops behave like desktop inside it.

## Root Cause / Approach

`useIsTablet()` (`(min-width: 1024px) and (max-width: 1366px)`) covers common laptop viewports. It flips `NavOverlayContext.isOverlayMode` on, which switches `QuranWord` from click-to-mark to long-press-only and repurposes tap as the `ReaderPager` strip's overlay toggle. A fine-pointer device with no touch gets neither path, plus pair-step nav it never asked for. Approach per ADR 0071: add `useIsCoarsePointer()` (`(pointer: coarse)`, SSR default `false`), expose a capability-gated interaction flag from `NavOverlayContext`, and re-key only the interaction branches to it. Fix the mark-modal trigger first (hard blocker), navigation discoverability second.

## Decision Tree / Algorithm

| Device in 1024–1366px band | Mark modal trigger | Overlay chrome | Page-turn inputs | Spread layout |
|---|---|---|---|---|
| Touch tablet (coarse primary) | Long-press (unchanged) | Tap toggles, auto-hide (unchanged) | Touch swipe (unchanged) | Forced double, pair-step (unchanged) |
| Non-touch laptop (fine primary) | Mouse click opens modal | Pinned visible, background click toggles (touch parity for mouse) | Keyboard + mouse-drag (no arrows — see below) | Forced double, pair-step (unchanged) |
| Touch-laptop (fine primary + touch) | Mouse click opens modal | Always visible | Touch swipe still works + arrows/keyboard/drag | Forced double, pair-step (unchanged) |
| Desktop ≥1367px | Mouse click (unchanged) | Always visible (unchanged) | Arrows + keyboard (unchanged) | Stored single/double preference (unchanged) |

Rules: capability defaults to fine on SSR (interaction may be one frame wrong; positioning may not — ADR 0043). Capability never drives `position`/`display`. Strip background `onClick` toggles the overlay when coarse and the pinned chrome when fine-band (word clicks stopPropagation to the modal first); desktop clicks do nothing. `isDouble` keeps reading `isTablet` only.

## Verified Test Cases

Walked through with the reporter and confirmed: 1280px non-touch laptop today shows zero modal on word click and no swipe path — after the fix, click opens `MarkModal` and arrows/keyboard/drag all turn pages while the spread stays double. Touch tablet at the same width keeps long-press modal, tap-toggle overlay, and swipe with no behavior change. Touch-laptop (fine primary) gets click-modal plus working touch swipe simultaneously. Desktop ≥1367px is byte-for-byte unchanged (stored view preference, rail, bottom-bar rules).

## Files to Change

- `app/hooks/use-is-coarse-pointer.ts` (new) — `(pointer: coarse)` hook mirroring the `useIsTablet` shape.
- `app/contexts/NavOverlayContext.tsx` — keep `isOverlayMode` (layout) and add the capability-gated interaction flag; `toggleOverlay` no-ops when interaction is fine-pointer. A second toggle, `toggleFineChrome`, flips the fine band's pinned chrome (with a band entry/exit reset so a stale dismissed flag can never strand the nav).
- `app/components/QuranWord.tsx` — click opens the modal when interaction is fine-pointer even inside the band; long-press handlers mount only when coarse.
- `app/components/QuranLine.tsx`, `app/components/QuranSafha.tsx` — thread the interaction flag through (`isOverlayMode` prop becomes the capability-gated value; layout consumers untouched).
- `app/components/reader/ReaderPager.tsx` — strip tap-toggle gated on coarse; fine-band background click calls `toggleFineChrome` (word clicks stopPropagation first, so the modal never fights the toggle); add fine-pointer mouse-drag (Pointer Events) sharing the `animateCommit(goNext, true)` swipe path; `isDouble` untouched. In-spread arrows stay hidden in the band (they are `display: none !important` below 1367px by design — full-bleed bands navigate by swipe, `docs/design/design-principles.md` "Navigation buttons"); no arrow changes in this task.
- `app/components/nav/Nav.tsx`, `app/components/RecitationPlayerBar.tsx`, `app/components/plans/PlansWidget.tsx` — keep consuming layout `isOverlayMode` (no change; verify by grep).
- New Playwright spec (e.g. `e2e/tablet-band-pointer-gating.spec.ts`) — 1280px matrix: `{ hasTouch: false }` asserts click-modal + arrows/keyboard/drag; `{ hasTouch: true }` asserts long-press modal + swipe + tap-toggle.
- `docs/architecture/adr/0071-reader-interaction-capability-gating.md`, `docs/architecture/decisions/reader.md`, `docs/architecture/DECISIONS.md` — written in this plan phase.

## Constraints

- ADR 0043: breakpoint positioning stays CSS `@media`-gated; the capability query is additive and interaction-only.
- ADR 0028 + arrow-controls Addendum 1: gate animation/interaction on input source, never on breakpoint.
- ADR 0013: pairing `(1,2),(3,4)…`, CSS `data-safha-view` display gate, and pair-step nav stay intact.
- Styling Motion section: keyboard-initiated commits stay instant (`animate=false`); hover-only affordances stay behind `(hover: hover) and (pointer: fine)`.
- Sweep (step 3b): no existing unit/e2e asserts the broken behavior (`PlansWidget.smart-completion.test.tsx` mocks `isOverlayMode: false` — unaffected); no API/SW/offline-signal involvement — client interaction gating only.

## What NOT to Do

- Do not move the 1367px desktop threshold or redefine the 1024–1366px band (moves the cliff; breaks 860px spread cap / 96px rail budget / ADR 0054 contracts).
- Do not change page pairing or the `/pages/[id]` route shape.
- Do not restyle tablet/desktop chrome or force single-page for fine pointers in the band.
- Do not drive `position`/`display` from the capability hook and do not add a pre-paint inline script for it.
- Do not re-unify arrows/keyboard onto the animated commit path and do not `router.push` for in-reader turns.

## Decisions Made

- User confirmed (2026-09-18): fine-pointer laptops in the band get full desktop interaction while keeping forced-double layout; touch behavior unchanged.
- Fix order: mark-modal trigger first, navigation discoverability second — per the issue's recommended first step.
- True-coarse-primary hybrids with a mouse keep touch interaction (accepted tradeoff; documented in ADR 0071).
- New ADR 0071 created in the plan phase; sweep corrections (no test invalidation, no SW/offline surface) recorded above rather than silently fixed.
- Implementation correction (2026-09-18): the plan assumed in-spread arrows render in the band (`hidden md:flex`); they do not — `globals.css` hides `.fq-nav-arrow` below 1367px and the 52px circle treatment lives in the `@media (min-width: 1367px)` block, per the "Navigation buttons" principle. Fine-pointer band navigation is keyboard + mouse-drag only; the arrows e2e was replaced with a hidden-arrows lock plus keyboard pair-step coverage. The `title` tooltip added to `NavigationArrow` only ever surfaces ≥1367px.
- Implementation correction 2 (2026-09-18): permanently pinned chrome overlapped the full-bleed band pages with no dismiss path (reporter-verified). Fine band keeps pinned-visible as its default but gains background-click toggling (`toggleFineChrome`) — the mouse equivalent of the touch tap-toggle; word clicks still stopPropagation to the modal first.
- Implementation correction 3 (2026-09-20): CI e2e failed 3 mobile long-press specs because the `mobile` Playwright project emulated no touch (`hasTouch` unset → `(pointer: coarse)` false → long-press handlers never mount). Fixed by setting `hasTouch: true` on the mobile project — real phones are coarse, so the project now emulates what it names; verified the 3 specs plus touch-adjacent suites green locally.
