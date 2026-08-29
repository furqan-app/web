# PWA: Remove the Root Layout's Unconditional Reciters and Session Network Calls From the Launch Path

**Type:** bug
**Date:** 2026-08-29
**Status:** implemented

## Summary

`app/[locale]/layout.tsx` wraps every route, including the 604 statically-generated Quran pages. Two providers it mounts each fire an unconditional network request in a mount effect — `RecitationProvider`'s `fetchReciters(locale)` (proxied live to QDC) and next-auth's `SessionProvider` (`/api/auth/session`) — and both land on a Serwist rule with a 10s network timeout. Mobile browsers cap concurrent connections per host at roughly six, and the App Router's own `<Link>` RSC prefetches compete for the same pool, so either request can hold a connection open for up to 10s on a slow link, for every visitor, whether or not they use recitation or are signed in. Fixed by making the reciter list a precached static asset (it never needs the network again) and giving the session fetch its own short-timeout SW rule (it still runs, but frees the connection much sooner). Issue #441.

## Root Cause / Approach

Traced both requests through `app/sw.ts` and `@serwist/next`'s `defaultCache`:
- `/api/auth/session` matches `defaultCache`'s own `/api/auth/.*` rule: `NetworkOnly({ networkTimeoutSeconds: 10 })` (never cached).
- `/api/quran/recitations/reciters` (not itself DB-backed — it proxies live to QDC, see `app/lib/recitation/qdc-provider.ts:33-50`) falls through to the generic `apis` rule: `NetworkFirst({ networkTimeoutSeconds: 10 })`.

The clean fix for session — server-inject it via `getServerSession(authOptions)` in the root layout, passed to `SessionProvider` as an initial `session` prop — was evaluated and rejected. Confirmed in `next-auth`'s source (`node_modules/next-auth/react/index.js:369-419`) that this does skip the mount-time fetch entirely, but `getServerSession` reads cookies, and calling it in a layout that wraps every route forces Next to opt the whole subtree — including the 604 static Quran pages — out of static rendering. That directly contradicts the Static Generation Strategy decision ("Never add server-side dynamic rendering to Quran page routes"). See [ADR 0049](../architecture/adr/0049-bound-launch-time-network-in-root-layout.md) for the full options-considered writeup.

Instead:
- **Session:** bound, don't eliminate. A new SW rule matches `pathname === "/api/auth/session"` exactly, registered ahead of `...defaultCache`, with `networkTimeoutSeconds: 3` (mirrors `READER_NAV_FALLBACK_TIMEOUT_MS`'s existing reasoning — slow-but-alive connections land well inside 3s). Every other `/api/auth/*` route (signin, callback, csrf — user-triggered, not launch-time) is untouched, still on `defaultCache`'s 10s rule.
- **Reciters:** eliminate the live call. `fetchChapters()` (`app/utils/recitation-api.ts:80-83`, the sibling effect at `RecitationContext.tsx:289-293`) already hits a committed static file, `/quran/chapters.json`, precached via `globPublicPatterns` — the reference shape the issue points to. Reciters gets the same treatment: a new build script generates `public/quran/reciters-{ar,en}.json`, `fetchReciters` reads that file directly, and the live route/provider method are deleted since nothing else calls them (confirmed via repo-wide grep).

## Decision Tree / Algorithm

**A. `/api/auth/session` SW routing (rule order matters — first match wins):**

| Request | Matcher | Handler |
|---|---|---|
| `url.pathname === "/api/auth/session"` | New rule, listed before `...defaultCache` in `app/sw.ts`'s `runtimeCaching` array | `NetworkOnly({ networkTimeoutSeconds: 3 })` |
| Any other `/api/auth/*` (signin, callback, csrf, providers) | Falls through to `defaultCache`'s own `/api/auth/.*` rule | `NetworkOnly({ networkTimeoutSeconds: 10 })` (unchanged) |

**B. Reciters data source:**

| Locale | Source | Precache |
|---|---|---|
| `ar` | `public/quran/reciters-ar.json` (generated) | Yes, via `globPublicPatterns` |
| `en` | `public/quran/reciters-en.json` (generated) | Yes, via `globPublicPatterns` |
| any other value | N/A — `RecitationContext` only ever calls `fetchReciters` with `useLocale()`'s result, which is always `ar` or `en` (routing has exactly two locales) | — |

**C. Scope check — other root-layout providers (verified, no code change needed):**

| Provider/hook mounted at root | Fires at mount? | Why it's fine |
|---|---|---|
| `QuranMushafContext` | Writes to `localStorage` + Cache Storage only | No network |
| `LastReadPageContext`, `QuranSafhaViewContext`, `DesktopQuranFontSizeContext`, `KeepScreenAwakeContext` | `localStorage` reads/writes only | No network |
| `useNotifications` (via `NotificationBell` in `Nav`) | `useQuery` gated `enabled: status === "authenticated"` | Downstream of the (now-bounded) session fetch, not a second unconditional call |
| `PlansWidget` → `useTodayAssignments` | `enabled: isOnReaderRoute && isSignedIn` | Same — gated on session, and route-scoped |

## Verified Test Cases

Walked through with the user; confirmed correct:

