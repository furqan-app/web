---
title: Fix native auth return hijack — scope App Links, log auth errors, refresh session after landing
type: bug
date: 2026-09-27
status: superseded
area: pwa
issue: 715
---

# Fix native auth return hijack — scope App Links, log auth errors, refresh session after landing

## Summary

On the Play-installed shell, tapping sign-in opens the system browser at a
verified App Links URL (`/api/auth/signin?...`), and Chrome hands that URL
straight back into the shell WebView — because the manifest's `autoVerify`
filter covers the entire host with no path scope. Google rejects embedded
OAuth inside the WebView, so the user is stuck on the NextAuth sign-in error
page with no mint row ever created. Fix in three parts: (1) scope the
intent-filter to locale content paths (`/ar`, `/en`) so `/api/*` stays in the
browser; (2) wire NextAuth's `logger` into `fq-logger`/Sentry so the next
auth failure of any kind is captured with its exact code; (3) force a shared
session refetch after a successful bootstrap landing (proven valid cookie,
stale UI on the emulator).

## Root Cause

Two compounding defects, both proven with evidence (no assumptions):

1. **Over-broad verified App Links (the hijack).**
   `android/app/src/main/AndroidManifest.xml` lines 31–36 declare
   `autoVerify` for `https://furqan.taha7.com` with no `pathPrefix`/`pathPattern`.
   Every URL on the host — including `/api/auth/signin?callbackUrl=...`,
   which `openSystemBrowserSignin()` opens in the Custom Tab — is a verified
   App Link. With "open supported links" enabled, Chrome routes the sign-in
   URL back into `MainActivity`'s WebView, where Google hard-rejects embedded
   OAuth (`disallowed_useragent`) and NextAuth renders `signin?error=...`
   (banner + Google button, a dead end: every tap re-fails in place, zero
   mint rows). Verified end to end:
   - Vivo Play install (versionCode 5, cert `7E:18...` matching prod
     `assetlinks.json`, domain `verified`) reproduces: chooser → app banner,
     no `native_bootstrap_codes` row.
   - Same flow with "open supported links" DISABLED on the same phone, same
     account, minutes later: full success, mint row created. Only variable
     was OS link routing.
   - Emulator debug build (self-signed cert ≠ assetlinks, unverified):
     clean Custom Tab flow, mint rows 14/15/16, one spend verified
     (`used_at` set on row 16).
   - Server + Google + upsert proven healthy throughout (desktop fresh
     login OK; emulator fresh login OK).

2. **Stale signed-out UI after a good exchange (the race remainder).**
   After a manually delivered App Link spend on the emulator, the server
   spent the code and set the session cookie, and the cookie jar holds a
   valid `__Secure-next-auth.session-token` (proved: `curl` with that cookie
   returns `{user id 1}` from `/api/auth/session`), yet the app UI still
   rendered signed-out until restart. The shared `SessionProvider` does not
   refetch on the programmatic `assign()` landing, so a landing that outruns
   the commit (or lands on an already-mounted provider) stays stale.
   Related context: #705 added bounded session polling pre-landing; this
   task adds the post-landing refetch so the UI converges without a manual
   reload. (ADR 0049's 3s SW abort on the session fetch still applies —
   a slow fetch still renders signed-out until the next focus refetch.)

3. **No server-side record of the failure class (the blindness).**
   `authOptions` sets no `logger`, so NextAuth callback/signin errors only
   reach stdout. The exact `?error=` code (OAuthCallback vs AccessDenied vs
   Callback) was unrecoverable after the fact more than once in this saga.

Out of scope but noted: Google Auth Platform project is in **Testing**
publishing status with 1 test user — every non-test account is rejected by
Google itself. That is a console action (add test users / publish), not a
code fix, and is tracked separately from this plan.

## Decision Tree

Verified App Links after the fix (intent-filter gets `pathPrefix /ar` +
`pathPrefix /en` on the same host/scheme/autoVerify):

- OAuth entry opens in the system browser → it STAYS in the browser:
`/api/auth/signin`
- Google's return to us stays in the browser:
`/api/auth/callback/google`
- The mint page stays in the browser (it must — mint needs the browser session):
`/ar/native-callback`
- The return link opens the shell:
`/ar/native-bootstrap`
- Ordinary content links keep today's deep-link behavior (open the shell):
`/ar/pages/300`

Rules: anything under `/api/*` never matches (no locale prefix) and always
stays in the browser. Any future browser-only flow must live under `/api/*`
(or handle the shell explicitly like the two native pages do) — never as a
bare locale route that assumes a browser. Content under `/ar` | `/en` must
always be app-safe (render correctly in both shell WebView and plain tabs).

## Verified Test Cases

Walked through live with the user before writing (all on prod + emulator):

1. Emulator debug APK (CI `app-debug`, prod host): system-browser Google
   sign-in → mint rows 14/15 created, `used_at` NULL (debug cert unverified,
   Chrome kept the App Link — expected).
