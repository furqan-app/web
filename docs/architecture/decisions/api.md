# Api — Decisions

Active decisions for API & auth — middleware chain, NextAuth, response envelope. Part of `docs/architecture/decisions/`; always-loaded index is [`../DECISIONS.md`](../DECISIONS.md).

---

## Middleware Chain

**Status:** active

**Decision:** Two middleware are piped in order: `intl-middleware` (locale detection and routing) → `auth-middleware` (protects `/api/quran/pages/[0-9]+/marks`).

**Rationale:** next-intl requires its middleware to run first. Auth is layered on top.

**Constraints:**
- Do not add new protected routes without updating the auth-middleware matcher pattern.
- The middleware chain uses the `pipeMiddlewares` utility in `app/middlewares/pipe.ts`.
- Any new top-level static asset directory served from `public/` (or a new Next metadata-route file) must be added to the root `middleware.ts` `config.matcher` exclusion list, alongside `_next/static`, `fonts/*`, `manifest.webmanifest`, `sw.js`, etc. Without it, `intl-middleware` treats the request as a page route and redirects it into a locale prefix (e.g. `/icons/icon-512.png` → `/en/icons/icon-512.png`), 404ing the asset. This bit the PWA icons (`public/icons/`) — see `docs/plans/pwa-offline-support.md` Addendum 1 — because the matcher was updated for `fonts/*`/`manifest.webmanifest`/`sw.js` but not the new `icons/` directory added in the same feature.
- RSC flight responses (Next.js App Router client-side navigation fetches, identified by the `?_rsc=<hash>` query parameter) must carry `Cache-Control: no-store`. This is set in `next.config.mjs` via `headers()` + `has: [{ type: "query", key: "_rsc" }]`. Hostinger's reverse proxy cache strips query parameters from cache keys and ignores the `Vary: RSC` header, so without `no-store`, RSC wire format gets cached under the bare page URL (e.g. `/ar`) and served to subsequent plain navigation requests — users see raw JSON instead of HTML. Do not remove this header rule. See `docs/plans/fix-rsc-cache-poisoning.md`.
- Favicon files (`favicon.ico`, `favicon-16.png`, `favicon-32.png`) live under `public/icons/`, not `public/` root — placing them in the already-whitelisted `icons/*` directory avoids editing the `middleware.ts` matcher or `next.config.mjs`'s `globPublicPatterns` (see the point above). A root-level favicon would need both updated first. See `docs/plans/brand-mark-icons.md`.

---

## Auth

**Status:** active

