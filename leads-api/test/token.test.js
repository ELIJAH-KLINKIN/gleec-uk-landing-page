import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { leadTokenFor, normalizeLeadId, randomLeadToken, signLeadToken, verifyLeadToken } from '../lib/token.js';

const ID = '3f1c2b1e-7a1d-4a55-9d0b-6a8c1e2f4b77';
const SECRET = 'lead-token-secret';

// Independent check using WebCrypto instead of node:crypto's createHmac.
async function webCryptoToken(id, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(id)));
  return Buffer.from(mac).toString('base64url');
}

describe('lead token', () => {
  it('is base64url(HMAC-SHA256(id, key LEAD_TOKEN_SECRET)): 43 characters, no padding', async () => {
    const token = signLeadToken(ID, SECRET);
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(token, await webCryptoToken(ID, SECRET));
  });

  it('depends on the id and on the secret', () => {
    assert.notEqual(signLeadToken(ID, SECRET), signLeadToken(ID.replace('7', '8'), SECRET));
    assert.notEqual(signLeadToken(ID, SECRET), signLeadToken(ID, 'other'));
  });

  it('leadTokenFor gives null without a secret', () => {
    assert.equal(leadTokenFor(ID, ''), null);
    assert.equal(leadTokenFor(ID, SECRET), signLeadToken(ID, SECRET));
  });

  it('random tokens have the same shape and differ every time', () => {
    const a = randomLeadToken();
    assert.match(a, /^[A-Za-z0-9_-]{43}$/);
    assert.notEqual(a, randomLeadToken());
  });
});

describe('verifyLeadToken', () => {
  const token = signLeadToken(ID, SECRET);

  it('accepts the right token', () => {
    assert.equal(verifyLeadToken(ID, token, SECRET), true);
  });

  it('rejects wrong, foreign, malformed and missing tokens without throwing', () => {
    const other = signLeadToken('00000000-0000-4000-8000-000000000000', SECRET);
    for (const value of [other, randomLeadToken(), token.slice(0, -1), `${token}A`, `${token.slice(0, -1)}=`, '', null, undefined, 42, [token], { token }]) {
      assert.equal(verifyLeadToken(ID, value, SECRET), false, JSON.stringify(value));
    }
  });

  it('rejects everything when the secret is missing', () => {
    assert.equal(verifyLeadToken(ID, token, ''), false);
    assert.equal(verifyLeadToken(ID, signLeadToken(ID, ''), ''), false);
  });
});

describe('normalizeLeadId', () => {
  it('accepts UUIDs in either case and returns them lower-case', () => {
    assert.equal(normalizeLeadId(ID), ID);
    assert.equal(normalizeLeadId(ID.toUpperCase()), ID);
  });
  it('rejects anything else', () => {
    for (const value of ['', 'abc', `${ID} `, ` ${ID}`, `${ID}0`, ID.replaceAll('-', ''), "' or 1=1 --", null, undefined, 42, [ID]]) {
      assert.equal(normalizeLeadId(value), null, JSON.stringify(value));
    }
  });
});
