# ADR 0075: Shell sign-in uses native Google Credential Manager + a NextAuth Credentials provider

**Date:** 2026-09-28
**Status:** Accepted — supersedes the "system-browser session + bootstrap" clause of [ADR 0072](./0072-mobile-app-capacitor-hosted-shell.md)

## Context

The hosted Capacitor shell cannot run Google OAuth inside its WebView. Google rejects embedded user agents. ADR 0072 therefore chose a system-browser sign-in that mints a one-time code, returns it to the shell over an App Link, and exchanges it for a session cookie. The exchange route also minted the NextAuth JWT cookie itself. That meant a second, hand-maintained copy of NextAuth's cookie name, flags, and token shape. The whole chain spans two cookie jars (Custom Tab and WebView), App Link verification, a DB table, and a listener/page race. Every hop needed its own fix.

## Options Considered

**Option A: Keep the system-browser bootstrap and fix it hop by hop.**
We keep ADR 0072's flow and keep patching each hop as it fails.

**Option B: Native Google sign-in via Credential Manager (`@capgo/capacitor-social-login`) + NextAuth Credentials provider.**
The shell gets a Google ID token from an OS-level account sheet. It posts the token through `signIn("google-native")`. The server verifies it (signature, `aud` = web client ID, `email_verified`), and NextAuth mints its own session cookie.

**Option C: A hand-written Capacitor plugin around `androidx.credentials`.**
This gives the same flow as B with zero third-party dependency, but we would own the native code and the future iOS side.

**Option D: `@capacitor-firebase/authentication`.**
This gives the same result, but it requires adopting Firebase for auth alone.

## Decision

Option B. The shell signs in with native Google Credential Manager and a server-verified NextAuth Credentials provider. The system-browser bootstrap (mint page, exchange route, `NativeBootstrapCode` table) is removed.

## Consequences

- **+** NextAuth is the only code that names, flags, and encodes the session cookie. No parallel copy can drift.
- **+** Sign-in never leaves the app: no Custom Tab, no second cookie jar, no App Link on the auth path, no code race.
- **+** Web and PWA sign-in are untouched. The Google OAuth provider stays as-is.
- **-** The build now carries a third-party native plugin (MPL-2.0, vendor-maintained, major version tracks Capacitor). Non-Google providers must be disabled in `capacitor.config.ts` (`facebook: false` keeps the Facebook SDK and `AD_ID` out of the APK).
- **-** Google Cloud needs an Android OAuth client per signing certificate (Play App Signing, upload, debug) in the same project as the web client. A missing SHA-1 fails with `[28444]`.
- **-** A replayed ID token is accepted until it expires (about 1 hour). Stealing one requires the device, and `aud` pins it to our client. We accept this risk instead of adding a server-issued nonce.
- **-** iOS needs its own client ID, URL scheme, and privacy manifest in a follow-up. An App Store build with Google login also needs Sign in with Apple (unchanged from ADR 0072).
- App Links survive only as a content feature (verse share URLs open in the shell). They carry no auth meaning.
