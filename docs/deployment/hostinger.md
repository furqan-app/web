# Deploy Furqan to Hostinger

Target: https://furqan.taha7.com  
Stack: Next.js 14, two MySQL databases (Quran + App), NextAuth Google OAuth

---

## Phase 1 — Create databases in hPanel

1. hPanel → **Databases → MySQL Databases**
2. Create two databases:
   - `furqan_quran` with a dedicated user (e.g. `furqan_quran_user`)
   - `furqan_app` with a dedicated user (e.g. `furqan_app_user`)
3. Save both database names, usernames, and passwords for the env vars in Phase 6

> Hostinger prefixes DB names and usernames with your account ID (e.g. `u123456789_furqan_quran`). Use the full names shown after creation.

---

## Phase 2 — Export the Quran database locally

```bash
mysqldump -h 127.0.0.1 -P 3307 -u quran_user -pquran_password --no-tablespaces furqan_quran > /tmp/furqan_quran_dump.sql
ls -lh /tmp/furqan_quran_dump.sql
```

The `--no-tablespaces` flag is required for MySQL 8.0 (avoids the PROCESS privilege error).

---

## Phase 3 — Import the Quran DB to Hostinger

**Via SSH (recommended, no size limit):**

Upload from your local machine:
```bash
scp /tmp/furqan_quran_dump.sql u123456789@your-server.hostinger.com:~/
```

Then on the Hostinger SSH session:
```bash
mysql -u u123456789_furqan_quran_user -p u123456789_furqan_quran < ~/furqan_quran_dump.sql
```

**Via phpMyAdmin** (only if dump < 50 MB):  
hPanel → Databases → phpMyAdmin → select the Quran DB → Import tab → upload the `.sql` file.

---

## Phase 4 — Deploy the latest code

Deployment is **GitHub-connected** and **automatic**: Hostinger monitors the `prod`
branch and triggers a redeploy on every push to it — merging the release PR into
`prod` is sufficient. No manual "redeploy" click in hPanel is needed for routine
releases.

Hostinger automatically runs `npm install` (which fires the `postinstall` Prisma
client generation for both schemas) and your build (`npm run build`) — you don't
run these by hand.

### Where the app is installed & the SSH limitation

The deploy installs the Node.js app into a **`nodejs` folder outside `public_html`**,
at one of:

- `~/nodejs`, or
- `/home/<username>/domains/furqan.taha7.com/nodejs`

`public_html` only holds the `.htaccess`/proxy that forwards requests to the Node
process. The `DO_NOT_UPLOAD_HERE` marker at the home root is Hostinger telling you
not to drop app files there.

**The catch:** on Business/Cloud shared plans you **cannot run `npm`/`npx` via SSH** —
npm only runs *automatically during a deploy*; the node/npm binaries aren't exposed
in the SSH shell. (The `mysql`/`mysqldump` clients used elsewhere in this runbook
*are* available over SSH — those are system binaries, unrelated to the managed Node
runtime.) So anything that needs npm — including the App DB push in Phase 5 — must
run either **during the deploy** or **from your local machine**, never via SSH on
the server.

---

## Phase 5 — Apply the App DB schema

The App DB schema is applied via **`prisma migrate deploy`**, which runs automatically
in the `build` npm script on every Hostinger deploy. For a brand-new empty App DB
(first-time setup), the first deploy after setting `APP_DATABASE_URL` in Phase 6 will
apply all migrations automatically — no manual step needed.

If the App DB was previously created with `prisma db push` (i.e. tables exist but have
no migration history), you must **baseline** it first before the first deploy. See
`docs/plans/adopt-prisma-migrations.md` for the one-time baselining procedure, which
involves running `prisma migrate resolve --applied` from your local machine against
the prod DB.

### Running migrate commands against the prod DB from your local machine

`prisma migrate resolve` and `prisma migrate status` only need a **connection to the
database** — they don't need to run on the server. Put the **production**
`APP_DATABASE_URL` in a local, git-ignored `.env.prod` file and run from your
laptop:

