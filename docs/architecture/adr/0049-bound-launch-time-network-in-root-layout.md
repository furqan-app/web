# ADR 0049: Root-Layout Providers Must Not Race the Launch-Time Connection Pool

**Date:** 2026-08-29
**Status:** Accepted

## Context

Two providers mounted in `app/[locale]/layout.tsx` — which wraps every route, including the 604 statically-generated Quran pages — each fire an unconditional network request in a mount effect: `RecitationProvider`'s `fetchReciters(locale)` (QDC-proxied) and next-auth's `SessionProvider` (`/api/auth/session`). Both fall through to Serwist rules with a 10s network timeout. Mobile browsers cap concurrent connections per host at roughly six, and the App Router's own `<Link>` RSC prefetches compete for the same pool, so either request can hold a connection needed elsewhere for up to 10s on a slow link — for every visitor, whether or not they ever use recitation or are signed in.

## Options Considered — session

**Option A — Server-inject the session.** Call `getServerSession(authOptions)` in the root layout and pass it into `SessionProvider` as an initial `session` prop; confirmed in `next-auth`'s source that this skips the mount-time fetch entirely, for both signed-in and signed-out visitors.

**Option B — Bound the client fetch's timeout.** Keep the client-side fetch, but give `/api/auth/session` its own Serwist rule ahead of `defaultCache`, with a short timeout instead of the default 10s.

## Decision — session

Adopt Option B. Option A reads cookies in a layout that wraps every route, which forces Next to opt the entire subtree out of static rendering — directly contradicting the Static Generation Strategy decision that the 604 Quran pages must never gain server-side dynamic rendering. That cost is not worth paying to shave a bounded client fetch down to zero.

Implementing Option B surfaced a second, narrower decision: Serwist's built-in `NetworkOnly({ networkTimeoutSeconds })` — what `defaultCache`'s own `/api/auth/.*` rule already uses at 10s — does not actually bound the connection. Reading `node_modules/serwist`'s source, `NetworkOnly._handle` races `Promise.race([handler.fetch(request), timeout(ms)])` with no `AbortController` or `signal` anywhere in the chain (`StrategyHandler.fetch` calls a plain `fetch(request, ...)`). The option only changes when the *service worker's promise to the page* settles — the real network request, and the connection slot it holds, keeps running in the background for however long the response actually takes, unaffected by the option's value. Using it here would have looked like a fix (the page finds out sooner) without being one (the connection isn't freed sooner), which is the actual problem this ADR exists to solve.

`app/sw.ts` therefore gains a rule matching exactly `pathname === "/api/auth/session"` with a hand-rolled `AbortController`-based handler — `AUTH_SESSION_NETWORK_TIMEOUT_MS` (3000ms), mirroring `READER_NAV_FALLBACK_TIMEOUT_MS`'s existing reasoning (slow-but-alive connections land well inside it, only a genuinely dead one pays the full wait) — registered ahead of `...defaultCache`'s own `/api/auth/.*` rule (which still applies, uncancelled at 10s, to the user-triggered routes: signin, callback, csrf).

## Options Considered — reciters

**Option A — Defer the fetch.** Keep `fetchReciters` hitting the live QDC-proxied route, but only call it once the user actually opens recitation UI, not on every app mount.

**Option B — Static precached file.** Generate `public/quran/reciters-{ar,en}.json` at build time (mirroring `scripts/quran-chapters/generate.js` → `public/quran/chapters.json`) and read it directly, adding both files to `globPublicPatterns` so they're part of the app-shell precache.

## Decision — reciters

Adopt Option B. It removes the live QDC dependency from the launch path entirely rather than just moving it later, and — unlike Option A — makes the reciter list available with zero network for any visitor who has opened the app before, matching `fetchChapters`' already-working reference shape. The live route (`/api/quran/recitations/reciters`), `RecitationProvider.getReciters`, and `qdcRecitationProvider.getReciters` are deleted as dead code once nothing calls them.

## Consequences

- **+** No launch-time network request competes for the connection pool for either concern; reciters need none at all once precached, and the session fetch's actual connection is genuinely released at 3s (not just hidden from the page) thanks to the AbortController fix.
- **+** Static Generation Strategy stays intact — no route gains server-side dynamic rendering.
- **+** Reciters become available fully offline, consistent with the rest of the app shell.
- **-** The reciter list only refreshes on a manual regeneration + deploy, same accepted trade-off `chapters.json` already carries.
- **-** `/api/auth/session` is still a real request on every launch (not eliminated) — bounded to 3s instead of 10s, not zero.
- **-** Bounding (rather than eliminating) the session fetch means a genuinely signed-in user whose response lands between 3s and 10s now renders as signed-out — next-auth's own fetch-failure path never calls `setSession` — until the next focus-triggered refetch, rather than correctly waiting up to 10s. This is inherent to choosing Option B at all, not specific to the abort mechanism; accepted because the connection-pool cost of the alternative (Option A, or simply keeping the 10s default) was judged worse.
