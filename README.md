# Ledgerion

A forex trading journal with manual trade entry, a live analytics dashboard, and daily/weekly/monthly/yearly reports.

## Tech stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS**
- **MySQL** via **Prisma ORM** (works against a local XAMPP/MariaDB instance in development, or any cloud MySQL host in production)
- **Auth.js (NextAuth v5)** — Credentials provider, bcrypt password hashing, JWT sessions

All trade and account data is read and written through Prisma against MySQL. There is no broker sync or CSV import — every trade is entered manually. `localStorage` is used for exactly one thing: remembering the last-used session/setup as a form default; it is never a source of truth for trade or account records.

## Running locally (XAMPP MySQL)

1. Start Apache + MySQL in XAMPP and make sure a database named `trading_journal` exists (empty is fine).
2. Copy the environment variables below into both `.env` (read by the Prisma CLI) and `.env.local` (read by Next.js at runtime) — they already exist in this repo with a generated secret:

   ```
   DATABASE_URL="mysql://root:@127.0.0.1:3306/trading_journal"
   NEXTAUTH_SECRET="<32-byte base64 secret>"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. Install dependencies and create the schema:

   ```bash
   npm install
   npx prisma migrate dev --name init
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

5. Visit `http://localhost:3000`, sign up, and start logging trades.

## Deploying to production (Vercel + cloud MySQL)

The app never hardcodes a database connection string or auth secret — both are read exclusively from environment variables — so going live is a matter of pointing those variables at production infrastructure:

1. **Provision a cloud MySQL database**, e.g. [TiDB Cloud Serverless](https://tidbcloud.com) (MySQL-wire-compatible, generous free tier) or PlanetScale/Aurora/RDS.
2. Set `DATABASE_URL` to that host's connection string locally (or in a `.env.production` you don't commit) and run:

   ```bash
   npx prisma migrate deploy
   ```

   This applies the same migrations created locally against XAMPP to the cloud database, without generating new migration files.
3. Push this repository to GitHub.
4. Import the repo into [Vercel](https://vercel.com/new).
5. In the Vercel project's Environment Variables settings, add:
   - `DATABASE_URL` — the cloud MySQL connection string
   - `NEXTAUTH_SECRET` — a new random 32-byte base64 secret (generate with `openssl rand -base64 32`) — use a different one than local dev
   - `NEXTAUTH_URL` — your production URL (e.g. `https://your-app.vercel.app`)
6. Deploy. Vercel runs `npm install` (which triggers `prisma generate` via `postinstall`) and `npm run build` automatically.

## Notes

- `npm audit` will report a handful of advisories against the Next.js 14.x dependency tree (Image Optimizer DoS, WebSocket SSRF, an internal PostCSS bundled by Next itself, etc.). These affect broad ranges of the 14.x line and are only resolved by moving to Next 16, which is out of scope while the app targets Next.js 14 per spec. None are exploitable in this app's usage (no image optimization of untrusted remote URLs, no WebSocket upgrades).
- Every Prisma query in `lib/data/*` and `lib/actions/*` is scoped by the authenticated user's `id` — one user can never read or write another user's trades or account settings.
