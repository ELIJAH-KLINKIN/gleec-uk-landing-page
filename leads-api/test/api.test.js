// Smoke tests of the real Vercel entry points (no network: only paths that never reach the DB).
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { BASE_ENV, ORIGIN, makeRequest, validBody } from './helpers.js';

let leads;
let health;

before(async () => {
  Object.assign(process.env, BASE_ENV, {
    TELEGRAM_BOT_TOKEN: '123456:secret-token-value-that-must-not-leak',
    TELEGRAM_CHAT_ID: '-1001234567890',
  });
  delete process.env.CRM_WEBHOOK_URL;
  delete process.env.CRM_WEBHOOK_SECRET;
  leads = await import('../api/leads.js');
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

describe('api/health.js', () => {
  it('reports configuration as booleans without leaking values', async () => {
    const response = await health.GET(new Request('https://leads.example.test/api/health'));
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.deepEqual(JSON.parse(text), { ok: true, db: true, telegram: true, crm: false });
    for (const value of [BASE_ENV.DATABASE_URL, 'secret-token-value', '-1001234567890', BASE_ENV.IP_HASH_SALT]) {
      assert.equal(text.includes(value), false, value);
    }
  });
});
