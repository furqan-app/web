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

SSH into Hostinger, navigate to the site directory, and pull:

```bash
cd ~/domains/furqan.taha7.com/public_html   # adjust to your actual site path
git pull origin main
npm install
npm run build
```

---

## Phase 5 — Push the App DB schema

Still on the Hostinger SSH session, from the site directory:

```bash
npx prisma db push --schema prisma/app/schema.prisma
```

This creates the `users` and `marks` tables. No data to import — the App DB starts empty.

---

## Phase 6 — Set environment variables

Create `.env.local` in the site root:

```bash
nano .env.local
```

```env
NEXT_PUBLIC_BASE_URL=https://furqan.taha7.com
NEXTAUTH_URL=https://furqan.taha7.com
NEXTAUTH_SECRET=<run `openssl rand -base64 32` locally to generate>

GOOGLE_CLIENT_ID=<your Google client ID>
GOOGLE_CLIENT_SECRET=<your Google client secret>

QURAN_DATABASE_URL="mysql://u123456789_furqan_quran_user:<password>@localhost:3306/u123456789_furqan_quran"
APP_DATABASE_URL="mysql://u123456789_furqan_app_user:<password>@localhost:3306/u123456789_furqan_app"
```

> On Hostinger, MySQL runs on `localhost:3306` (standard port — no Docker port offset).

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
