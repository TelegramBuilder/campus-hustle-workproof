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
| `funmilayo` | Vendor (Student Business Profile) |
| `chuka` | Ambassador |
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