import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TELEGRAM_MAX_LENGTH, formatTelegramMessage, sendTelegramMessage } from '../lib/telegram.js';
import { escapeHtml } from '../lib/text.js';
import { validateLead } from '../lib/validate.js';
import { TELEGRAM_TOKEN, createFakeFetch, emailOnlyBody, hangingFetch, validBody } from './helpers.js';

const LEAD_ID = '3f1c2b1e-7a1d-4a55-9d0b-6a8c1e2f4b77';

function leadRecord(overrides = {}) {
  const { lead } = validateLead(validBody(overrides));
  return { ...lead, id: LEAD_ID, createdAt: '2026-09-26T12:00:00.000Z' };
}

// Every "&" must start one of the entities Telegram's HTML mode accepts.
function assertEntitiesWellFormed(html) {
  const bad = html.match(/&(?!(amp|lt|gt|quot);)/g);
  assert.equal(bad, null, 'found a bare or broken & entity');
}

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

describe('escapeHtml', () => {
  it('escapes &, <, > and "', () => {
    assert.equal(escapeHtml(`<a href="x">Tom & Jerry</a>`), '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/a&gt;');
  });
  it('escapes & first so entities are not double-escaped incorrectly', () => {
    assert.equal(escapeHtml('&lt;'), '&amp;lt;');
  });
});

