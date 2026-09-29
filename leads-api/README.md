# GLEEC Business — leads API

Receives "Join waitlist" submissions from the landing page and:

1. stores each lead in Postgres (Neon),
2. posts it to a Telegram channel (optional),
3. forwards it to a CRM as a signed webhook (optional).

It also takes optional company details for a lead after it was created, and serves the public
waitlist count. Version 1 of the site sends the full form to `POST /api/leads` in one request;
version 2 sends the email first (`POST /api/leads`) and then, optionally, the details
(`POST /api/leads/details`). Both work side by side.

Plain JavaScript Vercel Functions (Node.js 24, ES modules, no framework). Two runtime
dependencies: `@neondatabase/serverless` and `@vercel/functions`.

```
api/leads.js          POST /api/leads          (+ OPTIONS preflight, 405 for everything else)
api/leads/details.js  POST /api/leads/details  (+ OPTIONS preflight, 405 for everything else)
api/stats.js          GET  /api/stats          -> { ok, companies } (+ HEAD, OPTIONS; 405 otherwise)
api/health.js         GET  /api/health         -> { ok, db, telegram, crm, details } (booleans only)
lib/                  all logic, dependency-injected and unit-tested
db/schema.sql         idempotent schema (creates the table, upgrades an older one)
scripts/migrate.js    applies the schema
```

## Deploy notes

- Vercel project **Root Directory: `leads-api`**, Framework Preset: **Other**, no build command.
- `.vercelignore` uploads only `api/`, `lib/` and the package files, so nothing else is served statically.
- Run the functions in the same region as the Neon database (every lead makes 3 database round
  trips): set it at `https://vercel.com/elijah-builds/PROJECT/settings/functions`, e.g. `lhr1` for
  a London (`eu-west-2`) database.
- After the database exists, run the migration once: `npm run migrate`. **Run it again before
  deploying the email-first version**: it makes `full_name` / `company` / `country` nullable and
  adds `details_at` / `details_ip_hash`. Until then an email-only lead fails (500) and so does the
  details step; the v1 full form keeps working. The old code runs fine on the new schema.
- Check the wiring: `GET /api/health` returns `{"ok":true,"db":true,"telegram":false,"crm":false,"details":true}`.

## Environment variables

| Name | Required | What it is |
|---|---|---|
| `DATABASE_URL` | yes | Postgres URL. Injected by Vercel's Neon integration. Missing → every lead gets 500. |
| `ALLOWED_ORIGINS` | yes | Comma-separated exact origins, e.g. `https://elijah-klinkin.github.io,http://localhost:5173,http://localhost:4173`. Missing → every request gets 403. |
| `IP_HASH_SALT` | yes | Secret for hashing IPs (`openssl rand -hex 32`). Missing → no IP stored and no rate limiting. |
| `LEAD_TOKEN_SECRET` | yes, for v2 | Signs the token that lets a browser add details to the lead it just created (`openssl rand -hex 32`). Missing → `POST /api/leads` returns `"token": null` and `POST /api/leads/details` answers 503. Changing it invalidates tokens already handed out. |
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

All endpoints answer JSON. `POST` endpoints: `Content-Type: application/json`, body ≤ 16 KB,
`Cache-Control: no-store`. CORS: only an origin listed in `ALLOWED_ORIGINS` is ever echoed in
`Access-Control-Allow-Origin`, always with `Vary: Origin`; preflights allow the listed methods
and the `Content-Type` header.

### `POST /api/leads` — create a lead

Version 2 (email first) sends only what is required:

```json
{ "email": "ada@example.co.uk", "consent": true, "website": "", "startedAt": 1790000000000, "source": { "page": "…" } }
```

Version 1 sends the full form in the same request (unchanged):

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
| `email` | required, valid, ≤ 254 chars; stored lower-cased |
| `consent` | required, must be `true` |
| `startedAt` | required number: ms epoch when the form was rendered |
| `website` | honeypot: must be empty |
| `fullName` | optional, 2–120 chars after trimming |
| `company` | optional, 1–160 chars |
| `country` | optional, 2–80 chars (country of incorporation) |
| `phone` | optional, ≤ 40 chars, only digits, spaces and `+ ( ) - .`, at least 5 digits |
| `businessType` | optional: `local` \| `international` \| `group` \| `other` |
| `currencies` | optional array of `GBP` \| `EUR` \| `USD` \| `Other` (duplicates removed) |
| `monthlyVolume` | optional: `lt_50k` \| `50k_250k` \| `250k_1m` \| `1m_5m` \| `gt_5m` |
| `message` | optional, ≤ 2000 chars |
| `source` | optional; unknown keys dropped, values cut to 500 chars (never rejected) |

