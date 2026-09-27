import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import { createDetailsHandler } from '../lib/details-handler.js';
import { createLeadsHandler } from '../lib/leads-handler.js';
import { MESSAGES } from '../lib/validate.js';
import {
  BASE_ENV,
  LEAD_TOKEN_SECRET,
  NOW,
  ORIGIN,
  TELEGRAM_ENV,
  TELEGRAM_TOKEN,
  createFakeFetch,
  createFakeRepo,
  createTestLogger,
  emailOnlyBody,
  makeRequest,
} from './helpers.js';

const PATH = '/api/leads/details';
const LEAD_ID = '3f1c2b1e-7a1d-4a55-9d0b-6a8c1e2f4b77';
const CRM_ENV = { CRM_WEBHOOK_URL: 'https://crm.example.test/hook', CRM_WEBHOOK_SECRET: 's3cret' };
// Independent of lib/token.js.
const tokenFor = (id) => createHmac('sha256', LEAD_TOKEN_SECRET).update(id).digest('base64url');
const ipHashOf = (ip) => createHmac('sha256', BASE_ENV.IP_HASH_SALT).update(ip).digest('hex');

/** A lead as POST /api/leads stored it from the email-first form. */
function storedLead(overrides = {}) {
  return {
    id: LEAD_ID,
    createdAt: new Date(NOW - 60_000).toISOString(),
    fullName: null,
    email: 'ada@example.co.uk',
    company: null,
    country: null,
    phone: null,
    businessType: null,
    currencies: [],
    monthlyVolume: null,
    message: null,
    consent: true,
    consentAt: new Date(NOW - 60_000).toISOString(),
    source: { page: 'https://elijah-klinkin.github.io/gleec-uk-landing-page/v2/' },
    ipHash: ipHashOf('203.0.113.7'),
    userAgent: 'UA',
    ...overrides,
  };
}

function detailsBody(overrides = {}) {
  return {
    id: LEAD_ID,
    token: tokenFor(LEAD_ID),
    fullName: 'Ada Lovelace',
    company: 'Analytical Engines Ltd',
    country: 'United Kingdom',
    phone: '+44 20 7946 0958',
    businessType: 'international',
    currencies: ['GBP', 'EUR'],
    monthlyVolume: '250k_1m',
    message: 'We need multi-currency accounts.',
    ...overrides,
  };
}

function setup({ env = {}, rows, repo = createFakeRepo({ rows: rows ?? [storedLead()] }), fetch = createFakeFetch(), ...rest } = {}) {
  const log = createTestLogger();
  const handler = createDetailsHandler({ env: { ...BASE_ENV, ...env }, repo, fetch, now: () => NOW, log, ...rest });
  return { handler, repo, fetch, log };
}

async function post(handler, options) {
  const response = await handler.POST(makeRequest({ path: PATH, ...options }));
  const text = await response.text();
  return { response, status: response.status, body: text ? JSON.parse(text) : null };
}

