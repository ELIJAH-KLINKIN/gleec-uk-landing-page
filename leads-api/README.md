# GLEEC Business — leads API

Receives "Join waitlist" submissions from the landing page and:

1. stores each lead in Postgres (Neon),
2. posts it to a Telegram channel (optional),
3. forwards it to a CRM as a signed webhook (optional).

Plain JavaScript Vercel Functions (Node.js 24, ES modules, no framework). Two runtime
dependencies: `@neondatabase/serverless` and `@vercel/functions`.

```
api/leads.js      POST /api/leads   (+ OPTIONS preflight, 405 for everything else)
api/health.js     GET  /api/health  -> { ok, db, telegram, crm } (booleans only)
lib/              all logic, dependency-injected and unit-tested
db/schema.sql     idempotent schema
scripts/migrate.js applies the schema
```

## Deploy notes

- Vercel project **Root Directory: `leads-api`**, Framework Preset: **Other**, no build command.
- `.vercelignore` uploads only `api/`, `lib/` and the package files, so nothing else is served statically.
- Run the functions in the same region as the Neon database (every lead makes 3 database round
  trips): set it at `https://vercel.com/elijah-builds/PROJECT/settings/functions`, e.g. `lhr1` for
  a London (`eu-west-2`) database.
- After the database exists, run the migration once: `npm run migrate`.
- Check the wiring: `GET /api/health` returns `{"ok":true,"db":true,"telegram":false,"crm":false}`.

## Environment variables