Optional fields: missing, `null`, `""` or only spaces all mean "not given"; a value that is given
must pass its rule.

| Status | Body | When |
|---|---|---|
| 201 | `{ "ok": true, "id": "<uuid>", "token": "<43 chars>" }` | stored, or the same email already submitted in the last 24 h (existing id and its token, no new row, no new notification) |
| 400 | `{ "ok": false, "error": "validation", "fields": { "email": "Please enter a valid email address." } }` | invalid fields; malformed JSON uses the key `body` |
| 403 | `{ "ok": false, "error": "origin_not_allowed" }` | `Origin` missing or not in `ALLOWED_ORIGINS` (POST and preflight) |
| 405 | `{ "ok": false, "error": "method_not_allowed" }` | any method other than POST / OPTIONS |
| 413 | `{ "ok": false, "error": "payload_too_large" }` | body over 16 KB |
| 415 | `{ "ok": false, "error": "unsupported_media_type" }` | content type is not `application/json` |
| 429 | `{ "ok": false, "error": "rate_limited" }` | this IP already created 5 leads in the last 10 minutes |
| 500 | `{ "ok": false, "error": "server" }` | anything unexpected (details only in the logs) |

`token` is `base64url(HMAC-SHA256(id, key LEAD_TOKEN_SECRET))` and is what the details step
needs; it is `null` when `LEAD_TOKEN_SECRET` is not set. Version 1 simply ignores it.

Bot traps answer `201 {ok:true, id, token}` with a random id and a random token of the same shape
and store nothing: a non-empty `website`, or a submission less than 2.5 s after `startedAt`.
(If the browser clock is *ahead* of the server, the time trap is skipped rather than risk
dropping a real lead.)

### `POST /api/leads/details` — add company details (optional second step)

```json
{
  "id": "3f1c2b1e-7a1d-4a55-9d0b-6a8c1e2f4b77",
  "token": "<token from POST /api/leads>",
  "fullName": "Ada Lovelace",
  "company": "Analytical Engines Ltd",
  "country": "United Kingdom",
  "phone": "+44 20 7946 0958",
  "businessType": "international",
  "currencies": ["GBP", "EUR"],
  "monthlyVolume": "250k_1m",
  "message": "Optional text"
}
```

Every detail field is optional, with the same rule as on `POST /api/leads`, but at least one must
carry a value. Other keys (`email`, `consent`, `source`, …) are ignored. Details can be added
**once** per lead, and only fill what is still empty: a value the lead already has is never
overwritten.

| Status | Body | When |
|---|---|---|
| 200 | `{ "ok": true }` | details saved |
| 400 | `{ "ok": false, "error": "validation", "fields": { "phone": "Please enter a valid phone number." } }` | invalid fields; no field with a value, malformed JSON or a non-object body use the key `body` |
| 403 | `{ "ok": false, "error": "invalid_token" }` | `id` is not a UUID, or `token` is missing / wrong (checked before the fields) |
| 403 | `{ "ok": false, "error": "origin_not_allowed" }` | as above |
| 404 | `{ "ok": false, "error": "not_found" }` | valid token, but no lead with that id |
| 405 / 413 / 415 | as above | |
| 409 | `{ "ok": false, "error": "already_submitted" }` | details were already added to this lead |
| 429 | `{ "ok": false, "error": "rate_limited" }` | this IP already added details to 5 leads in the last 10 minutes |
| 500 | `{ "ok": false, "error": "server" }` | anything unexpected, or no database |
| 503 | `{ "ok": false, "error": "details_disabled" }` | `LEAD_TOKEN_SECRET` is not set |

The token is compared in constant time. A bot's random token is always refused (403). Rate limit:
the same limits as lead creation, counted separately — the details request stores its own IP hash
in `details_ip_hash`, and the check counts rows with that hash and `details_at` in the last 10
minutes (one indexed query). The update is one statement
(`… WHERE id = $1 AND details_at IS NULL RETURNING …`), so two concurrent requests cannot both
succeed.

### `GET /api/stats` — public waitlist count

```json
{ "ok": true, "companies": 128 }
```

