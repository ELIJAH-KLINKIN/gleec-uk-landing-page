import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import { createLeadsHandler } from '../lib/leads-handler.js';
import { MESSAGES } from '../lib/validate.js';
import {
  BASE_ENV,
  NOW,
  ORIGIN,
  TELEGRAM_ENV,
  TELEGRAM_TOKEN,
  createFakeFetch,
  createFakeRepo,
  createTestLogger,
  hangingFetch,
  makeRequest,
  validBody,
} from './helpers.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function setup({ env = {}, repo = createFakeRepo(), fetch = createFakeFetch(), ...rest } = {}) {
  const log = createTestLogger();
  const handler = createLeadsHandler({
    env: { ...BASE_ENV, ...env },
    repo,
    fetch,
    now: () => NOW,
    log,
    ...rest,
  });
  return { handler, repo, fetch, log };
}

async function post(handler, options) {
  const response = await handler.POST(makeRequest(options));
  const text = await response.text();
  return { response, status: response.status, body: text ? JSON.parse(text) : null };
}

describe('POST /api/leads — success', () => {
  it('stores the lead, returns 201 with its id and echoes the allowed origin', async () => {
    const { handler, repo } = setup();
    const { response, status, body } = await post(handler, { body: validBody() });

    assert.equal(status, 201);
    assert.equal(body.ok, true);
    assert.match(body.id, UUID_RE);
    assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
    assert.match(response.headers.get('vary'), /Origin/);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.equal(response.headers.get('cache-control'), 'no-store');

    assert.equal(repo.rows.length, 1);
    const row = repo.rows[0];
    assert.equal(row.id, body.id);
    assert.equal(row.email, 'ada@example.co.uk');
    assert.equal(row.consent, true);
    assert.equal(row.consentAt, new Date(NOW).toISOString());
    assert.equal('startedAt' in row, false);
    assert.equal('website' in row, false);
    assert.deepEqual(row.source.utm_source, 'google');
  });

  it('stores only a salted hash of the first x-forwarded-for IP', async () => {
    const { handler, repo } = setup();
    await post(handler, { body: validBody() });
    const expected = createHmac('sha256', BASE_ENV.IP_HASH_SALT).update('203.0.113.7').digest('hex');
    assert.equal(repo.rows[0].ipHash, expected);
    assert.equal(JSON.stringify(repo.rows[0]).includes('203.0.113.7'), false);
  });

  it('falls back to x-real-ip', async () => {
    const { handler, repo } = setup();
    const request = makeRequest({ body: validBody(), headers: { 'x-real-ip': '198.51.100.9' } });
    request.headers.delete('x-forwarded-for');
    await handler.POST(request);
    const expected = createHmac('sha256', BASE_ENV.IP_HASH_SALT).update('198.51.100.9').digest('hex');
    assert.equal(repo.rows[0].ipHash, expected);
  });

  it('stores the user agent, capped at 300 characters', async () => {
    const { handler, repo } = setup();
    await post(handler, { body: validBody(), headers: { 'user-agent': 'U'.repeat(1000) } });
    assert.equal(repo.rows[0].userAgent.length, 300);
  });

  it('accepts application/json with a charset parameter', async () => {
    const { handler } = setup();
    const { status } = await post(handler, { body: validBody(), contentType: 'application/json; charset=UTF-8' });
    assert.equal(status, 201);
  });

  it('accepts every allowed origin, including one listed with a trailing slash', async () => {
    const { handler } = setup();
    for (const [i, origin] of [ORIGIN, 'http://localhost:5173', 'http://localhost:4173'].entries()) {
      const { status, response } = await post(handler, { origin, body: validBody({ email: `origin${i}@example.com` }) });
      assert.equal(status, 201, origin);
      assert.equal(response.headers.get('access-control-allow-origin'), origin);
    }
  });
});

