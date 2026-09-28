---
title: Mobile app (phone + tablet, iOS + Android) via Capacitor hosted shell
type: feature
date: 2026-09-16
status: ready-to-implement
area: pwa
issue: 644
adr: [0072, 0075]
supersedes: [fix-native-auth-link-scope]
---

# Mobile app (phone + tablet, iOS + Android) via Capacitor hosted shell

## Summary

Ship Furqan as installable phone + tablet apps (iOS + Android) in a minimal-binary Capacitor HTTPS-hosted shell around the existing Next.js PWA: first launch needs connectivity, then downloads the base mushaf edition or continues online. Phases run from shell setup through full parity with the current web state, then mobile-only and tablet-only capabilities; a later native track stays open and must not be blocked. Three independent reviews (internal audit, Gemini 3.8 high-reasoning, Codex terra-xhigh adversarial) agree on this direction; Codex's corrections (hosted-only, iOS Tajweed gate, native auth + push as server work) are load-bearing constraints below. Native Google sign-in wired on Android 2026-09-28 (#728, ADR 0075): replaces the earlier system-browser bootstrap with native Credential Manager plus a NextAuth Credentials provider (`google-native`), flushes WebView cookies on pause, makes App Links (verse share URLs) navigate the shell, and narrows session/jwt callbacks to `{ id, name, email }`.

## Root Cause / Approach

There is no bug — this is a distribution expansion. The approach is reuse-maximal: the mushaf renderer (per-page WOFF2, COLRv1 tajweed pipeline, 15-line layout data), the offline-first marks sync engine, the awrad engine, the `jsonResponse()` API envelope, and the Serwist offline/verify-and-heal machinery all survive unchanged because the shell runs the same app at HTTPS. Native work is confined to: thin shell + bridge plugins, native Google Credential Manager + Credentials provider (+ Sign in with Apple on iOS), native push registration + fan-out, background-audio session setup, and a first-run mushaf download gate. Anything that would fork the renderer, the sync state machine, or the API envelope is out of scope.

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

