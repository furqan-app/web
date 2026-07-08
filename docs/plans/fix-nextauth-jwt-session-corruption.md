# Fix NextAuth JWT/Session Corruption on Transient DB Error

**Type:** bug  
**Date:** 2026-07-07  
**Status:** implemented

## Summary

When Prisma has a transient error during a NextAuth callback, two catch blocks in `app/api/auth/options.ts` return empty objects instead of the original token/session. The `jwt` callback returning `{}` overwrites the JWT cookie with an empty token, corrupting the user's session. All subsequent API requests then fail — the middleware's `getToken` gets `{}` back, `token?.email` is falsy, and the request crashes with an unhandled error producing an HTTP 500. The user sees "Something went wrong" on every action and cannot recover without clearing cookies.

## Root Cause

`app/api/auth/options.ts` has two unsafe catch blocks:

**`jwt` callback (line ~57):**
```ts
} catch (e) {
  return {}; // ← overwrites the JWT cookie with an empty token
}
```

**`session` callback (line ~43):**
```ts
} catch (e) {
  session.user = {}; // ← replaces the session user with an empty object
  return session;
}
```

On a transient Prisma connection failure, both callbacks degrade the session rather than preserving it. The `jwt` catch is the critical one — it writes `{}` as the new encrypted JWT cookie, which persists across requests.

## Verified Fix

| Callback | Current (broken) | Fix |
|---|---|---|
| `jwt` catch | `return {}` | `return token` |
| `session` catch | `session.user = {}; return session` | `return session` |

On error, return the original value unchanged. The user's session stays valid; they may see a failed request during the Prisma hiccup but a retry succeeds because the cookie was never corrupted.

## Files to Change

- `app/api/auth/options.ts`
  - `jwt` catch block: `return {}` → `return token`
  - `session` catch block: remove `session.user = {}` line, keep `return session`

## Constraints

- Do not add logging to the catch blocks — silent preservation is correct here; noisy logging on transient DB errors would flood production logs.
- Do not remove the try/catch — the Prisma lookup can fail and must be guarded.
- Do not change the happy-path return values.

## What NOT to Do

- Do not wrap mushaf route handlers in blanket try/catch — per `docs/standards/api-conventions.md`, only catch errors that can be handled meaningfully; transient DB errors in route handlers are an infrastructure concern, not a code bug.
- Do not change the JWT secret or session strategy.