describe('POST /api/leads — Telegram', () => {
  it('sends a Telegram message and records "sent"', async () => {
    const fetch = createFakeFetch();
    const { handler, repo } = setup({ env: { ...TELEGRAM_ENV, TELEGRAM_THREAD_ID: '7' }, fetch });
    const { body } = await post(handler, { body: validBody() });

    assert.equal(fetch.calls.length, 1);
    const [call] = fetch.calls;
    assert.equal(call.url, `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`);
    assert.equal(call.json.chat_id, TELEGRAM_ENV.TELEGRAM_CHAT_ID);
    assert.equal(call.json.message_thread_id, 7);
    assert.equal(call.json.parse_mode, 'HTML');
    assert.equal(call.json.disable_web_page_preview, true);
    assert.ok(call.json.text.includes(`<code>${body.id}</code>`));
    assert.ok(call.json.text.includes('mailto:ada@example.co.uk'));

    const [update] = repo.calls.update;
    assert.equal(update.id, body.id);
    assert.equal(update.telegramStatus, 'sent');
    assert.equal(update.telegramSentAt.toISOString(), new Date(NOW).toISOString());
    assert.equal(update.crmStatus, 'not_configured');
    assert.equal(update.crmSentAt, null);
  });

  it('records "not_configured" and calls nothing when Telegram env vars are absent', async () => {
    const { handler, repo, fetch } = setup();
    const { status } = await post(handler, { body: validBody() });
    assert.equal(status, 201);
    assert.equal(fetch.calls.length, 0);
    assert.equal(repo.calls.update[0].telegramStatus, 'not_configured');
  });

  it('a Telegram network failure does not fail the request', async () => {
    const fetch = createFakeFetch(() => {
      throw new TypeError('fetch failed');
    });
    const { handler, repo, log } = setup({ env: TELEGRAM_ENV, fetch });
    const { status, body } = await post(handler, { body: validBody() });

    assert.equal(status, 201);
    assert.equal(body.ok, true);
    assert.equal(repo.rows.length, 1);
    assert.equal(repo.calls.update[0].telegramStatus, 'failed: fetch failed');
    assert.equal(repo.calls.update[0].telegramSentAt, null);
    assert.ok(log.entries.some((e) => e.event === 'lead.notified' && e.level === 'error'));
  });

  it('a Telegram API error is recorded with its description', async () => {
    const fetch = createFakeFetch(() =>
      Response.json({ ok: false, error_code: 403, description: 'Forbidden: bot is not a member of the channel chat' }, { status: 403 }),
    );
    const { handler, repo } = setup({ env: TELEGRAM_ENV, fetch });
    const { status } = await post(handler, { body: validBody() });
    assert.equal(status, 201);
    assert.equal(repo.calls.update[0].telegramStatus, 'failed: 403 Forbidden: bot is not a member of the channel chat');
  });

  it('a Telegram timeout does not fail the request', async () => {
    const { handler, repo } = setup({ env: TELEGRAM_ENV, fetch: hangingFetch(), notifyTimeoutMs: 40 });
    const { status } = await post(handler, { body: validBody() });
    assert.equal(status, 201);
    assert.equal(repo.calls.update[0].telegramStatus, 'failed: timed out after 40 ms');
  });

  it('a failure to record the outcome is logged, not returned', async () => {
    const repo = createFakeRepo();
    repo.recordNotificationResults = async () => {
      throw new Error('db down');
    };
    const { handler, log } = setup({ env: TELEGRAM_ENV, repo });
    const { status } = await post(handler, { body: validBody() });
    assert.equal(status, 201);
    assert.ok(log.entries.some((e) => e.event === 'lead.status_update_failed'));
  });
});

