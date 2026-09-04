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

Demo data lives in browser localStorage — this is a front-end prototype. Production requires a real backend with server-side auth, authorization, and storage.