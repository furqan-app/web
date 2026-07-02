# ADR 0010: PrismaClient Constructors Must Not Receive Explicit Datasource URLs

**Date:** 2026-07-02  
**Status:** Accepted

## Context

Next.js statically analyzes all imported modules during `next build` ("Collecting page data" phase). Any code that runs at module load time — outside function bodies — executes during this phase. If that code calls `new URL(undefined)` (e.g. because a runtime env var is absent during CI/CD build), the build crashes before deployment. PrismaClient with an explicit datasource URL passed to its constructor triggers this because the URL string must be constructed at the call site, which is module-level.

## Options Considered

**Option A — Lazy singleton via Proxy**  
Wrap each PrismaClient in an ES6 Proxy that defers instantiation until first property access, keeping the exported name identical to all call sites.

**Option B — Getter functions**  
Export `getQuranPrisma()` and `getAppPrisma()` factory functions instead of values; update all ~8 call sites to call the function before accessing the client.

**Option C — No explicit datasource URL (chosen)**  
Remove the datasource URL from PrismaClient constructors entirely. Prisma reads the env var defined in the schema (`env("QURAN_DATABASE_URL")`) at query time, not at construction. The constructor becomes `new QuranPrismaClient()` with no arguments and cannot crash at module load.

## Decision

Use Option C: PrismaClient instances are constructed without explicit datasource URLs and rely on schema-defined `env()` references read at query time.

## Consequences

- **+** Build never crashes from missing DB env vars — they are only needed at runtime (when queries actually execute).
- **+** `db.ts` is substantially simpler; no URL parsing utilities at module scope.
- **+** No call-site changes required.
- **-** `connection_limit=5` can no longer be injected programmatically via `withConnectionLimit`; it must be appended directly to the DATABASE_URL string in each environment's `.env.local` (e.g. `mysql://...?connection_limit=5`). Environments that omit it will use Prisma's default pool size.
- **-** The raw `mysql2` `connection` export (which depended on parsing the URL at module load) is removed. It was unused by any caller at the time of this decision — if a raw connection is needed in future, instantiate it inside the function that needs it, not at module scope.