describe('POST /api/leads — CRM webhook', () => {
  const CRM_ENV = { CRM_WEBHOOK_URL: 'https://crm.example.test/hook', CRM_WEBHOOK_SECRET: 's3cret' };

  it('posts the stored lead, signed, in parallel with Telegram', async () => {
    const fetch = createFakeFetch((url) =>
      url.startsWith('https://api.telegram.org') ? Response.json({ ok: true }) : new Response(null, { status: 202 }),
    );
    const { handler, repo } = setup({ env: { ...TELEGRAM_ENV, ...CRM_ENV }, fetch });
    const { body } = await post(handler, { body: validBody() });

    const crmCall = fetch.calls.find((c) => c.url === CRM_ENV.CRM_WEBHOOK_URL);
    assert.ok(crmCall, 'CRM webhook was called');
    const headers = new Headers(crmCall.init.headers);
    const expected = `sha256=${createHmac('sha256', 's3cret').update(crmCall.body).digest('hex')}`;
    assert.equal(headers.get('x-gleec-signature'), expected);
    assert.equal(headers.get('x-gleec-event'), 'lead.created');
    assert.equal(crmCall.json.id, body.id);
    assert.equal(crmCall.json.email, 'ada@example.co.uk');
    assert.equal('ipHash' in crmCall.json, false);

    assert.equal(repo.calls.update[0].crmStatus, 'sent');
    assert.equal(repo.calls.update[0].telegramStatus, 'sent');
  });

  it('a CRM failure does not fail the request', async () => {
    const fetch = createFakeFetch(() => new Response('boom', { status: 500 }));
    const { handler, repo } = setup({ env: CRM_ENV, fetch });
    const { status } = await post(handler, { body: validBody() });
    assert.equal(status, 201);
    assert.equal(repo.calls.update[0].crmStatus, 'failed: HTTP 500');
  });

  it('a URL without a secret is recorded as a failure and nothing is sent', async () => {
    const { handler, repo, fetch, log } = setup({ env: { CRM_WEBHOOK_URL: CRM_ENV.CRM_WEBHOOK_URL } });
    await post(handler, { body: validBody() });
    assert.equal(fetch.calls.length, 0);
    assert.equal(repo.calls.update[0].crmStatus, 'failed: CRM_WEBHOOK_SECRET not set');
    assert.ok(log.entries.some((e) => e.event === 'config.warning' && /CRM_WEBHOOK_SECRET/.test(e.warning)));
  });
});

describe('POST /api/leads — waitUntil', () => {
  it('responds before notifications finish and hands them to waitUntil', async () => {
    let releaseTelegram;
    const fetch = createFakeFetch(
      () =>
        new Promise((resolve) => {
          releaseTelegram = () => resolve(Response.json({ ok: true }));
        }),
    );
    const pending = [];
    const { handler, repo } = setup({ env: TELEGRAM_ENV, fetch, waitUntil: (p) => pending.push(p) });

    const { status } = await post(handler, { body: validBody() });
    assert.equal(status, 201);
    assert.equal(pending.length, 1);
    assert.equal(repo.calls.update.length, 0, 'outcome not recorded yet');

    releaseTelegram();
    await pending[0];
    assert.equal(repo.calls.update[0].telegramStatus, 'sent');
  });

  it('falls back to awaiting when waitUntil throws', async () => {
    const { handler, repo } = setup({
      env: TELEGRAM_ENV,
      waitUntil: () => {
        throw new Error('no request context');
      },
    });
    await post(handler, { body: validBody() });
    assert.equal(repo.calls.update[0].telegramStatus, 'sent');
  });
});

describe('POST /api/leads — bot traps', () => {
  it('honeypot: 201 with a random id, nothing stored, nobody notified', async () => {
    const { handler, repo, fetch, log } = setup({ env: TELEGRAM_ENV });
    const { status, body } = await post(handler, { body: validBody({ website: 'https://spam.example' }) });
    assert.equal(status, 201);
    assert.equal(body.ok, true);
    assert.match(body.id, UUID_RE);
    assert.equal(repo.calls.insert, 0);
    assert.equal(repo.calls.count, 0);
    assert.equal(fetch.calls.length, 0);
    assert.ok(log.entries.some((e) => e.event === 'lead.dropped' && e.reason === 'honeypot'));
  });

  it('honeypot wins even when the rest of the body is invalid', async () => {
    const { handler, repo } = setup();
    const { status } = await post(handler, { body: { website: 'x' } });
    assert.equal(status, 201);
    assert.equal(repo.calls.insert, 0);
  });

  it('time trap: submitted < 2500 ms after render is silently dropped', async () => {
    const { handler, repo, fetch } = setup({ env: TELEGRAM_ENV });
    const { status, body } = await post(handler, { body: validBody({ startedAt: NOW - 1200 }) });
    assert.equal(status, 201);
    assert.equal(body.ok, true);
    assert.equal(repo.calls.insert, 0);
    assert.equal(fetch.calls.length, 0);
  });

  it('time trap: exactly 2500 ms is accepted', async () => {
    const { handler, repo } = setup();
    await post(handler, { body: validBody({ startedAt: NOW - 2500 }) });
    assert.equal(repo.rows.length, 1);
  });
});

