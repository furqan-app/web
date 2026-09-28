---
title: Fix web sign-in provider selection & Android shell activity result forwarding
type: Bug
status: implemented
date: 2026-09-28
area: pwa
issue: 734
---

# Fix web sign-in provider selection & Android shell activity result forwarding

## Summary

Resolve two sign-in regressions discovered after deploying v1.9.7:
1. **Web sign-in regression:** Calling parameterless `signIn()` in the 5 web sign-in UI components (`UserMenu`, `MyMarksList`, `MarksSignedOutPrompt`, `PlansSignedOutPrompt`, `SignedOutPrompt`) triggers NextAuth's default provider-selection page displaying an `idToken` input box and "Sign in with Google (native)" button because multiple providers (`google` and `google-native`) are registered. Calling `signIn("google")` explicitly restores direct Google OAuth redirection on the web.
2. **Android shell activity result forwarding:** Google Sign-in scope authorization intent returns results to `MainActivity.onActivityResult`, but `MainActivity` does not delegate to `SocialLoginPlugin.handleGoogleLoginIntent(requestCode, data)`. Overriding `onActivityResult` in `MainActivity.java` and delegating to the plugin completes the authorization flow cleanly.

## Root Cause / Approach

### Web Provider Selection
In NextAuth, `signIn()` without arguments redirects to `/api/auth/signin` if more than one provider is registered in `authOptions.providers`. Before #728, `google` was the only provider, so NextAuth auto-selected it. After #728 added `google-native` (CredentialsProvider), NextAuth renders its auto-generated sign-in form listing both providers.
**Fix:** Pass `"google"` explicitly (`signIn("google")`) in all 5 web sign-in call sites (matching `MarkModal.tsx`, which already passed `"google"`). Also configure `pages: { signIn: "/ar" }` (or similar fallback in `options.ts`) as a defensive measure.

### Android Shell Intent Result
In `@capgo/capacitor-social-login` Android implementation (`GoogleProvider.java`), after acquiring the `idToken` from Credential Manager, the plugin issues an authorization request for user scopes via `Identity.getAuthorizationClient().authorize()`. If consent is needed, it calls `activity.startIntentSenderForResult(..., REQUEST_AUTHORIZE_GOOGLE_MIN + index, ...)`. The result arrives at `MainActivity.onActivityResult`. Because `MainActivity` does not forward this result, `SocialLoginPlugin.handleGoogleLoginIntent(requestCode, data)` is never called, causing the future to time out and reject the login.
**Fix:** Override `onActivityResult` in `MainActivity.java` and delegate to `SocialLoginPlugin.handleGoogleLoginIntent(requestCode, data)`.

## Decision Tree / Algorithm

```
Sign-in Requested
├── isNativePlatform() is true (Android shell)
│   └── nativeGoogleSignIn() -> SocialLogin.login({ provider: "google" })
│       ├── Credential Manager returns idToken
│       ├── Authorization intent (if launched) returns to MainActivity.onActivityResult()
│       ├── MainActivity forwards to SocialLoginPlugin.handleGoogleLoginIntent()
│       └── Plugin resolves with idToken -> NextAuth signIn("google-native", { idToken }) -> Session created
└── isNativePlatform() is false (Web / PWA)
    └── signIn("google") -> Immediate redirect to https://accounts.google.com -> Web OAuth callback -> Session created
```

## Verified Test Cases

| Case | Expected |
|---|---|
| Web: Click "Sign in" in UserMenu | Direct redirect to Google OAuth; never shows `/api/auth/signin` or `idToken` box |
| Web: Click "Sign in" in MarksSignedOutPrompt | Direct redirect to Google OAuth |
| Web: Click "Sign in" in PlansSignedOutPrompt | Direct redirect to Google OAuth |
| Web: Click "Sign in" in SignedOutPrompt | Direct redirect to Google OAuth |
| Web: Click "Sign in" in MyMarksList | Direct redirect to Google OAuth |
| Android Shell: Tap sign in on physical device / emulator | Native account chooser appears, user selects account, authorization completes, user is signed in |
| Android Shell: Dismiss account chooser | Closes silently, still signed out |

## Files to Change

- `app/components/nav/UserMenu.tsx` — change `signIn()` to `signIn("google")`
- `app/components/nav/UserMenu.test.tsx` — update unit tests asserting `signIn("google")`
- `app/components/marks/MyMarksList.tsx` — change `signIn()` to `signIn("google")`
- `app/components/marks/MarksSignedOutPrompt.tsx` — change `signIn()` to `signIn("google")`
- `app/components/plans/PlansSignedOutPrompt.tsx` — change `signIn()` to `signIn("google")`
- `app/components/mushaf/SignedOutPrompt.tsx` — change `signIn()` to `signIn("google")`
- `android/app/src/main/java/app/furqan/MainActivity.java` — override `onActivityResult` and forward to `SocialLoginPlugin.handleGoogleLoginIntent`

## Constraints

- Web sign-in must remain strictly standard Google OAuth (`signIn("google")`).
- Native sign-in must remain strictly Credential Manager + `google-native` credentials provider.
- `MainActivity.onActivityResult` must check nullability and only pass to `SocialLoginPlugin` if present.
- All existing unit tests and lint checks must pass.

## What NOT to Do

- Do NOT remove `google-native` credentials provider (it is required for native shell).
- Do NOT expose `idToken` to users on web.
- Do NOT bypass `ModifiedMainActivityForSocialLoginPlugin`.

## Decisions Made

- Use explicit `signIn("google")` everywhere on web instead of relying on NextAuth single-provider inference.
- Delegate `onActivityResult` directly to `SocialLoginPlugin.handleGoogleLoginIntent` in `MainActivity.java`.
