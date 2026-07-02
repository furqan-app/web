# Fix Hostinger Auto-Deploy Build Failures

**Type:** bug  
**Date:** 2026-07-02  
**Status:** implemented

## Summary

Hostinger's CI/CD pipeline clones the repo fresh and runs `npm run build` without access to `.env.local`. Two things crash the build: (1) `db.ts` calls `new URL(process.env.QURAN_DATABASE_URL!)` at module load time — `undefined` when the env var is absent during build, producing `TypeError: Invalid URL`; (2) ESLint fails to resolve `next/core-web-vitals` in Hostinger's build environment. Additionally, `NEXT_PUBLIC_BASE_URL` must be baked into the static output as `https://furqan.taha7.com`, not `http://localhost:3000`.

## Root Cause

`app/utils/db.ts` constructs PrismaClients and a mysql2 connection at module scope, which Next.js executes during "Collecting page data." Any missing env var causes an unrecoverable crash before the build can finish. See [ADR 0010](../architecture/adr/0010-prisma-no-explicit-datasource-url.md).

## Files to Change

### `app/utils/db.ts`
Replace the entire file. Remove:
- Top-level `new URL(process.env.QURAN_DATABASE_URL!)` 
- `withConnectionLimit` utility (no longer needed here)
- `mysql2` `connection` export (unused by any caller)
- Explicit datasource URL from both PrismaClient constructors

New content — just two constructor calls with no args:
```typescript
import { PrismaClient as QuranPrismaClient } from "@/app/generated/quran-client";
import { PrismaClient as AppPrismaClient } from "@/app/generated/app-client";

export const quranPrisma = new QuranPrismaClient();
export const appPrisma = new AppPrismaClient();
```

Prisma reads `QURAN_DATABASE_URL` and `APP_DATABASE_URL` from the environment at query time via the schema's `env()` declarations. No call-site changes needed.

### `next.config.mjs`
Add `eslint: { ignoreDuringBuilds: true }` to `nextConfig`. Hostinger's build environment fails to resolve `next/core-web-vitals`; linting is already covered locally and in a separate CI step.

### `.env.production` (new, committed)
Create this file at the repo root with one line:
```
NEXT_PUBLIC_BASE_URL=https://furqan.taha7.com
```
This is the only build-time public env var that must be baked into the static output. It contains no secrets. Next.js loads `.env.production` during `next build` in production mode; `.env.local` (gitignored) overrides it locally so dev builds are unaffected.

## Constraints

- Do not add DB URLs or secrets to `.env.production` — this file is committed.
- `connection_limit=5` is no longer automatically appended. The server's `.env.local` should include it in the URL strings: `mysql://user:pass@host:3306/db?connection_limit=5`. This is a documentation/ops concern, not a code change.
- No call-site changes to `quranPrisma` or `appPrisma` imports — the exported names are identical.
- The `connection` (mysql2) export is removed; it had zero callers. If a raw connection is needed in future, create it inside the function that uses it, not at module scope (per ADR 0010).

## Decisions Made

- Option C from ADR 0010: no explicit datasource URL in PrismaClient constructors.
- ESLint suppressed during build (`ignoreDuringBuilds`) rather than fixed at the config level — the ESLint failure is an environment artifact specific to Hostinger, not a local issue.
- `.env.production` committed with only the public base URL — safe because it contains no credentials.
