import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { describe, it } from 'node:test';
import { open, parseKey, seal } from '../lib/secretbox.js';
import { createTalkHandler } from '../lib/talk-handler.js';
import { requestMessage } from '../lib/talk-notify.js';
import { BASE_ENV, LEAD_TOKEN_SECRET, ORIGIN, TELEGRAM_ENV, createTestLogger, makeRequest } from './helpers.js';

const NOW = Date.parse('2026-09-28T12:00:00Z'); // Monday 13:00 London
const KEY_TEXT = randomBytes(32).toString('base64');
const KEY = parseKey(KEY_TEXT);
const ENV = {
  ...BASE_ENV,
  ...TELEGRAM_ENV,
  GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  TALK_TOKEN_KEY: KEY_TEXT,
  TALK_HOSTS: 'ilia@example.com, andrey@example.com',
};
const tokenFor = (id) => createHmac('sha256', LEAD_TOKEN_SECRET).update(`talk:${id}`).digest('base64url');
const TUE_10 = '2026-09-29T09:00:00.000Z';

/** In-memory stand-in for createTalkRepo, with the unique (host, start) rule. */
function createFakeTalkRepo({ hosts = ['ilia@example.com', 'andrey@example.com'] } = {}) {
  const rows = new Map();
  const hostRows = new Map(
    hosts.map((email) => [
      email,
      { email, displayName: email.split('@')[0].replace(/^./, (c) => c.toUpperCase()), refreshTokenEnc: seal(`rt-${email}`, KEY), calendarId: 'primary' },
    ]),
  );
  let n = 0;
  return {
    rows,
    hostRows,
    async countRecentByIpHash() {
      return 0;
    },
    async insertRequest(r) {
      const id = `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
      rows.set(id, { ...r, id, status: 'requested', createdAt: new Date(NOW).toISOString() });
      return { id, createdAt: new Date(NOW).toISOString() };
    },
    async getRequest(id) {
      return rows.get(id) ? { ...rows.get(id) } : null;
    },
    async claimSlot(id, { hostEmail, startAt, endAt }) {
      const row = rows.get(id);
      if (!row || row.status !== 'requested') return 'not_requested';
      const clash = [...rows.values()].some(
        (o) => ['booking', 'booked'].includes(o.status) && o.hostEmail === hostEmail && o.startAt === new Date(startAt).toISOString(),
      );
      if (clash) return 'slot_taken';
      Object.assign(row, { status: 'booking', hostEmail, startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString() });
      return 'claimed';
    },
    async releaseSlot(id) {
      Object.assign(rows.get(id), { status: 'requested', hostEmail: null, startAt: null, endAt: null });
    },
    async confirmBooking(id, { eventId, meetUrl }) {
      Object.assign(rows.get(id), { status: 'booked', eventId, meetUrl });
    },
    async recordTelegram(id, status, ping) {
      const row = rows.get(id);
      row.telegramStatus = status;
      if (ping) Object.assign(row, { telegramChatId: ping.chatId, telegramMessageId: ping.messageId });
    },
    async upcomingCountsByHost() {
      const counts = {};
      for (const r of rows.values()) if (r.status === 'booked') counts[r.hostEmail] = (counts[r.hostEmail] ?? 0) + 1;
      return counts;
    },
    async activeHosts() {
      return [...hostRows.values()];
    },
    async upsertHost(h) {
      hostRows.set(h.email, { ...h, calendarId: 'primary' });
    },
  };
}

/** Fake Google + Telegram. busy: { 'rt-<email>': [{start,end}] } keyed by refresh token. */
function createFakeGoogle({ busy = {}, failEvent = false, idToken = null, tokenScope } = {}) {
  const calls = [];
  const accessToRefresh = {};
  const fetch = async (url, init = {}) => {
    const body = typeof init.body === 'string' ? init.body : init.body?.toString();
    calls.push({ url: String(url), init, body });
    if (url.startsWith('https://api.telegram.org/')) {
      return Response.json({ ok: true, result: url.endsWith('/sendMessage') ? { message_id: 500 + calls.length } : {} });
    }
    if (url === 'https://oauth2.googleapis.com/token') {
      const p = new URLSearchParams(body);
      if (p.get('grant_type') === 'refresh_token') {
        const at = `at-${p.get('refresh_token')}`;
        accessToRefresh[at] = p.get('refresh_token');
        return Response.json({ access_token: at, expires_in: 3599 });
      }
      return Response.json({
        access_token: 'at-new',
        refresh_token: 'rt-new-host',
        scope: tokenScope ?? 'openid email https://www.googleapis.com/auth/calendar.freebusy https://www.googleapis.com/auth/calendar.events',
        id_token: idToken,
      });
    }
    const auth = init.headers?.authorization?.replace('Bearer ', '');
    if (url.endsWith('/freeBusy')) {
      const rt = accessToRefresh[auth];
      return Response.json({
        calendars: { primary: { busy: (busy[rt] || []).map((b) => ({ start: new Date(b.start).toISOString(), end: new Date(b.end).toISOString() })) } },
      });
    }
    if (url.includes('/events?')) {
      if (failEvent) return Response.json({ error: { message: 'Backend Error' } }, { status: 503 });
      return Response.json({ id: 'evt-1', hangoutLink: 'https://meet.google.com/abc-defg-hij' });
    }
    return new Response('not found', { status: 404 });
  };
  fetch.calls = calls;
  return fetch;
}

function setup({ env = ENV, repo = createFakeTalkRepo(), google = createFakeGoogle(), now = NOW } = {}) {
  const log = createTestLogger();
  const handler = createTalkHandler({ env, repo, fetch: google, now: () => now, log, randomUUID: () => 'bot-id' });
  return { handler, repo, google, log };
}

const requestBody = (overrides = {}) => ({
  email: 'Ada@Example.co.uk',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phone: '+44 20 7946 0958',
  company: 'Analytical Engines Ltd',
  companyWebsite: 'analytical.example',
  message: 'Multi-currency payouts',
  website: '',
  startedAt: NOW - 30_000,
  source: { page: 'https://gleec-uk-landing-page-v3.vercel.app/' },
  ...overrides,
});

async function createRequest(ctx, overrides) {
  const res = await ctx.handler.POST(makeRequest({ path: '/api/talk', body: requestBody(overrides) }));
  return { res, data: await res.json() };
}

const slots = (ctx, id, token) =>
  ctx.handler.GET(makeRequest({ method: 'GET', path: `/api/talk?id=${id}&token=${token}` }));
const book = (ctx, body) => ctx.handler.BOOK(makeRequest({ path: '/api/talk/book', body }));

describe('POST /api/talk', () => {
  it('stores the request, pings Telegram and returns id + token', async () => {
    const ctx = setup();
    const { res, data } = await createRequest(ctx);
    assert.equal(res.status, 201);
    assert.equal(data.token, tokenFor(data.id));
    assert.equal(data.booking, true);
    const row = ctx.repo.rows.get(data.id);
    assert.equal(row.email, 'ada@example.co.uk');
    assert.equal(row.companyWebsite, 'https://analytical.example');
    assert.equal(row.telegramStatus, 'sent');
    const tg = ctx.google.calls.find((c) => c.url.includes('api.telegram.org'));
    const text = JSON.parse(tg.body).text;
    assert.ok(text.startsWith('🇬🇧 <b>UK Business Banking Call Request</b>\n\n• Ada Lovelace\n'));
    assert.ok(text.endsWith('<i>Choosing a time…</i>'));
  });

  it('rejects missing names and bad websites with field messages', async () => {
    const { res, data } = await createRequest(setup(), { firstName: '', companyWebsite: 'nope' });
    assert.equal(res.status, 400);
    assert.deepEqual(Object.keys(data.fields).sort(), ['companyWebsite', 'firstName']);
  });

  it('answers bots like a success without storing anything', async () => {
    const ctx = setup();
    const { res, data } = await createRequest(ctx, { website: 'http://spam.example' });
    assert.equal(res.status, 201);
    assert.equal(data.id, 'bot-id');
    assert.equal(ctx.repo.rows.size, 0);
  });

  it('refuses other origins', async () => {
    const res = await setup().handler.POST(makeRequest({ path: '/api/talk', origin: 'https://evil.example', body: requestBody() }));
    assert.equal(res.status, 403);
  });
});

describe('GET /api/talk (free times)', () => {
  it('returns days with slots when at least one host is free', async () => {
    const google = createFakeGoogle({
      busy: { 'rt-ilia@example.com': [{ start: Date.parse(TUE_10), end: Date.parse('2026-09-29T12:00:00Z') }] },
    });
    const ctx = setup({ google });
    const { data } = await createRequest(ctx);
    const res = await slots(ctx, data.id, data.token);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.available, true);
    assert.equal(body.timeZone, 'Europe/London');
    assert.equal(body.days[0].date, '2026-09-29');
    assert.equal(body.days[0].slots[0], TUE_10); // Andrey is free at 10:00
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });

  it('needs the right token', async () => {
    const ctx = setup();
    const { data } = await createRequest(ctx);
    const res = await slots(ctx, data.id, tokenFor('00000000-0000-4000-8000-999999999999'));
    assert.equal(res.status, 403);
  });

  it('says unavailable (not an error) when Google is not configured', async () => {
    const env = { ...ENV, GOOGLE_CLIENT_ID: '' };
    const ctx = setup({ env });
    const { data } = await createRequest(ctx);
    assert.equal(data.booking, false);
    const body = await (await slots(ctx, data.id, data.token)).json();
    assert.deepEqual(body, { ok: true, available: false, days: [] });
  });

  it('skips a host whose calendar fails and still offers the other', async () => {
    const repo = createFakeTalkRepo();
    repo.hostRows.get('ilia@example.com').refreshTokenEnc = 'v1.broken';
    const ctx = setup({ repo });
    const { data } = await createRequest(ctx);
    const body = await (await slots(ctx, data.id, data.token)).json();
    assert.equal(body.available, true);
    assert.ok(ctx.log.entries.some((e) => e.event === 'talk.host_unavailable'));
  });
});

describe('POST /api/talk/book', () => {
  it('books a free host with a Google Meet link and invites the guest', async () => {
    const ctx = setup();
    const { data } = await createRequest(ctx);
    const res = await book(ctx, { id: data.id, token: data.token, start: TUE_10 });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.booking.meetUrl, 'https://meet.google.com/abc-defg-hij');
    assert.equal(body.booking.start, TUE_10);
    assert.equal(body.booking.end, '2026-09-29T09:20:00.000Z');

    const insert = ctx.google.calls.find((c) => c.url.includes('/events?'));
    assert.match(insert.url, /conferenceDataVersion=1/);
    assert.match(insert.url, /sendUpdates=all/);
    const event = JSON.parse(insert.body);
    assert.deepEqual(event.attendees, [{ email: 'ada@example.co.uk', displayName: 'Ada Lovelace' }]);
    assert.equal(event.conferenceData.createRequest.conferenceSolutionKey.type, 'hangoutsMeet');
    assert.match(event.description, /not currently authorised by the FCA/);
    assert.equal(ctx.repo.rows.get(data.id).status, 'booked');
    // One message per request: the request ping is edited into "Call Booked".
    const pings = ctx.google.calls.filter((c) => c.url.includes('api.telegram.org'));
    assert.deepEqual(pings.map((c) => c.url.split('/').pop()), ['sendMessage', 'editMessageText']);
    const row = ctx.repo.rows.get(data.id);
    const edit = JSON.parse(pings[1].body);
    assert.equal(edit.chat_id, TELEGRAM_ENV.TELEGRAM_CHAT_ID);
    assert.equal(edit.message_id, row.telegramMessageId);
    assert.ok(edit.text.startsWith('🇬🇧 <b>UK Business Banking Call Booked</b>\n\n• Ada Lovelace\n'));
    assert.match(edit.text, /\n<b>Tue 29 Sept?, 10:00–10:20 \(London\)<\/b> with Andrey\nhttps:\/\/meet\.google\.com\/abc-defg-hij$/);
    assert.equal(edit.text.includes('Choosing a time'), false);
    assert.equal(row.telegramStatus, 'edited');
  });

  it('posts "Call Booked" as a new message when the request ping can\'t be edited', async () => {
    const ctx = setup();
    const { data } = await createRequest(ctx);
    ctx.repo.rows.get(data.id).telegramMessageId = null; // e.g. the request ping never went out
    await book(ctx, { id: data.id, token: data.token, start: TUE_10 });
    const pings = ctx.google.calls.filter((c) => c.url.includes('api.telegram.org'));
    assert.deepEqual(pings.map((c) => c.url.split('/').pop()), ['sendMessage', 'sendMessage']);
    assert.ok(JSON.parse(pings[1].body).text.startsWith('🇬🇧 <b>UK Business Banking Call Booked</b>'));
    assert.equal(ctx.repo.rows.get(data.id).telegramStatus, 'sent');
  });

  it('is idempotent: booking again returns the same call', async () => {
    const ctx = setup();
    const { data } = await createRequest(ctx);
    await book(ctx, { id: data.id, token: data.token, start: TUE_10 });
    const again = await (await book(ctx, { id: data.id, token: data.token, start: '2026-09-29T10:00:00.000Z' })).json();
    assert.equal(again.booking.start, TUE_10);
    assert.equal(ctx.google.calls.filter((c) => c.url.includes('/events?')).length, 1);
  });

  it('spreads calls between hosts (round robin)', async () => {
    const ctx = setup();
    const a = (await createRequest(ctx)).data;
    const b = (await createRequest(ctx, { email: 'grace@example.com' })).data;
    await book(ctx, { id: a.id, token: a.token, start: TUE_10 });
    await book(ctx, { id: b.id, token: b.token, start: '2026-09-29T10:00:00.000Z' });
    const hostsUsed = new Set([ctx.repo.rows.get(a.id).hostEmail, ctx.repo.rows.get(b.id).hostEmail]);
    assert.equal(hostsUsed.size, 2);
  });

  it('gives the same slot to the second host, then reports it taken', async () => {
    const ctx = setup();
    const ids = [];
    for (const email of ['a@example.com', 'b@example.com', 'c@example.com']) ids.push((await createRequest(ctx, { email })).data);
    const r1 = await book(ctx, { id: ids[0].id, token: ids[0].token, start: TUE_10 });
    const r2 = await book(ctx, { id: ids[1].id, token: ids[1].token, start: TUE_10 });
    const r3 = await book(ctx, { id: ids[2].id, token: ids[2].token, start: TUE_10 });
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(r3.status, 409);
    assert.equal((await r3.json()).error, 'slot_taken');
  });

  it('rejects a time that was never offered', async () => {
    const ctx = setup();
    const { data } = await createRequest(ctx);
    const res = await book(ctx, { id: data.id, token: data.token, start: '2026-09-29T09:07:00.000Z' });
    assert.equal(res.status, 400);
  });

  it('frees the slot again when Google fails to create the event', async () => {
    const ctx = setup({ google: createFakeGoogle({ failEvent: true }) });
    const { data } = await createRequest(ctx);
    const res = await book(ctx, { id: data.id, token: data.token, start: TUE_10 });
    assert.equal(res.status, 502);
    assert.equal(ctx.repo.rows.get(data.id).status, 'requested');
  });
});

describe('connecting a host calendar', () => {
  const idToken = (claims) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;

  it('redirects to Google with offline access and a signed state', async () => {
    const res = setup().handler.CONNECT(new Request('https://api.example.test/api/talk/connect'));
    assert.equal(res.status, 302);
    const url = new URL(res.headers.get('location'));
    assert.equal(url.origin, 'https://accounts.google.com');
    assert.equal(url.searchParams.get('access_type'), 'offline');
    assert.equal(url.searchParams.get('redirect_uri'), 'https://api.example.test/api/talk/callback');
    assert.match(url.searchParams.get('scope'), /calendar\.events/);
    assert.match(url.searchParams.get('state'), /^\d+\.[A-Za-z0-9_-]{43}$/);
  });

  async function callback(google, { state } = {}) {
    const ctx = setup({ repo: createFakeTalkRepo({ hosts: [] }), google });
    const location = new URL(ctx.handler.CONNECT(new Request('https://api.example.test/api/talk/connect')).headers.get('location'));
    const s = state ?? location.searchParams.get('state');
    const res = await ctx.handler.CALLBACK(new Request(`https://api.example.test/api/talk/callback?code=abc&state=${s}`));
    return { res, ctx };
  }

  it('stores an allowed host with the refresh token encrypted', async () => {
    const { res, ctx } = await callback(createFakeGoogle({ idToken: idToken({ email: 'Andrey@Example.com', email_verified: true, given_name: 'Andrey' }) }));
    assert.equal(res.status, 200);
    const host = ctx.repo.hostRows.get('andrey@example.com');
    assert.equal(host.displayName, 'Andrey');
    assert.notEqual(host.refreshTokenEnc, 'rt-new-host');
    assert.equal(open(host.refreshTokenEnc, KEY), 'rt-new-host');
  });

  it('refuses accounts that are not on TALK_HOSTS', async () => {
    const { res, ctx } = await callback(createFakeGoogle({ idToken: idToken({ email: 'someone@else.com', email_verified: true }) }));
    assert.equal(res.status, 403);
    assert.equal(ctx.repo.hostRows.size, 0);
  });

  it('refuses a forged or expired state', async () => {
    const { res } = await callback(createFakeGoogle(), { state: `${NOW}.${'A'.repeat(43)}` });
    assert.equal(res.status, 400);
  });

  it('refuses when a calendar permission was left unticked', async () => {
    const { res } = await callback(
      createFakeGoogle({ idToken: idToken({ email: 'ilia@example.com', email_verified: true }), tokenScope: 'openid email' }),
    );
    assert.equal(res.status, 400);
  });
});

