# CampusHustle GrowthProof

**Verified student growth marketplace for UNILAG.** Student vendors create Campaigns (per-sale, per-lead, ticket sales, content, promotion, media, research). Verified promoters join with a unique referral code, bring real results, and the vendor's confirmation mints a **GrowthProof** entry on their Passport.

> Build proof. Earn trust. Get hired.

## What's inside

- **Campaigns** — vendors post structured growth campaigns with target results, rewards (per result or fixed task), and a unique campaign code
- **Join & refer** — promoters join a campaign and get their own referral code + shareable link
- **Proof of result** — promoters submit proof; vendors confirm, reject, or dispute in a queue
- **GrowthProof Passport** — verified work history: level, rating, on-time rate, campaign results, vendor reliability
- **Student Business Profile** — verified students can register as vendors (replaces association-only posting)
- **Vendor reliability rating** — confirmed results, dispute rate, payment-confirmation reputation
- **Campaign analytics** — target vs confirmed results, active promoters, completion rate
- Chat, ratings, report/block, admin moderation, ambassador dashboard, campus-only access

**Deliberately not built (phase one):** escrow, wallets, payment processing, bank storage, commission deduction, outside registration, academic cheating, loans, gambling.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5174
npm run typecheck
npm run build
```

## Demo logins (all password `password123`)

| User | Account |
|---|---|
| `salawu` | Contributor / promoter |
| `morayo` | Vendor (Student Business Profile) |
| `chiamaka` | Ambassador |
| `kunle` | Admin |

## Local demo vs. cloud sync

Without extra configuration the app runs as a browser-local demo — every device starts from the same seed and **changes don't leave that browser**.

To make accounts real and sync every edit across devices (phone ↔ laptop), enable the **Supabase cloud layer**:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the whole contents of [`schema.sql`](./schema.sql) (creates the shared campus world + the demo auth accounts).
3. Optional for new sign-ups: **Authentication → Sign In / Providers → Email → Confirm email: OFF** (the demo accounts are pre-confirmed).
4. Copy `.env.example` to `.env` and paste your **Project URL** and **anon public key** (Project Settings → API).
5. Rebuild & redeploy — `.env` values are baked into the bundle at build time.

In cloud mode:

- Logging in runs against **Supabase Auth** (demo accounts use their demo email, e.g. `salawu@demo.campushustle.app`, password `password123`).
- Every signed-in user reads/writes **one shared campus world** (a JSON document in Postgres with row-level security), so a profile edit on the laptop appears live on the phone.
- Without the keys nothing changes — the local demo still works.

> Production hardening still to come: per-role server-side authorization instead of one shared document, real file upload to Supabase Storage, and server-enforced rate limits.

## Auto-deploying database changes (Supabase ↔ GitHub)

The `supabase/` folder is the **source of truth** for the database:

- `supabase/config.toml` — project config (set `project_id` to your project ref)
- `supabase/migrations/20260904000000_init.sql` — the initial schema (idempotent: it can be re-run on the current DB safely)

Two ways to apply schema going forward:

**A. Automatic (recommended) — GitHub database branches.**
1. In Supabase Dashboard → **Integrations → GitHub**, make sure this repo is connected and set the **Production Branch** to `main`.
2. From now on, every schema change is a numbered `.sql` file added to `supabase/migrations/` (e.g. `20260905000000_add_uploads.sql`), committed and merged to `main` — Supabase applies it automatically.
   - Locally you can generate a new empty migration with `supabase migration new add_uploads` (needs the [Supabase CLI](https://supabase.com/docs/guides/cli)).
   - Or just create the file by hand with a timestamp prefix.

**B. Manual — SQL editor.** Paste the contents of `schema.sql` (or a migration file) into Supabase → SQL Editor → **Run**. Use this when you don't want to touch Git.

> The old root `schema.sql` is kept as a single-file reference for the SQL Editor; the `supabase/migrations/` folder is what the GitHub integration actually applies.