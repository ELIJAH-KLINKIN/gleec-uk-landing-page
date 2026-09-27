import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createStatsHandler } from '../lib/stats-handler.js';
import { BASE_ENV, NOW, ORIGIN, createFakeRepo, createTestLogger, makeRequest } from './helpers.js';

const PATH = '/api/stats';
const CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

const lead = (email, overrides = {}) => ({
  id: `id-${email}`,
  email,
  fullName: 'Secret Name',
  company: 'Secret Co',
  createdAt: new Date(NOW).toISOString(),
  ...overrides,
});

function setup({ env = {}, rows = [], repo = createFakeRepo({ rows }) } = {}) {
  const log = createTestLogger();
  const handler = createStatsHandler({ env: { ...BASE_ENV, ...env }, repo, log });
  return { handler, repo, log };
}

async function get(handler, options = {}) {
  const response = await handler.GET(makeRequest({ method: 'GET', path: PATH, ...options }));
  const text = await response.text();
  return { response, status: response.status, text, body: text ? JSON.parse(text) : null };
}

describe('GET /api/stats — count', () => {
  it('returns { ok: true, companies: N }: distinct emails, disqualified excluded', async () => {
    const { handler } = setup({
      rows: [
        lead('a@example.com'),
        lead('b@example.com', { status: 'contacted' }),
        lead('a@example.com', { id: 'again' }),
        lead('c@example.com', { status: 'disqualified' }),
      ],
    });
    const { status, body } = await get(handler);
    assert.equal(status, 200);
    assert.deepEqual(body, { ok: true, companies: 2 });
  });

  it('an empty waitlist is 0', async () => {
    const { body } = await get(setup().handler);
    assert.deepEqual(body, { ok: true, companies: 0 });
  });

  it('never exposes anything but the count', async () => {
    const { handler } = setup({ rows: [lead('secret@example.com')] });
    const { body, text } = await get(handler);
    assert.deepEqual(Object.keys(body), ['ok', 'companies']);
    for (const value of ['secret@example.com', 'Secret Name', 'Secret Co', 'id-']) assert.equal(text.includes(value), false, value);
  });
});

describe('GET /api/stats — caching', () => {
  it('is cacheable by browsers (1 min) and the CDN (5 min, +10 min stale)', async () => {
    const { response } = await get(setup().handler);
    assert.equal(response.headers.get('cache-control'), CACHE_CONTROL);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.equal(response.headers.get('vary'), 'Origin');
  });

  it('errors are never cached', async () => {
    const repo = createFakeRepo();
    repo.countCompanies = async () => {
      throw new Error('boom');
    };
    assert.equal((await get(setup({ repo }).handler)).response.headers.get('cache-control'), 'no-store');
    assert.equal((await get(setup({ repo: null }).handler)).response.headers.get('cache-control'), 'no-store');
  });
});

describe('GET /api/stats — CORS', () => {
  it('echoes an allowed origin', async () => {
    const { handler } = setup();
    for (const origin of [ORIGIN, 'http://localhost:5173']) {
      const { status, response } = await get(handler, { origin });
      assert.equal(status, 200);
      assert.equal(response.headers.get('access-control-allow-origin'), origin);
      assert.equal(response.headers.get('vary'), 'Origin');
    }
  });

  it('no Origin or a disallowed one: still the JSON, without Access-Control-Allow-Origin', async () => {
    const { handler } = setup({ rows: [lead('a@example.com')] });
    for (const origin of [null, 'https://evil.example']) {
      const { status, body, response } = await get(handler, { origin });
      assert.equal(status, 200, String(origin));
      assert.deepEqual(body, { ok: true, companies: 1 });
      assert.equal(response.headers.get('access-control-allow-origin'), null);
      assert.equal(response.headers.get('vary'), 'Origin');
      assert.equal(response.headers.get('cache-control'), CACHE_CONTROL);
    }
  });

  it('OPTIONS preflight: 204 for an allowed origin, 403 otherwise', async () => {
    const { handler } = setup();
    const ok = handler.OPTIONS(makeRequest({ method: 'OPTIONS', path: PATH }));
    assert.equal(ok.status, 204);
    assert.equal(ok.headers.get('access-control-allow-origin'), ORIGIN);
    assert.equal(ok.headers.get('access-control-allow-methods'), 'GET, HEAD, OPTIONS');
    assert.equal(await ok.text(), '');
    const denied = handler.OPTIONS(makeRequest({ method: 'OPTIONS', path: PATH, origin: 'https://evil.example' }));
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
  });
});

describe('/api/stats — other methods', () => {
  it('HEAD: same status and headers, no body', async () => {
    const { handler } = setup({ rows: [lead('a@example.com')] });
    const response = await handler.HEAD(makeRequest({ method: 'HEAD', path: PATH }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), CACHE_CONTROL);
    assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
    assert.equal(await response.text(), '');
  });

  it('POST/PUT/PATCH/DELETE: 405 with Allow: GET, HEAD, OPTIONS', async () => {
    const { handler } = setup();
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const response = handler.methodNotAllowed(makeRequest({ method, path: PATH, body: {} }));
      assert.equal(response.status, 405, method);
      assert.equal(response.headers.get('allow'), 'GET, HEAD, OPTIONS');
      assert.deepEqual(await response.json(), { ok: false, error: 'method_not_allowed' });
    }
  });
});

describe('GET /api/stats — errors', () => {
  it('database missing: 503 unavailable', async () => {
    const { handler, log } = setup({ repo: null });
    const { status, body, response } = await get(handler);
    assert.equal(status, 503);
    assert.deepEqual(body, { ok: false, error: 'unavailable' });
    assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
    assert.ok(log.entries.some((e) => e.event === 'stats.db_not_configured'));
  });

  it('database error: 500 server, details only in the logs', async () => {
    const repo = createFakeRepo();
    repo.countCompanies = async () => {
      throw new Error('password authentication failed for user "neondb_owner" at ep-secret-123');
    };
    const { handler, log } = setup({ repo });
    const { status, body, text } = await get(handler);
    assert.equal(status, 500);
    assert.deepEqual(body, { ok: false, error: 'server' });
    assert.equal(text.includes('neondb_owner'), false);
    assert.ok(log.entries.some((e) => e.event === 'stats.failed' && e.level === 'error'));
  });
});
