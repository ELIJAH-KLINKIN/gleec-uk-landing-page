// "Talk to a human": a visitor leaves their details, picks a time, and gets a Google Meet
// invitation from one of the hosts (round robin). Endpoints:
//
//   POST /api/talk            details → 201 { id, token }            (bot traps, rate limit)
//   GET  /api/talk?id&token   free times in the hosts' calendars      (id + token required)
//   POST /api/talk/book       { id, token, start } → Meet invitation  (idempotent per request)
//   GET  /api/talk/connect    a host connects their Google Calendar (consent screen)
//   GET  /api/talk/callback   Google's redirect back; stores the host's encrypted token
//
// The token is HMAC("talk:" + id) with LEAD_TOKEN_SECRET, so only the browser that
// created the request can list times for it and book it.
import { loadConfig } from './config.js';
import { NOTIFY_TIMEOUT_MS } from './constants.js';
import { clientIp, hashIp, userAgent } from './client.js';
import { afterResponse, createCorsGate, readJsonObject } from './endpoint.js';
import {
  authorizationUrl,
  busyIntervals,
  createMeetEvent,
  exchangeCode,
  idTokenClaims,
  refreshAccessToken,
} from './google.js';
import { describeError, json } from './http.js';
import { createLogger } from './log.js';
import { isRateLimited, rateLimitWindowStart } from './rate-limit.js';
import { availableSlots, freeHosts, isBookableStart, pickHost, scheduleFromEnv } from './schedule.js';
import { open, parseKey, seal } from './secretbox.js';
import { bookedMessage, notifyTalk, requestMessage } from './talk-notify.js';
import { leadTokenFor, normalizeLeadId, randomLeadToken, signLeadToken, verifyLeadToken } from './token.js';
import { detectBot, TALK_MESSAGES, validateTalkRequest } from './validate.js';

const MINUTE = 60_000;
const STATE_MAX_AGE_MS = 15 * MINUTE;

// Shown to the guest in the calendar invitation. Keep in step with the website's status line.
export const EVENT_STATUS_NOTE =
  'GLEEC Business is a brand of Gleec Pay Ltd, which is preparing an application to the Financial Conduct ' +
  'Authority to become an Authorised Electronic Money Institution. Gleec Pay Ltd is not currently authorised ' +
  'by the FCA and does not currently provide regulated e-money or payment services.';