`companies` = number of distinct emails among leads whose status is not `disqualified`. Nothing
else is ever returned. Headers: `Cache-Control: public, max-age=60, s-maxage=300,
stale-while-revalidate=600` (browsers 1 min, Vercel's CDN 5 min), `Vary: Origin`. The count is
public, so a request without `Origin` or from an unlisted origin still gets it — just without
`Access-Control-Allow-Origin`, so other sites' scripts cannot read it. `HEAD` and an `OPTIONS`
preflight are supported; other methods get 405.

| Status | Body | When |
|---|---|---|
| 200 | `{ "ok": true, "companies": 128 }` | always, when the database answers |
| 503 | `{ "ok": false, "error": "unavailable" }` | `DATABASE_URL` is not set (not cached) |
| 500 | `{ "ok": false, "error": "server" }` | database error (not cached, details only in the logs) |

## What happens after a lead is stored (or its details are added)

Telegram and the CRM webhook run in parallel **after the response is sent**, kept alive with
`waitUntil` from `@vercel/functions`, each with a 5 s timeout. Their outcome is written to the row:
`telegram_status` / `crm_status` = `sent` | `not_configured` | `failed: <reason>`, plus
`telegram_sent_at` / `crm_sent_at`. A failure never changes the response.

A new lead posts "🇬🇧 **UK Business Banking Lead**": one unlabelled bullet per known value
(email, source page, …; missing ones are left out), the message as a quote, then `Lead ID: …`. It
also sends `lead.created`. Added details post "🇬🇧 **UK Business Banking Lead · Details**" with the
lead as now stored, its email and its id (so sales can match the two messages), and send
`lead.updated`. Call requests and bookings use the same shape ("UK Business Banking Call Request" /
"Call Booked"). The status columns always hold the outcome of the latest of the two.

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
country, phone, businessType, currencies, monthlyVolume, message, consent, consentAt, source`;
fields that were not given are `null`, `currencies` is `[]`) and headers:

```
X-Gleec-Event: lead.created          (lead.updated after the details step)
X-Gleec-Signature: sha256=<hex HMAC-SHA256 of the raw body, key CRM_WEBHOOK_SECRET>
```

`lead.updated` carries the full record after the update: the same fields (with the stored
`status`) plus `detailsAt`.

Verify on the receiving side against the raw bytes, before parsing:

```js
const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
const valid = expected.length === signature.length &&
  crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
```

## Talk to a human (book a call)

The website's "Talk to a human" section books a 20-minute Google Meet call with one of the
hosts (round robin). All logic is in `lib/talk-handler.js`; slot maths in `lib/schedule.js`.

| Endpoint | What it does |
|---|---|
| `POST /api/talk` | `{ email, firstName, lastName, phone?, company?, companyWebsite?, message?, website (honeypot), startedAt, source }` → `201 { ok, id, token, booking }`. Stores the request, pings Telegram. |
| `GET /api/talk?id&token` | Free times: `{ ok, available, timeZone, durationMinutes, days: [{ date, slots: [iso] }] }`. `available: false` when no host is connected or Google isn't set up. |
| `POST /api/talk/book` | `{ id, token, start }` → `{ ok, booking: { start, end, meetUrl, hostName } }`. Creates the event on the host's calendar with a Meet link; Google emails the invitation. `409 slot_taken` if the time went meanwhile; idempotent once booked. |
| `GET /api/talk/connect` | A host opens this once: Google consent screen (calendar free/busy + events). |
| `GET /api/talk/callback` | Google's redirect. Stores the host's refresh token (AES-256-GCM) if their email is in `TALK_HOSTS`. |

Environment (in addition to the ones above):

| Variable | Required | Notes |
|---|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | for booking | OAuth client (Web). Redirect URI: `https://<api-domain>/api/talk/callback`. |
| `TALK_TOKEN_KEY` | for booking | 32 random bytes, base64 (`openssl rand -base64 32`). Encrypts hosts' refresh tokens. |
| `TALK_HOSTS` | for booking | Comma-separated Google emails allowed to connect as hosts. |
| `TALK_PUBLIC_URL` | no | Override the API origin used in the OAuth redirect URI. |
| `TALK_TIMEZONE`, `TALK_DAY_START`, `TALK_DAY_END`, `TALK_CALL_MINUTES`, `TALK_BUFFER_MINUTES`, `TALK_MIN_NOTICE_MINUTES`, `TALK_HORIZON_DAYS` | no | Defaults: Europe/London, 10:00–17:00 Mon–Fri, 20-min calls, 10-min gaps, 4 h notice, 14 days. |

Double booking is prevented by a unique index on `(host_email, start_at)`; the slot is claimed
in the database before the calendar event is created, and released if Google fails.

## Database

One table, `leads` (see `db/schema.sql`). `status` defaults to `new` and is limited to
`new | contacted | qualified | disqualified` for the future CRM. Duplicate detection runs inside
one transaction with an advisory lock on the email, so a double-click cannot create two rows.
`full_name`, `company` and `country` are nullable (email-first form); `details_at` /
`details_ip_hash` are set by the details step. `db/schema.sql` both creates the table and
upgrades one created before these changes; it is safe to run any number of times, and
`npm run migrate` applies all of it in one transaction.
