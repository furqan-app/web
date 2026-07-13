# Fix NextAuth JWT/Session Corruption on Transient DB Error

**Type:** bug  
**Date:** 2026-07-07  
**Status:** implemented

## Root Cause

Two catch blocks in `app/api/auth/options.ts` return empty objects on Prisma transient errors instead of preserving the original values:

- `jwt` catch: `return {}` — overwrites JWT cookie with empty token. All subsequent `getToken` calls return `{}`, `token?.email` is falsy, every API request crashes with 500. User cannot recover without clearing cookies.
- `session` catch: `session.user = {}; return session` — replaces session user with empty object.

## Fix

| Callback | Current | Fix |
|---|---|---|
| `jwt` catch | `return {}` | `return token` |
| `session` catch | `session.user = {}; return session` | `return session` (remove the `session.user = {}` line) |

Return the original value unchanged on error. User's session stays valid; they may see a failed request during the Prisma hiccup but a retry succeeds because the cookie was never corrupted.

## Files Changed

- `app/api/auth/options.ts` — two catch block fixes above

## Constraints

- Do not add logging to the catch blocks — silent preservation is correct; transient DB errors in auth callbacks should not flood prod logs.
- Do not remove the try/catch.
- Do not change the JWT secret or session strategy.
