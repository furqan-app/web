---
title: Auth return lands before the session cookie commits — verify session before landing
type: bug
date: 2026-09-25
status: implemented
area: pwa
issue: 705
adr: [0072]
---

# Auth return lands before the session cookie commits — verify session before landing

## Summary

Device evidence (owner, Play build): the exchange sets the session cookie (visible in DevTools), yet the immediate landing reads signed-out — a reload then returns 200 OK with the session. Root cause: `Set-Cookie` from the fetch exchange commits asynchronously, and the immediate `location.assign` races it — the landing page's session read goes out without the cookie. Fix: after a successful exchange, poll `GET /api/auth/session` until it reports a user (bounded), then navigate; fall back to immediate navigate on exhaustion (never worse than today).

## Root Cause / Approach

Cookie-store sync is async; a navigation issued synchronously after fetch completion can miss just-set cookies on its first requests. The landing page therefore must not assume the cookie is visible yet. Polling the existing session endpoint turns the race into a wait — first success is instant in the common case, and the bound keeps worst-case at today's behavior plus ~5s.

## Decision Tree / Algorithm

- If the exchange fails → false, unchanged (retry UI owns it).
- If the exchange succeeds → poll session up to 6 tries × 800ms; first body with `user` → assign(target).
- If the poll exhausts with no user → assign(target) anyway (today's behavior; a later refetch/reload still heals).
- Network throw inside the poll counts as a missed try, never a failure.

## Verified Test Cases

- Unit: success-first-try assigns immediately with 2 fetches (exchange + session); session-appears-on-third-try assigns after 4 fetches; never-appears assigns after 7 fetches (1 exchange + 6 polls); exchange failure never touches the session endpoint.
- Existing shell/platform specs stay green; lint clean; no new `tsc` errors.
- Device gate (owner, Play build): sign-in → auto-return signed-in on first landing, persists across restart.

## Files to Change

- `app/lib/shell/auth-return.ts` — `spendCode` verifies via `readSessionUser()` before navigating; shared by listener + bootstrap page, so both gain it.
- `app/lib/shell/auth-return.test.ts` — per-URL fetch mock + the three poll cases above.
- `docs/plans/INDEX.md` — regenerated.

## Constraints

- No new endpoint, no server change, no SW rule change (the session GET already travels the existing uncached path).
- Non-native, no-code, and failure branches byte-identical.
- Bounded wait only; never block landing indefinitely.

## What NOT to Do

- No top-level form-POST rework of the exchange (bigger blast radius for the same guarantee).
- No reading `document.cookie` (HttpOnly — invisible by design; the session endpoint is the only signal).
- No `cache: no-store` overrides — the existing SW path already avoids caching this read.

## Decisions Made

- Poll-over-navigate chosen over form-POST navigation: client-only change, zero server blast radius, same guarantee.
- Sweep 2026-09-25: session endpoint shape (`{user...}` vs `{}`) confirmed against next-auth v4 + the repo's session callback; SW/middleware/i18n untouched.
