---
title: Arrow Controls on Desktop
type: feature
date: 2026-07-27
status: implemented
area: reader
---

# Arrow Controls on Desktop

## Summary

Pressing the physical `ArrowLeft`/`ArrowRight` keyboard keys flips Mushaf pages, same as the click nav arrows. Active at any breakpoint (arrow keys only fire from a physical keyboard, rare on touch, so no breakpoint gate). Arrow **and** keyboard navigation commit **instantly** — they do not replay the swipe slide animation, which exists only to complete a drag gesture. A held arrow key flips exactly one page (`e.repeat` guard).

## Approach

`ReaderPager` (ADR 0028) owns page navigation via `animateCommit(goNext, animate = true)`, shared by swipe-commit, the in-spread click arrows (`onArrowNavigate`/`navRef`), and the `keydown` listener this plan adds. Swipe passes the default `true`; arrow and keyboard callers pass `false`, short-circuiting to the same `commitTo(target)` branch `prefers-reduced-motion` already takes — a proven path, no new machinery.

**Direction mapping is locale-independent.** Traced through `computeSpreadNav` (`ReaderPager.tsx`) and `NavigationArrow`'s `showLeft = isRTL ? isNext : !isNext` (`QuranSpread.tsx`): the physical-left position always resolves to forward (`nextAnchor`), physical-right to backward (`prevAnchor`), in both `ar` and `en`. The Quran's page order is fixed regardless of UI language, so a physical spatial mapping doesn't flip with locale. Confirmed with user 2026-07-27.

**Gate the slide on input source, not breakpoint.** A breakpoint gate (`isLgUp`) would leave *tablet arrow-taps* sliding — the arrows render from `md` (768px) — and would kill swipe on a touch laptop at `lg+`. Input source needs no `matchMedia` in the commit path.

**Held-key rate limiting.** The 300ms slide was an *accidental* rate limiter: `isCommitting` stayed true for its duration and dropped triggers arriving inside it. Instant commit clears `isCommitting` synchronously, so a held arrow key would flip at the OS repeat rate (~30/s), each a `flushSync` + `replaceState` + two prefetches. `if (e.repeat) return;` in the `keydown` handler restores one-page-per-press. Rapid arrow *clicking* is left unthrottled — it is hand-limited.

