---
title: Mobile app (phone + tablet, iOS + Android) via Capacitor hosted shell
type: feature
date: 2026-09-16
status: ready-to-implement
area: pwa
issue: 644
adr: [0072]
---

# Mobile app (phone + tablet, iOS + Android) via Capacitor hosted shell

## Summary

Ship Furqan as installable phone + tablet apps (iOS + Android) in a minimal-binary Capacitor HTTPS-hosted shell around the existing Next.js PWA: first launch needs connectivity, then downloads the base mushaf edition or continues online. Phases run from shell setup through full parity with the current web state, then mobile-only and tablet-only capabilities; a later native track stays open and must not be blocked. Three independent reviews (internal audit, Gemini 3.8 high-reasoning, Codex terra-xhigh adversarial) agree on this direction; Codex's corrections (hosted-only, iOS Tajweed gate, native auth + push as server work) are load-bearing constraints below. Auth-return slice wired 2026-09-23 (#659): the shell sign-in return leg (callback page + Android App Link + shell handler) under the platform-fidelity invariant — web→web, PWA→PWA, app→app — with return-to-origin preserved in all three contexts.

## Root Cause / Approach

There is no bug — this is a distribution expansion. The approach is reuse-maximal: the mushaf renderer (per-page WOFF2, COLRv1 tajweed pipeline, 15-line layout data), the offline-first marks sync engine, the awrad engine, the `jsonResponse()` API envelope, and the Serwist offline/verify-and-heal machinery all survive unchanged because the shell runs the same app at HTTPS. Native work is confined to: thin shell + bridge plugins, a system-browser auth bootstrap (+ Sign in with Apple), native push registration + fan-out, background-audio session setup, and a first-run mushaf download gate. Anything that would fork the renderer, the sync state machine, or the API envelope is out of scope.

## Decision Tree / Algorithm

Packaging (decided, ADR 0072 — re-verify only on new platform evidence):

- If the binary must work with zero network on first launch → rejected (owner accepted first-launch connectivity 2026-09-16).
- If static export of the full app is proposed → rejected (26 API route handlers + cookie-session NextAuth cannot export; no true Server Actions exist — `app/server/actions/` files are browser fetch wrappers).
- If `capacitor://` + service workers is proposed → rejected (broken on iOS WebKit).
- Else → hosted shell at HTTPS, minimal binary, no baked-in font/Quran assets.

First-run flow (Phase 0 prerequisite: shell detection lands first — `isStandaloneDisplayMode()` is false in a Capacitor WebView, so an `isNativePlatform()` branch must gate every PWA-gated surface before any POC, else the first-run gate renders `null`):

- If online at first launch → offer the `PRECACHE_MUSHAF_ID` base-edition download (per-edition sentinel/progress, same model as the PWA gate) or continue online. Tafsir and recitation stay separate opt-in downloads (ADR 0060 / ADR 0046) — the Phase 0 gate covers the base mushaf edition only, plus reachability of the other download surfaces.
- If offline at first launch → show the offline-fallback document path only (never promise full reading); retry download on reconnect.
- If a later launch finds an evicted/incomplete cache → existing verify-and-heal runs (sentinel + count), same as PWA.

iOS Tajweed gate (implementer verifies on a physical iPhone, owner does not pre-decide):

- If screenshot parity with web passes → ship Tajweed on iOS.
- Else → omit Tajweed on iOS v1 (explicit gap, no CSS fallback — a fallback cannot preserve the mushaf).

