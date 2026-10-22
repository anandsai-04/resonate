# Deploying Resonate to Vercel + Postgres (no GitHub needed)

This guide takes you from the downloaded `Resonate` folder to a live URL like
`https://resonate-yourname.vercel.app`, with a real Postgres database storing
student email + regd number + music preferences.

**You do NOT need GitHub.** We'll deploy directly from your laptop with the
Vercel CLI. If you ever want to use GitHub later, you can connect the repo
after the fact.

---

## What you'll need (10 minutes of setup)

1. **Node.js 18+** on your laptop — check with `node --version`
2. **A Supabase account** (free) — https://supabase.com
3. **A Resend account** (free) — https://resend.com (for magic-link emails)
4. **The Vercel CLI** installed (one command, see below)

---

## Step 1 — Create your Postgres database on Supabase (3 min)

1. Go to **https://supabase.com** → Sign up with GitHub/Google/email
2. Click **New Project**
3. Fill in:
   - **Name**: `resonate-db`
   - **Database password**: click "Generate" → write it down somewhere safe
   - **Region**: pick the one closest to you
4. Click **Create new project** → wait ~2 min for provisioning
5. Once ready, on the left sidebar:
   - Click **Connect** (or Project Settings → Database)
   - Find **Connection string** → **URI**
   - You'll see two connection strings:
     - **Transaction** (pooled, `?pgbouncer=true`) — copy as `DATABASE_URL`
     - **Session** (direct, no pgbouncer) — copy as `DIRECT_URL`
   - Replace `[YOUR-PASSWORD]` with your actual database password

Save both strings somewhere — you'll paste them into a `.env` file next.

---

## Step 2 — Set up local environment (3 min)

Open a terminal in your `Resonate` folder:

```bash
cd ~/Documents/Resonate
```

Copy the example env file:

```bash
cp .env.example .env.local
```

Open `.env.local` in your editor and fill in these values:

```bash
DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.xxxx.supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.xxxx.supabase.co:5432/postgres"

# Generate a random secret:
NEXTAUTH_SECRET="output-of-openssl-rand-base64-32"

NEXTAUTH_URL="http://localhost:3000"

# (optional for local testing, required for production)
RESEND_API_KEY="re_xxxxxxxxxxxx"
EMAIL_FROM="Resonate <onboarding@resend.dev>"

# Replace with your actual campus email domain(s)
ALLOWED_DOMAINS="yourcampus.edu"
```

To generate `NEXTAUTH_SECRET`, run:

```bash
openssl rand -base64 32
```

---

## Step 3 — Push the database schema to Postgres (1 min)

Still in your `Resonate` folder:

```bash
# Install dependencies (first time only)
npm install

# Generate Prisma client
npm run db:generate

# Push schema to your Supabase database
npm run db:push
```

You should see:
```
🚀 Your database is now in sync with your Prisma schema.
```

**Verify:** Open Supabase dashboard → Table Editor — you should see tables:
- `User`, `UserPreference`, `Account`, `Session`, `VerificationToken`
- `Track`, `Playlist`, `PlaylistTrack`, `SavedAlbum`, `ListeningHistory`

---

## Step 4 — Test locally (optional but recommended, 1 min)

```bash
npm run dev
```

Open http://localhost:3000 — you should be redirected to `/auth/signin`.
Type your campus email → if you set up Resend, you'll get a magic link in your inbox.