describe('POST /api/leads/details — success', () => {
  it('fills the lead, returns 200 { ok: true } with CORS and no-store', async () => {
    const { handler, repo } = setup();
    const { status, body, response } = await post(handler, { body: detailsBody() });
    assert.equal(status, 200);
    assert.deepEqual(body, { ok: true });
    assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
    assert.match(response.headers.get('vary'), /Origin/);
    assert.equal(response.headers.get('cache-control'), 'no-store');

    const row = repo.rows[0];
    assert.equal(row.fullName, 'Ada Lovelace');
    assert.equal(row.company, 'Analytical Engines Ltd');
    assert.equal(row.country, 'United Kingdom');
    assert.equal(row.phone, '+44 20 7946 0958');
    assert.equal(row.businessType, 'international');
    assert.deepEqual(row.currencies, ['GBP', 'EUR']);
    assert.equal(row.monthlyVolume, '250k_1m');
    assert.equal(row.message, 'We need multi-currency accounts.');
    assert.equal(row.detailsAt, new Date(NOW).toISOString());
    assert.equal(row.detailsIpHash, ipHashOf('203.0.113.7'));
  });

  it('works end to end with the id and token from POST /api/leads (email-first flow)', async () => {
    const repo = createFakeRepo();
    const leads = createLeadsHandler({ env: BASE_ENV, repo, fetch: createFakeFetch(), now: () => NOW, log: createTestLogger() });
    const created = await (await leads.POST(makeRequest({ body: emailOnlyBody() }))).json();
    const { handler } = setup({ repo });
    const { status } = await post(handler, { body: { id: created.id, token: created.token, company: 'Analytical Engines Ltd' } });
    assert.equal(status, 200);
    assert.equal(repo.rows[0].company, 'Analytical Engines Ltd');
  });

  it('accepts a single field, normalised with the create rules', async () => {
    const { handler, repo } = setup();
    const { status } = await post(handler, { body: { id: LEAD_ID, token: tokenFor(LEAD_ID), company: '  Analytical\tEngines ' } });
    assert.equal(status, 200);
    assert.equal(repo.rows[0].company, 'Analytical Engines');
    assert.equal(repo.rows[0].fullName, null);
    assert.deepEqual(repo.calls.details[0].details, {
      fullName: null,
      company: 'Analytical Engines',
      country: null,
      phone: null,
      businessType: null,
      currencies: [],
      monthlyVolume: null,
      message: null,
    });
  });

  it('accepts the id in upper case (and uses the canonical form)', async () => {
    const { handler, repo } = setup();
    const { status } = await post(handler, { body: detailsBody({ id: LEAD_ID.toUpperCase() }) });
    assert.equal(status, 200);
    assert.equal(repo.calls.details[0].id, LEAD_ID);
  });

  it('never overwrites a stored value; only empty ones are filled', async () => {
    const { handler, repo } = setup({
      rows: [storedLead({ fullName: 'Ada Lovelace', company: 'Original Ltd', currencies: ['USD'], businessType: 'group' })],
    });
    const { status } = await post(handler, {
      body: detailsBody({ fullName: 'Mallory', company: 'Evil Ltd', currencies: ['EUR'], businessType: 'local' }),
    });
    assert.equal(status, 200);
    const row = repo.rows[0];
    assert.equal(row.fullName, 'Ada Lovelace');
    assert.equal(row.company, 'Original Ltd');
    assert.deepEqual(row.currencies, ['USD']);
    assert.equal(row.businessType, 'group');
    assert.equal(row.country, 'United Kingdom', 'empty before, filled now');
    assert.equal(row.phone, '+44 20 7946 0958');
  });
});

describe('POST /api/leads/details — notifications', () => {
  it('Telegram "📝 Lead details added" with email and id; CRM lead.updated with the full record, signed', async () => {
    const fetch = createFakeFetch((url) =>
      url.startsWith('https://api.telegram.org') ? Response.json({ ok: true }) : new Response(null, { status: 202 }),
    );
    const { handler, repo } = setup({ env: { ...TELEGRAM_ENV, ...CRM_ENV }, fetch });
    await post(handler, { body: detailsBody() });

    const telegram = fetch.calls.find((c) => c.url.startsWith('https://api.telegram.org'));
    assert.equal(telegram.url, `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`);
    const { text } = telegram.json;
    assert.ok(text.startsWith('📝 <b>Lead details added</b>\n'));
    assert.ok(text.includes('<b>Email:</b> <a href="mailto:ada@example.co.uk">ada@example.co.uk</a>'));
    assert.ok(text.includes('<b>Company:</b> Analytical Engines Ltd'));
    assert.ok(text.endsWith(`<b>Lead ID:</b> <code>${LEAD_ID}</code>`));
    assert.equal(text.includes('Source page'), false);

    const crm = fetch.calls.find((c) => c.url === CRM_ENV.CRM_WEBHOOK_URL);
    const headers = new Headers(crm.init.headers);
    assert.equal(headers.get('x-gleec-event'), 'lead.updated');
    assert.equal(headers.get('x-gleec-signature'), `sha256=${createHmac('sha256', 's3cret').update(crm.body).digest('hex')}`);
    assert.deepEqual(crm.json, {
      id: LEAD_ID,
      createdAt: new Date(NOW - 60_000).toISOString(),
      status: 'new',
      fullName: 'Ada Lovelace',
      email: 'ada@example.co.uk',
      company: 'Analytical Engines Ltd',
      country: 'United Kingdom',
      phone: '+44 20 7946 0958',
      businessType: 'international',
      currencies: ['GBP', 'EUR'],
      monthlyVolume: '250k_1m',
      message: 'We need multi-currency accounts.',
      consent: true,
      consentAt: new Date(NOW - 60_000).toISOString(),
      source: { page: 'https://elijah-klinkin.github.io/gleec-uk-landing-page/v2/' },
      detailsAt: new Date(NOW).toISOString(),
    });

    const [update] = repo.calls.update;
    assert.deepEqual(update, {
      id: LEAD_ID,
      telegramStatus: 'sent',
      telegramSentAt: new Date(NOW),
      crmStatus: 'sent',
      crmSentAt: new Date(NOW),
    });
  });

  it('responds before notifications finish and hands them to waitUntil', async () => {
    let release;
    const fetch = createFakeFetch(
      () =>
        new Promise((resolve) => {
          release = () => resolve(Response.json({ ok: true }));
        }),
    );
    const pending = [];
    const { handler, repo } = setup({ env: TELEGRAM_ENV, fetch, waitUntil: (p) => pending.push(p) });
    const { status } = await post(handler, { body: detailsBody() });
    assert.equal(status, 200);
    assert.equal(pending.length, 1);
    assert.equal(repo.calls.update.length, 0, 'outcome not recorded yet');
    release();
    await pending[0];
    assert.equal(repo.calls.update[0].telegramStatus, 'sent');
  });

  it('a Telegram failure does not fail the request and is recorded', async () => {
    const fetch = createFakeFetch(() => {
      throw new TypeError('fetch failed');
    });
    const { handler, repo, log } = setup({ env: TELEGRAM_ENV, fetch });
    const { status } = await post(handler, { body: detailsBody() });
    assert.equal(status, 200);
    assert.equal(repo.calls.update[0].telegramStatus, 'failed: fetch failed');
    assert.equal(repo.calls.update[0].crmStatus, 'not_configured');
    assert.ok(log.entries.some((e) => e.event === 'details.notified' && e.level === 'error'));
  });

  it('nothing is sent when nothing was updated (404 / 409)', async () => {
    const fetch = createFakeFetch();
    const { handler, repo } = setup({ env: TELEGRAM_ENV, fetch, rows: [storedLead({ detailsAt: new Date(NOW - 1000).toISOString() })] });
    assert.equal((await post(handler, { body: detailsBody() })).status, 409);
    const ghost = '00000000-0000-4000-8000-000000000000';
    assert.equal((await post(handler, { body: detailsBody({ id: ghost, token: tokenFor(ghost) }) })).status, 404);
    assert.equal(fetch.calls.length, 0);
    assert.equal(repo.calls.update.length, 0);
  });
});