const csv = (value) =>
  String(value ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export function loadTalkConfig(env = {}) {
  const base = loadConfig(env);
  const clientId = String(env.GOOGLE_CLIENT_ID ?? '').trim();
  const clientSecret = String(env.GOOGLE_CLIENT_SECRET ?? '').trim();
  return {
    ...base,
    google: clientId && clientSecret ? { clientId, clientSecret } : null,
    tokenKey: parseKey(env.TALK_TOKEN_KEY),
    allowedHosts: new Set(csv(env.TALK_HOSTS)),
    publicUrl: String(env.TALK_PUBLIC_URL ?? '').trim().replace(/\/+$/, '') || null,
    schedule: scheduleFromEnv(env),
  };
}

const talkTokenFor = (id, secret) => leadTokenFor(`talk:${id}`, secret);
const verifyTalkToken = (id, token, secret) => verifyLeadToken(`talk:${id}`, token, secret);

/** Signed, expiring OAuth state: "<ms>.<hmac>". */
function signState(now, secret) {
  return `${now}.${signLeadToken(`connect:${now}`, secret)}`;
}
function verifyState(state, now, secret) {
  const [ts, sig] = String(state ?? '').split('.');
  const issued = Number(ts);
  if (!Number.isFinite(issued) || now - issued > STATE_MAX_AGE_MS || issued - now > MINUTE) return false;
  return verifyLeadToken(`connect:${issued}`, sig, secret);
}

function html(status, title, message) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const body = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title><style>body{font:17px/1.5 -apple-system,system-ui,sans-serif;max-width:560px;margin:80px auto;padding:0 24px;color:#1d1d1f}@media(prefers-color-scheme:dark){body{background:#000;color:#f5f5f7}}h1{font-size:28px;margin:0 0 12px}</style></head><body><h1>${esc(title)}</h1><p>${esc(message)}</p></body></html>`;
  return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

/**
 * @param {object} deps
 * @param {object} deps.env
 * @param {object|null} deps.repo  createTalkRepo(db), or null when DATABASE_URL is unset
 * @param {typeof fetch} deps.fetch  Google + Telegram
 */
export function createTalkHandler({
  env = {},
  repo = null,
  fetch = globalThis.fetch,
  now = Date.now,
  waitUntil = null,
  log = createLogger(),
  randomUUID = () => globalThis.crypto.randomUUID(),
  notifyTimeoutMs = NOTIFY_TIMEOUT_MS,
} = {}) {
  const config = loadTalkConfig(env);
  const { schedule } = config;
  const cors = createCorsGate(config.allowedOrigins, 'GET, POST, OPTIONS');
  const bookCors = createCorsGate(config.allowedOrigins, 'POST, OPTIONS');
  const bookingConfigured = Boolean(config.google && config.tokenKey && config.leadTokenSecret);

  // Access tokens live ~1 hour; keep them per warm instance to save a round trip.
  const accessCache = new Map();
  async function accessTokenFor(host) {
    const hit = accessCache.get(host.email);
    if (hit && hit.expires > now()) return hit.token;
    const refreshToken = open(host.refreshTokenEnc, config.tokenKey);
    if (!refreshToken) throw new Error('stored refresh token cannot be decrypted');
    const token = await refreshAccessToken({ fetch, ...config.google, refreshToken });
    accessCache.set(host.email, { token, expires: now() + 50 * MINUTE });
    return token;
  }

  /** { email: busy[] } for every host whose calendar answered; failures are logged and skipped. */
  async function busyByHost(hosts, timeMin, timeMax) {
    const entries = await Promise.all(
      hosts.map(async (host) => {
        try {
          const accessToken = await accessTokenFor(host);
          const busy = await busyIntervals({ fetch, accessToken, calendarId: host.calendarId, timeMin, timeMax });
          return [host.email, busy];
        } catch (error) {
          log.warn('talk.host_unavailable', { host: host.email, error: describeError(error) });
          return null;
        }
      }),
    );
    return Object.fromEntries(entries.filter(Boolean));
  }

  async function authorised(body, reply) {
    const id = normalizeLeadId(body.id);
    if (!config.leadTokenSecret || !id || !verifyTalkToken(id, body.token, config.leadTokenSecret)) {
      return { error: reply(403, { ok: false, error: 'invalid_token' }) };
    }
    const request = await repo.getRequest(id);
    if (!request) return { error: reply(404, { ok: false, error: 'not_found' }) };
    return { id, request };
  }

  const bookingOf = (r, hosts = []) => ({
    start: r.startAt,
    end: r.endAt,
    meetUrl: r.meetUrl,
    hostName: hosts.find((h) => h.email === r.hostEmail)?.displayName ?? null,
  });

  // POST /api/talk — save the visitor's details and hand back the token for the next steps.
  async function POST(request) {
    const origin = request.headers.get('origin');
    if (!cors.isAllowed(origin)) return cors.forbidden();
    const reply = (status, body) => json(status, body, cors.headers(origin));
    try {
      const parsed = await readJsonObject(request);
      if (!parsed.ok) return reply(parsed.status, parsed.body);
      const { body } = parsed;
      const receivedAt = now();

      const bot = detectBot(body, receivedAt);
      if (bot) {
        log.info('talk.dropped', { reason: bot });
        return reply(201, { ok: true, id: randomUUID(), token: randomLeadToken(), booking: bookingConfigured });
      }
      const validation = validateTalkRequest(body);
      if (!validation.ok) return reply(400, { ok: false, error: 'validation', fields: validation.fields });
      if (!repo || !config.leadTokenSecret) {
        log.error('talk.not_configured', { db: Boolean(repo), token: Boolean(config.leadTokenSecret) });
        return reply(500, { ok: false, error: 'server' });
      }

      const ipHash = hashIp(clientIp(request.headers), config.ipHashSalt);
      if (ipHash && isRateLimited(await repo.countRecentByIpHash(ipHash, rateLimitWindowStart(receivedAt)))) {
        log.warn('talk.rate_limited');
        return reply(429, { ok: false, error: 'rate_limited' });
      }

      const record = { ...validation.request, ipHash, userAgent: userAgent(request.headers) };
      delete record.startedAt;
      const saved = await repo.insertRequest(record);
      log.info('talk.requested', { id: saved.id });

      const note = notifyTalk({
        id: saved.id,
        text: requestMessage(record),
        config,
        repo,
        fetch,
        log,
        timeoutMs: notifyTimeoutMs,
      });
      await afterResponse(note, { waitUntil, log, event: 'talk.wait_until_failed' });

      return reply(201, {
        ok: true,
        id: saved.id,
        token: talkTokenFor(saved.id, config.leadTokenSecret),
        booking: bookingConfigured,
      });
    } catch (error) {
      log.error('talk.failed', { error: describeError(error) });
      return reply(500, { ok: false, error: 'server' });
    }
  }

  // GET /api/talk?id=…&token=… — the free times, grouped by day (UTC ISO strings).
  async function GET(request) {
    const origin = request.headers.get('origin');
    if (!cors.isAllowed(origin)) return cors.forbidden();
    const reply = (status, body) => json(status, body, { ...cors.headers(origin), 'cache-control': 'no-store' });
    try {
      if (!repo) return reply(500, { ok: false, error: 'server' });
      const params = new URL(request.url).searchParams;
      const auth = await authorised({ id: params.get('id'), token: params.get('token') }, reply);
      if (auth.error) return auth.error;

      const unavailable = () => reply(200, { ok: true, available: false, days: [] });
      if (!bookingConfigured) return unavailable();
      const hosts = await repo.activeHosts();
      if (auth.request.status === 'booked') {
        return reply(200, { ok: true, available: true, booked: bookingOf(auth.request, hosts), days: [] });
      }
      if (!hosts.length) return unavailable();

      const start = now();
      const busy = await busyByHost(hosts, start, start + schedule.horizonDays * 24 * 60 * MINUTE);
      const days = availableSlots(start, busy, schedule);
      if (!Object.keys(busy).length) return unavailable();
      return reply(200, {
        ok: true,
        available: days.length > 0,
        timeZone: schedule.timeZone,
        durationMinutes: schedule.durationMinutes,
        days,
      });
    } catch (error) {
      log.error('talk.slots_failed', { error: describeError(error) });
      return reply(500, { ok: false, error: 'server' });
    }
  }

  // POST /api/talk/book — { id, token, start }: claim the time for a free host, create the
  // Meet event on their calendar (Google emails the invitation), and confirm.
  async function BOOK(request) {
    const origin = request.headers.get('origin');
    if (!bookCors.isAllowed(origin)) return bookCors.forbidden();
    const reply = (status, body) => json(status, body, bookCors.headers(origin));
    try {
      if (!repo) return reply(500, { ok: false, error: 'server' });
      const parsed = await readJsonObject(request);
      if (!parsed.ok) return reply(parsed.status, parsed.body);
      const auth = await authorised(parsed.body, reply);
      if (auth.error) return auth.error;
      const { id, request: r } = auth;

      const hosts = bookingConfigured ? await repo.activeHosts() : [];
      if (r.status === 'booked') return reply(200, { ok: true, booking: bookingOf(r, hosts) });
      if (r.status !== 'requested') return reply(409, { ok: false, error: 'in_progress' });
      if (!bookingConfigured || !hosts.length) return reply(503, { ok: false, error: 'booking_unavailable' });

      const startIso = parsed.body.start;
      if (!isBookableStart(startIso, now(), schedule)) {
        return reply(400, { ok: false, error: 'validation', fields: { start: TALK_MESSAGES.start } });
      }
      const start = Date.parse(startIso);
      const end = start + schedule.durationMinutes * MINUTE;
      const margin = schedule.bufferMinutes * MINUTE;

      const busy = await busyByHost(hosts, start - margin, end + margin);
      const counts = await repo.upcomingCountsByHost(new Date(now()));
      const candidates = [...freeHosts(start, busy, schedule)];

      // Try free hosts in round-robin order until one slot claim sticks.
      while (candidates.length) {
        const hostEmail = pickHost(candidates, counts);
        candidates.splice(candidates.indexOf(hostEmail), 1);
        const claim = await repo.claimSlot(id, { hostEmail, startAt: start, endAt: end });
        if (claim === 'not_requested') return reply(409, { ok: false, error: 'in_progress' });
        if (claim === 'slot_taken') continue;

        const host = hosts.find((h) => h.email === hostEmail);
        let created;
        try {
          created = await createMeetEvent({
            fetch,
            accessToken: await accessTokenFor(host),
            calendarId: host.calendarId,
            requestId: id,
            event: {
              summary: `GLEEC Business intro call · ${r.firstName} ${r.lastName}${r.company ? ` (${r.company})` : ''}`,
              description: [
                'Introductory call booked on the GLEEC Business website.',
                '',
                `Name: ${r.firstName} ${r.lastName}`,
                `Email: ${r.email}`,
                r.phone ? `Phone: ${r.phone}` : null,
                r.company ? `Company: ${r.company}` : null,
                r.companyWebsite ? `Website: ${r.companyWebsite}` : null,
                r.message ? `Notes: ${r.message}` : null,
                '',
                EVENT_STATUS_NOTE,
              ]
                .filter((l) => l !== null)
                .join('\n'),
              start: { dateTime: new Date(start).toISOString(), timeZone: schedule.timeZone },
              end: { dateTime: new Date(end).toISOString(), timeZone: schedule.timeZone },
              attendees: [{ email: r.email, displayName: `${r.firstName} ${r.lastName}` }],
              guestsCanInviteOthers: true,
              reminders: { useDefault: true },
            },
          });
        } catch (error) {
          await repo.releaseSlot(id);
          log.error('talk.event_failed', { id, host: hostEmail, error: describeError(error) });
          return reply(502, { ok: false, error: 'calendar_failed' });
        }

        await repo.confirmBooking(id, created);
        log.info('talk.booked', { id, host: hostEmail });
        const booking = {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          meetUrl: created.meetUrl,
          hostName: host.displayName,
        };
        const note = notifyTalk({
          id,
          text: bookedMessage(r, {
            startAt: booking.start,
            endAt: booking.end,
            hostName: host.displayName || hostEmail,
            meetUrl: created.meetUrl,
            timeZone: schedule.timeZone,
          }),
          config,
          repo,
          fetch,
          log,
          timeoutMs: notifyTimeoutMs,
        });
        await afterResponse(note, { waitUntil, log, event: 'talk.wait_until_failed' });
        return reply(200, { ok: true, booking });
      }
      return reply(409, { ok: false, error: 'slot_taken' });
    } catch (error) {
      log.error('talk.book_failed', { error: describeError(error) });
      return reply(500, { ok: false, error: 'server' });
    }
  }

  const redirectUri = (request) => `${config.publicUrl || new URL(request.url).origin}/api/talk/callback`;

  // GET /api/talk/connect — sends a host to Google's consent screen.
  function CONNECT(request) {
    if (!config.google || !config.tokenKey || !config.leadTokenSecret) {
      return html(503, 'Calendar connection is not set up', 'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, TALK_TOKEN_KEY and LEAD_TOKEN_SECRET must be set on the API.');
    }
    const url = authorizationUrl({
      clientId: config.google.clientId,
      redirectUri: redirectUri(request),
      state: signState(now(), config.leadTokenSecret),
    });
    return new Response(null, { status: 302, headers: { location: url, 'cache-control': 'no-store' } });
  }

  // GET /api/talk/callback — stores the host's refresh token (encrypted) if they're allowed.
  async function CALLBACK(request) {
    try {
      if (!config.google || !config.tokenKey || !config.leadTokenSecret || !repo) {
        return html(503, 'Calendar connection is not set up', 'The API is missing its Google or database settings.');
      }
      const params = new URL(request.url).searchParams;
      if (params.get('error')) return html(400, 'Not connected', 'Google did not grant access. You can close this page and try again.');
      if (!verifyState(params.get('state'), now(), config.leadTokenSecret)) {
        return html(400, 'Link expired', 'Please open the connect link again.');
      }
      const tokens = await exchangeCode({
        fetch,
        ...config.google,
        redirectUri: redirectUri(request),
        code: params.get('code') || '',
      });
      const claims = idTokenClaims(tokens.id_token);
      const email = String(claims?.email || '').toLowerCase();
      if (!email || claims.email_verified === false) return html(400, 'Not connected', 'Google did not confirm an email address.');
      if (!config.allowedHosts.has(email)) {
        log.warn('talk.host_not_allowed', { email });
        return html(403, 'Not connected', `${email} is not on the list of people who take calls (TALK_HOSTS).`);
      }
      if (!tokens.refresh_token) return html(400, 'Not connected', 'Google did not return offline access. Please try again.');
      const granted = String(tokens.scope || '');
      if (!granted.includes('calendar.events') || !granted.includes('calendar.freebusy')) {
        return html(400, 'Not connected', 'Please allow both calendar permissions on the Google screen.');
      }
      await repo.upsertHost({
        email,
        displayName: claims.given_name || claims.name || email,
        refreshTokenEnc: seal(tokens.refresh_token, config.tokenKey),
      });
      accessCache.delete(email);
      log.info('talk.host_connected', { email });
      return html(200, 'Calendar connected', `${email} will now receive calls booked on the GLEEC Business website. You can close this page.`);
    } catch (error) {
      log.error('talk.connect_failed', { error: describeError(error) });
      return html(500, 'Not connected', 'Something went wrong. Please try again.');
    }
  }

  return {
    POST,
    GET,
    OPTIONS: cors.preflight,
    BOOK,
    BOOK_OPTIONS: bookCors.preflight,
    CONNECT,
    CALLBACK,
    methodNotAllowed: cors.methodNotAllowed,
    bookMethodNotAllowed: bookCors.methodNotAllowed,
    config,
  };
}