**Dependency:** not shippable without `docs/plans/fix-panel-placeholder-reflow.md` (Trello #157, merged). The pager `Panel`'s loading placeholder was ~72px too tall (`min-h-[calc(100dvh-5.5rem)]`), so an uncached incoming panel overflowed the viewport, toggled the scrollbar, and reflowed the document ~19px sideways — a flicker the 300ms slide had been covering. Instant commit removes the cover, so the placeholder fix must land with it.

## Decision Tree (user-verified)

| Trigger | Behaviour |
|---|---|
| Touch drag release, ≥`COMMIT_THRESHOLD` (80px) | 300ms slide → anchor swap — the slide completes the gesture |
| Touch drag release, <80px | 200ms snap-back |
| Click nav arrow (`md`+, any device) | **instant** `commitTo` |
| Cmd/Ctrl/Shift/Alt-click an arrow | falls through to the `<Link>` (real route nav / new tab) |
| Keyboard `ArrowLeft`/`ArrowRight`, discrete press | **instant** `commitTo` (`ArrowLeft` = forward/`nextAnchor`, `ArrowRight` = backward/`prevAnchor`) |
| Keyboard arrow, OS key-repeat (`e.repeat`) | dropped by an explicit `e.repeat` guard |
| `ArrowLeft`/`ArrowRight` while a text input / `[contenteditable]` is focused | ignored (cursor movement) |
| `ArrowLeft`/`ArrowRight` while `isCommitting.current` | ignored |
| `onNavigate` target that is neither `nextAnchor` nor `prevAnchor`, or recitation-follow (`followTo`) | already `commitTo` — unchanged |
| `prefers-reduced-motion`, any trigger | already `commitTo` — `!animate` short-circuits before the `matchMedia` check, no double-handling |
| Mouse drag | no handlers exist (touch-only) |

## Verified Test Cases

Targets traced through `nextAnchor`/`prevAnchor` and `computeSpreadNav`, not assumed.

| # | Setup | Trigger | Expected |
|---|---|---|---|
| 1 | Desktop 1440px, `/ar/pages/300`, double-view (pair 299/300) | physical-left arrow → `/pages/301` = `nextAnchor` | instant swap to pair 301/302, no slide |
| 2 | Same | physical-right arrow → `/pages/297` = `prevAnchor` | instant swap to pair 297/298 |
| 3 | `/en/pages/300` desktop double-view | physical-left arrow → `/pages/301` | instant, same direction as `ar` |
| 4 | Mobile 390px, `/ar/pages/300` | swipe right 120px | 300ms slide → 301, unchanged |
| 5 | Tablet 820px (`md`, forced single-view, touch) | tap left arrow | instant → 301 (a breakpoint gate would have kept the slide) |
| 6 | Same tablet | swipe right | 300ms slide — both behaviours coexist on one device |
| 7 | Desktop `lg+`, view toggled to single | left arrow | instant ±1 → 301 |
| 8 | Desktop | hold `ArrowLeft` ~2s | exactly one page (301); repeat events dropped |
| 9 | Anchor 1, single-view | prev arrow → `604` = `prevAnchor` | instant wrap to 604 |
| 10 | Recitation playing on 300 | click prev arrow | instant → 297, then `RecitationFollow`'s microtask `followTo(300)` → instant back (less jarring than the old slide-away + snap-back) |
| 11 | Any | Cmd-click an arrow | not intercepted; real `<Link>` navigation |
| 12 | `prefers-reduced-motion` on, touch laptop | swipe | instant (as today) |

Combined verification at 1440-wide desktop `/ar`, 6 consecutive instant arrow commits (228 frames, placeholder path exercised in 14): `documentElement.clientWidth` constant at 1800 (was 1800↔1781), scrollbar 0 (was 0↔19px), one panel inside the viewport (was up to 2), no long tasks (was 76ms first commit) — all *after* the #157 placeholder fix.

## Files to Change

- `app/components/reader/ReaderPager.tsx` — add the `animate = true` parameter to `animateCommit`; the early-return condition becomes `if (!animate || !strip || matchMedia("(prefers-reduced-motion: reduce)").matches)` so the instant path is the same `commitTo(target)` reduced-motion uses. Target resolution and `isCommitting` bookkeeping stay put. Add a `useEffect` registering a `window` `keydown` listener (deps `[animateCommit]`) implementing the decision tree — passes `animate = false`, and `if (e.repeat) return;` immediately after the key-name check. `navRef.current`'s two `animateCommit` calls pass `false`. Update the comment above `animateCommit` to record that only swipe animates and why not `isLgUp`.
- `docs/architecture/COMPONENTS.md` — `ReaderPager` entry: `animateCommit` description + the `ArrowLeft`/`ArrowRight` clause.
- `docs/architecture/DECISIONS.md` — a Constraints bullet under "Reader Navigation — Persistent Client Pager" recording the input-source rule and its `e.repeat` coupling.

`QuranSpread`/`NavigationArrow` are untouched — they hand the pager a target page and know nothing about motion.

## Constraints

- `commitTo` stays the single in-reader navigation primitive (ADR 0028). No second commit path, new state, or new timing machinery for the instant case — reuse the reduced-motion branch.
- Do not touch target resolution (`nextAnchor`/`prevAnchor`, `computeSpreadNav`, wrap-around, `isDouble` pair stepping) — direction and destination are already correct and locale-independent. This change is motion-only.
- Do not touch the `flushSync`/recenter sequence inside `commitTo`, or `followTo`'s microtask deferral — ADR 0028 pager invariants.
- Keep the swipe path byte-for-byte behaviourally identical: drag transform, `COMMIT_THRESHOLD`, `SNAP_BACK_MS`, `EXIT_MS`, `EASE_OUT`.
- Must not fire while `isDragging.current` or `isCommitting.current`; must not intercept modifier-held arrows or arrows while a text input has focus.
- No breakpoint gating — arrow keys are inert without a physical keyboard (user-confirmed).
- Verify on both `/ar` and `/en`, at mobile, tablet (`md`), and desktop widths — device and input vary independently.

## What NOT to Do

- Do not gate on `isLgUp` or any breakpoint — explicitly rejected in favour of input source. A breakpoint gate leaves tablet arrow-taps sliding and kills swipe on touch laptops.
- Do not derive the direction mapping from `isRTL` per-keypress — locale-independent; branching on `isRTL` risks getting it backwards.
- Do not add a cross-fade or any other transition for the arrow/keyboard case — the user chose a plain instant swap. A new opacity/transition on the commit path is exactly what ADR 0029 and `reader-persistent-pager.md`'s flicker sessions warn against.
- Do not merely shorten `EXIT_MS` for arrows — a faster slide still reads as a swipe.
- Do not throttle arrow *clicks* — only key-repeat needed a guard.
- Do not remove or weaken the `isCommitting` guard — the swipe path still depends on it.
- Do not allow queued/interrupting rapid-fire page turns on key-repeat.
- Do not assume this fixes Trello #153 (*rapid swipes silently dropped on tablet, 300ms commit lock*) — swipe keeps both the animation and the lock, so #153 stays open.
- Out of scope, noticed while tracing: on tablet/mobile an arrow tap also bubbles to the strip container's `onClick` → `toggleOverlay()`. Pre-existing, unrelated to motion — do not fix it here.

## Decisions Made

- All breakpoints, not desktop-only (user-confirmed).
- Guard both input-focus and modifier-key combos (user-confirmed).
- **Gate on input source, not breakpoint** (user-confirmed): drag → slide, click/key → instant, at every breakpoint and device.
- **Instant swap, not a cross-fade or a shorter slide** (user-confirmed): reuse `commitTo`, the reduced-motion path; zero new machinery.
- **Held arrow key flips one page** via an `e.repeat` guard (user-confirmed), replacing the rate limit the removed animation was accidentally providing.
- **No ADR needed** — a scoping change to an existing ADR 0028 primitive. `commitTo` stays the single navigation primitive, `animateCommit` the only slide path; no new state or timing behaviour. Consistent with ADR 0028 / 0013 / 0029, and independently backed by the `ui-motion` guidance ("keyboard-triggered actions must never animate"), which is why it was recorded in `DECISIONS.md`.

## Revision History

- 2026-07-30 — folded Addendum 1 (Trello #156): arrow and keyboard page nav no longer replay the swipe slide. **Supersedes the original "reuse `animateCommit` as-is" approach** — `animateCommit` gained an `animate` parameter, click/keyboard callers pass `false` and commit instantly via `commitTo`; an `e.repeat` guard replaces the rate limit the 300ms slide was accidentally providing. Depends on `fix-panel-placeholder-reflow.md` (Trello #157), which removes a pre-existing ~19px reflow flicker the slide had been covering.
