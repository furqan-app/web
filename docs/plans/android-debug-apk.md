---
title: Cloud Android build — debug APK artifact on demand
type: feature
date: 2026-09-22
status: ready-to-implement
area: ci
issue: 656
adr: []
---

# Cloud Android build — debug APK artifact on demand

## Summary

Add a GitHub Actions workflow that compiles the Capacitor Android shell into a downloadable debug APK, manually triggerable and automatic on PRs touching the shell. No signing keys needed (debug self-signs); no local SDK install required.

## Root Cause / Approach

Follow repo CI conventions (`ci.yml`: concurrency cancel, `contents: read`, pinned actions). Runner-provided Android SDK + Temurin JDK 17 + Gradle wrapper from the scaffold. Deliberately no `cap sync`: the shell is hosted-only (ADR 0072), so bundled web assets are unused and sync would only copy ~263MB for nothing.

## Decision Tree / Algorithm

- If the trigger is `workflow_dispatch` or a PR touches `android/**`, `capacitor.config.ts`, or the workflow itself → build.
- If SDK platform 36 / build-tools 36.0.0 missing on the runner image → install via sdkmanager (idempotent step, licenses auto-accepted).
- If the build succeeds → upload `app-debug.apk` as a 14-day artifact (owner installs directly on a phone).

## Verified Test Cases

- The workflow's own PR run going green IS the verification (it triggers on its own path filter).
- Artifact present and named `app-debug.apk`; `assembleDebug` exit 0; no secrets referenced anywhere.

## Files to Change

- `.github/workflows/android-debug.yml` (new) — the workflow.

## Constraints

- Debug only: no keystore, no signing config, no secrets in the workflow.
- `permissions: contents: read`; concurrency cancel-in-progress like `ci.yml`.
- Never commit APKs/AABs or `local.properties` to the repo.

## What NOT to Do

- Do not add release signing here — that is a separate task with Play Console keys.
- Do not run `cap sync` in this workflow (see Approach).
- Do not cache-bust or pin to a self-hosted runner.

## Decisions Made

- JDK 17 (AGP 8.x requirement) via `setup-java@v4` Temurin; Gradle setup via `gradle/actions/setup-gradle@v4` cache.
- 14-day artifact retention: long enough to install, short enough to not hoard storage.
