---
title: PWA Cold Launch Splash-Continuity Cover
type: feature
date: 2026-09-06
status: implemented
area: pwa
issue: 586
adr: [65]
---

# PWA Cold Launch Splash-Continuity Cover

## Summary

On the installed mobile/tablet PWA, the OS splash drops at the reader
document's first paint and the user then watches a skeleton spread plus the
browser's loading indicator before the Quran page settles — even with a fully
downloaded offline cache, on both mushaf editions. Since the OS ends the splash
at first paint, the destination document itself paints a static
splash-continuity cover (manifest background + Furqan mark, zero network) and
lifts it when the current pair's data + fonts are ready, with a bounded safety
reveal. Full decision in [ADR 0065](../architecture/adr/0065-launch-splash-continuity-cover.md).

## Root Cause / Approach

Root cause: ADR 0042 fixed *where* the launch lands before first paint, but the
first paint of a reader document is the `QuranSafha` loading state
(`!fontReady || !hasContent`), not the settled page — font fetch/decode, JS
hydration, and (for non-default editions or unvisited pages) JSON fetch all
happen after the splash is already gone. The thin top bar is the destination
document's own load continuing after `launch.html`'s `location.replace()`.

Approach: don't fight first paint — own it. Render cover markup in the reader
SSR HTML (static, same bytes for every user, so no CDN poisoning shape and no
dynamic rendering), reveal it pre-paint only on standalone mobile/tablet via a
parse-time inline script (the `fq-pending-jump` pattern), and remove it
client-side when the visible pair is ready or the safety timer fires. Companion
speedup (earlier font preload) ships only if an edition-safe shape is found;
the cover does not depend on it.

## Decision Tree / Algorithm

