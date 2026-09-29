// Test doubles shared by the test files (not a test file itself).
import { randomUUID } from 'node:crypto';

export const NOW = Date.parse('2026-09-26T12:00:00.000Z');
export const ORIGIN = 'https://elijah-klinkin.github.io';
export const TELEGRAM_TOKEN = '123456789:AAHfakeTokenForTestsOnly_abcdefghijk';

export const LEAD_TOKEN_SECRET = 'test-lead-token-secret';

export const BASE_ENV = {
  ALLOWED_ORIGINS: `${ORIGIN}, http://localhost:5173/,http://localhost:4173`,
  IP_HASH_SALT: 'test-salt',
  DATABASE_URL: 'postgresql://user:pass@ep-test.eu-west-2.aws.neon.tech/neondb',
  LEAD_TOKEN_SECRET,
};

export const TELEGRAM_ENV = {
  TELEGRAM_BOT_TOKEN: TELEGRAM_TOKEN,
  TELEGRAM_CHAT_ID: '-1001234567890',
};

export function validBody(overrides = {}) {
  return {
    fullName: 'Ada Lovelace',
    email: 'Ada@Example.co.uk',
    company: 'Analytical Engines Ltd',
    country: 'United Kingdom',
    phone: '+44 20 7946 0958',
    businessType: 'international',
    currencies: ['GBP', 'EUR'],
    monthlyVolume: '250k_1m',
    message: 'We need multi-currency accounts.',
    consent: true,
    website: '',
    startedAt: NOW - 30_000,
    source: {
      page: 'https://elijah-klinkin.github.io/gleec-uk-landing-page/',
      referrer: 'https://www.google.com/',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'launch',
    },
    ...overrides,
  };
}

/** The version-2 form's first step: email only. */
export function emailOnlyBody(overrides = {}) {
  return {
    email: 'Ada@Example.co.uk',
    consent: true,
    website: '',
    startedAt: NOW - 30_000,
    source: { page: 'https://elijah-klinkin.github.io/gleec-uk-landing-page/v2/' },
    ...overrides,
  };
}

export function makeRequest({
  method = 'POST',
  path = '/api/leads',
  origin = ORIGIN,
  body,
  rawBody,
  contentType = 'application/json',
  headers = {},
} = {}) {
  const h = new Headers(headers);
  if (origin !== null) h.set('origin', origin);
  if (contentType !== null && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    h.set('content-type', contentType);
  }
  if (!h.has('x-forwarded-for')) h.set('x-forwarded-for', '203.0.113.7, 10.0.0.1');
  if (!h.has('user-agent')) h.set('user-agent', 'Mozilla/5.0 (Test)');
  const init = { method, headers: h };
  if (rawBody !== undefined) init.body = rawBody;
  else if (body !== undefined) init.body = JSON.stringify(body);
  if (init.body instanceof ReadableStream) init.duplex = 'half';
  return new Request(`https://leads.example.test${path}`, init);
}

const DETAIL_COLUMNS = [
  'fullName',
  'firstName',
  'lastName',
  'company',
  'companyWebsite',
  'country',
  'phone',
  'businessType',
  'monthlyVolume',
  'message',
];

/** In-memory repository with the same interface (and semantics) as lib/db.js createLeadRepo(). */
export function createFakeRepo({ clock = () => NOW, rows = [] } = {}) {
  const calls = { count: 0, insert: 0, update: [], detailsCount: 0, details: [], companies: 0 };
  const repo = {
    rows,
    calls,
    async countRecentByIpHash(ipHash, since) {
      calls.count += 1;
      return rows.filter((r) => r.ipHash === ipHash && Date.parse(r.createdAt) > since.getTime()).length;
    },
    async insertLeadUnlessDuplicate(lead, { duplicateSince }) {
      calls.insert += 1;
      const existing = rows
        .filter((r) => r.email === lead.email && Date.parse(r.createdAt) > duplicateSince.getTime())
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
      if (existing) return { id: existing.id, createdAt: existing.createdAt, duplicate: true };
      const row = { ...lead, id: randomUUID(), createdAt: new Date(clock()).toISOString() };
      rows.push(row);
      return { id: row.id, createdAt: row.createdAt, duplicate: false };
    },
    async recordNotificationResults(id, results) {
      calls.update.push({ id, ...results });
      const row = rows.find((r) => r.id === id);
      if (row) Object.assign(row, results);
    },
    async countRecentDetailsByIpHash(ipHash, since) {
      calls.detailsCount += 1;
      return rows.filter((r) => r.detailsIpHash === ipHash && r.detailsAt && Date.parse(r.detailsAt) > since.getTime()).length;
    },
    // Mirrors SQL.addDetailsOnce: fills only empty columns, once per lead.
    async addDetailsOnce(id, details, { ipHash = null } = {}) {
      calls.details.push({ id, details, ipHash });
      const row = rows.find((r) => r.id === id);
      if (!row) return { outcome: 'not_found' };
      if (row.detailsAt) return { outcome: 'already_submitted' };
      for (const key of DETAIL_COLUMNS) {
        if ((row[key] == null || row[key] === '') && details[key] != null) row[key] = details[key];
      }
      if (!row.currencies || row.currencies.length === 0) row.currencies = details.currencies ?? [];
      row.detailsAt = new Date(clock()).toISOString();
      row.detailsIpHash = ipHash;
      const record = {
        id: row.id,
        createdAt: row.createdAt,
        status: row.status ?? 'new',
        fullName: row.fullName ?? null,
        firstName: row.firstName ?? null,
        lastName: row.lastName ?? null,
        email: row.email,
        company: row.company ?? null,
        companyWebsite: row.companyWebsite ?? null,
        country: row.country ?? null,
        phone: row.phone ?? null,
        businessType: row.businessType ?? null,
        currencies: row.currencies ?? [],
        monthlyVolume: row.monthlyVolume ?? null,
        message: row.message ?? null,
        consent: row.consent === true,
        consentAt: row.consentAt ?? null,
        source: row.source ?? {},
        detailsAt: row.detailsAt,
        telegramChatId: row.telegramChatId ?? null,
        telegramMessageId: row.telegramMessageId ?? null,
      };
      return { outcome: 'updated', record };
    },
    async countCompanies() {
      calls.companies += 1;
      return new Set(rows.filter((r) => r.status !== 'disqualified').map((r) => r.email.toLowerCase())).size;
    },
  };
  return repo;
}

/** fetch double: `respond(url, init, body)` returns a Response (or throws). Records every call. */
export function createFakeFetch(respond = () => Response.json({ ok: true, result: {} })) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const body = typeof init.body === 'string' ? init.body : undefined;
    calls.push({ url: String(url), init, body, json: body ? JSON.parse(body) : undefined });
    return respond(String(url), init, body);
  };
  fetch.calls = calls;
  return fetch;
}

/** A fetch that only settles when its AbortSignal fires (to test timeouts). */
export function hangingFetch() {
  return (url, init) =>
    new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason));
    });
}

export function createTestLogger() {
  const entries = [];
  const log = (level) => (event, data = {}) => entries.push({ level, event, ...data });
  return { entries, info: log('info'), warn: log('warn'), error: log('error') };
}
