// Smoke tests of the real Vercel entry points (no network: only paths that never reach the DB).
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { BASE_ENV, ORIGIN, makeRequest, validBody } from './helpers.js';

let leads;
let details;
let stats;
let health;

before(async () => {
  Object.assign(process.env, BASE_ENV, {
    TELEGRAM_BOT_TOKEN: '123456:secret-token-value-that-must-not-leak',
    TELEGRAM_CHAT_ID: '-1001234567890',
  });
  delete process.env.CRM_WEBHOOK_URL;
  delete process.env.CRM_WEBHOOK_SECRET;
  leads = await import('../api/leads.js');
  details = await import('../api/leads/details.js');
  stats = await import('../api/stats.js');
  health = await import('../api/health.js');
});

describe('api/leads.js', () => {
  it('exports Web-standard method handlers', () => {
    for (const method of ['POST', 'OPTIONS', 'GET', 'HEAD', 'PUT', 'PATCH', 'DELETE']) {
      assert.equal(typeof leads[method], 'function', method);
    }
    assert.equal(typeof leads.default, 'undefined');
    assert.deepEqual(leads.config, { maxDuration: 30 });
  });

  it('answers a preflight', async () => {
    const response = await leads.OPTIONS(makeRequest({ method: 'OPTIONS' }));
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
  });

  it('refuses other origins and methods before touching the database', async () => {
    assert.equal((await leads.POST(makeRequest({ origin: 'https://evil.example', body: validBody() }))).status, 403);
    assert.equal((await leads.GET(makeRequest({ method: 'GET' }))).status, 405);
    assert.equal((await leads.POST(makeRequest({ body: validBody(), contentType: 'text/plain' }))).status, 415);
  });
});

describe('api/leads/details.js', () => {
  it('exports Web-standard method handlers', () => {
    for (const method of ['POST', 'OPTIONS', 'GET', 'HEAD', 'PUT', 'PATCH', 'DELETE']) {
      assert.equal(typeof details[method], 'function', method);
    }
    assert.equal(typeof details.default, 'undefined');
    assert.deepEqual(details.config, { maxDuration: 30 });
  });

  it('answers a preflight and refuses what it must before touching the database', async () => {
    const path = '/api/leads/details';
    assert.equal((await details.OPTIONS(makeRequest({ method: 'OPTIONS', path }))).status, 204);
    assert.equal((await details.POST(makeRequest({ path, origin: 'https://evil.example', body: {} }))).status, 403);
    assert.equal((await details.GET(makeRequest({ method: 'GET', path }))).status, 405);
    assert.equal((await details.POST(makeRequest({ path, body: {}, contentType: 'text/plain' }))).status, 415);
    const badToken = await details.POST(makeRequest({ path, body: { id: '3f1c2b1e-7a1d-4a55-9d0b-6a8c1e2f4b77', token: 'x'.repeat(43), phone: '12345' } }));
    assert.equal(badToken.status, 403);
  });
});

describe('api/stats.js', () => {
  it('exports Web-standard method handlers', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      assert.equal(typeof stats[method], 'function', method);
    }
    assert.equal(typeof stats.default, 'undefined');
    assert.deepEqual(stats.config, { maxDuration: 10 });
  });

  it('answers a preflight and 405 for POST (GET needs the database, covered in stats-handler tests)', async () => {
    const preflight = await stats.OPTIONS(makeRequest({ method: 'OPTIONS', path: '/api/stats' }));
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-methods'), 'GET, HEAD, OPTIONS');
    const post = await stats.POST(makeRequest({ path: '/api/stats', body: {} }));
    assert.equal(post.status, 405);
    assert.equal(post.headers.get('allow'), 'GET, HEAD, OPTIONS');
  });
});

describe('api/health.js', () => {
  it('reports configuration as booleans without leaking values', async () => {
    const response = await health.GET(new Request('https://leads.example.test/api/health'));
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.deepEqual(JSON.parse(text), { ok: true, db: true, telegram: true, crm: false, details: true });
    for (const value of [BASE_ENV.DATABASE_URL, 'secret-token-value', '-1001234567890', BASE_ENV.IP_HASH_SALT, BASE_ENV.LEAD_TOKEN_SECRET]) {
      assert.equal(text.includes(value), false, value);
    }
  });
});
