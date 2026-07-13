# Fix Hostinger Auto-Deploy Build Failures

**Type:** bug  
**Date:** 2026-07-02  
**Status:** implemented

## Root Cause

`app/utils/db.ts` called `new URL(process.env.QURAN_DATABASE_URL!)` at module scope. Next.js executes module scope during "Collecting page data" — missing env var during Hostinger's build causes an unrecoverable `TypeError: Invalid URL`. ESLint also failed to resolve `next/core-web-vitals` in Hostinger's environment. `NEXT_PUBLIC_BASE_URL` needed to be baked into static output as `https://furqan.taha7.com`. See [ADR 0010](../architecture/adr/0010-prisma-no-explicit-datasource-url.md).

Running `npm run build` locally also failed at the `prisma migrate deploy` step: the `build` script runs Prisma bare, Prisma looks for `.env` at root (doesn't exist), and `APP_DATABASE_URL` lives in `.env.local` which Next.js loads but Prisma doesn't.

## Files Changed

**`app/utils/db.ts`** — replaced entirely. Remove top-level `new URL(...)`, `withConnectionLimit`, the `mysql2` connection export (zero callers), and explicit datasource URLs from both PrismaClient constructors. Prisma reads `QURAN_DATABASE_URL`/`APP_DATABASE_URL` from env at query time via schema `env()` declarations:

```typescript
import { PrismaClient as QuranPrismaClient } from "@/app/generated/quran-client";
import { PrismaClient as AppPrismaClient } from "@/app/generated/app-client";

export const quranPrisma = new QuranPrismaClient();
export const appPrisma = new AppPrismaClient();
```

**`next.config.mjs`** — add `eslint: { ignoreDuringBuilds: true }`. Hostinger env artifact; linting runs locally and in CI.

**`.env.production`** (new, committed) — one line: `NEXT_PUBLIC_BASE_URL=https://furqan.taha7.com`. No secrets. Next.js loads it during `next build` in production; `.env.local` overrides locally.

**`package.json`** — add `build:local` script:
```json
"build:local": "dotenv -e .env.local -- npx prisma migrate deploy --schema prisma/app/schema.prisma && next build"
```
`build` stays unchanged — Hostinger uses it with `APP_DATABASE_URL` already in platform env.

## Constraints

- Do not add DB URLs or secrets to `.env.production` — it's committed.
- `connection_limit=5` must be included in the URL strings in `.env.local` (`?connection_limit=5`) — no longer auto-appended.
- Do not add `dotenv -e .env.local --` to the existing `build` script — `.env.local` doesn't exist on Hostinger and `dotenv-cli` v7 throws `ENOENT` on a missing file.
- Do not use `--env-file .env.local` as a Prisma CLI flag — Prisma 5 errors if the file is absent.
- The `mysql2` connection export is removed; it had zero callers. If raw connection is needed in future, create it inside the function that uses it (per ADR 0010).

## Usage

- **Local testing:** `npm run build:local && npm start`
- **Hostinger production:** `npm run build` (unchanged)
