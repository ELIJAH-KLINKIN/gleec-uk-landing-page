import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MESSAGES, detectBot, normalizeSource, validateLead } from '../lib/validate.js';
import { NOW, validBody } from './helpers.js';

const errorsFor = (overrides) => {
  const result = validateLead(validBody(overrides));
  return result.ok ? {} : result.fields;
};
const leadFor = (overrides) => {
  const result = validateLead(validBody(overrides));
  assert.equal(result.ok, true, JSON.stringify(result.fields));
  return result.lead;
};

describe('validateLead — happy path', () => {
  it('accepts a full valid body and normalises it', () => {
    const lead = leadFor({
      fullName: '  Ada   Lovelace ',
      email: '  Ada@Example.CO.UK ',
      company: 'Analytical\tEngines Ltd',
    });
    assert.equal(lead.fullName, 'Ada Lovelace');
    assert.equal(lead.email, 'ada@example.co.uk');
    assert.equal(lead.company, 'Analytical Engines Ltd');
    assert.deepEqual(lead.currencies, ['GBP', 'EUR']);
    assert.equal(lead.monthlyVolume, '250k_1m');
    assert.equal(lead.consent, true);
    assert.equal(lead.startedAt, NOW - 30_000);
  });

  it('accepts a minimal body (optional fields absent)', () => {
    const lead = leadFor({
      phone: undefined,
      businessType: undefined,
      currencies: undefined,
      monthlyVolume: undefined,
      message: undefined,
      source: undefined,
      website: undefined,
    });
    assert.equal(lead.phone, null);
    assert.equal(lead.businessType, null);
    assert.deepEqual(lead.currencies, []);
    assert.equal(lead.monthlyVolume, null);
    assert.equal(lead.message, null);
    assert.deepEqual(lead.source, {});
  });

  it('treats empty strings and null in optional fields as absent', () => {
    const lead = leadFor({ phone: '  ', businessType: '', monthlyVolume: null, message: '   ', currencies: null });
    assert.equal(lead.phone, null);
    assert.equal(lead.businessType, null);
    assert.equal(lead.monthlyVolume, null);
    assert.equal(lead.message, null);
    assert.deepEqual(lead.currencies, []);
  });

  it('ignores unknown top-level fields', () => {
    const lead = leadFor({ isAdmin: true, status: 'qualified' });
    assert.equal('isAdmin' in lead, false);
    assert.equal('status' in lead, false);
  });

  it('reports every invalid field at once', () => {
    const fields = errorsFor({ fullName: '', email: 'nope', consent: false });
    assert.deepEqual(Object.keys(fields).sort(), ['consent', 'email', 'fullName']);
  });
});

describe('validateLead — body shape', () => {
  for (const body of [null, [], 'text', 42, true]) {
    it(`rejects ${JSON.stringify(body)}`, () => {
      assert.deepEqual(validateLead(body), { ok: false, fields: { body: MESSAGES.body } });
    });
  }
});

describe('validateLead — fullName (2–120)', () => {
  it('rejects too short, too long, missing and non-string', () => {
    for (const fullName of ['A', ' A ', 'x'.repeat(121), undefined, null, 42, ['Ada']]) {
      assert.equal(errorsFor({ fullName }).fullName, MESSAGES.fullName, `value ${JSON.stringify(fullName)}`);
    }
  });
  it('accepts the boundaries', () => {
    assert.equal(leadFor({ fullName: 'Al' }).fullName, 'Al');
    assert.equal(leadFor({ fullName: 'x'.repeat(120) }).fullName.length, 120);
  });
  it('strips control and bidi characters', () => {
    assert.equal(leadFor({ fullName: 'Ada\u0000\nLove‮lace' }).fullName, 'Ada Lovelace');
  });
});

