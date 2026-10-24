# Material Cards v2 — release and recovery guide

## What changed

- A verified scan now produces a structured `ScanAnalysis`: verdict, object, material group,
  visible conditions, versioned library properties, disposal guidance and uncertainty.
- `not_waste`, `multiple_objects`, `uncertain` and malformed AI output never reward or create a
  card. Offline inference is labelled preliminary and never rewards points.
- A scan preview shows a deterministic passive/active skill and the fixed 50-point cost. One scan
  creates at most one card; retries return the same card without another debit.
- The card screen has only Collection, Challenge and Battle. Legacy gacha, fusion, shards, old PvP,
  campaign and client-reported battle rewards are retired.
- Practice and asynchronous matches are scored by the server. Correct answers are not included in
  the match response, opponent submissions stay hidden until completion, and rating is separate
  from redeemable points.
- Reward/purchase email notifications use a Firestore outbox with retry state. `accepted` means the
  provider accepted the message; it does not prove delivery to the mailbox.

Gift images and reward history are not migrated or changed. The material-card image upload uses a
separate Cloudinary folder.

## Required production configuration

The server refuses to start in production without Firestore. Configure:

- `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_BASE64`
- `GEMINI_API_KEY`
- Cloudinary credentials for persistent card photos
- `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL`, `PURCHASE_NOTIFICATION_EMAIL` and
  `PUBLIC_APP_URL` for Render Free. SMTP remains available for hosts that allow SMTP egress.

For Resend, verify the sending domain and use an address on that domain in
`NOTIFICATION_FROM_EMAIL`. The provider test endpoint reports acceptance only. Bounce/delivery
confirmation needs Resend webhooks and is not claimed by this release.

`GET /api/health/live` checks the process. `GET /api/health/ready` checks the primary store and
reports optional research services as warnings.

## Migration

The migration is dry-run by default:

```bash
npm run migrate:material-cards
npm run migrate:material-cards -- --execute
```

Execution writes a mode-0600 JSON recovery file under ignored `backups/`, then clears only legacy
ownership, card-name, level, pity and shard fields. It preserves accounts, balances, reward
redemptions, purchases and unrelated progress. A Firestore migration marker makes a repeated run a
no-op. Keep the backup for 30 days.

Restore with:

```bash
npm run migrate:material-cards -- --execute --restore=backups/material-cards-v2-....json
```

Do not run migration and restore simultaneously from multiple machines. Pause writes/deploy the API
version that returns `410 legacy_card_system_retired`, take a Firestore managed backup when
available, run the script once, verify counts, then reopen traffic.

## Release checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium firefox webkit
npm run test:browser
LOAD_BASE_URL=https://your-awake-service.example npm run test:load
npm audit --omit=dev
```

The load smoke uses 50 concurrent workers by default and fails when ordinary API p95 is at least one
second. Run it only against an awake instance; Render cold-start time is a hosting limitation, not an
application p95 measurement.

## Known limits

- Free hosting can sleep, and Gemini/Cloudinary/Resend quotas can stop a flow. The UI reports these
  failures but cannot remove provider limits.
- AI output is schema-validated and properties come from server rules, but image classification is
  not a laboratory measurement.
- Exact-image hashes and a four-reward-per-material-profile daily cap reduce simple replay. They do
  not prove physical collection and must not be presented as collection evidence.
- Firestore integration and provider acceptance can be tested automatically; mailbox placement and
  real-user Core Web Vitals require deployment monitoring.