describe('secretbox', () => {
  it('round-trips and detects tampering or the wrong key', () => {
    const box = seal('refresh-token', KEY);
    assert.equal(open(box, KEY), 'refresh-token');
    const [v, iv, body, tag] = box.split('.');
    const flipped = (body[0] === 'A' ? 'B' : 'A') + body.slice(1);
    assert.equal(open([v, iv, flipped, tag].join('.'), KEY), null);
    assert.equal(open(box, parseKey(randomBytes(32).toString('base64'))), null);
    assert.equal(parseKey('short'), null);
  });
});

it('talk handler origin constant matches the helpers', () => {
  assert.ok(ENV.ALLOWED_ORIGINS.includes(ORIGIN));
});

describe('talk: Telegram request message', () => {
  const r = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    company: 'Analytical <Engines>',
    email: 'ada@example.co.uk',
    message: 'Hi & thanks',
    source: { page: 'https://gleecpay.co.uk/#talk' },
  };

  it('lists the details as bullets and quotes the notes', () => {
    assert.equal(
      requestMessage(r),
      [
        '🇬🇧 <b>UK Business Banking Call Request</b>',
        '',
        '• Ada Lovelace',
        '• Analytical &lt;Engines&gt;',
        '• ada@example.co.uk',
        '• https://gleecpay.co.uk/#talk',
        '\n<blockquote>Hi &amp; thanks</blockquote>',
        '',
        '<i>Choosing a time…</i>',
      ].join('\n'),
    );
  });

  it('says to email them when online booking is off', () => {
    assert.ok(requestMessage(r, { booking: false }).endsWith('<i>Online booking is off: email them to arrange a time.</i>'));
  });
});