The tree agreed with the user (2026-09-06, issue #586 discussion):

- If the launch comes from `launch.html` on mobile/tablet `standalone`, the
  cover paints with the first paint in `background_color` with the Furqan mark
  and zero new network requests.
- If the current pair is ready immediately (fonts + data), the cover lifts at
  once with no visible flash.
- If the current pair is not ready, the cover stays, hiding the skeleton and
  the loading indicator beneath it until readiness.
- If the `fq-pending-jump` correction is pending, the cover waits for both the
  correction and readiness: the jump class lifts unconditionally in the pager's
  correction layout effect, and the cover lifts after that in a passive effect,
  so the cover window always covers the jump window and no intermediate state
  is exposed.
- If the safety timeout (5000ms from mount, tunable) expires first, the cover
  lifts unconditionally — never a stranded blank.
- If the visitor is a plain browser tab or desktop, no cover ever reveals;
  behaviour is pixel-identical to today.
- If `prefers-reduced-motion` is set, removal is instant (no fade).
- Preload speedup: ship only with an edition-safe design (no wasted bytes for
  non-default-edition users, no new launch-path requests).

Ready = React Query data present for the visible page(s) under the active
`mushafId` (offline-safe via `networkMode: "always"`) AND `pageFontsReady()`
resolved for the visible font ids (single view: anchor page only; double view:
both pages of the pair).

## Verified Test Cases

Walked through with the reporter (standalone mobile PWA, bulk download
complete, happens on both editions, thin top bar after skeleton):

| Case | Cover behaviour |
|---|---|
| Cold launch, default edition, fully cached | Cover paints pre-paint; lifts when seeded data + cached font confirm ready (fast, possibly imperceptible) |
| Cold launch, Tajweed edition, fully cached | Same; readiness keyed to the *active* edition's query key + `pageFontsReady(ids, tajweedEdition)` — never the default edition's signals |
| Cold launch, page never visited, offline, complete cache | Cover stays through the `fq-pending-jump` correction; lifts when the corrected pair's cached JSON + font are ready |
| Cold launch, incomplete/no cache, slow network | Cover stays through the SW shell + client fetch; safety timer guarantees reveal even if readiness never signals |
| Fresh install (gate shows) | Gate dialog renders above cover (`z-50` vs `z-40`); Skip/Download then reveal cover, not skeleton |
| Browser tab / desktop standalone | Cover markup present but never revealed — first paint identical to today |
| `prefers-reduced-motion` | Instant hide, no opacity transition |

## Files to Change

- `app/components/reader/LaunchSplashCover.tsx` (new, client) — null-leaf
  controller (RecitationFollow pattern, renders nothing): owns the safety timer
  + reduced-motion handling + `pageFontsReady` wait; props `dataReady` /
  `visibleIds` / `edition`; `aria` needs none (renders null). The cover shell
  itself lives as static markup in `ReaderPage` (below), not here, so first
  paint needs no JS.
- `app/components/reader/ReaderPage.tsx` (server) — render cover markup
  (`#fq-launch-cover`, inline wordmark, `aria-hidden`) in the SSR HTML +
  parse-time reveal script (standalone-mobile/tablet media check,
  `fq-pending-jump` pattern); no per-user content, stays statically generated.
- `app/components/reader/ReaderPager.tsx` (client) — derive visible-pair
  readiness (current query data + `pageFontsReady` for visible ids, same helper
  Stage A uses) and pass to the cover; lift cover in the same frame as the
  `fq-pending-jump` removal.
- `app/globals.css` — cover styles: `position: fixed; inset: 0`,
  `background: #16232F`, `z-40`, opacity-only fade ≤250ms `ease-out`,
  `motion-reduce` instant path.
- `e2e/tests/offline-pwa.spec.ts` — extend or add: cover never strands a cold
  launch (content appears within bound); gate focus-trap test keeps passing
  (cover takes no focus). Existing content assertions need no change (they wait
  on positive content).
- `docs/architecture/decisions/pwa.md` — ADR 0065 summary entry under "App
  Launch & Back Navigation".
- `docs/architecture/adr/0065-launch-splash-continuity-cover.md` — new (written
  with this plan).

## Constraints

- Quran page routes stay statically generated with no per-user SSR (Non-negotiable
  invariant) — cover markup is identical bytes for every user.
- `public/launch.html` stays capped at "decide a URL and navigate" (ADR 0042) —
  no waiting logic there; manifest `id`, `start_url`, `display` untouched.
- The `fq-pending-jump` script + CSS rule + pager removal stay intact as one
  mechanism; the cover composes with it, never replaces any leg.
- Bulk precache stays explicit-tap-only (Addendum 2) — the cover must not start,
  probe, or depend on any download.
- Offline UI stays at `z-50` or below; the cover sits at `z-40` so the gate,
  sheets, and banners render above it.
- Ready signal derives only from offline-safe sources (React Query
  `networkMode: "always"` data + `pageFontsReady`) — never `useSession()` (lies
  offline), never `navigator.onLine`.
- Motion standard: opacity-only, ≤250ms, `ease-out` enter, instant under
  `prefers-reduced-motion`; no JS animation dependency.
- Cover artwork is inline-only (no `<img>`, no fetched asset) — root-layout
  network budget compliance.
- e2e: Playwright runs against a production build (`e2e:serve`), never `next dev`
  (SW disabled in dev); standalone spoofing per `docs/standards/pwa-testing.md`.

## What NOT to Do

- Do not add waiting/timing logic to `public/launch.html` or move any launch
  decision into a React effect (both reintroduce what ADR 0042 removed).
- Do not build the cover on Radix Dialog or any focus-trapping primitive — it
  blocks no choice and must take no focus (the gate's focus-trap spec must keep
  passing).
- Do not gate cover removal on neighbour prefetch (Stage A/B lookahead) — only
  the visible pair.
- Do not satisfy one edition's readiness from another edition's cached data
  (ADR 0033 isolation; same rejection as Addendum 9).
- Do not add an unconditional SSR font preload for the default edition — it
  spends bytes for Tajweed users the server cannot detect. Preload ships only
  with an edition-safe design or not at all.
- Do not change `app/sw.ts`, cache names/versions, the sentinel, or
  `globPublicPatterns` in this task.
- Do not memoize or cache the standalone/mobile scope read per session in a way
  that survives rotation/resize incorrectly — read at reveal time like the
  existing `matchMedia` call sites.

## Decisions Made

- Cover + speedup-companion (reporter's pick: "both, cover primary"). The
  speedup is investigatory with a hard acceptance bar; the cover is the
  guaranteed fix.
- Scope is standalone mobile/tablet only (mirrors `launch.html`), not all
  browsers — avoids hiding content where no splash preceded it.
- Default-hidden + parse-time reveal (not default-visible + client hide), so
  browser-tab first paint cannot flash the cover for one frame.
- Safety timeout starting value 5000ms (~2× the 3000ms SW navigation race +
  hydration headroom); on-device tuning was deferred (no device in this
  session) — local production-build E2E keeps the starting value, and the 1b
  spec asserts the ready path lifts well under it. Revisit on the first
  on-device pass if cold-launch traces show the bound too tight or too loose.
- Review fixes (`/review-fq-work`, 2026-09-07, 9 findings): the ready path now
  waits for `QuranMushafContext.hydrated` so a stored Tajweed edition never
  lifts the mount-once cover on pre-hydration default-edition signals (ADR 0033
  first-flip rule); the safety timer re-arms after a StrictMode dev remount
  (nullable id instead of a boolean flag); the keep-in-sync constraint in
  `decisions/pwa.md` now names the cover reveal script alongside `launch.html`;
  ADR 0065 promoted to accepted; cover `background` case-corrected to `#16232F`;
  the 1b spec asserts lift latency (<4500ms with ~1.2s font delay) to prove the
  ready path rather than the safety timer. Not taken: extra e2e cases (Tajweed
  ready path, jump composition, gate stacking, reduced-motion) — valuable but
  each needs its own harness setup; proposed as follow-up work, not this task.
- Sweep (plan §3b) findings: `e2e/tests/offline-pwa.spec.ts` test 1 asserts the
  first-run gate's focus trap and skip persistence — cover must not take focus
  (plain `div`, `aria-hidden`) and must stack below the dialog; `e2e/helpers/reader.ts`
  asserts positive content (not skeleton absence), so auto-removal on readiness
  keeps it green. No `GET /api/*` is added (no `defaultCache` interaction). No
  new state derives from `useSession()`/`onLine`. "SSR preload" was initially
  listed as a firm speedup — corrected during the sweep to investigatory-only
  after confirming the server cannot know the active edition (`localStorage`-only)
  while SSR words are default-edition.
- Implementation notes (2026-09-07): the SSR font-preload companion was
  **skipped entirely** — no edition-safe shape exists (server cannot know the
  active edition; unconditional default-edition preload wastes bytes for Tajweed
  users) and the existing client-side `<link rel=preload>` for the current page
  (ReaderPager) already covers the safe case. Shell/controller split: cover
  markup lives in `ReaderPage` SSR, removal logic in the null-leaf controller
  (mounted directly after `FontFaceInjector` for the effect-order guarantee —
  `pageFontsReady` settles instantly for unregistered ids). E2E verified
  locally against a production build: new test 1b (mobile project — desktop
  viewport ≥1367px is excluded from the cover scope by design, so the desktop
  project can never reveal it) asserts pre-paint reveal then ready-path lift;
  test 1 (gate focus-trap) still passes. `background: #16232F` in `globals.css`
  is an intentional theming-rule exception: it must equal the manifest
  `background_color` byte-for-byte (platform splash contract, not a theme
  token).
