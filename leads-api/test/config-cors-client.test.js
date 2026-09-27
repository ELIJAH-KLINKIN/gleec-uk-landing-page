import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clientIp, hashIp, userAgent } from '../lib/client.js';
import { configStatus, loadConfig, parseAllowedOrigins } from '../lib/config.js';
import { corsHeaders, isOriginAllowed } from '../lib/cors.js';
import { isRateLimited, rateLimitWindowStart } from '../lib/rate-limit.js';

describe('config', () => {
  it('parses ALLOWED_ORIGINS: trims, drops empties and trailing slashes', () => {
    assert.deepEqual(
      [...parseAllowedOrigins(' https://a.example/ ,, http://localhost:5173 ,https://b.example')],
      ['https://a.example', 'http://localhost:5173', 'https://b.example'],
    );
    assert.equal(parseAllowedOrigins(undefined).size, 0);
  });

  it('Telegram needs both token and chat id; thread id must be an integer', () => {
    assert.equal(loadConfig({ TELEGRAM_BOT_TOKEN: 't' }).telegram, null);
    assert.equal(loadConfig({ TELEGRAM_CHAT_ID: '-100' }).telegram, null);
    assert.deepEqual(loadConfig({ TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '-100', TELEGRAM_THREAD_ID: '12' }).telegram, {
      token: 't',
      chatId: '-100',
      threadId: 12,
    });
    const config = loadConfig({ TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '-100', TELEGRAM_THREAD_ID: 'abc' });
    assert.equal(config.telegram.threadId, null);
    assert.ok(config.warnings.some((w) => w.includes('TELEGRAM_THREAD_ID')));
  });

  it('configStatus exposes booleans only', () => {
    const status = configStatus(
      loadConfig({
        DATABASE_URL: 'postgres://secret',
        TELEGRAM_BOT_TOKEN: 't',
        TELEGRAM_CHAT_ID: '-100',
        CRM_WEBHOOK_URL: 'https://crm.example',
      }),
    );
    assert.deepEqual(status, { db: true, telegram: true, crm: false });
  });

  it('a fully configured environment produces no warnings', () => {
    const config = loadConfig({
      ALLOWED_ORIGINS: 'https://a.example',
      DATABASE_URL: 'postgres://x',
      IP_HASH_SALT: 's',
      TELEGRAM_BOT_TOKEN: 't',
      TELEGRAM_CHAT_ID: '-100',
      CRM_WEBHOOK_URL: 'https://crm.example',
      CRM_WEBHOOK_SECRET: 'k',
    });
    assert.deepEqual(config.warnings, []);
  });
});

describe('cors', () => {
  const allowed = parseAllowedOrigins('https://a.example');
  it('echoes only allowed origins and always varies on Origin', () => {
    assert.deepEqual(corsHeaders('https://a.example', allowed), {
      vary: 'Origin',
      'access-control-allow-origin': 'https://a.example',
    });
    assert.deepEqual(corsHeaders('https://b.example', allowed), { vary: 'Origin' });
    assert.deepEqual(corsHeaders(null, allowed), { vary: 'Origin' });
  });
  it('is an exact, case-sensitive match', () => {
    assert.equal(isOriginAllowed('https://A.example', allowed), false);
    assert.equal(isOriginAllowed('https://a.example/', allowed), false);
    assert.equal(isOriginAllowed('', allowed), false);
  });
});

describe('client', () => {
  it('takes the first x-forwarded-for entry, then x-real-ip', () => {
    assert.equal(clientIp(new Headers({ 'x-forwarded-for': ' 203.0.113.7 , 10.0.0.1' })), '203.0.113.7');
    assert.equal(clientIp(new Headers({ 'x-real-ip': '198.51.100.2' })), '198.51.100.2');
    assert.equal(clientIp(new Headers({ 'x-forwarded-for': 'FE80::1', 'x-real-ip': '1.1.1.1' })), 'fe80::1');
    assert.equal(clientIp(new Headers()), null);
  });

  it('hashes the IP with the salt and never returns it raw', () => {
    const a = hashIp('203.0.113.7', 'salt-a');
    assert.match(a, /^[0-9a-f]{64}$/);
    assert.equal(a, hashIp('203.0.113.7', 'salt-a'));
    assert.notEqual(a, hashIp('203.0.113.7', 'salt-b'));
    assert.notEqual(a, hashIp('203.0.113.8', 'salt-a'));
    assert.equal(hashIp('203.0.113.7', ''), null);
    assert.equal(hashIp(null, 'salt-a'), null);
  });

  it('cleans and caps the user agent', () => {
    assert.equal(userAgent(new Headers({ 'user-agent': 'A'.repeat(500) })).length, 300);
    assert.equal(userAgent(new Headers()), null);
  });
});

describe('rate limit decision', () => {
  it('blocks at 5 or more recent leads', () => {
    assert.equal(isRateLimited(0), false);
    assert.equal(isRateLimited(4), false);
    assert.equal(isRateLimited(5), true);
    assert.equal(isRateLimited(12), true);
  });
  it('window is 10 minutes', () => {
    assert.equal(rateLimitWindowStart(Date.parse('2026-09-26T12:00:00Z')).toISOString(), '2026-09-26T11:50:00.000Z');
  });
});
