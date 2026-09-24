---
title: Signed release build — upload keystore plus CI-signed AAB for Play internal testing
type: feature
date: 2026-09-23
status: ready-to-implement
area: ci
issue: 670
adr: [0072]
---

# Signed release build — upload keystore plus CI-signed AAB for Play internal testing

## Summary

Play Console's App integrity section (source of the app-signing fingerprint for `assetlinks.json`) appears only after the first build reaches internal testing — and that build must be a release AAB signed with an upload key. This slice wires Gradle release signing from CI secrets plus an on-demand workflow producing the signed AAB. The owner holds the keystore: generated once locally, stored as GitHub secrets, never committed.

## Root Cause / Approach

`android/app/build.gradle` has no `signingConfigs` at all, so only self-signed debug APKs exist. Add an env-driven release signing config (no secrets in git — values arrive as CI secrets at build time) and a manual-dispatch workflow that decodes the keystore, builds the release bundle, and uploads it as an artifact the owner then uploads to Play Console internal testing.

## Decision Tree / Algorithm

- If CI secrets are present (manual dispatch on `main`) → decode keystore → `bundleRelease` signs with the upload key → signed AAB artifact.
- If secrets are absent (PR builds, forks, local runs) → nothing changes: `assembleDebug` is untouched and `bundleRelease` fails with a clear keystore-missing error instead of silently shipping debug keys.
- If a future upload needs a higher version → `versionCode` comes from the workflow run number (monotonic), `versionName` from a dispatch input; Play's strictly-increasing rule holds without hand-editing gradle.
- If the owner rotates the upload key later → new secrets values only, no code change (Play key upgrade goes through Console).

## Verified Test Cases

- `python yaml` parses the new workflow; `npm run lint` clean (gradle untouched by it, workflow untouched — recorded, not assumed).
- Full signing verification is owner-gated: the signed AAB is verified only after the owner stores the four secrets and dispatches the workflow; the artifact's `apksigner verify --print-certs` fingerprint must match the upload certificate, and after Play upload, App integrity shows the app-signing fingerprint.
- Debug APK workflow unaffected (no shared steps changed except none — separate file).
- `*.jks` / `*.keystore` uncommented in `android/.gitignore` so a keystore can never be committed by accident.

## Files to Change

- `android/app/build.gradle`: `signingConfigs.release` from env (`ANDROID_KEYSTORE_PATH/_PASSWORD/_ALIAS`, `ANDROID_KEY_PASSWORD`), wired into the `release` build type; `versionCode`/`versionName` from env (`ANDROID_VERSION_CODE`/`ANDROID_VERSION_NAME`) with today's literals as fallback.
- `android/.gitignore`: uncomment the `*.jks` / `*.keystore` lines.
- `.github/workflows/android-release.yml` (new, `workflow_dispatch` only): Node 22, `npm ci`, `cap sync android`, JDK 21, SDK packages (same pins as the debug workflow), decode `ANDROID_KEYSTORE_BASE64` to `android/app/upload.keystore`, `bundleRelease`, upload `app-release.aab` artifact (30-day retention).

## Constraints

- Secrets (`ANDROID_KEYSTORE_BASE64/_PASSWORD/_ALIAS`, `ANDROID_KEY_PASSWORD`) live only in GitHub repo secrets — never in git, logs (GitHub masks them), or chat. Owner-generated, owner-held.
- The keystore file decoded in CI lives under `android/app/` (gitignored by the uncommented rules) and dies with the runner.
- First Play upload registers the upload key permanently for this package — the keystore backup is load-bearing; losing it means a Play support key-reset flow.
- No `minifyEnabled`/shrink changes here; no iOS work; no Play upload automation (owner uploads the AAB in Console).

## What NOT to Do

- No committing keystores or passwords — the uncommented gitignore is the backstop, not a suggestion.
- No auto-run on PRs (unsigned forks must keep building debug green; signing runs only on manual dispatch).
- No auto-upload to Play (service-account upload is future scope, needs its own design).
- No changing the debug workflow's steps.

## Decisions Made

- Env-driven `signingConfigs` over `gradle.properties`/`local.properties`: CI secrets map to env cleanly; local files risk accidental commits.
- `bundleRelease` (AAB) over `assembleRelease` (APK): Play requires AAB for new apps; APK stays debug-only.
- Run-number `versionCode`: monotonic without human bookkeeping; display `versionName` stays a dispatch input defaulting to the current release.
- Sweep 2026-09-23: no test asserts gradle content; `globPublicPatterns`/SW/middleware untouched (native-only change); `cap sync` in the new workflow keeps plugin gradle include generation working post-slim (empty webDir copies ~KB).
- New plan file (not an epic addendum): CI infra slice, no product behavior; secret-holding split (owner key, CI wiring) is recorded here, not in decisions/.