describe('formatTelegramMessage', () => {
  it('renders title, unlabelled bullets, the message as a quote and the id', () => {
    const html = formatTelegramMessage(leadRecord());
    assert.equal(
      html,
      [
        '🇬🇧 <b>UK Business Banking Lead</b>',
        '',
        '• Ada Lovelace',
        '• Analytical Engines Ltd',
        '• United Kingdom',
        '• ada@example.co.uk',
        '• +44 20 7946 0958',
        '• International business',
        '• GBP, EUR',
        '• £250k–£1m',
        '• https://elijah-klinkin.github.io/gleec-uk-landing-page/',
        '• from https://www.google.com/',
        '• utm_source=google · utm_medium=cpc · utm_campaign=launch',
        '',
        '<blockquote>We need multi-currency accounts.</blockquote>',
        '',
        `Lead ID: ${LEAD_ID}`,
      ].join('\n'),
    );
  });

  it('maps every business type and volume to a label', () => {
    const expected = {
      local: 'UK business',
      group: 'Holding / corporate group',
      other: 'Other',
    };
    for (const [value, label] of Object.entries(expected)) {
      assert.ok(formatTelegramMessage(leadRecord({ businessType: value })).includes(`\n• ${label}\n`));
    }
    const volumes = { lt_50k: 'Under £50k', '50k_250k': '£50k–£250k', '1m_5m': '£1m–£5m', gt_5m: 'Over £5m' };
    for (const [value, label] of Object.entries(volumes)) {
      assert.ok(formatTelegramMessage(leadRecord({ monthlyVolume: value })).includes(`\n• ${label}\n`));
    }
  });

  it('omits optional lines that are empty', () => {
    const html = formatTelegramMessage(
      leadRecord({ phone: '', businessType: '', currencies: [], monthlyVolume: '', message: '', source: {} }),
    );
    assert.equal(
      html,
      [
        '🇬🇧 <b>UK Business Banking Lead</b>',
        '',
        '• Ada Lovelace',
        '• Analytical Engines Ltd',
        '• United Kingdom',
        '• ada@example.co.uk',
        '',
        `Lead ID: ${LEAD_ID}`,
      ].join('\n'),
    );
  });

  it('email-first lead: email and page as bullets, then the id', () => {
    const { lead } = validateLead(emailOnlyBody());
    const html = formatTelegramMessage({ ...lead, id: LEAD_ID, createdAt: '2026-09-26T12:00:00.000Z' });
    assert.equal(
      html,
      [
        '🇬🇧 <b>UK Business Banking Lead</b>',
        '',
        '• ada@example.co.uk',
        '• https://elijah-klinkin.github.io/gleec-uk-landing-page/v2/',
        '',
        `Lead ID: ${LEAD_ID}`,
      ].join('\n'),
    );
  });

  it('details added: its own title, the stored details, email and id — no source lines', () => {
    const record = { ...leadRecord({ fullName: '', country: '', message: '' }), detailsAt: '2026-09-26T12:01:00.000Z' };
    const html = formatTelegramMessage(record, TELEGRAM_MAX_LENGTH, { kind: 'updated' });
    assert.equal(
      html,
      [
        '🇬🇧 <b>UK Business Banking Lead · Details</b>',
        '',
        '• Analytical Engines Ltd',
        '• ada@example.co.uk',
        '• +44 20 7946 0958',
        '• International business',
        '• GBP, EUR',
        '• £250k–£1m',
        '',
        `Lead ID: ${LEAD_ID}`,
      ].join('\n'),
    );
    assertEntitiesWellFormed(html);
  });

  it('details from the v3 form: first + last name as one bullet, then company and website', () => {
    const record = {
      id: LEAD_ID,
      email: 'ada@example.co.uk',
      firstName: 'Ada',
      lastName: 'Lovelace',
      company: 'Analytical Engines Ltd',
      companyWebsite: 'https://analytical.example',
      country: 'Germany',
      currencies: [],
      source: {},
    };
    assert.equal(
      formatTelegramMessage(record, TELEGRAM_MAX_LENGTH, { kind: 'updated' }),
      [
        '🇬🇧 <b>UK Business Banking Lead · Details</b>',
        '',
        '• Ada Lovelace',
        '• Analytical Engines Ltd',
        '• https://analytical.example',
        '• Germany',
        '• ada@example.co.uk',
        '',
        `Lead ID: ${LEAD_ID}`,
      ].join('\n'),
    );
  });

  it('details message escapes input and stays within the limit too', () => {
    const record = leadRecord({ fullName: '<b>x</b>', company: '&'.repeat(160), message: '&<>"'.repeat(500) });
    const html = formatTelegramMessage(record, TELEGRAM_MAX_LENGTH, { kind: 'updated' });
    assert.ok(html.length <= TELEGRAM_MAX_LENGTH);
    assert.ok(html.includes('• &lt;b&gt;x&lt;/b&gt;'));
    assert.ok(html.endsWith(`Lead ID: ${LEAD_ID}`));
    assertEntitiesWellFormed(html);
  });

  it('escapes all user input', () => {
    const html = formatTelegramMessage(
      leadRecord({
        fullName: '<b>Eve</b> & "Mallory"',
        company: '<a href="https://evil.example">click</a>',
        message: '</blockquote><i>injected</i> & more',
        source: { page: 'https://x.example/?a=1&b=<2>', utm_source: '<script>' },
      }),
    );
    assert.ok(html.includes('• &lt;b&gt;Eve&lt;/b&gt; &amp; &quot;Mallory&quot;'));
    assert.ok(html.includes('&lt;a href=&quot;https://evil.example&quot;&gt;click&lt;/a&gt;'));
    assert.ok(html.includes('<blockquote>&lt;/blockquote&gt;&lt;i&gt;injected&lt;/i&gt; &amp; more</blockquote>'));
    assert.ok(html.includes('https://x.example/?a=1&amp;b=&lt;2&gt;'));
    assert.equal(html.includes('<script>'), false);
    assert.equal(html.includes('<i>'), false);
    assert.equal(html.includes('evil.example">'), false);
    assertEntitiesWellFormed(html);
  });

  it('stays within 4096 characters for the largest possible lead', () => {
    const lead = leadRecord({
      fullName: '&'.repeat(120),
      company: '<'.repeat(160),
      country: '>'.repeat(80),
      message: '&<>"'.repeat(500), // 2000 chars, ~5x when escaped
      source: {
        page: '&'.repeat(500),
        referrer: '&'.repeat(500),
        utm_source: '&'.repeat(500),
        utm_medium: '&'.repeat(500),
        utm_campaign: '&'.repeat(500),
        utm_term: '&'.repeat(500),
        utm_content: '&'.repeat(500),
      },
    });
    const html = formatTelegramMessage(lead);
    assert.ok(html.length <= TELEGRAM_MAX_LENGTH, `length ${html.length}`);
    assert.ok(html.includes('…'));
    assert.ok(html.includes('• ada@example.co.uk'));
    assert.ok(html.endsWith(`Lead ID: ${LEAD_ID}`));
    assert.ok(html.includes('<blockquote>') && html.includes('</blockquote>'));
    assertEntitiesWellFormed(html);
  });

  it('shortens the longest free-text value first and leaves short fields intact', () => {
    const html = formatTelegramMessage(leadRecord({ message: 'm'.repeat(2000) }), 800);
    assert.ok(html.length <= 800, `length ${html.length}`);
    assert.ok(html.includes('• Ada Lovelace'));
    assert.ok(html.includes('• Analytical Engines Ltd'));
    assert.match(html, /<blockquote>m+…<\/blockquote>/);
  });

  it('does not split emoji (surrogate pairs) when truncating', () => {
    for (let limit = 700; limit < 760; limit += 1) {
      const html = formatTelegramMessage(leadRecord({ message: '😀'.repeat(1000) }), limit);
      assert.ok(html.length <= limit);
      assert.equal(LONE_SURROGATE.test(html), false, `limit ${limit}`);
    }
  });
});