describe('validateLead — email', () => {
  it('accepts common real-world addresses and lower-cases them', () => {
    for (const [input, stored] of [
      ['First.Last+tag@Sub.Example.co.uk', 'first.last+tag@sub.example.co.uk'],
      ["o'brien@example.ie", "o'brien@example.ie"],
      ['x@xn--80ak6aa92e.com', 'x@xn--80ak6aa92e.com'],
      ['user@example.xn--p1ai', 'user@example.xn--p1ai'],
    ]) {
      assert.equal(leadFor({ email: input }).email, stored);
    }
  });
  it('rejects invalid addresses', () => {
    for (const email of [
      '',
      'plainaddress',
      'a@b',
      'a@b.c',
      'a..b@example.com',
      '.a@example.com',
      'a.@example.com',
      'a@-example.com',
      'a@example-.com',
      'a b@example.com',
      'a@exa mple.com',
      '<script>@example.com',
      `${'a'.repeat(65)}@example.com`,
      `a@${['b', 'c', 'd', 'e', 'f'].map((ch) => ch.repeat(60)).join('.')}.com`, // 310 chars > 254
      42,
      undefined,
    ]) {
      assert.equal(errorsFor({ email }).email, MESSAGES.email, `value ${JSON.stringify(email)}`);
    }
  });
});

describe('validateLead — company (1–160) and country (2–80)', () => {
  it('company boundaries', () => {
    assert.equal(leadFor({ company: 'X' }).company, 'X');
    assert.equal(leadFor({ company: 'x'.repeat(160) }).company.length, 160);
    assert.equal(errorsFor({ company: '   ' }).company, MESSAGES.company);
    assert.equal(errorsFor({ company: 'x'.repeat(161) }).company, MESSAGES.company);
    assert.equal(errorsFor({ company: undefined }).company, MESSAGES.company);
  });
  it('country boundaries', () => {
    assert.equal(leadFor({ country: 'UK' }).country, 'UK');
    assert.equal(leadFor({ country: 'x'.repeat(80) }).country.length, 80);
    assert.equal(errorsFor({ country: 'U' }).country, MESSAGES.country);
    assert.equal(errorsFor({ country: 'x'.repeat(81) }).country, MESSAGES.country);
    assert.equal(errorsFor({ country: undefined }).country, MESSAGES.country);
  });
});

describe('validateLead — phone (optional)', () => {
  it('accepts digits, spaces and + ( ) - .', () => {
    assert.equal(leadFor({ phone: ' +44 (20) 7946-0958 ' }).phone, '+44 (20) 7946-0958');
    assert.equal(leadFor({ phone: '020.7946.0958' }).phone, '020.7946.0958');
  });
  it('rejects other characters', () => {
    assert.equal(errorsFor({ phone: '+44 20 CALL ME' }).phone, MESSAGES.phoneChars);
    assert.equal(errorsFor({ phone: '<b>1234567</b>' }).phone, MESSAGES.phoneChars);
    assert.equal(errorsFor({ phone: 4420794609 }).phone, MESSAGES.phoneChars);
  });
  it('rejects more than 40 characters', () => {
    assert.equal(leadFor({ phone: '1'.repeat(40) }).phone.length, 40);
    assert.equal(errorsFor({ phone: '1'.repeat(41) }).phone, MESSAGES.phoneLength);
  });
  it('rejects numbers with fewer than 5 digits', () => {
    assert.equal(errorsFor({ phone: '+' }).phone, MESSAGES.phoneDigits);
    assert.equal(errorsFor({ phone: '(12) 34' }).phone, MESSAGES.phoneDigits);
  });
});

describe('validateLead — enums', () => {
  it('businessType', () => {
    for (const value of ['local', 'international', 'group', 'other']) {
      assert.equal(leadFor({ businessType: value }).businessType, value);
    }
    for (const value of ['LOCAL', 'global', 1, true]) {
      assert.equal(errorsFor({ businessType: value }).businessType, MESSAGES.businessType);
    }
  });
  it('monthlyVolume', () => {
    for (const value of ['lt_50k', '50k_250k', '250k_1m', '1m_5m', 'gt_5m']) {
      assert.equal(leadFor({ monthlyVolume: value }).monthlyVolume, value);
    }
    for (const value of ['5m+', 'GT_5M', 250000]) {
      assert.equal(errorsFor({ monthlyVolume: value }).monthlyVolume, MESSAGES.monthlyVolume);
    }
  });
  it('currencies: allowed values, deduplicated, order kept', () => {
    assert.deepEqual(leadFor({ currencies: ['USD', 'GBP', 'USD', 'Other', 'GBP'] }).currencies, ['USD', 'GBP', 'Other']);
    assert.deepEqual(leadFor({ currencies: [] }).currencies, []);
    for (const value of ['GBP', ['JPY'], ['gbp'], [null], { 0: 'GBP' }, Array(21).fill('GBP')]) {
      assert.equal(errorsFor({ currencies: value }).currencies, MESSAGES.currencies, JSON.stringify(value));
    }
  });
});