describe('POST /api/leads — validation (400)', () => {
  it('returns field messages and stores nothing', async () => {
    const { handler, repo } = setup();
    const { status, body, response } = await post(handler, {
      body: validBody({ fullName: 'A', email: 'not-an-email', consent: false, currencies: ['JPY'] }),
    });
    assert.equal(status, 400);
    assert.deepEqual(body, {
      ok: false,
      error: 'validation',
      fields: {
        fullName: MESSAGES.fullName,
        email: MESSAGES.email,
        currencies: MESSAGES.currencies,
        consent: MESSAGES.consent,
      },
    });
    assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
    assert.equal(repo.calls.insert, 0);
  });

  it('rejects malformed JSON', async () => {
    const { handler } = setup();
    const { status, body } = await post(handler, { rawBody: '{"fullName": "Ada",' });
    assert.equal(status, 400);
    assert.deepEqual(body, { ok: false, error: 'validation', fields: { body: MESSAGES.body } });
  });

  it('rejects a JSON array or empty body', async () => {
    const { handler } = setup();
    assert.equal((await post(handler, { rawBody: '[]' })).status, 400);
    assert.equal((await post(handler, { rawBody: '' })).status, 400);
  });
});

describe('POST /api/leads — transport errors', () => {
  it('415 for a non-JSON content type', async () => {
    const { handler, repo } = setup();
    for (const contentType of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x', null]) {
      const { status, body, response } = await post(handler, { body: validBody(), contentType });
      assert.equal(status, 415, String(contentType));
      assert.deepEqual(body, { ok: false, error: 'unsupported_media_type' });
      assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
    }
    assert.equal(repo.calls.insert, 0);
  });

  it('413 when Content-Length is over 16 KB', async () => {
    const { handler } = setup();
    const { status, body } = await post(handler, { body: validBody(), headers: { 'content-length': String(16 * 1024 + 1) } });
    assert.equal(status, 413);
    assert.deepEqual(body, { ok: false, error: 'payload_too_large' });
  });

  it('413 when a streamed body without Content-Length goes over 16 KB', async () => {
    const { handler } = setup();
    const chunk = new TextEncoder().encode('x'.repeat(4096));
    let sent = 0;
    const stream = new ReadableStream({
      pull(controller) {
        if (sent >= 10) return controller.close();
        sent += 1;
        controller.enqueue(chunk);
      },
    });
    const { status } = await post(handler, { rawBody: stream });
    assert.equal(status, 413);
    assert.ok(sent < 10, 'stopped reading early');
  });

  it('accepts a body of exactly 16 KB', async () => {
    const { handler } = setup();
    const base = JSON.stringify(validBody({ message: '' }));
    const padded = base.replace('"message":""', `"message":"${' '.repeat(16 * 1024 - base.length)}"`);
    assert.equal(Buffer.byteLength(padded), 16 * 1024);
    const { status } = await post(handler, { rawBody: padded });
    assert.equal(status, 201);
  });
});

