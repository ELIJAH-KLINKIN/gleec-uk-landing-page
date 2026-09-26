// Shared enums, human labels and limits. The API contract lives in README.md.

export const MAX_BODY_BYTES = 16 * 1024;

// Anti-bot time trap: a real person needs at least this long to fill the form.
export const MIN_FILL_TIME_MS = 2500;

// Rate limit: at most this many *new* leads per client IP hash per window.
export const RATE_LIMIT_MAX = 5;
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

// A second submission with the same email inside this window is a duplicate.
export const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

// Outbound calls (Telegram, CRM webhook).
export const NOTIFY_TIMEOUT_MS = 5000;

export const USER_AGENT_MAX = 300;
export const SOURCE_FIELD_MAX = 500;

export const SOURCE_KEYS = [
  'page',
  'referrer',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
];

// Same wording as the waitlist form's options (src/lib/leads.js in the site).
export const BUSINESS_TYPE_LABELS = {
  local: 'UK business',
  international: 'International business',
  group: 'Holding / corporate group',
  other: 'Other',
};

export const CURRENCIES = ['GBP', 'EUR', 'USD', 'Other'];

export const MONTHLY_VOLUME_LABELS = {
  lt_50k: 'Under £50k',
  '50k_250k': '£50k–£250k',
  '250k_1m': '£250k–£1m',
  '1m_5m': '£1m–£5m',
  gt_5m: 'Over £5m',
};

export const BUSINESS_TYPES = Object.keys(BUSINESS_TYPE_LABELS);
export const MONTHLY_VOLUMES = Object.keys(MONTHLY_VOLUME_LABELS);