describe('POST /api/leads/details — token (403)', () => {
  const cases = {
    'a wrong token': { token: 'A'.repeat(43) },
    'the token of another lead': { token: tokenFor('00000000-0000-4000-8000-000000000000') },
    'a token signed with another secret': { token: createHmac('sha256', 'other').update(LEAD_ID).digest('base64url') },
    'a truncated token': { token: tokenFor(LEAD_ID).slice(0, 42) },
    'no token': { token: undefined },
    'a non-string token': { token: 12345 },
    'no id': { id: undefined },
    'an id that is not a UUID': { id: "' OR 1=1 --" },
  };
  for (const [name, overrides] of Object.entries(cases)) {
    it(`${name}: 403 invalid_token, database untouched`, async () => {
      const { handler, repo, log } = setup();
      const { status, body, response } = await post(handler, { body: detailsBody(overrides) });
      assert.equal(status, 403);
      assert.deepEqual(body, { ok: false, error: 'invalid_token' });
      assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
      assert.equal(repo.calls.details.length, 0);
      assert.equal(repo.calls.detailsCount, 0);
      assert.ok(log.entries.some((e) => e.event === 'details.invalid_token'));
    });
  }

  it('the token is checked before the fields', async () => {
    const { handler } = setup();
    const { status } = await post(handler, { body: detailsBody({ token: 'A'.repeat(43), fullName: 'A' }) });
    assert.equal(status, 403);
  });
});

describe('POST /api/leads/details — outcomes', () => {
  it('unknown id (valid token): 404 not_found', async () => {
    const { handler } = setup({ rows: [] });
    const { status, body } = await post(handler, { body: detailsBody() });
    assert.equal(status, 404);
    assert.deepEqual(body, { ok: false, error: 'not_found' });
  });

  it('second submission: 409 already_submitted, stored values unchanged', async () => {
    const { handler, repo } = setup();
    assert.equal((await post(handler, { body: detailsBody({ phone: undefined }) })).status, 200);
    const { status, body } = await post(handler, { body: detailsBody({ phone: '+44 20 7946 0000' }) });
    assert.equal(status, 409);
    assert.deepEqual(body, { ok: false, error: 'already_submitted' });
    assert.equal(repo.rows[0].phone, null);
  });
});