describe('validateLead — message (≤2000)', () => {
  it('keeps line breaks, normalises CRLF and strips control characters', () => {
    const lead = leadFor({ message: '  Line one\r\nLine\u0007 two\n\n\n\nLine three  ' });
    assert.equal(lead.message, 'Line one\nLine two\n\nLine three');
  });
  it('boundaries', () => {
    assert.equal(leadFor({ message: 'm'.repeat(2000) }).message.length, 2000);
    assert.equal(errorsFor({ message: 'm'.repeat(2001) }).message, MESSAGES.message);
    assert.equal(errorsFor({ message: 12 }).message, MESSAGES.message);
  });
});

describe('validateLead — consent and startedAt', () => {
  it('consent must be exactly true', () => {
    for (const consent of [false, 'true', 1, undefined, null]) {
      assert.equal(errorsFor({ consent }).consent, MESSAGES.consent, JSON.stringify(consent));
    }
  });
  it('startedAt must be a finite number', () => {
    for (const startedAt of [undefined, null, '1700000000000', Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.equal(errorsFor({ startedAt }).startedAt, MESSAGES.startedAt, String(startedAt));
    }
  });
});

describe('normalizeSource', () => {
  it('keeps known string keys, truncates to 500, drops the rest', () => {
    const source = normalizeSource({
      page: 'https://example.com/' + 'p'.repeat(600),
      referrer: '  https://google.com/  ',
      utm_source: 'news\nletter',
      utm_medium: 42,
      utm_campaign: '',
      evil: 'x',
    });
    assert.equal(source.page.length, 500);
    assert.equal(source.referrer, 'https://google.com/');
    assert.equal(source.utm_source, 'news letter');
    assert.equal('utm_medium' in source, false);
    assert.equal('utm_campaign' in source, false);
    assert.equal('evil' in source, false);
  });
  it('returns {} for anything that is not an object', () => {
    for (const value of [undefined, null, 'x', ['a'], 5]) assert.deepEqual(normalizeSource(value), {});
  });
  it('never rejects the lead because of bad tracking data', () => {
    assert.equal(validateLead(validBody({ source: 'garbage' })).ok, true);
  });
});

describe('detectBot', () => {
  it('honeypot: any non-empty value is a bot', () => {
    for (const website of ['http://spam.example', 'x', 0, false, [], {}]) {
      assert.equal(detectBot(validBody({ website }), NOW), 'honeypot', JSON.stringify(website));
    }
    for (const website of ['', '   ', null, undefined]) {
      assert.equal(detectBot(validBody({ website }), NOW), null, JSON.stringify(website));
    }
  });
  it('time trap: under 2500 ms after startedAt is a bot', () => {
    assert.equal(detectBot(validBody({ startedAt: NOW }), NOW), 'too_fast');
    assert.equal(detectBot(validBody({ startedAt: NOW - 2499 }), NOW), 'too_fast');
    assert.equal(detectBot(validBody({ startedAt: NOW - 2500 }), NOW), null);
    assert.equal(detectBot(validBody({ startedAt: NOW - 60_000 }), NOW), null);
  });
  it('time trap: a browser clock ahead of the server is not treated as a bot', () => {
    assert.equal(detectBot(validBody({ startedAt: NOW + 90_000 }), NOW), null);
  });
  it('missing startedAt is left to validation (loud 400, not a silent drop)', () => {
    assert.equal(detectBot(validBody({ startedAt: undefined }), NOW), null);
  });
});