```bash
# .env.prod (git-ignored): APP_DATABASE_URL="mysql://u123456789_furqan_app_user:<password>@<prod-host>:3306/u123456789_furqan_app"
dotenv -e .env.prod -- npx prisma migrate status --schema prisma/app/schema.prisma
```

Shared-hosting MySQL is only reachable from whitelisted IPs — in hPanel go to
**Databases → Remote MySQL**, add your current IP, and use the **remote host** shown
there (not `localhost`, which only resolves for the app running on the server).

---

## Phase 6 — Set environment variables

On a GitHub-connected Business/Cloud deploy you **don't** hand-edit `.env.local`
over SSH — set these in hPanel → **Websites → your site → Node.js → Environment
variables** (the running app reads them from the platform):

```env
NEXT_PUBLIC_BASE_URL=https://furqan.taha7.com
NEXTAUTH_URL=https://furqan.taha7.com
NEXTAUTH_SECRET=<run `openssl rand -base64 32` locally to generate>

GOOGLE_CLIENT_ID=<your Google client ID>
GOOGLE_CLIENT_SECRET=<your Google client secret>

QURAN_DATABASE_URL="mysql://u123456789_furqan_quran_user:<password>@localhost:3306/u123456789_furqan_quran"
APP_DATABASE_URL="mysql://u123456789_furqan_app_user:<password>@localhost:3306/u123456789_furqan_app"
```

> The app runs **on** the Hostinger server, so its DB host is `localhost:3306`
> (standard port — no Docker port offset). The `<prod-host>` in Phase 5 Option 1 is
> different: that's the external Remote-MySQL host you connect to from your laptop.

After saving, push any change to `prod` (or manually trigger a redeploy in hPanel → **Websites → your site → Node.js → Git**) so the new values take effect.

---

## Phase 7 — Configure Node.js in hPanel

1. hPanel → **Websites** → your site → **Node.js**
2. Set:
   - **Node.js version**: 20.x (latest LTS)
   - **Application root**: path to your site folder
   - **Application startup file**: leave as default or point to `server.js`
   - **Start command**: `npm start`
3. Click **Restart** / **Enable Node.js**

---

## Phase 8 — Update Google OAuth callback URL

[Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → your OAuth client:

Add to **Authorized redirect URIs**:
```
https://furqan.taha7.com/api/auth/callback/google
```

---

## Phase 9 — Verify

- [ ] `https://furqan.taha7.com` loads
- [ ] A Quran page renders with real data
- [ ] Google login completes successfully

---

## Ongoing — deploying App DB schema changes

The App DB uses versioned Prisma migrations (ADR 0017). Schema changes follow this
workflow:

1. **Edit `prisma/app/schema.prisma`** locally.
2. **Run `npm run app-migrate-dev -- --name <descriptive_name>`** — creates
   `prisma/app/migrations/TIMESTAMP_<name>/migration.sql`, applies it to your local
   dev DB, and regenerates the app Prisma client.
3. **Commit both** `schema.prisma` and the new `migrations/` file.
4. **Push to `prod`** — Hostinger runs `npm run build`, which starts with
   `prisma migrate deploy --schema prisma/app/schema.prisma`. This applies any pending
   migration files in order, silently, with no prompts and no risk of accidental
   column drops. It is a no-op if no migrations are pending.

**`migrate deploy` is safe to run on every deploy** — it only applies SQL from
committed migration files; it cannot drop anything that isn't in a migration you wrote.

**Before any schema-changing deploy, back up the App DB:**
```bash
mysqldump -u u123456789_furqan_app_user -p --no-tablespaces \
  u123456789_furqan_app > ~/furqan_app_backup_$(date +%F).sql
```

**Never** use `--force-reset` on the App DB — it drops the entire database.
That flag belongs only to the Quran seeder (`npm run seed:quran`), which rebuilds
reproducible content and never touches user data.