describe('POST /api/leads/details — validation (400)', () => {
  it('no detail field with a value: fields.body', async () => {
    const { handler, repo } = setup();
    for (const extra of [{}, { fullName: '', phone: '  ', currencies: [], message: '' }, { email: 'x@example.com' }]) {
      const { status, body } = await post(handler, { body: { id: LEAD_ID, token: tokenFor(LEAD_ID), ...extra } });
      assert.equal(status, 400, JSON.stringify(extra));
      assert.deepEqual(body, { ok: false, error: 'validation', fields: { body: MESSAGES.noDetails } });
    }
    assert.equal(repo.calls.details.length, 0);
  });

  it('field errors use the create messages', async () => {
    const { handler, repo } = setup();
    const { status, body } = await post(handler, {
      body: detailsBody({ fullName: 'A', phone: '+44 CALL ME', currencies: ['JPY'], monthlyVolume: '5m+' }),
    });
    assert.equal(status, 400);
    assert.deepEqual(body, {
      ok: false,
      error: 'validation',
      fields: {
        fullName: MESSAGES.fullName,
        phone: MESSAGES.phoneChars,
        currencies: MESSAGES.currencies,
        monthlyVolume: MESSAGES.monthlyVolume,
      },
    });
    assert.equal(repo.calls.details.length, 0);
  });

  it('malformed JSON, an array or an empty body: fields.body', async () => {
    const { handler } = setup();
    for (const rawBody of ['{"id":', '[]', '', 'null']) {
      const { status, body } = await post(handler, { rawBody });
      assert.equal(status, 400, rawBody);
      assert.deepEqual(body, { ok: false, error: 'validation', fields: { body: MESSAGES.body } });
    }
  });
});

describe('POST /api/leads/details — disabled without LEAD_TOKEN_SECRET', () => {
  it('503 details_disabled, even for an otherwise valid request; nothing read or stored', async () => {
    const { handler, repo, log } = setup({ env: { LEAD_TOKEN_SECRET: '' } });
    const { status, body, response } = await post(handler, { body: detailsBody() });
    assert.equal(status, 503);
    assert.deepEqual(body, { ok: false, error: 'details_disabled' });
    assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
    assert.equal(repo.calls.details.length, 0);
    assert.ok(log.entries.some((e) => e.event === 'config.warning' && /LEAD_TOKEN_SECRET/.test(e.warning)));
  });

  it('a disallowed origin still gets 403 first', async () => {
    const { handler } = setup({ env: { LEAD_TOKEN_SECRET: '' } });
    assert.equal((await post(handler, { origin: 'https://evil.example', body: detailsBody() })).status, 403);
  });
});

describe('POST /api/leads/details — rate limit (5 per IP hash per 10 min)', () => {
  const others = (count, ageMs, ip = '203.0.113.7') =>
    Array.from({ length: count }, (_, i) => ({
      ...storedLead({ id: `other-${i}`, email: `o${i}@example.com` }),
      detailsAt: new Date(NOW - ageMs).toISOString(),
      detailsIpHash: ipHashOf(ip),
    }));

  it('allows the 5th details update from an IP and blocks the 6th', async () => {
    const { handler, repo } = setup({ rows: [storedLead(), ...others(4, 60_000)] });
    assert.equal((await post(handler, { body: detailsBody() })).status, 200);
    const next = '11111111-1111-4111-8111-111111111111';
    repo.rows.push(storedLead({ id: next, email: 'next@example.com' }));
    const { status, body, response } = await post(handler, { body: detailsBody({ id: next, token: tokenFor(next) }) });
    assert.equal(status, 429);
    assert.deepEqual(body, { ok: false, error: 'rate_limited' });
    assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
    assert.equal(repo.rows.find((r) => r.id === next).detailsAt, undefined);
  });

  it('counts per IP and only inside the window', async () => {
    const { handler } = setup({ rows: [storedLead(), ...others(5, 10 * 60_000 + 1), ...others(5, 60_000, '198.51.100.1')] });
    assert.equal((await post(handler, { body: detailsBody() })).status, 200);
  });

  it('is skipped (and no IP hash stored) when IP_HASH_SALT is missing', async () => {
    const { handler, repo } = setup({ env: { IP_HASH_SALT: '' }, rows: [storedLead(), ...others(5, 60_000)] });
    assert.equal((await post(handler, { body: detailsBody() })).status, 200);
    assert.equal(repo.calls.detailsCount, 0);
    assert.equal(repo.rows[0].detailsIpHash, null);
  });
});

