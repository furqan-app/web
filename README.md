# Furqan

A word-focused Qur'an reading app. Next.js 14 (App Router), MySQL/Prisma, NextAuth (Google/GitHub), next-intl (ar/en), Tailwind/shadcn.

## Architecture at a glance

Two separate MySQL databases (see [ADR 0008](docs/architecture/adr/0008-quran-app-database-split.md)):

| Database | Purpose | Env var | Prisma client | Local port |
|---|---|---|---|---|
| `furqan_quran` | Read-only Qur'an content | `QURAN_DATABASE_URL` | `quranPrisma` | 3307 |
| `furqan_app` | User/interaction data | `APP_DATABASE_URL` | `appPrisma` | 3308 |

Both clients are exported from `app/utils/db.ts`. Never add a relation/FK across the two domains.

## Local setup

1. **Environment** — copy the template and fill in the secrets (`NEXTAUTH_SECRET` via `openssl rand -base64 32`, OAuth creds):
   ```bash
   cp .env.example .env.local
   ```
   Optionally `cp compose.env.example .env` to override docker-compose defaults (ports/credentials).

2. **Databases** — start both MySQL containers + phpMyAdmin (`http://localhost:8081`):
   ```bash
   docker compose up -d
   ```

3. **Install deps** — `postinstall` generates both Prisma clients into `app/generated/`:
   ```bash
   npm install
   ```

4. **App schema** — create `users`/`marks` in `furqan_app`:
   ```bash
   npm run app-db-push
   ```

5. **Seed the Qur'an DB** — regenerate `furqan_quran` from the QDC API (destructive; see [ADR 0009](docs/architecture/adr/0009-reproducible-quran-seeder.md)):
   ```bash
   npm run seed:quran -- --force
   ```

6. **Run** the dev server on [http://localhost:3000](http://localhost:3000):
   ```bash
   npm run dev
   ```

## Commands

```bash
npm run dev                 # dev server (port 3000)
npm run build               # production build
npm run lint                # ESLint
npm run prisma-generate     # regenerate both Prisma clients
npm run app-db-push         # push the app schema to furqan_app
npm run seed:quran -- --force  # rebuild furqan_quran from the QDC API (destructive)
npm run quran-studio        # Prisma Studio for furqan_quran
npm run app-studio          # Prisma Studio for furqan_app
npm run extract-translations   # sync i18n keys
```

The Qur'an seeder lives in `scripts/quran-seed/`; it refuses to run without `--force` and prints its target database first.

## Documentation

- Active architectural decisions: [`docs/architecture/DECISIONS.md`](docs/architecture/DECISIONS.md)
- ADR history: [`docs/architecture/adr/`](docs/architecture/adr/)
- Standards (API, components, database, i18n, styling): [`docs/standards/`](docs/standards/)
- Task plans: [`docs/plans/`](docs/plans/)
