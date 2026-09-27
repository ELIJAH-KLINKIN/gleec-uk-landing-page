-- GLEEC Business waitlist leads.
-- Idempotent: safe to run any number of times (`npm run migrate`).
-- gen_random_uuid() is built into Postgres 13+ (Neon runs 14+), no extension needed.

create table if not exists leads (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),

  full_name        text not null,
  email            text not null,               -- always stored lower-case
  company          text not null,
  country          text not null,               -- country of incorporation
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

  constraint leads_status_check check (status in ('new', 'contacted', 'qualified', 'disqualified')),
  constraint leads_email_lowercase_check check (email = lower(email))
);

-- Duplicate check: same email within 24h.
create index if not exists leads_email_created_at_idx on leads (email, created_at desc);

-- Rate limit: leads per IP hash within 10 minutes.
create index if not exists leads_ip_hash_created_at_idx on leads (ip_hash, created_at desc);

-- Newest-first listing for sales.
create index if not exists leads_created_at_idx on leads (created_at desc);