**Decision:** Google OAuth via NextAuth. Session is stored server-side. For protected API routes, `auth-middleware` validates the NextAuth token and forwards it to the handler as a percent-encoded JSON `user` **request** header via `NextResponse.next({ request: { headers } })` (percent-encoded so non-ASCII user profiles, such as Arabic names, strictly adhere to HTTP ByteString rules). It first **strips any incoming `user` header** so a client can never forge one, and it does **not** set the token on the response (which the handler can't read and which would leak the decoded token to the browser).

**How to read user in an API route:**
```ts
import { extractUser } from "@/app/api/request";
const user = extractUser(request); // { id, email, ... }
```

**Constraints:**
- Do not attempt to read the session via `getServerSession` inside API routes — use `extractUser` instead, which reads the header the middleware sets.
- The `user` header is only forwarded for routes the `auth-middleware` matcher protects (all under `/api/...`). **Server components / layouts are not covered** — the middleware forwards the header to matched API-route requests, not to RSC renders. So page/layout server components that need the user (e.g. the `/mushaf/[grant]` grant guard) must call `getServerSession(authOptions)` directly; `extractUser` is API-routes-only. `session.user` carries the full app `User` row (incl. `id`) via the session callback, but is not type-augmented — read `id` via a cast (`(session.user as { id?: number }).id`). Layout guards should `redirect()`, not `notFound()`, for both the unauthenticated case (→ locale home) and the authorized-but-no-longer case (a revoked/foreign grant → `/{locale}/mushaf?removed=1`, where the hub shows a generic "access removed" banner — never the owner's name, per ADR 0012). Genuine 404s render `app/not-found.tsx` (for root unmatched URLs) and `app/[locale]/not-found.tsx` (for `[locale]` segment `notFound()` calls, delegating to `Custom404`). Both use **theme tokens** (so they are themed against the inline-script theme class) and **plain `<a>` links** (a `next/link` client-nav from a 404 boundary into the locale tree can paint before that tree's CSS chunk loads in prod).
- The middleware strips any client-supplied `user` request header before injecting the trusted token, and forwards it via `NextResponse.next({ request: { headers } })` — never `response.headers.set`. A client cannot forge identity, and the token is never echoed to the browser.
- `extractUser` decodes the `user` header via `decodeURIComponent` (falling back to raw JSON parsing for backwards compatibility) and returns `null` (never throws) if the `user` header is missing or malformed — every call site must check for `null` and return `jsonResponse({ code: 401, message: "Unauthorized" })` before using `user.id`. This is a defensive boundary check for a state that shouldn't occur (middleware is expected to always set the header correctly) — see `app/api/quran/pages/[pageId]/marks/route.ts` for the pattern.
- **Never call `getServerSession` in `app/[locale]/layout.tsx` or any other layout that wraps the Quran page routes.** It reads cookies, which forces Next to opt the whole subtree out of static rendering — silently reintroducing server-side dynamic rendering on all 604 pages, contradicting the Static Generation Strategy decision. `getServerSession` calls stay scoped to layouts that only cover already-dynamic routes (marks, plans, the mushaf grant guard). `SessionProvider`'s own launch-time `/api/auth/session` fetch is bounded instead, not eliminated this way — see [ADR 0049](../adr/0049-bound-launch-time-network-in-root-layout.md).
- `app/sw.ts` gives `pathname === "/api/auth/session"` its own hand-rolled `AbortController` handler, registered ahead of `...defaultCache`, that cancels the fetch at `AUTH_SESSION_NETWORK_TIMEOUT_MS` (3s) — **not** the built-in `NetworkOnly({ networkTimeoutSeconds })` option, which races a timer against the fetch but never aborts it, so the underlying connection stays open for the real response time regardless of the option's value (confirmed by reading `node_modules/serwist`'s `NetworkOnly`/`StrategyHandler.fetch` — no `signal` anywhere in that path). Every other `/api/auth/*` route (signin, callback, csrf — all user-triggered, not launch-time) is untouched and stays on `defaultCache`'s 10s `NetworkOnly` default, uncancelled. Accepted trade-off: a genuinely signed-in user whose session response lands between 3s and 10s now renders as signed-out (next-auth's fetch failure path never calls `setSession`) until the next focus-triggered refetch, instead of waiting up to 10s for a correct result — inherent to bounding this fetch at all, not specific to the abort mechanism. See ADR 0049.

---

## API Response Shape

**Status:** active

**Decision:** All API routes return a consistent envelope via `jsonResponse()` from `app/api/response.ts`:
```json
{ "data": ..., "success": true|false, "error": ..., "code": 200, "message": ... }
```

**Constraints:**
- Never return raw `NextResponse.json({ ... })` in API routes — always use `jsonResponse()` (exception: the page words route which predates this convention).
- Validate inputs before DB writes; return `code: 422` with `message` on missing required fields.

---

## `useSession()` Is Not a Source of Persistent Identity

**Status:** active

**Decision (2026-09-04):** next-auth's fetch-failure path never calls `setSession`, so
`useSession()` reports `unauthenticated` whenever `/api/auth/session` fails or is aborted.
Given `app/sw.ts`'s 3s abort (ADR 0049, see the Auth section above), that is the **normal**
state offline — not an edge case.

**Constraints:**
- It is safe to use for rendering a session-dependent control: a wrong reading self-corrects on
  the next successful fetch, and nothing is lost in between.
- It must **never** be the input to persistent per-user state — ownership stamps, local-store
  partitioning, cache keys, or any transition that destroys data. Such state needs an
  evidence-based signal that distinguishes **"no session"** (a successful fetch saying so, or a
  401 from a real request) from **"unknown"** (a failed or aborted fetch), and must treat
  "unknown" as *keep the last known state*.
- Found while planning offline-first marks (#236): deriving the local store's owner stamp from
  `useSession()` would have re-stamped it to `"guest"` on every offline launch, then tripped the
  different-owner reset on reconnect and discarded the user's offline work. See
  `docs/plans/offline-first-marks/INDEX.md`, "Session state is not a reliable signal offline".