describe('CORS', () => {
  it('POST from a disallowed origin is 403 without CORS headers', async () => {
    const { handler, repo } = setup();
    const { status, body, response } = await post(handler, { origin: 'https://evil.example', body: validBody() });
    assert.equal(status, 403);
    assert.deepEqual(body, { ok: false, error: 'origin_not_allowed' });
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal(response.headers.get('vary'), 'Origin');
    assert.equal(repo.calls.insert, 0);
  });

  it('POST without an Origin header is 403', async () => {
    const { handler } = setup();
    assert.equal((await post(handler, { origin: null, body: validBody() })).status, 403);
  });

  it('near-miss origins are rejected (exact match only)', async () => {
    const { handler } = setup();
    for (const origin of [`${ORIGIN}.evil.example`, 'http://elijah-klinkin.github.io', `${ORIGIN}:443`, 'null', 'http://localhost:5174']) {
      assert.equal((await post(handler, { origin, body: validBody() })).status, 403, origin);
    }
  });

  it('with ALLOWED_ORIGINS unset every browser request is 403 (fail closed)', async () => {
    const { handler, log } = setup({ env: { ALLOWED_ORIGINS: '' } });
    assert.equal((await post(handler, { body: validBody() })).status, 403);
    assert.ok(log.entries.some((e) => e.event === 'config.warning' && /ALLOWED_ORIGINS/.test(e.warning)));
  });

  it('OPTIONS preflight from an allowed origin: 204 with CORS headers', async () => {
    const { handler } = setup();
    const response = handler.OPTIONS(
      makeRequest({
        method: 'OPTIONS',
        headers: { 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' },
      }),
    );
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
    assert.equal(response.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
    assert.equal(response.headers.get('access-control-allow-headers'), 'Content-Type');
    assert.equal(response.headers.get('access-control-max-age'), '7200');
    assert.match(response.headers.get('vary'), /Origin/);
    assert.equal(await response.text(), '');
  });

  it('OPTIONS preflight from a disallowed origin: 403', async () => {
    const { handler } = setup();
    const response = handler.OPTIONS(makeRequest({ method: 'OPTIONS', origin: 'https://evil.example' }));
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  });
});

describe('405 for other methods', () => {
  it('GET/PUT/PATCH/DELETE get 405 with an Allow header', async () => {
    const { handler } = setup();
    for (const method of ['GET', 'PUT', 'PATCH', 'DELETE']) {
      const response = handler.methodNotAllowed(makeRequest({ method }));
      assert.equal(response.status, 405, method);
      assert.equal(response.headers.get('allow'), 'POST, OPTIONS');
      assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
      assert.deepEqual(await response.json(), { ok: false, error: 'method_not_allowed' });
    }
  });

  it('HEAD gets 405 with no body', async () => {
    const { handler } = setup();
    const response = handler.methodNotAllowed(makeRequest({ method: 'HEAD' }));
    assert.equal(response.status, 405);
    assert.equal(await response.text(), '');
  });

  it('does not echo a disallowed origin', () => {
    const { handler } = setup();
    const response = handler.methodNotAllowed(makeRequest({ method: 'GET', origin: 'https://evil.example' }));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  });
});

describe('Duplicates (same email within 24 h)', () => {
  it('returns 201 with the existing id, no new row, no second notification', async () => {
    const fetch = createFakeFetch();
    const { handler, repo } = setup({ env: TELEGRAM_ENV, fetch });
    const first = await post(handler, { body: validBody() });
    const second = await post(handler, {
      body: validBody({ email: '  ADA@example.co.uk ', fullName: 'Ada L.' }),
      headers: { 'x-forwarded-for': '192.0.2.1' },
    });

    assert.equal(second.status, 201);
    assert.deepEqual(second.body, { ok: true, id: first.body.id });
    assert.equal(repo.rows.length, 1);
    assert.equal(fetch.calls.length, 1, 'Telegram called once');
    assert.equal(repo.calls.update.length, 1);
  });

  it('the same email after 24 h is a new lead', async () => {
    const repo = createFakeRepo({
      rows: [{ id: 'old', email: 'ada@example.co.uk', ipHash: 'x', createdAt: new Date(NOW - 24 * 3600_000 - 1).toISOString() }],
    });
    const { handler } = setup({ repo });
    const { body } = await post(handler, { body: validBody() });
    assert.notEqual(body.id, 'old');
    assert.equal(repo.rows.length, 2);
  });

  it('passes a 24 h window to the repository', async () => {
    const repo = createFakeRepo();
    let since;
    const original = repo.insertLeadUnlessDuplicate;
    repo.insertLeadUnlessDuplicate = (lead, options) => {
      since = options.duplicateSince;
      return original(lead, options);
    };
    const { handler } = setup({ repo });
    await post(handler, { body: validBody() });
    assert.equal(since.toISOString(), new Date(NOW - 24 * 3600_000).toISOString());
  });
});

describe('Rate limit (5 leads per IP hash per 10 min)', () => {
  const ipHashOf = (ip) => createHmac('sha256', BASE_ENV.IP_HASH_SALT).update(ip).digest('hex');
  const rowsFor = (ip, count, ageMs) =>
    Array.from({ length: count }, (_, i) => ({
      id: `r${i}`,
      email: `r${i}@example.com`,
      ipHash: ipHashOf(ip),
      createdAt: new Date(NOW - ageMs).toISOString(),
    }));

  it('allows the 5th lead and blocks the 6th', async () => {
    const { handler } = setup();
    for (let i = 0; i < 5; i += 1) {
      const { status } = await post(handler, { body: validBody({ email: `person${i}@example.com` }) });
      assert.equal(status, 201, `lead ${i + 1}`);
    }
    const { status, body, response } = await post(handler, { body: validBody({ email: 'sixth@example.com' }) });
    assert.equal(status, 429);
    assert.deepEqual(body, { ok: false, error: 'rate_limited' });
    assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
  });

  it('only counts leads from the last 10 minutes', async () => {
    const repo = createFakeRepo({ rows: rowsFor('203.0.113.7', 5, 10 * 60_000 + 1) });
    const { handler } = setup({ repo });
    assert.equal((await post(handler, { body: validBody() })).status, 201);
  });

  it('counts per IP', async () => {
    const repo = createFakeRepo({ rows: rowsFor('203.0.113.7', 5, 60_000) });
    const { handler } = setup({ repo });
    assert.equal((await post(handler, { body: validBody() })).status, 429);
    const other = await post(handler, { body: validBody(), headers: { 'x-forwarded-for': '198.51.100.1' } });
    assert.equal(other.status, 201);
  });

  it('is skipped (and nothing IP-related is stored) when IP_HASH_SALT is missing', async () => {
    const repo = createFakeRepo({ rows: rowsFor('203.0.113.7', 5, 60_000) });
    const { handler, log } = setup({ repo, env: { IP_HASH_SALT: '' } });
    assert.equal((await post(handler, { body: validBody() })).status, 201);
    assert.equal(repo.calls.count, 0);
    assert.equal(repo.rows.at(-1).ipHash, null);
    assert.ok(log.entries.some((e) => e.event === 'config.warning' && /IP_HASH_SALT/.test(e.warning)));
  });
});

describe('Server errors (500)', () => {
  it('without a database the lead is refused with a generic error', async () => {
    const { handler, log } = setup({ repo: null });
    const { status, body } = await post(handler, { body: validBody() });
    assert.equal(status, 500);
    assert.deepEqual(body, { ok: false, error: 'server' });
    assert.ok(log.entries.some((e) => e.event === 'lead.db_not_configured'));
  });

  it('a database error never leaks internals', async () => {
    const repo = createFakeRepo();
    repo.insertLeadUnlessDuplicate = async () => {
      throw new Error('password authentication failed for user "neondb_owner" at ep-secret-123');
    };
    const { handler, log } = setup({ repo });
    const { status, body, response } = await post(handler, { body: validBody() });
    assert.equal(status, 500);
    assert.deepEqual(body, { ok: false, error: 'server' });
    assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
    assert.ok(log.entries.some((e) => e.event === 'lead.failed'));
  });

  it('logs never contain the email, name or raw IP', async () => {
    const { handler, log } = setup({ env: TELEGRAM_ENV });
    await post(handler, { body: validBody() });
    const logged = JSON.stringify(log.entries);
    for (const secret of ['ada@example.co.uk', 'Ada Lovelace', '203.0.113.7', TELEGRAM_TOKEN]) {
      assert.equal(logged.toLowerCase().includes(secret.toLowerCase()), false, secret);
    }
  });
});
