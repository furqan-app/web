const { PrismaClient } = require("../../app/generated/quran-client");

/**
 * Resolves QURAN_DATABASE_URL — the same env var the app uses (see app/utils/db.ts),
 * so the seeder always targets `furqan_quran` and never the app DB. Run via
 * `npm run seed:quran`, which loads .env.local through dotenv-cli.
 */
function requireQuranDatabaseUrl() {
  const url = process.env.QURAN_DATABASE_URL;
  if (!url) {
    throw new Error(
      "QURAN_DATABASE_URL is not set. Run via `npm run seed:quran` (loads .env.local)."
    );
  }
  return url;
}

/** Human-readable "host:port/db" for the pre-flight confirmation print. */
function targetLabel(url) {
  const u = new URL(url);
  return `${u.hostname}:${u.port || 3306}${u.pathname}`;
}

/** A PrismaClient bound to the Quran database, for the data inserts. */
function createQuranClient(url) {
  return new PrismaClient({ datasources: { db: { url } } });
}

module.exports = { requireQuranDatabaseUrl, targetLabel, createQuranClient };
