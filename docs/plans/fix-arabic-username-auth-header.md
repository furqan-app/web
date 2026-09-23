---
title: Fix ByteString Crash on Non-ASCII Usernames in Auth Middleware
type: bug
date: 2026-09-06
status: implemented
area: api
issue: 580
---

# Fix ByteString Crash on Non-ASCII Usernames in Auth Middleware

## Summary

When a user whose Google account name contains non-ASCII characters (such as Arabic letters "محمد أحمد") signs in and interacts with any authenticated route (e.g., adding or removing marks via `/api/quran/pages/[pageId]/marks` or syncing marks via `/api/marks`), the request fails with HTTP 500 and the UI displays the generic action error ("حدث خطأ ما. حاول مرة أخرى."). This plan resolves the crash by percent-encoding the injected `user` header in `app/middlewares/auth-middleware.ts` so it strictly adheres to HTTP ByteString rules, and decoding it in `app/api/request.ts` (`extractUser`) with backwards-compatible fallback.

## Root Cause / Approach

### Root Cause
1. In `app/api/auth/options.ts`, Google OAuth persists the user's name in `users` (which succeeds because MySQL is `utf8mb4_unicode_ci`). The `jwt` callback attaches this full user profile to the JWT session token (`token.name`).
2. In `app/middlewares/auth-middleware.ts`, lines 59-62 forward the authenticated token to downstream route handlers by setting a request header:
   ```ts
   const requestHeaders = new Headers(req.headers);
   requestHeaders.delete("user");
   requestHeaders.set("user", JSON.stringify(token));
   ```
3. The Fetch API and Node.js (`undici`) enforce that HTTP header values must be valid `ByteString` sequences (code points 0 to 255). Arabic characters have code points well above 255 (e.g., 'م' is 1605).
4. `Headers.set("user", JSON.stringify(token))` throws:
   ```text
   TypeError: Cannot convert argument to a ByteString because the character at index ... has a value of ... which is greater than 255.
   ```
5. Because this exception is uncaught in middleware, the entire request fails with a 500 error before hitting the route handler. Frontend components (e.g., `MarkModal.tsx`) catch the failure and render `actionError`.

### Approach
- Encode the serialized token in `auth-middleware.ts` with `encodeURIComponent(JSON.stringify(token))`. This guarantees 100% ASCII-safe characters (code points <= 127).
- In `app/api/request.ts`, update `extractUser` to decode the value using `decodeURIComponent` inside a try-catch, falling back to raw `JSON.parse` if decoding fails (for backwards compatibility with tests or unencoded calls).
- Add automated unit tests in `app/api/request.test.ts` covering ASCII names, Arabic names, names with percent signs/symbols, and missing/corrupted headers.

## Decision Tree / Algorithm

### Header Injection (`app/middlewares/auth-middleware.ts`)
```ts
const serializedToken = encodeURIComponent(JSON.stringify(token));
requestHeaders.set("user", serializedToken);
```

### User Extraction (`app/api/request.ts`)
```ts
export const extractUser = (req: Request) => {
  try {
    const raw = req.headers.get("user");
    if (!raw) return null;
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      return JSON.parse(raw);
    }
  } catch {
    return null;
  }
};
```

| Input Header (`user`) | Processing Step | Result |
|---|---|---|
| `encodeURIComponent(JSON)` with Arabic name | Decodes via `decodeURIComponent`, parses JSON | Valid user object with original Arabic name |
| `encodeURIComponent(JSON)` with ASCII name | Decodes via `decodeURIComponent`, parses JSON | Valid user object with ASCII name |
| Raw unencoded JSON (legacy / test mocks) | `decodeURIComponent` parses or fails; fallback parses raw string | Valid user object |
| Raw JSON with unescaped `%` (legacy) | `decodeURIComponent` throws `URIError`; inner catch falls back to `JSON.parse(raw)` | Valid user object |
| Missing header (`null`) | Early return | `null` |
| Malformed non-JSON string | Outer catch catches parse error | `null` |

## Verified Test Cases

1. **Arabic User Profile:**
   - Input: `{ id: 42, name: "محمد أحمد", email: "mohamed@example.com" }`
   - In middleware: `encodeURIComponent(JSON.stringify(token))` yields `%7B%22id%22%3A42%2C%22name%22%3A%22%D9%85%D8%AD%D9%85%D8%AF%20%D8%A3%D8%AD%D9%85%D8%AF%22...%7D`
   - `requestHeaders.set("user", ...)` succeeds without `TypeError`.
   - `extractUser(request)` returns exact object `{ id: 42, name: "محمد أحمد", email: "mohamed@example.com" }`.

2. **ASCII User Profile:**
   - Input: `{ id: 1, name: "John Doe", email: "john@example.com" }`
   - In middleware: encoded string contains only ASCII.
   - `extractUser(request)` returns exact object `{ id: 1, name: "John Doe", email: "john@example.com" }`.

3. **Special Characters & Percent Signs:**
   - Input: `{ id: 3, name: "User 100% & Co", email: "user@example.com" }`
   - Encoded cleanly, round-trips through `decodeURIComponent(raw)` without data loss.

4. **Missing or Invalid Header:**
   - Input: Header not present or `"invalid-json"`
   - `extractUser(request)` returns `null` safely without throwing.

## Files to Change

- `app/middlewares/auth-middleware.ts` — percent-encode the stringified token before calling `requestHeaders.set("user", ...)`
- `app/api/request.ts` — update `extractUser` to decode percent-encoded header with fallback to raw JSON
- `app/api/request.test.ts` — unit test suite asserting `extractUser` parses both percent-encoded and legacy raw JSON headers, specifically including Arabic Unicode strings
- `docs/architecture/decisions/api.md` — update the Auth section to document that the forwarded `user` header is percent-encoded to comply with HTTP ByteString constraints

## Constraints

- Do not alter the header name (`"user"`).
- Do not remove the stripping of incoming client `user` headers (`requestHeaders.delete("user")`) — this prevents header forgery.
- Do not leak the header into response headers.
- `extractUser` must remain non-throwing (returns `null` on missing or malformed header).
- No DB schema changes or migrations required (`users` and `marks` tables already use `utf8mb4_unicode_ci`).

## What NOT to Do

- Do not strip or sanitize the user's name to ASCII in `jwt` or `signIn` callbacks — users must retain their real Arabic names.
- Do not use Node `Buffer` in `auth-middleware.ts` — middleware runs in Edge runtime where `encodeURIComponent` / `decodeURIComponent` are standard web globals.
- Do not call `getServerSession` inside API routes to bypass the header — `docs/architecture/decisions/api.md` explicitly forbids `getServerSession` in API route handlers for performance and architecture consistency.

## Decisions Made

- Plan sweep confirmed that no existing unit tests mock `req.headers.get("user")` directly with non-URL-encoded JSON, but adding the fallback in `extractUser` makes it completely safe for existing mock patterns.
- Plan sweep confirmed that the service worker's `defaultCache` and `NetworkOnly` policies for `/api/*` are unaffected by this change since this is an internal request header injected between middleware and route handler.