(If you haven't set up Resend yet, you can skip auth testing locally — go straight to deploying.)

---

## Step 5 — Install Vercel CLI + deploy (3 min)

This is the part that replaces GitHub.

```bash
# Install Vercel CLI globally
npm install -g vercel

# Sign in (uses email magic link — same flow as Resend)
vercel login

# Inside your Resonate folder, run:
vercel
```

Vercel will ask a few questions:

```
? Set up and deploy "~/Documents/Resonate"? [Y/n]  Y
? Which scope should contain your project?          <your-email>
? Link to existing project? [y/N]                   N
? What's your project name? (resonate)              resonate
? In which directory is your code located?          ./
? Want to modify these settings? [y/N]              N
```

Vercel will:
- Detect Next.js automatically
- Install dependencies
- Run the build
- Deploy to a URL like `https://resonate-xxxx.vercel.app`

**But wait** — the build will fail because Vercel doesn't have your environment variables yet. Cancel out and add them:

```bash
vercel env add DATABASE_URL
# Paste the pooled Supabase connection string with ?pgbouncer=true

vercel env add DIRECT_URL
# Paste the direct Supabase connection string (no ?pgbouncer=true)

vercel env add NEXTAUTH_SECRET
# Same value as your local .env.local

vercel env add NEXTAUTH_URL
# Paste your Vercel URL: https://resonate-xxxx.vercel.app (no trailing slash)

vercel env add RESEND_API_KEY
# Your Resend API key

vercel env add EMAIL_FROM
# Resonate <onboarding@resend.dev>

vercel env add ALLOWED_DOMAINS
# yourcampus.edu
```

For each one, when prompted, choose **Production**, **Preview**, AND **Development** environments.

Now deploy for real:

```bash
vercel --prod
```

Wait 2-3 minutes. At the end you'll see:

```
✅ Production: https://resonate-xxxx.vercel.app
```

Open that URL — you'll see the sign-in page. Type your campus email, click the magic link, and you're in!

---

## Step 6 — Run database migration on production (1 min)

The deploy created the tables on Supabase? Actually, **no** — Vercel doesn't run `prisma db push` automatically. You need to do it once, from your laptop, pointing at the production DB:

```bash
cd ~/Documents/Resonate
# Your .env.local already has the production Supabase credentials
npm run db:push
```

If you see "🚀 Your database is now in sync", you're done.

---

## Step 7 — Set up Resend for magic-link emails (5 min, only needed once)

1. Go to **https://resend.com** → Sign up
2. Dashboard → **API Keys** → **Create API Key** → copy the `re_...` key
3. Add it to your `.env.local` as `RESEND_API_KEY`
4. For testing, use `onboarding@resend.dev` as the sender — this works on any email address without domain verification
5. For production (when you want emails to come from `no-reply@yourdomain.com`):
   - Resend Dashboard → **Domains** → **Add Domain**
   - Add the DNS records Resend gives you to your domain's DNS
   - Wait for verification (5-30 min)
   - Update `EMAIL_FROM` to `Resonate <no-reply@yourdomain.com>`
   - Re-run `vercel env add EMAIL_FROM` with the new value

---

## Step 8 — Updating your deploy

Whenever you make code changes:

```bash
vercel --prod
```

That's it. Vercel caches dependencies so rebuilds are fast (~30s for small changes).

If you change `prisma/schema.prisma`:

```bash
npm run db:push   # apply schema changes to Supabase
vercel --prod     # redeploy with new Prisma client
```

---

## Troubleshooting

### "Prisma could not connect to database" on Vercel
- Make sure `DATABASE_URL` has `?pgbouncer=true` at the end
- Make sure `DIRECT_URL` does NOT have `?pgbouncer=true`
- Both URLs must use the same password

### "Magic link email never arrives"
- Check Resend dashboard → **Logs** for delivery status
- For testing, make sure you're using `onboarding@resend.dev` as the sender
- Check your spam folder
- Resend's free tier only lets you send to **your own email** until you verify a domain

### "Email not on allowed list" error
- Update `ALLOWED_DOMAINS` to include your campus domain (e.g. `iitb.ac.in`)
- Use `*` only for development

### Build fails with "prisma generate not found"
- Verify `package.json` has `"postinstall": "prisma generate"` (it should — added in this version)

### "NEXTAUTH_URL" mismatch error
- Make sure `NEXTAUTH_URL` matches your exact Vercel URL (no trailing slash, https://)

### `vercel env add` prompts to overwrite
- Choose "Yes" to overwrite if you're updating a value

### Need to run a one-off command on production DB
- Your local `.env.local` already points to the production Supabase database
- Just run `npm run db:push` locally — it'll affect production
- (If you ever want a separate staging DB, create a second Supabase project)

---

## What your database looks like now

After running `npm run db:push`, your Supabase database has these tables:

| Table | Purpose |
|-------|---------|
| **User** | Student identity: email, name, regdNumber, course, university, year, role |
| **UserPreference** | One row per user with `genres[]`, `languages[]`, `artists[]`, `albums[]`, `moods[]`, `discoveryLevel`, `autoPlayNext` |
| Account, Session, VerificationToken | NextAuth's internal auth tables (managed automatically) |
| Track | Cached song metadata (shared across all users) |
| Playlist | User playlists (with `isPublic` flag for sharing) |
| PlaylistTrack | Many-to-many: tracks in playlists |
| SavedAlbum | Albums a user has hearted |
| ListeningHistory | Every play event (for taste profiling) |

You can inspect all of these visually in Supabase → **Table Editor**.

---

## Why no GitHub?

GitHub 2FA is annoying, but Vercel CLI bypasses it entirely:
- No repo to manage
- No branches or PRs to set up
- Direct deploy from your laptop
- One command to redeploy: `vercel --prod`

If you ever DO want to use GitHub (e.g. for collaboration), you can:
1. Create a GitHub repo
2. Push your code there
3. Import the repo into Vercel via the web UI

But for solo campus deployments, Vercel CLI is simpler.

---

## What to do next

Once your app is live:

1. **Invite a few friends** — share the URL, they sign in with their campus email
2. **Add your regd number** — currently, the `User` table has a `regdNumber` field but the UI doesn't collect it yet. Add a "Complete your profile" page that asks for it on first sign-in. (Phase 2 feature.)
3. **Make a "Trending on Campus" page** — aggregate `ListeningHistory` across all users
4. **Public playlists** — the schema has `isPublic` flag, just need a UI toggle + a `/p/[id]` route

These are great next iterations. Good luck!
