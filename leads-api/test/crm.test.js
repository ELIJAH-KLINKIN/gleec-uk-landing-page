import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCrmPayload, buildCrmUpdatePayload, sendCrmWebhook, signBody } from '../lib/crm.js';
import { createFakeFetch, hangingFetch } from './helpers.js';

const SECRET = 'whsec_test_secret';
const URL_ = 'https://crm.example.test/hooks/leads?token=abc123';

// Independent check using WebCrypto instead of node:crypto's createHmac.
async function webCryptoSignature(rawBody, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(rawBody)));
  return `sha256=${Buffer.from(mac).toString('hex')}`;
}

const record = {
  id: '3f1c2b1e-7a1d-4a55-9d0b-6a8c1e2f4b77',
  createdAt: '2026-09-26T12:00:00.000Z',
  fullName: 'Zoë Ångström',
  email: 'zoe@example.com',
  company: 'Ångström & Co',
  country: 'Sweden',
  phone: null,
  businessType: 'group',
  currencies: ['EUR'],
  monthlyVolume: 'gt_5m',
  message: 'Hej 👋',
  consent: true,
  consentAt: '2026-09-26T12:00:00.000Z',
  source: { page: 'https://example.com/' },
  ipHash: 'deadbeef',
  userAgent: 'Mozilla/5.0',
};

describe('signBody', () => {
  it('matches the RFC 4231 HMAC-SHA256 test vector', () => {
    // RFC 4231 test case 2: key "Jefe", data "what do ya want for nothing?"
    assert.equal(
      signBody('what do ya want for nothing?', 'Jefe'),
      'sha256=5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
  });
  it('agrees with WebCrypto on UTF-8 bodies', async () => {
    const body = JSON.stringify(buildCrmPayload(record));
    assert.equal(signBody(body, SECRET), await webCryptoSignature(body, SECRET));
  });
  it('changes when the body or the secret changes', () => {
    assert.notEqual(signBody('{"a":1}', SECRET), signBody('{"a":2}', SECRET));
    assert.notEqual(signBody('{"a":1}', SECRET), signBody('{"a":1}', 'other'));
  });
});

describe('buildCrmPayload', () => {
  it('contains the stored lead but not the IP hash or user agent', () => {
    const payload = buildCrmPayload(record);
    assert.equal(payload.id, record.id);
    assert.equal(payload.status, 'new');
    assert.equal(payload.email, 'zoe@example.com');
    assert.deepEqual(payload.currencies, ['EUR']);
    assert.equal('ipHash' in payload, false);
    assert.equal('userAgent' in payload, false);
  });
});

describe('buildCrmPayload — email-first and updates', () => {
  const KEYS = [
    'id', 'createdAt', 'status', 'fullName', 'firstName', 'lastName', 'email', 'company', 'companyWebsite', 'country',
    'phone', 'businessType',
    'currencies', 'monthlyVolume', 'message', 'consent', 'consentAt', 'updatesOptIn', 'source',
  ];

  it('keeps the same shape for an email-only lead, missing fields null', () => {
    const payload = buildCrmPayload({ id: record.id, createdAt: record.createdAt, email: 'zoe@example.com', consent: true });
    assert.deepEqual(Object.keys(payload), KEYS);
    assert.equal(payload.status, 'new');
    for (const key of ['fullName', 'firstName', 'lastName', 'company', 'companyWebsite', 'country', 'phone', 'businessType', 'monthlyVolume', 'message', 'consentAt']) {
      assert.equal(payload[key], null, key);
    }
    assert.deepEqual(payload.currencies, []);
    assert.deepEqual(payload.source, {});
  });

  it('lead.updated payload: same fields plus detailsAt, with the stored status', () => {
    const payload = buildCrmUpdatePayload({ ...record, status: 'contacted', detailsAt: '2026-09-26T12:01:00.000Z' });
    assert.deepEqual(Object.keys(payload), [...KEYS, 'detailsAt']);
    assert.equal(payload.status, 'contacted');
    assert.equal(payload.detailsAt, '2026-09-26T12:01:00.000Z');
    assert.equal('ipHash' in payload, false);
  });
});

describe('sendCrmWebhook', () => {
  it('sends the event it is given (lead.updated for the details step)', async () => {
    const fetch = createFakeFetch(() => new Response(null, { status: 204 }));
    await sendCrmWebhook({ url: URL_, secret: SECRET, payload: {}, fetch, event: 'lead.updated' });
    assert.equal(new Headers(fetch.calls[0].init.headers).get('x-gleec-event'), 'lead.updated');
  });

  it('POSTs the JSON with a signature the receiver can verify', async () => {
    const fetch = createFakeFetch(() => new Response(null, { status: 204 }));
    const payload = buildCrmPayload(record);
    const result = await sendCrmWebhook({ url: URL_, secret: SECRET, payload, fetch });
    assert.deepEqual(result, { ok: true });

    const [call] = fetch.calls;
    assert.equal(call.url, URL_);
    assert.equal(call.init.method, 'POST');
    const headers = new Headers(call.init.headers);
    assert.equal(headers.get('content-type'), 'application/json');
    assert.equal(headers.get('x-gleec-event'), 'lead.created');
    // Receiver side: recompute over the raw bytes it received.
    assert.equal(headers.get('x-gleec-signature'), await webCryptoSignature(call.body, SECRET));
    assert.deepEqual(JSON.parse(call.body), payload);
  });

  it('does not send without a secret', async () => {
    const fetch = createFakeFetch();
    const result = await sendCrmWebhook({ url: URL_, secret: '', payload: {}, fetch });
    assert.deepEqual(result, { ok: false, error: 'CRM_WEBHOOK_SECRET not set' });
    assert.equal(fetch.calls.length, 0);
  });

  it('reports non-2xx responses', async () => {
    const fetch = createFakeFetch(() => new Response('nope', { status: 500 }));
    const result = await sendCrmWebhook({ url: URL_, secret: SECRET, payload: {}, fetch });
    assert.deepEqual(result, { ok: false, error: 'HTTP 500' });
  });

  it('never throws and keeps the URL (which may hold a token) out of the error', async () => {
    const fetch = createFakeFetch((url) => {
      throw new Error(`getaddrinfo ENOTFOUND ${url}`);
    });
    const result = await sendCrmWebhook({ url: URL_, secret: SECRET, payload: {}, fetch });
    assert.equal(result.ok, false);
    assert.equal(result.error.includes('abc123'), false);
  });

  it('gives up after the timeout', async () => {
    const result = await sendCrmWebhook({ url: URL_, secret: SECRET, payload: {}, fetch: hangingFetch(), timeoutMs: 30 });
    assert.deepEqual(result, { ok: false, error: 'timed out after 30 ms' });
  });
});