Auth flow in shell (return leg wired 2026-09-23, #659 — tree verified with owner):

- If signing in from a plain browser tab → same-tab return to the origin page (`MarkModal`'s `callbackUrl` flow, `[...nextauth]` route untouched).
- If signing in from the installed PWA → same-window return to the origin page.
- If signing in from the shell → system browser session (`Browser.open`, absolute URL) at sign-in with `callbackUrl=/[locale]/native-callback?native=1&target=<shell current path>` → callback page mints the one-time code (gated on `native=1`; unauthenticated visits round-trip through web sign-in first) → App Link URL `/[locale]/native-bootstrap?code=<code>&target=<path>` → Android opens the shell → shell handler (`appUrlOpen` + bootstrap page, race-deduped per code) POSTs to `/api/auth/native-bootstrap` → WebView lands on `target`. Cookie session, never tokens in JS.
- If the App Link URL opens outside the shell (no app, desktop) → code ignored, `replace()` to `target` in the same context; the session already lives there (current behavior, preserved). Only the exchange POST spends a code, so the shell can still use it inside the 10-minute window.
- If the code is invalid/expired → safe error, no loop; shell retry restarts at the system-browser step (a spent code is never retried in place).
- If submitting to the App Store with Google login → Sign in with Apple + backend account linking (incl. private-relay email) ships in the same release.

Capability matrix (what ships where):

| Capability | Phone | Tablet | Web/PWA |
|---|---|---|---|
| Single-page swipe reader | yes | yes | yes |
| Two-page spread | no | yes | desktop-only |
| Reader + tafsir split view | no | yes | no |
| Stylus annotation overlay | no | yes | no |
| Hardware keyboard bindings | no | yes | desktop-only |
| Haptics on mark, share sheet, deep links | yes | yes | no |
| Biometric app lock, widgets | yes | yes | no |
| Background/lock-screen audio | yes | yes | no |
| Native push (APNs/FCM) | yes | yes | web-push only |
| First-run mushaf download | yes | yes | installed-PWA gate |

## Verified Test Cases

Per owner direction (2026-09-16), step-3 case walkthrough is carried by the implementer behind POC gates, not pre-verified here. The gates that constitute "verified" for each phase:

- Phase 0 gate (signed TestFlight internal + Play internal, physical devices): shell-detection lands first (prove `usePwaPrecache` fires and gates render inside the Capacitor WebView) → cold launch online → first-run gate offers the `PRECACHE_MUSHAF_ID` download → download completes with sentinel → airplane mode → any of the 604 pages of the downloaded edition renders from cache with the correct edition font (active-edition check via `readActiveMushafId()`, never bare sentinel); SW registration persists in the shell and an eviction simulation (deleted pages) heals on relaunch; back button closes overlays before exiting; no `capacitor://` URL anywhere.
- Auth/bootstrap gate: fresh install → system browser → link → session cookie present in WebView (`SameSite=None; Secure` verified readable by `getToken`); Google + Apple private-relay linking; no token in JS/`localStorage`. Return-leg cases walked with owner 2026-09-23 (#659): mark → sign-in → same mark page in each of web / PWA / shell; home sign-in returns home; stray App Link lands without consuming the code; expired code shows shell retry, no loop; unauthenticated callback round-trips through sign-in. Implementation verified: 20 unit tests (`app/lib/shell/auth-return.test.ts`, incl. exchange-race dedupe + envelope/error branches), lint clean, no new `tsc` errors; device gate (fresh debug APK + prod-deployed web code, adb-fired intent pre-verification) pending owner.
- `NetworkOnly` negative test: offline `GET /api/marks`, bootstrap and device-token GETs must fail outright, never serve a 200 from the `apis` cache.
- Phase 1 gate: word-level mark made offline in shell syncs on reconnect (push-then-pull, no loss, guest→user stamp migration intact); awrad check-off + streak work **online** (offline awrad needs its own design — out of Phase 1); grant reader loads online and shows the generic fallback offline (accepted limitation); auth bootstrap + Apple linking on a fresh install; Arabic RTL and English LTR parity screenshots.
- Phase 2/3 gate: native push received on both OSes; background audio survives lock; tablet spread + split view + keyboard bindings on a physical tablet.
- iOS Tajweed gate: side-by-side screenshot parity (web vs iPhone, 13+ pages incl. divergent-boundary pages per ADR 0033) — pass ships it, fail omits it on iOS with a logged gap.

## Files to Change

- Root shell scaffold (done, slice 2 + #659): `capacitor.config.ts` (hosted `server.url` per environment via `CAP_SERVER_URL`, default production host, `allowNavigation` pinned, `androidScheme: https`; `appId: "app.furqan"` is pre-release and frozen at first store upload), `android/` + `ios/` native projects (standard CLI layout at repo root — inert for the web build), `@capacitor/{core,cli,android,ios}` 8.5.2 plus `@capacitor/{app,browser}` 8.x in `package.json` (dynamically imported only — never in the web bundle path; android synced, iOS deferred with the platform).
- `mobile/` follow-ups (still open): `isNativePlatform()` detection branch ORed into every PWA gate, native back-button bridge that **delegates to the existing web guards** (`overlay-back-guard.ts` flag, `useCloseOnBackGesture`, `AndroidBackExitGuard` disabled when native — never a parallel bypass system; iOS and Android expectations split), `appStateChange` resume triggers added **alongside** (not replacing) existing triggers for all 4 `storage`-event consumers (`marks/store.ts`, `marks/sync.ts`, `use-pwa-precache.ts`, tafsir `download-manager.ts`).
- `middleware.ts` matcher exclusions: `/.well-known/apple-app-site-association` + `/.well-known/assetlinks.json` were already excluded (verified on `origin/main` — no change needed; else `intl-middleware` locale-prefixes them and Universal/App Links + AASA verification break).
- `app/api/auth/` (extend): `POST /api/auth/native-bootstrap` — verifies a short-lived single-use expiring code from the Universal/App Link callback, sets the session cookie (`SameSite=None; Secure`) and redirects into the app URL; no token ever enters JS, so `extractUser` works unchanged on subsequent requests. Sign in with Apple ships as its own Phase 1 task (provider config, Services key, private-relay linking, link-merge UI) — it needs Apple Developer Program enrollment first, not just code.
- Auth-return web/shell surfaces (done, #659): `app/[locale]/native-callback/page.tsx` + `NativeCallbackHandler` (mints in the system browser iff `native=1`; unauthenticated visits round-trip through web sign-in; stray visits redirect with no mint), `app/[locale]/native-bootstrap/page.tsx` + `NativeBootstrapHandler` (exchanges in-shell, plain `replace()` in browser/PWA), `app/lib/shell/auth-return.ts` (+ 10 unit tests: URL builders, target sanitizer, per-code exchange dedupe, envelope/error branches) — gates on `isNativePlatform()`, never re-derived; exchange clients branch on content-type/body code, never `res.ok` (`jsonResponse()` always answers HTTP 200 — now a `decisions/api.md` constraint). `NativeAuthReturnListener` mounted app-wide in `app/[locale]/layout.tsx`. All 8 web sign-in entries (`MarkModal` ×2, `UserMenu` ×2, marks/plans/mushaf signed-out prompts, `MyMarksList` session-expired banner) route through `openSystemBrowserSignin()` when native, unchanged otherwise. `nativeCallback.*` / `nativeBootstrap.*` keys in both locales. `public/.well-known/assetlinks.json` (placeholder fingerprint — real value from Play Console before prod verification) + `autoVerify` intent-filter for the prod host in `android/app/src/main/AndroidManifest.xml`.
- `app/api/notifications/` + `prisma/app/schema.prisma` (extend, versioned migration): `DeviceToken` model in `furqan_app` only — scalar `user_id` (no `User` relation, ADR 0008), `@unique` token hash, APNs/FCM channel + dedup key (`userId + notificationId`) so a dual web+native user gets exactly one delivery. Add new routes to `protectedRoutes` in `auth-middleware.ts`.
- `app/sw.ts` (extend rule list, same pattern as marks/QDC tafsir rules): explicit `NetworkOnly` ahead of `...defaultCache` for the bootstrap GET, device-token status GETs, and any plans reads if awrad goes offline-capable. POST-only routes need no rule — document why per route. The auth-return slice (#659) adds no rule: mint + exchange are POST-only and the two new documents are plain online-only page navigations (offline → fetch throws → retry UI; never precached, never `NetworkOnly`-listed since that list is API-sync-read-only).
- Phase 0 submission prerequisites (before TestFlight): Apple Developer Program + AASA served + associated-domains entitlement + assetlinks + ATS + audio/background/push modes; reviewer-risk note for the hosted shell (guideline 4.2 — demo offline downloads, native login/push/audio, deep links, reviewer account).
- `docs/` (this task): ADR 0072, `decisions/pwa.md` mobile section, this plan + regenerated `docs/plans/INDEX.md`.

## Constraints

- Minimal binary: never bake any edition into the app (base V1 ≈48 MiB wire / ≈67 MiB stored, V2 ≈95 MiB, Tajweed ≈51 MiB); all bulk content downloads post-install per edition with sentinel + verify-and-heal.
- Awrad stays online-only in Phase 1: plans reads currently fall through to `defaultCache` (24h/10s) with no sync engine, so offline awrad needs its own design + SW rules before it can be gated.
- Tablet split-view, stylus overlay, and hardware keyboard bindings are exploratory Phase 3 — each needs its own renderer-parity gate (15-lines/page print-accuracy risk), unlike the spread which already ships.
- Grant reader requires connectivity; offline it shows the generic fallback (dynamic grant routes are permanently excluded from precache).
- Never fork the renderer, the marks sync state machine, the `jsonResponse()` envelope, or the two-DB no-cross-FK invariant for mobile convenience.
- Native-track future-proofing: every mobile backend addition (bootstrap, Apple linking, `DeviceToken`) must be a pure server addition the web never depends on, so the later native app reuses the same contracts.
- Root-layout network budget, `isStandaloneDisplayMode()`-style gating discipline, and the Radix z-50 ceiling carry over to any shell UI.
- i18n: Arabic RTL and English LTR are both first-class in the shell (mirrored pager direction, `start`/`end` logical properties, `toLocaleNumeral` numerals).
- Design: manuscript reading identity, emerald-only accent, edge-only page depth, no-dependency-on-hover — unchanged inside the shell.
- Platform fidelity, auth return (owner hard requirement 2026-09-23, #659): web→web, PWA→PWA, app→app — any redirect that moves a session across contexts fails the slice; return-to-origin holds in all three. Exchange `callbackUrl` validation stays server-side (same-origin locale paths, backslash rejection); clients mirror it, never relax it.
- Exchange clients branch on the response content-type / envelope body code, never `res.ok` (`jsonResponse()` always answers HTTP 200 — recorded in `decisions/api.md`).
- iOS deferred: no AASA, no associated-domains entitlement — App Links verify against the production host only (LAN-dev builds can't verify); Play Console fingerprint + prod deploy are owner-manual; the shell path is verified on a physical device (fresh debug APK + prod-deployed web code, adb-fired intent until verification lands), never Playwright.

## What NOT to Do

- No full-app static export; no `capacitor://` origin with service workers; no Google OAuth inside the WebView; no Web Push as the native notification solution — all four are permanent rejections (ADR 0072), not fallbacks.
- No CSS/colored-span "tajweed fallback" on iOS — omit instead of faking the mushaf.
- No second accent color, no box-shadow page lift in dark, no raw `<input type="number">`, no `left`/`right` physical properties in new shell UI.
- No offline write-queueing for grant-scoped marks (ADR 0012 last-author-wins hazard stands in the shell too).
- No new root-mounted provider with an unconditional launch-time fetch (root-layout network budget).
- No re-deriving display-mode/back-guard logic outside the shared helpers — the shell's native back branch lives in one place.
- No mint without `native=1`; no auto-redirect loops on any branch; no retrying a spent code in place (retry restarts at the system-browser step).
- No new `protectedRoutes` entries for the return leg (the exchange mints the session it would otherwise require); no SW rules for POST routes; no precaching the callback/bootstrap documents.
- No touching `[...nextauth]` options, the `MarkModal`/prompt web sign-in flow, or `auth-middleware.ts` for the return leg.

## Decisions Made

- Stack: Capacitor hosted shell 1st, Expo RN reserved as the future native track, Flutter and dual-native rejected — unanimous across internal audit, Gemini 3.8 high-reasoning review, and Codex adversarial review (2026-09-16).
- Packaging: minimal binary + first-launch connectivity accepted by owner; static bundle and `capacitor://` rejected per Codex evidence (App Router export limits, WebKit SW bug).
- Scope: phases 0 (shell + POC gates) → 1 (parity) → 2 (mobile-only) → 3 (tablet-only) → 4 (native track later); phone/tablet differences fixed in the matrix above.
- Tajweed-on-iOS and per-case verification deliberately deferred to implementer POC gates per owner direction — recorded here instead of resolved, so the sweep rule ("every claim of unchanged is a hypothesis") is satisfied by gates, not by assertion.
- Slice 6: `native_push` channel key + store getters + channel (skip-paths) + registry entry + 4 unit tests landed with zero web behavior change (no type defaults to it); sender wiring and the web-vs-native dedup policy deferred to Phase 2 push (needs APNs/FCM credentials + device UX before the preference is knowable).
- Submission prerequisite (done): static bilingual `app/[locale]/privacy/page.tsx` + 17 `privacy.*` keys in both locales serves as the Play Console privacy-policy URL; also repaired `light`/`gold`/`dark` theme keys the key-extractor had emptied (Arabic now genuinely translated).
- Review fan-out (2026-09-16): all 6 free opencode models were sent the plan read-only — 4 returned approve-with-fixes (7, 5, 6, 7/10), 1 returned reject-and-why (3/10, direction still called sound), 1 abstained (narration only). Convergent findings were folded into this plan: Server-Actions wording corrected (zero `use server` directives exist), shell-detection prerequisite, 4-consumer `storage` replacement, explicit `NetworkOnly` list, one-time bootstrap design (`SameSite=None; Secure`, no token-in-JS), Apple linking as its own Phase 1 task, submission prerequisites moved to Phase 0, awrad online-only scoping, per-edition byte counts, `/.well-known/` matcher exclusions, back-bridge delegation. Single-source claims kept as gates, not facts (first-run SW-readiness validation, tajweed 13+ page methodology per ADR 0033 divergent boundaries).
- Plan sweep: no existing test asserts shell behavior (no mobile spec exists yet — Phase 0 adds device-gate checklist, not Playwright); no sync read may fall through to `defaultCache` (marks `NetworkOnly` rule already covers; new bootstrap/device-token endpoints get the same treatment); `useSession()` stays render-only (owner stamp keeps its evidence-based signal).
- Auth-return slice implemented 2026-09-23 (#659, in-review): pre-implementation sweep found `e2e/helpers/auth.ts` has zero `signin`/`callbackUrl` refs — no existing test asserts the new routes, nothing invalidated; `useSession()` stays render-only (both handlers read fetch status, never session state). Antigravity review of the branch caught 4 blockers, all fixed before ship: relative URL passed to `Browser.open` (now absolutized), dead `response.status === 401` check (the mint POST now sends `Content-Type: application/json` per `isJSONRequest` and branches on the envelope's `code`, since `jsonResponse()` answers HTTP 200), listener/page double-spend race (per-code in-flight dedupe + spent short-circuit in `auth-return.ts`), retry looping a spent code in place (now restarts at the system browser) — plus an 8th sign-in site the plan had missed (`MyMarksList` session-expired banner). 20 unit tests green, lint clean, no new `tsc` errors. No ADR (implements ADR 0072's decided path); the `jsonResponse()`-always-200 client rule is recorded in `decisions/api.md`. `assetlinks.json` ships with a placeholder fingerprint; Play upload deferred per owner — pre-verification device gate runs via adb-fired intent.

## Revision History

- 2026-09-23: folded the native-auth-return addendum into the body (Summary, Decision Tree, Verified Test Cases, Files to Change, Constraints, What NOT to Do, Decisions Made). **Nothing from the pre-fold body was removed and nothing was superseded** — the addendum refined open items (auth flow, middleware matcher state, SW rules, shell deps) to as-implemented truth (#659).