describe('sendTelegramMessage', () => {
  it('POSTs sendMessage with HTML parse mode and previews disabled', async () => {
    const fetch = createFakeFetch();
    const result = await sendTelegramMessage({ token: TELEGRAM_TOKEN, chatId: '-1001234567890', text: 'hi', fetch });
    assert.deepEqual(result, { ok: true });
    assert.equal(fetch.calls.length, 1);
    const [call] = fetch.calls;
    assert.equal(call.url, `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`);
    assert.equal(call.init.method, 'POST');
    assert.equal(call.init.headers['content-type'], 'application/json');
    assert.deepEqual(call.json, {
      chat_id: '-1001234567890',
      text: 'hi',
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  });

  it('adds message_thread_id when configured', async () => {
    const fetch = createFakeFetch();
    await sendTelegramMessage({ token: TELEGRAM_TOKEN, chatId: '-100', threadId: 42, text: 'hi', fetch });
    assert.equal(fetch.calls[0].json.message_thread_id, 42);
  });

  it('reports Telegram API errors with their description', async () => {
    const fetch = createFakeFetch(() =>
      Response.json({ ok: false, error_code: 400, description: 'Bad Request: chat not found' }, { status: 400 }),
    );
    const result = await sendTelegramMessage({ token: TELEGRAM_TOKEN, chatId: '-100', text: 'hi', fetch });
    assert.deepEqual(result, { ok: false, error: '400 Bad Request: chat not found' });
  });

  it('resends once to the new id when the group became a supergroup', async () => {
    const fetch = createFakeFetch((url, init) =>
      JSON.parse(init.body).chat_id === '-4001'
        ? Response.json(
            { ok: false, error_code: 400, description: 'Bad Request: group chat was upgraded to a supergroup chat', parameters: { migrate_to_chat_id: -1004001 } },
            { status: 400 },
          )
        : Response.json({ ok: true, result: {} }),
    );
    const result = await sendTelegramMessage({ token: TELEGRAM_TOKEN, chatId: '-4001', text: 'hi', fetch });
    assert.deepEqual(result, { ok: true, migratedTo: '-1004001' });
    assert.deepEqual(fetch.calls.map((c) => c.json.chat_id), ['-4001', '-1004001']);
  });

  it('reports non-JSON error pages by status', async () => {
    const fetch = createFakeFetch(() => new Response('<html>Bad gateway</html>', { status: 502 }));
    const result = await sendTelegramMessage({ token: TELEGRAM_TOKEN, chatId: '-100', text: 'hi', fetch });
    assert.deepEqual(result, { ok: false, error: 'HTTP 502' });
  });

  it('never throws and never leaks the bot token', async () => {
    const fetch = createFakeFetch((url) => {
      throw new Error(`connect ECONNREFUSED ${url}`);
    });
    const result = await sendTelegramMessage({ token: TELEGRAM_TOKEN, chatId: '-100', text: 'hi', fetch });
    assert.equal(result.ok, false);
    assert.equal(result.error.includes(TELEGRAM_TOKEN), false);
    assert.equal(result.error.includes('AAHfake'), false);
    assert.match(result.error, /ECONNREFUSED/);
  });

  it('gives up after the timeout', async () => {
    const started = Date.now();
    const result = await sendTelegramMessage({
      token: TELEGRAM_TOKEN,
      chatId: '-100',
      text: 'hi',
      fetch: hangingFetch(),
      timeoutMs: 50,
    });
    assert.deepEqual(result, { ok: false, error: 'timed out after 50 ms' });
    assert.ok(Date.now() - started < 2000);
  });

  it('uses a 5 second timeout by default', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const pending = sendTelegramMessage({ token: TELEGRAM_TOKEN, chatId: '-100', text: 'hi', fetch: hangingFetch() });
    t.mock.timers.tick(4999);
    await Promise.resolve();
    t.mock.timers.tick(1);
    assert.deepEqual(await pending, { ok: false, error: 'timed out after 5000 ms' });
  });
});