| Name | Required | What it is |
|---|---|---|
| `DATABASE_URL` | yes | Postgres URL. Injected by Vercel's Neon integration. Missing → every lead gets 500. |
| `ALLOWED_ORIGINS` | yes | Comma-separated exact origins, e.g. `https://elijah-klinkin.github.io,http://localhost:5173,http://localhost:4173`. Missing → every request gets 403. |
| `IP_HASH_SALT` | yes | Secret for hashing IPs (`openssl rand -hex 32`). Missing → no IP stored and no rate limiting. |
| `TELEGRAM_BOT_TOKEN` | no | Bot token from [@BotFather](https://t.me/BotFather). |
| `TELEGRAM_CHAT_ID` | no | Channel id, `-100…` (see below). Telegram is on only when both are set. |
| `TELEGRAM_THREAD_ID` | no | Topic id, for a group with topics. |
| `CRM_WEBHOOK_URL` | no | CRM endpoint. |
| `CRM_WEBHOOK_SECRET` | with URL | HMAC secret for the signature. URL without secret → nothing is sent. |

See `.env.example`. Missing or half-set variables are logged as `config.warning` at cold start.

## Tests and migration

```bash
npm install
npm test                                    # node:test, no network, no database
npm run migrate                             # uses DATABASE_URL from the env, .env.local or .env
vercel env pull .env.local && npm run migrate   # alternative: pull the project's env first
```

## API contract

`POST /api/leads` with `Content-Type: application/json`, body ≤ 16 KB.

```json
{
  "fullName": "Ada Lovelace",
  "email": "ada@example.co.uk",
  "company": "Analytical Engines Ltd",
  "country": "United Kingdom",
  "phone": "+44 20 7946 0958",
  "businessType": "international",
  "currencies": ["GBP", "EUR"],
  "monthlyVolume": "250k_1m",
  "message": "Optional text",
  "consent": true,
  "website": "",
  "startedAt": 1790000000000,
  "source": { "page": "…", "referrer": "…", "utm_source": "…", "utm_medium": "…", "utm_campaign": "…", "utm_term": "…", "utm_content": "…" }
}
```

| Field | Rule |
|---|---|
| `fullName` | required, 2–120 chars after trimming |
| `email` | required, valid, ≤ 254 chars; stored lower-cased |
| `company` | required, 1–160 chars |
| `country` | required, 2–80 chars (country of incorporation) |
| `phone` | optional, ≤ 40 chars, only digits, spaces and `+ ( ) - .`, at least 5 digits |
| `businessType` | optional: `local` \| `international` \| `group` \| `other` |
| `currencies` | optional array of `GBP` \| `EUR` \| `USD` \| `Other` (duplicates removed) |
| `monthlyVolume` | optional: `lt_50k` \| `50k_250k` \| `250k_1m` \| `1m_5m` \| `gt_5m` |
| `message` | optional, ≤ 2000 chars |
| `consent` | must be `true` |
| `website` | honeypot: must be empty |
| `startedAt` | required number: ms epoch when the form was rendered |
| `source` | optional; unknown keys dropped, values cut to 500 chars (never rejected) |

Responses (always JSON, `Cache-Control: no-store`):

| Status | Body | When |
|---|---|---|
| 201 | `{ "ok": true, "id": "<uuid>" }` | stored, or the same email already submitted in the last 24 h (existing id, no new row, no new notification) |
| 400 | `{ "ok": false, "error": "validation", "fields": { "email": "Please enter a valid email address." } }` | invalid fields; malformed JSON uses the key `body` |
| 403 | `{ "ok": false, "error": "origin_not_allowed" }` | `Origin` missing or not in `ALLOWED_ORIGINS` (POST and preflight) |
| 405 | `{ "ok": false, "error": "method_not_allowed" }` | any method other than POST / OPTIONS |
| 413 | `{ "ok": false, "error": "payload_too_large" }` | body over 16 KB |
| 415 | `{ "ok": false, "error": "unsupported_media_type" }` | content type is not `application/json` |
| 429 | `{ "ok": false, "error": "rate_limited" }` | this IP already created 5 leads in the last 10 minutes |
| 500 | `{ "ok": false, "error": "server" }` | anything unexpected (details only in the logs) |

Bot traps answer `201 {ok:true, id}` with a random id and store nothing: a non-empty `website`,
or a submission less than 2.5 s after `startedAt`. (If the browser clock is *ahead* of the
server, the time trap is skipped rather than risk dropping a real lead.)

CORS: preflight allows `POST, OPTIONS` and the `Content-Type` header; only an allowed origin is
ever echoed in `Access-Control-Allow-Origin`, always with `Vary: Origin`.

## What happens after a lead is stored

Telegram and the CRM webhook run in parallel **after the response is sent**, kept alive with
`waitUntil` from `@vercel/functions`, each with a 5 s timeout. Their outcome is written to the row:
`telegram_status` / `crm_status` = `sent` | `not_configured` | `failed: <reason>`, plus
`telegram_sent_at` / `crm_sent_at`. A failure never changes the response.

The IP is stored only as `HMAC-SHA256(IP_HASH_SALT, ip)` (first `x-forwarded-for` entry, else
`x-real-ip`). Logs carry lead ids and statuses, never names, emails or IPs.

### Telegram channel setup

1. Create the bot in [@BotFather](https://t.me/BotFather) → `TELEGRAM_BOT_TOKEN`.
2. Add the bot to the channel as an **administrator** with "Post messages".
3. Post any message in the channel, then read the id from the bot's updates:
   ```bash
   curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates" | grep -o '"chat":{"id":-100[0-9]*'
   ```
   Channel ids start with `-100` (e.g. `-1001234567890`) → `TELEGRAM_CHAT_ID`.

### CRM webhook

`POST CRM_WEBHOOK_URL` with the lead as JSON (`id, createdAt, status, fullName, email, company,
country, phone, businessType, currencies, monthlyVolume, message, consent, consentAt, source`) and headers:

```
X-Gleec-Event: lead.created
X-Gleec-Signature: sha256=<hex HMAC-SHA256 of the raw body, key CRM_WEBHOOK_SECRET>
```

Verify on the receiving side against the raw bytes, before parsing:

```js
const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
const valid = expected.length === signature.length &&
  crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
```

## Database

One table, `leads` (see `db/schema.sql`). `status` defaults to `new` and is limited to
`new | contacted | qualified | disqualified` for the future CRM. Duplicate detection runs inside
one transaction with an advisory lock on the email, so a double-click cannot create two rows.