1. **Fresh visitor, first-ever page load (before SW installs).** Both `/api/auth/session` and `/quran/reciters-{locale}.json` go over the network uncached — unavoidable, matches `chapters.json`'s existing first-visit behavior. Session is bounded to 3s instead of 10s.
2. **Repeat visitor, SW installed, browser tab (not installed PWA).** `reciters-{locale}.json` serves from the app-shell precache — zero network, instant. `/api/auth/session` still fetches live (session state can change between visits) but bounded to 3s.
3. **Installed PWA, offline, cold launch.** Reciters resolve instantly from precache regardless of connectivity. Session fetch fails fast (bounded `NetworkOnly`) rather than hanging 10s; `UserMenu` shows its existing "not authenticated" fallback UI (`session` falsy) — no behavior change from today beyond the shorter wait, since the UI already treats "loading" and "signed out" the same (`app/components/nav/UserMenu.tsx`, no separate loading state).
4. **Signed-in user, healthy connection.** Session resolves well under 3s as it does today; no observable change.
5. **QDC adds a new reciter after deploy.** Not reflected until the static JSON is regenerated and redeployed — accepted, identical trade-off to `chapters.json`.

## Files to Change

- `app/sw.ts` — import `NetworkOnly` from `serwist`; add an `AUTH_SESSION_NETWORK_TIMEOUT_SECONDS = 3` constant near `READER_NAV_FALLBACK_TIMEOUT_MS`; add the new `/api/auth/session` rule to `runtimeCaching`, before `...defaultCache`.
- `next.config.mjs` — add `quran/reciters-ar.json` and `quran/reciters-en.json` as two literal entries in `globPublicPatterns` (same style as the existing `offline-ar.html`/`offline-en.html` pair, not a glob).
- `scripts/quran-reciters/generate.js` — new script mirroring `scripts/quran-chapters/generate.js`'s shape: for each locale in `["ar", "en"]`, fetch `https://api.qurancdn.com/api/qdc/audio/reciters?language={locale}`, map to `{ id, name, translatedName, style }` (mirrors the mapping in `app/lib/recitation/qdc-provider.ts:44-49` — keep both in sync via a comment, same convention `quran-chapters/generate.js` uses for `SurahResult`), write `public/quran/reciters-{locale}.json`. No DB/dotenv needed (QDC direct, no Prisma).
- `package.json` — add `"generate:quran-reciters": "node scripts/quran-reciters/generate.js"`.
- `public/quran/reciters-ar.json`, `public/quran/reciters-en.json` — generated output, committed (run the new script during implementation).
- `app/utils/recitation-api.ts` — `fetchReciters(language)` reads `/quran/reciters-${language}.json` and returns `res.json()` directly (bare array, no `unwrap()` envelope), matching `fetchChapters`'s shape exactly.
- `app/api/quran/recitations/reciters/route.ts` — delete (unused once `fetchReciters` no longer calls it).
- `app/lib/recitation/provider.ts` — remove `getReciters` from the `RecitationProvider` interface.
- `app/lib/recitation/qdc-provider.ts` — remove the `getReciters` function, the `QdcReciter` type, and the now-unused `Reciter` import (keep `ChapterAudio`); remove `getReciters` from the exported `qdcRecitationProvider` object.
- `docs/architecture/DECISIONS.md` — done in this planning pass (Auth section + Recitation Playback section).
- `docs/architecture/adr/0049-bound-launch-time-network-in-root-layout.md` — done in this planning pass.

## Constraints

- Do not add `getServerSession` to `app/[locale]/layout.tsx` or any layout wrapping the Quran page routes — breaks static generation for all 604 pages (ADR 0049, Static Generation Strategy decision).
- The new `/api/auth/session` SW rule must match on `pathname` exactly, not a prefix/regex over `/api/auth/*` — other auth routes (signin, callback, csrf) are user-triggered, not launch-time, and must keep the full 10s default.
- The new rule must be registered ahead of `...defaultCache` in the `runtimeCaching` array — Serwist takes the first matching rule, and `defaultCache` already contains its own (unbounded-from-us) `/api/auth/.*` rule.
- `fetchReciters`'s exported signature (`(language: string) => Promise<Reciter[]>`) does not change — only its implementation. No caller needs updating beyond the file itself.
- `globPublicPatterns` stays an explicit allowlist (per its own "must stay pinned to the app shell" constraint in `DECISIONS.md`) — add the two reciters files as literal entries, do not widen it to a glob that could sweep in unrelated `public/quran/` content.

## What NOT to Do

- Do not server-inject the session via `getServerSession` in the root layout — evaluated and rejected (see Root Cause / Approach and ADR 0049).
- Do not defer `fetchReciters` to fire only when recitation UI opens, as an alternative to the static file — considered, rejected because it still pays a live, per-open network hit and gives no offline support, unlike the static-precache approach.
- Do not leave the live `/api/quran/recitations/reciters` route, `RecitationProvider.getReciters`, or `qdcRecitationProvider`'s `getReciters` in place "just in case" — confirmed via grep that nothing else calls them; keeping them means dead code with its own live-QDC-dependent surface.
- Do not widen `globPublicPatterns` to a glob pattern for the new files — use two explicit literal entries, matching the existing `offline-ar.html`/`offline-en.html` convention.
- Do not touch offline recitation audio download/playback (ADR 0046), the bulk page-cache download, or auth semantics/session lifetime — out of scope per the issue.

## Decisions Made

- Session: bound the existing client fetch to a 3s SW-level timeout rather than eliminating it server-side, to protect static generation.
- Reciters: convert to a build-time static per-locale JSON file, precached as part of the app shell, mirroring `chapters.json`. Live route and provider method deleted as dead code.
