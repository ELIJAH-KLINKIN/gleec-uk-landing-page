-- GLEEC Business waitlist leads.
-- Idempotent: safe to run any number of times (`npm run migrate`).
-- gen_random_uuid() is built into Postgres 13+ (Neon runs 14+), no extension needed.

create table if not exists leads (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),

  full_name        text,                        -- optional since the email-first form (v2)
  email            text not null,               -- always stored lower-case
  company          text,                        -- optional since v2
  country          text,                        -- optional since v2; country of incorporation
  phone            text,
  business_type    text,                        -- local | international | group | other
  currencies       text[] not null default '{}', -- subset of GBP, EUR, USD, Other
  monthly_volume   text,                        -- lt_50k | 50k_250k | 250k_1m | 1m_5m | gt_5m
  message          text,

  consent          boolean not null,
  consent_at       timestamptz,

  source           jsonb not null default '{}'::jsonb, -- page, referrer, utm_*
  ip_hash          text,                        -- HMAC-SHA256(IP_HASH_SALT, ip); never the raw IP
  user_agent       text,

  status           text not null default 'new', -- sales pipeline, for the future CRM

  telegram_status  text,                        -- sent | not_configured | failed: <reason>
  telegram_sent_at timestamptz,
  crm_status       text,                        -- sent | not_configured | failed: <reason>
  crm_sent_at      timestamptz,

  details_at       timestamptz,                 -- set once by POST /api/leads/details
  details_ip_hash  text,                        -- IP hash of that request (details rate limit)

  constraint leads_status_check check (status in ('new', 'contacted', 'qualified', 'disqualified')),
  constraint leads_email_lowercase_check check (email = lower(email))
);

-- Upgrade of a table created before the email-first form. Idempotent: DROP NOT NULL on a
-- column that is already nullable is a no-op, and ADD COLUMN IF NOT EXISTS skips existing ones.
alter table leads
  alter column full_name drop not null,
  alter column company drop not null,
  alter column country drop not null,
  add column if not exists details_at timestamptz,
  add column if not exists details_ip_hash text,
  -- The details step asks for first and last name and the company website (v3).
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists company_website text;

-- Duplicate check: same email within 24h.
create index if not exists leads_email_created_at_idx on leads (email, created_at desc);

-- Rate limit: leads per IP hash within 10 minutes.
create index if not exists leads_ip_hash_created_at_idx on leads (ip_hash, created_at desc);

-- Rate limit of the details step: details added per IP hash within 10 minutes.
create index if not exists leads_details_ip_hash_details_at_idx on leads (details_ip_hash, details_at desc)
  where details_ip_hash is not null;

-- Newest-first listing for sales.
create index if not exists leads_created_at_idx on leads (created_at desc);

-- ---------------------------------------------------------------------------
-- "Talk to a human": call requests booked from the website, and the team
-- members (hosts) whose Google Calendars the booking flow reads and writes.
-- ---------------------------------------------------------------------------

create table if not exists calendar_hosts (
  email              text primary key,             -- Google account, lower-case
  display_name       text,
  refresh_token_enc  text not null,                -- AES-256-GCM (TALK_TOKEN_KEY); never the plain token
  calendar_id        text not null default 'primary',
  active             boolean not null default true,
  connected_at       timestamptz not null default now(),
  constraint calendar_hosts_email_lowercase_check check (email = lower(email))
);

create table if not exists call_requests (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  email            text not null,
  first_name       text not null,
  last_name        text not null,
  phone            text,
  company          text,
  company_website  text,
  message          text,
  source           jsonb not null default '{}'::jsonb,
  ip_hash          text,                          -- HMAC-SHA256(IP_HASH_SALT, ip); never the raw IP
  user_agent       text,
  status           text not null default 'requested', -- requested | booking | booked
  host_email       text,
  start_at         timestamptz,
  end_at           timestamptz,
  google_event_id  text,
  meet_url         text,
  booked_at        timestamptz,
  telegram_status  text,
  constraint call_requests_status_check check (status in ('requested', 'booking', 'booked')),
  constraint call_requests_email_lowercase_check check (email = lower(email))
);

-- One call per host per start time: a second booking of the same slot fails here
-- (the race between two visitors picking the same time at once).
create unique index if not exists call_requests_host_start_uidx
  on call_requests (host_email, start_at) where status in ('booking', 'booked');

-- Rate limit: requests per IP hash within 10 minutes.
create index if not exists call_requests_ip_hash_created_at_idx on call_requests (ip_hash, created_at desc);

-- Round robin: upcoming calls per host.
create index if not exists call_requests_booked_start_idx on call_requests (start_at) where status = 'booked';