Auth flow in shell (Android verified 2026-09-28, #728 — ADR 0075 supersedes ADR 0072's bootstrap):

- Sign-in:
  - Web tab or installed PWA: Google OAuth provider, unchanged.
  - Shell: every sign-in entry calls `nativeGoogleSignIn(target?)`, in this order:
    1. `SocialLogin.initialize({ google: { webClientId } })`, once per page load.
    2. `SocialLogin.login({ provider: "google", options: {} })` (default scopes: email, profile, openid).
    3. `signIn("google-native", { idToken, redirect: false })`.
    4. On success, `window.location.assign(target ?? current path)`.
  - User dismisses the account sheet: do nothing. No message, still signed out.
  - Any other failure (no Google account on device, no network, server rejects the token, `[28444]` misconfiguration): show the shell sign-in error notice and stay signed out. There is no client-side log: `getLogger()` imports `next/headers` and is server-only. Server-side rejections are logged by `verifyNativeGoogleIdToken` (`auth.native_google.*`) and by NextAuth's logger.
  - Server (`google-native` `authorize`): run `OAuth2Client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })`. Reject if verification throws or `email_verified !== true`. Otherwise upsert the user by email (same upsert as the existing `signIn` callback) and return `{ id, name, email }`.
- Sign-out (shell): `signOut({ redirect: false })`, then `SocialLogin.logout({ provider: "google" })` (best effort, errors ignored), then `window.location.reload()`.
- App Links (shell only):
  - The URL is `https://furqan.taha7.com` with a path matching `^/(ar|en)(/|$)`: navigate to `pathname + search`.
  - Cold start (`App.getLaunchUrl()` on listener mount): navigate only if the URL is not yet recorded in `sessionStorage`, then record it. `getLaunchUrl()` repeats on every reload.
  - Warm open (`appUrlOpen`): always navigate, with no guard. Each event is a fresh tap, and the same link tapped twice must work twice.
  - Different host or non-locale path: ignore.
- Session persistence: `MainActivity.onPause()` calls `CookieManager.getInstance().flush()`.
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
- Native sign-in & shell test cases (walked with owner 2026-09-28, #728):

| Case | Expected |
|---|---|
| Sign in from MarkModal on page 300 | Back on page 300, signed in |
| Dismiss the account sheet | Nothing shown, still signed out |
| Device has no Google account | Error notice, signed out |
| Server rejects the token | Error notice, signed out |
| Offline tap on sign-in | Error notice, signed out |
| Signed in, swipe from Recents, reopen | Still signed in |
| Verse share link, app not running | Opens the shared verse |
| Verse share link, app in background | Opens the shared verse |
| Reload after a link-driven navigation | No re-navigation loop |
| Sign out, then sign in | Account sheet appears again |
| Web tab and installed PWA sign-in | Unchanged Google OAuth flow |

Device gate: a Play internal-testing build (Play App Signing SHA-1 registered) on the owner's physical device, running every row above. Unit tests cover pure pieces (57 tests passing across `app/lib/shell`, `app/components/shell`, `app/components/nav`, `app/api/auth`).
- `NetworkOnly` negative test: offline `GET /api/marks`, device-token GETs must fail outright, never serve a 200 from the `apis` cache.
- Phase 1 gate: word-level mark made offline in shell syncs on reconnect (push-then-pull, no loss, guest→user stamp migration intact); awrad check-off + streak work **online** (offline awrad needs its own design — out of Phase 1); grant reader loads online and shows the generic fallback offline (accepted limitation); auth bootstrap + Apple linking on a fresh install; Arabic RTL and English LTR parity screenshots.
- Phase 2/3 gate: native push received on both OSes; background audio survives lock; tablet spread + split view + keyboard bindings on a physical tablet.
- iOS Tajweed gate: side-by-side screenshot parity (web vs iPhone, 13+ pages incl. divergent-boundary pages per ADR 0033) — pass ships it, fail omits it on iOS with a logged gap.

## Files to Change

- Root shell scaffold (done, slice 2 + #659 + #728): `capacitor.config.ts` (hosted `server.url` per environment via `CAP_SERVER_URL`, default production host, `allowNavigation` pinned, `androidScheme: https`; `appId: "app.furqan"` is pre-release and frozen at first store upload), `android/` + `ios/` native projects (standard CLI layout at repo root — inert for the web build), `@capacitor/{core,cli,android,ios}` 8.5.2 plus `@capacitor/{app,browser}` 8.x, `@capgo/capacitor-social-login` ^8.5.11, and `google-auth-library` ^10.9.1 in `package.json` (dynamically imported only — never in the web bundle path; android synced, iOS deferred with the platform).
- `mobile/` follow-ups (still open): `isNativePlatform()` detection branch ORed into every PWA gate, native back-button bridge that **delegates to the existing web guards** (`overlay-back-guard.ts` flag, `useCloseOnBackGesture`, `AndroidBackExitGuard` disabled when native — never a parallel bypass system; iOS and Android expectations split), `appStateChange` resume triggers added **alongside** (not replacing) existing triggers for all 4 `storage`-event consumers (`marks/store.ts`, `marks/sync.ts`, `use-pwa-precache.ts`, tafsir `download-manager.ts`).
- `middleware.ts` matcher exclusions: `/.well-known/apple-app-site-association` + `/.well-known/assetlinks.json` were already excluded (verified on `origin/main` — no change needed; else `intl-middleware` locale-prefixes them and Universal/App Links + AASA verification break).
- Auth & Shell surfaces (#728, ADR 0075):
  - `android/app/src/main/java/app/furqan/MainActivity.java`: `onPause()` calls `CookieManager.getInstance().flush()`; implements `ModifiedMainActivityForSocialLoginPlugin`.
  - `app/api/auth/options.ts`: CredentialsProvider `google-native` verifying Google ID tokens with `google-auth-library`; narrowed `jwt` and `session` callbacks exposing `{ id, name, email }`.
  - `app/lib/shell/native-signin.ts` (`nativeGoogleSignIn`, `nativeSignOut`, `classifyNativeSignInError`) + `app/lib/shell/app-links.ts` (`appLinkTarget`, `isSafeLocalePath`).
  - `NativeAppLinkListener.tsx` + `NativeSignInErrorNotice.tsx` mounted in `app/[locale]/layout.tsx`.
  - All 6 sign-in call sites (`MarkModal.tsx`, `MarksSignedOutPrompt.tsx`, `MyMarksList.tsx`, `SignedOutPrompt.tsx`, `PlansSignedOutPrompt.tsx`, `UserMenu.tsx`) switched to `nativeGoogleSignIn`. `UserMenu` calls `nativeSignOut()`.
  - Removed obsolete return-leg code: `native-callback` / `native-bootstrap` pages and handlers, `/api/auth/native-bootstrap*` routes, `NativeBootstrapCode` model and migration `20260928120000_drop_native_bootstrap_codes`.
- `app/api/notifications/` + `prisma/app/schema.prisma` (extend, versioned migration): `DeviceToken` model in `furqan_app` only — scalar `user_id` (no `User` relation, ADR 0008), `@unique` token hash, APNs/FCM channel + dedup key (`userId + notificationId`) so a dual web+native user gets exactly one delivery. Add new routes to `protectedRoutes` in `auth-middleware.ts`.
- `app/sw.ts`: explicit `NetworkOnly` ahead of `...defaultCache` for device-token status GETs, and any plans reads if awrad goes offline-capable. POST-only routes need no rule.
- Phase 0 submission prerequisites (before TestFlight): Apple Developer Program + AASA served + associated-domains entitlement + assetlinks + ATS + audio/background/push modes; reviewer-risk note for the hosted shell (guideline 4.2 — demo offline downloads, native login/push/audio, deep links, reviewer account).
- `docs/` (this task): ADR 0072, ADR 0075, `decisions/pwa.md` mobile section, this plan + regenerated `docs/plans/INDEX.md`.

## Constraints

- Minimal binary: never bake any edition into the app (base V1 ≈48 MiB wire / ≈67 MiB stored, V2 ≈95 MiB, Tajweed ≈51 MiB); all bulk content downloads post-install per edition with sentinel + verify-and-heal.
- Awrad stays online-only in Phase 1: plans reads currently fall through to `defaultCache` (24h/10s) with no sync engine, so offline awrad needs its own design + SW rules before it can be gated.
- Tablet split-view, stylus overlay, and hardware keyboard bindings are exploratory Phase 3 — each needs its own renderer-parity gate (15-lines/page print-accuracy risk), unlike the spread which already ships.
- Grant reader requires connectivity; offline it shows the generic fallback (dynamic grant routes are permanently excluded from precache).
- Never fork the renderer, the marks sync state machine, the `jsonResponse()` envelope, or the two-DB no-cross-FK invariant for mobile convenience.
- Native-track future-proofing: every mobile backend addition (Apple linking, `DeviceToken`) must be a pure server addition the web never depends on, so the later native app reuses the same contracts.
- Root-layout network budget, `isStandaloneDisplayMode()`-style gating discipline, and the Radix z-50 ceiling carry over to any shell UI.
- NextAuth is the only code that sets or names the session cookie.
- ID tokens are verified server-side only. Never trust `decodeIdToken`.
- `webClientId` is the web client ID, never the Android one.
- Web / PWA sign-in path and the `[...nextauth]` route handler stay untouched. The only options change is the added provider plus the narrowed callbacks.
- In `@capgo/capacitor-social-login` on Android, passing an explicit `scopes` array requires `MainActivity` to implement `ModifiedMainActivityForSocialLoginPlugin`. `SocialLogin.login({ provider: "google", options: {} })` omits explicit `scopes` (default scopes already request `email`, `profile`, `openid`), and `MainActivity` implements `ModifiedMainActivityForSocialLoginPlugin` as a belt-and-suspenders guard.
- App Links stay scoped to `/ar` | `/en` on the prod host (`decisions/pwa.md`).
- Session persistence: `MainActivity.onPause()` calls `CookieManager.getInstance().flush()`.
- No new SW rule: `signIn` posts to `/api/auth/callback/google-native` (POST, never cached).
- `useSession()` stays render-only. Nothing persistent derives from the sign-in result.
- i18n: Arabic RTL and English LTR are both first-class in the shell (mirrored pager direction, `start`/`end` logical properties, `toLocaleNumeral` numerals).
- Design: manuscript reading identity, emerald-only accent, edge-only page depth, no-dependency-on-hover — unchanged inside the shell.
- iOS deferred: no AASA, no associated-domains entitlement — App Links verify against the production host only (LAN-dev builds can't verify); Play Console fingerprint + prod deploy are owner-manual; the shell path is verified on a physical device, never Playwright.

## What NOT to Do

- No full-app static export; no `capacitor://` origin with service workers; no Google OAuth inside the WebView; no Web Push as the native notification solution — all four are permanent rejections (ADR 0072), not fallbacks.
- Do not keep the system-browser bootstrap as a fallback. It is removed, not dormant.
- Do not hand-encode a NextAuth JWT or set a session cookie from any custom route.
- Do not pass the Android client ID as `webClientId`, and do not enable the plugin's Facebook provider.
- Do not trust client-decoded ID token claims.
- Do not start iOS in this slice.
- Do not add a toast library for one notice.
- No CSS/colored-span "tajweed fallback" on iOS — omit instead of faking the mushaf.
- No second accent color, no box-shadow page lift in dark, no raw `<input type="number">`, no `left`/`right` physical properties in new shell UI.
- No offline write-queueing for grant-scoped marks (ADR 0012 last-author-wins hazard stands in the shell too).
- No new root-mounted provider with an unconditional launch-time fetch (root-layout network budget).
- No re-deriving display-mode/back-guard logic outside the shared helpers — the shell's native back branch lives in one place.

## Decisions Made

- Stack: Capacitor hosted shell 1st, Expo RN reserved as the future native track, Flutter and dual-native rejected — unanimous across internal audit, Gemini 3.8 high-reasoning review, and Codex adversarial review (2026-09-16).
- Packaging: minimal binary + first-launch connectivity accepted by owner; static bundle and `capacitor://` rejected per Codex evidence (App Router export limits, WebKit SW bug).
- Scope: phases 0 (shell + POC gates) → 1 (parity) → 2 (mobile-only) → 3 (tablet-only) → 4 (native track later); phone/tablet differences fixed in the matrix above.
- Tajweed-on-iOS and per-case verification deliberately deferred to implementer POC gates per owner direction — recorded here instead of resolved, so the sweep rule ("every claim of unchanged is a hypothesis") is satisfied by gates, not by assertion.
- Slice 6: `native_push` channel key + store getters + channel (skip-paths) + registry entry + 4 unit tests landed with zero web behavior change (no type defaults to it); sender wiring and the web-vs-native dedup policy deferred to Phase 2 push (needs APNs/FCM credentials + device UX before the preference is knowable).
- Submission prerequisite (done): static bilingual `app/[locale]/privacy/page.tsx` + 17 `privacy.*` keys in both locales serves as the Play Console privacy-policy URL; also repaired `light`/`gold`/`dark` theme keys the key-extractor had emptied (Arabic now genuinely translated).
- Native Google sign-in (2026-09-28, #728, ADR 0075): native Google sign-in replaces the system-browser bootstrap. The old path is removed entirely. Keep App Links for verse sharing and fix their navigation here. Include cookie flush on pause and session/jwt callback narrowing. Android only. A dismissed account sheet is silent.
- Package: `@capgo/capacitor-social-login` over a hand-written plugin (maintenance), `@capacitor-firebase/authentication` (Firebase for auth alone), and `@codetrix-studio/capacitor-google-auth` (abandoned). Checked 2026-09-27: v8.5.11 published 4 days earlier, Capacitor 8 support, npm provenance, MPL-2.0.
- Sweep: no e2e spec references the removed routes (`grep` of `e2e/`). The only tests asserting the old flow are the three unit files listed above, which are rewritten, not deleted silently. `app/sw.ts` has no native-route rule to remove. `assetlinks.json` already carries two real SHA-256 fingerprints, so App Link verification should not need a change. The cold-start `getLaunchUrl()` re-navigation loop was found in this sweep (from source) and is covered by the handled-URL guard.
- Plan `fix-native-auth-link-scope.md` (#715) is superseded. Its App Links scoping shipped and stands, and its auth-return parts are moot.
- Review corrections (OpenCode Muse Spark 1.3, 2026-09-28):
  - Handled-URL guard scoped to cold launch URL only; warm `appUrlOpen` is never guarded.
  - `google-auth-library` pinned to `^10` (Node >=18 compatible for CI).
  - Added audience guard in `verifyNativeGoogleIdToken`.
  - JWT callback strips `password`, `created_at`, `updated_at` from pre-existing tokens.
  - Client-side `fq-logger` call dropped as infeasible (server-only logger).
- Device/emulator testing (2026-09-28): `@capgo/capacitor-social-login` checks for `ModifiedMainActivityForSocialLoginPlugin` on Android when custom `scopes` are passed. Since default scopes already include `email`, `profile`, and `openid`, explicit `scopes` were dropped from `SocialLogin.login({ provider: "google", options: {} })`, and `MainActivity.java` implements `ModifiedMainActivityForSocialLoginPlugin` as a belt-and-suspenders guard.

## Revision History

- 2026-09-28: folded native Google sign-in / Credential Manager addendum into the body (native Google sign-in replaces system-browser bootstrap; **ADR 0072's system-browser auth bootstrap superseded by ADR 0075**; `fix-native-auth-link-scope.md` superseded) (#728).
- 2026-09-23: folded the native-auth-return addendum into the body (Summary, Decision Tree, Verified Test Cases, Files to Change, Constraints, What NOT to Do, Decisions Made). **Nothing from the pre-fold body was removed and nothing was superseded** — the addendum refined open items (auth flow, middleware matcher state, SW rules, shell deps) to as-implemented truth (#659).