describe('POST /api/leads/details — transport and CORS', () => {
  it('415 for a non-JSON content type', async () => {
    const { handler, repo } = setup();
    for (const contentType of ['text/plain', 'application/x-www-form-urlencoded', null]) {
      const { status, body } = await post(handler, { body: detailsBody(), contentType });
      assert.equal(status, 415, String(contentType));
      assert.deepEqual(body, { ok: false, error: 'unsupported_media_type' });
    }
    assert.equal(repo.calls.details.length, 0);
  });

  it('413 over 16 KB (declared or streamed)', async () => {
    const { handler } = setup();
    const declared = await post(handler, { body: detailsBody(), headers: { 'content-length': String(16 * 1024 + 1) } });
    assert.equal(declared.status, 413);
    assert.deepEqual(declared.body, { ok: false, error: 'payload_too_large' });
    const chunk = new TextEncoder().encode('x'.repeat(4096));
    let sent = 0;
    const stream = new ReadableStream({
      pull(controller) {
        if (sent >= 10) return controller.close();
        sent += 1;
        controller.enqueue(chunk);
      },
    });
    assert.equal((await post(handler, { rawBody: stream })).status, 413);
  });

  it('POST from a disallowed or missing origin: 403 without CORS headers', async () => {
    const { handler, repo } = setup();
    for (const origin of ['https://evil.example', null, `${ORIGIN}.evil.example`]) {
      const { status, body, response } = await post(handler, { origin, body: detailsBody() });
      assert.equal(status, 403, String(origin));
      assert.deepEqual(body, { ok: false, error: 'origin_not_allowed' });
      assert.equal(response.headers.get('access-control-allow-origin'), null);
    }
    assert.equal(repo.calls.details.length, 0);
  });

  it('OPTIONS preflight: 204 for an allowed origin, 403 otherwise', async () => {
    const { handler } = setup();
    const ok = handler.OPTIONS(makeRequest({ method: 'OPTIONS', path: PATH }));
    assert.equal(ok.status, 204);
    assert.equal(ok.headers.get('access-control-allow-origin'), ORIGIN);
    assert.equal(ok.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
    assert.equal(ok.headers.get('access-control-allow-headers'), 'Content-Type');
    const denied = handler.OPTIONS(makeRequest({ method: 'OPTIONS', path: PATH, origin: 'https://evil.example' }));
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
  });

  it('405 for other methods, with an Allow header (HEAD without a body)', async () => {
    const { handler } = setup();
    for (const method of ['GET', 'PUT', 'PATCH', 'DELETE']) {
      const response = handler.methodNotAllowed(makeRequest({ method, path: PATH }));
      assert.equal(response.status, 405, method);
      assert.equal(response.headers.get('allow'), 'POST, OPTIONS');
      assert.deepEqual(await response.json(), { ok: false, error: 'method_not_allowed' });
    }
    const head = handler.methodNotAllowed(makeRequest({ method: 'HEAD', path: PATH }));
    assert.equal(head.status, 405);
    assert.equal(await head.text(), '');
  });
});

describe('POST /api/leads/details — server errors (500)', () => {
  it('without a database: 500 server', async () => {
    const { handler, log } = setup({ repo: null });
    const { status, body } = await post(handler, { body: detailsBody() });
    assert.equal(status, 500);
    assert.deepEqual(body, { ok: false, error: 'server' });
    assert.ok(log.entries.some((e) => e.event === 'details.db_not_configured'));
  });

  it('a database error never leaks internals', async () => {
    const repo = createFakeRepo({ rows: [storedLead()] });
    repo.addDetailsOnce = async () => {
      throw new Error('password authentication failed for user "neondb_owner" at ep-secret-123');
    };
    const { handler, log } = setup({ repo });
    const { status, body, response } = await post(handler, { body: detailsBody() });
    assert.equal(status, 500);
    assert.deepEqual(body, { ok: false, error: 'server' });
    assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
    assert.ok(log.entries.some((e) => e.event === 'details.failed'));
  });

  it('logs never contain the email, name, token or raw IP', async () => {
    const { handler, log } = setup({ env: { ...TELEGRAM_ENV, ...CRM_ENV } });
    await post(handler, { body: detailsBody() });
    await post(handler, { body: detailsBody() }); // 409
    await post(handler, { body: detailsBody({ token: 'A'.repeat(43) }) }); // 403
    const logged = JSON.stringify(log.entries);
    for (const secret of ['ada@example.co.uk', 'Ada Lovelace', '203.0.113.7', tokenFor(LEAD_ID), TELEGRAM_TOKEN, LEAD_TOKEN_SECRET]) {
      assert.equal(logged.toLowerCase().includes(secret.toLowerCase()), false, secret);
    }
  });
});
