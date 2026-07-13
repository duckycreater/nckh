# Security

This document tracks the secret-rotation policy and the security
guarantees BMO Robot ships with. It is the single source of truth for
"what's a secret" and "what do I do if I leaked one."

## What counts as a secret

Anything that grants access to a third-party service on our behalf:

| Service          | Secret(s)                                       | Where to rotate                |
| ---------------- | ----------------------------------------------- | ------------------------------ |
| Supabase         | `SUPABASE_URL`, service-role key, anon key      | Project → Settings → API       |
| Firebase Admin   | service-account JSON (`FIREBASE_SERVICE_ACCOUNT`)| GCP IAM → Service Accounts     |
| Gemini           | `GEMINI_API_KEY`                                | Google AI Studio → API keys    |
| Groq             | `GROQ_API_KEY`                                  | console.groq.com → Keys        |
| Cloudinary       | API key + secret                                | Console → Account → Security   |
| Resend           | `RESEND_API_KEY`                                | resend.com → API Keys          |
| Twilio           | Account SID + auth token                        | console.twilio.com → Auth      |
| Google Sheets    | service-account JSON + `GOOGLE_SPREADSHEET_ID`  | GCP IAM + Drive sharing        |
| OSF              | `OSF_TOKEN`                                     | osf.io → Settings → Tokens     |
| Hugging Face     | `HF_TOKEN`                                      | huggingface.co → Settings      |
| BMO admin panel  | `ADMIN_API_KEY` (32-byte hex)                   | `openssl rand -hex 32`         |
| BMO model HMAC   | `BMO_MODEL_HMAC_SECRET`                         | `openssl rand -hex 32`         |

## Secret rotation procedure

1. **Identify the leak surface.** Run:
   ```bash
   npm run check:secrets
   ```
   Anything that exits with hits is a candidate.
2. **Rotate at the provider first** — generate a new key, install it on
   any running services, then move to step 3.
3. **Update local `.env`** (git-ignored, never committed) with the new
   value. Restart `npm run dev` to pick it up.
4. **For CI**: GitHub Actions secrets are configured under
   `Settings → Secrets and variables → Actions`. Replace the entry, then
   re-run the workflow.
5. **Audit the leaked value** in the relevant provider's logs
   (Supabase has "API usage", Firebase has "Audit logs", etc.) for any
   unauthorised access since the leak timestamp.

## Why the rotation matters

A leaked secret is not just a vulnerability — it is a live credential.
Treat rotation as **incident response**, not a code change.

## What's already in place

- `.env*` is in `.gitignore`. `.env.example` only has placeholders.
- `firebase-applet-config.json` is git-ignored (was previously committed;
  has been `git rm --cached`).
- `service-account-key.json` is git-ignored.
- `npm run check:secrets` (and `node scripts/check-secrets.mjs`) scans
  the repo for AIza / gsk_ / AKIA / eyJ / hf_ prefixes and for long
  `*KEY/SECRET/TOKEN` variables, and exits 1 on hit. Wired into CI.
- Production cookie flags + HTTPS enforcement are described in
  `DEPLOYMENT.md` §3 (HTTPS-only).
- All `/api/*` routes pass through `helmet`, `cors` (whitelist-driven),
  and `express-rate-limit` (see `server/middleware/security.ts`).
- Session tokens are persisted to Supabase + auto-revoked on expiry
  (see `server/services/sessionStore.ts`).
- Passwords are bcrypt-hashed (cost 12) on first write; legacy
  plaintext entries in `data.json` auto-migrate on first successful
  login.

## Reporting a leak

If you find a leaked secret in this repository, **do not** open a
public GitHub issue. Email the maintainers directly. See
`CODE_OF_CONDUCT.md` for contact details.
