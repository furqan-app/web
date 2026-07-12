const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

// Resets the dedicated e2e-only databases (compose.e2e.yml) and loads the
// committed fixture (see docs/plans/visual-e2e-testing.md). Safe to run
// destructively — these containers are disposable and separate from the
// developer's real dev DBs in compose.yml.

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set. Run via \`npm run e2e:setup\` (loads .env.e2e).`);
  }
  return v;
}

function parseConnection(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
  };
}

async function loadFixture(quranUrl) {
  const sqlPath = path.join(__dirname, "../../e2e/fixtures/quran-fixture.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const conn = await mysql.createConnection({
    ...parseConnection(quranUrl),
    multipleStatements: true,
  });
  try {
    await conn.query(sql);
  } finally {
    await conn.end();
  }
}

async function main() {
  const quranUrl = requireEnv("QURAN_DATABASE_URL");
  requireEnv("APP_DATABASE_URL");

  console.log("[1/3] Resetting e2e Quran schema (prisma db push --force-reset)…");
  execSync(
    "npx prisma db push --force-reset --skip-generate --schema prisma/quran/schema.prisma",
    { stdio: "inherit" }
  );

  console.log("[2/3] Loading fixture data (e2e/fixtures/quran-fixture.sql)…");
  await loadFixture(quranUrl);

  console.log("[3/3] Resetting e2e app schema (no seed data)…");
  execSync(
    "npx prisma db push --force-reset --skip-generate --schema prisma/app/schema.prisma",
    { stdio: "inherit" }
  );

  console.log("\n✓ e2e databases ready.");
}

main().catch((e) => {
  console.error("\ne2e setup failed:", e.message);
  process.exit(1);
});