2. Manually delivered App Link (`am start VIEW .../native-bootstrap?code=<row16>`)
   → server `used_at` SET on row 16 → cookie present in
   `app_webview/Default/Cookies` → `curl` with that cookie returns user 1.
   Proves spend + store + validity; UI stayed stale → part (3) of the fix.
3. Vivo Play build (1.9.4 / versionCode 5, cert matches assetlinks, domain
   verified): correct-flow taps produce no mint rows + app shows
   `signin?error=` banner; same phone/account with OS link handling off:
   success + mint row. Proves the hijack, not the server.
4. Manifest filter read in full (lines 20–36): single host-only `data`
   element, no path scope. `assetlinks.json` live on prod carries both
   fingerprints and is correct — untouched by this plan.
5. `next-auth@4.24.10` source read: `core/index.js` error case redirects
   known codes to `/signin?error=` (the imported-banner mechanism), and
   `logger?: Partial<LoggerInstance>` (`error(code, ...message)`) is
   available on the options object.

## Files to Change

- `android/app/src/main/AndroidManifest.xml` — add two `data` path scopes
  to the existing `autoVerify` filter: `pathPrefix /ar` and `pathPrefix /en`
  (same scheme/host). Nothing else in the manifest changes; `assetlinks.json`
  untouched (host-level, already correct).
- `app/api/auth/options.ts` — add `logger: { error, warn }`: `error` maps to
  `getLogger().error` (structured line + Sentry via fq-logger), `warn` maps
  to `getLogger().warn` (line only). Log the code + message only — never
  tokens, codes, or verifiers (redaction list already covers `email` and
  friends; extend `redact.ts` only if a new sensitive key appears).
  Rationale for `.error` (not double-reporting): OAuth failures become
  redirects, never throws, so `onRequestError` never sees them — the logger
  is the sole capture path.
- `app/components/shell/NativeBootstrapHandler.tsx` — after `handleAppUrl`
  returns true, force a shared session refetch (`useSession().update()`)
  before the landing settles, so the provider converges without reload.
  `appUrlOpen`-only path (`NativeAuthReturnListener`, no hooks) keeps
  today's behavior and heals via focus refetch — documented limitation,
  not a second mechanism.
- `docs/architecture/decisions/pwa.md` — new `## ` section
  (`**Status:** active`): verified App Links = locale content paths only;
  `/api/*` never verified; new locale routes must be app-safe. No standalone
  ADR (single platform rule, fully captured here).
- Regenerate `docs/plans/INDEX.md` via `gen-plans-index.sh`.

## Constraints

- Do not broaden the filter again, and do not add paths outside `/ar` | `/en`
  without a plan update. `native-callback` must keep resolving in the
  browser (mint needs that session); only `native-bootstrap` spends in shell.
- `getLogger()` only inside request scope (the `[...nextauth]` route counts —
  same as the existing `signIn` callback usage). Never import `@/lib/fq-logger`
  from client components; client-side native failures (if ever captured) go
  through `Sentry.captureException` directly (DSN-gated no-op in dev).
- No `NODE_ENV` branching around Sentry init; no real DSN in committed env files.
- Root-layout session rules stand (ADR 0049, `useSession()`-is-not-identity):
  the added `update()` is a post-user-action refetch on one page, not a
  launch-time provider fetch.
- Targeted `vitest` only for touched pure logic; full suites run in CI.
  Manifest change has no unit test — verify on emulator: signin URL must NOT
  resolve to the app (`am start VIEW <signin-url>` stays in Chrome/chooser),
  bootstrap URL must resolve to the app.
- Release train only: feature branch → `main` → release → Play upload by the
  owner (`android-release.yml` manual dispatch; `versionCode` = run number).
  Never merge without explicit say.

## What NOT to Do

- Do not "fix" this by disabling `autoVerify` or by moving OAuth under a
  locale path — either breaks verified return or re-creates the hijack.
- Do not touch `public/.well-known/assetlinks.json` (live file is correct;
  the placeholder in some dirty checkout is another session's work).
- Do not add test users / publish the OAuth project as a code change —
  console action, separate track.
- Do not re-propose bootstrap-only scoping (rejected: kills shared-link
  deep-opening, a core sharing flow, for no additional safety).
- Do not log `code`, `code_verifier`, `state`, tokens, or cookies — codes
  only (`OAuthCallback`, `AccessDenied`, …) plus safe metadata.

## Decisions Made

- Broad scope (`/ar` + `/en` prefixes), recommended over bootstrap-only:
  preserves shared content deep-opening; `/api/*` excluded by construction.
- Three-part single task (filter + logging + post-landing refresh), per user
  "both" on scope question 2026-09-27.
- No new standalone ADR; platform rule recorded in `decisions/pwa.md`.
