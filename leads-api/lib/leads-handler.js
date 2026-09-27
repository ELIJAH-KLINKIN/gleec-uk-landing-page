// POST /api/leads — the whole request pipeline, with every dependency injected.
import { randomUUID as cryptoRandomUUID } from 'node:crypto';
import { loadConfig } from './config.js';
import { DUPLICATE_WINDOW_MS, MAX_BODY_BYTES, NOTIFY_TIMEOUT_MS } from './constants.js';
import { corsHeaders, isOriginAllowed, preflightHeaders } from './cors.js';
import { BodyTooLargeError, describeError, isJsonContentType, json, readBodyText } from './http.js';
import { clientIp, hashIp, userAgent } from './client.js';
import { createLogger } from './log.js';
import { notifyNewLead } from './notify.js';
import { isRateLimited, rateLimitWindowStart } from './rate-limit.js';
import { MESSAGES, detectBot, isPlainObject, validateLead } from './validate.js';

const ALLOWED_METHODS = 'POST, OPTIONS';

/**
 * @param {object} deps
 * @param {Record<string, string|undefined>} deps.env      environment (ALLOWED_ORIGINS, IP_HASH_SALT, TELEGRAM_*, CRM_*)
 * @param {object|null} deps.repo                          lead repository (see lib/db.js), null when DATABASE_URL is missing
 * @param {typeof fetch} deps.fetch                        used for Telegram and the CRM webhook
 * @param {() => number} [deps.now]                        clock, ms epoch
 * @param {(p: Promise<unknown>) => void} [deps.waitUntil] keeps the function alive for post-response work;
 *                                                         when absent, notifications are awaited before responding
 * @param {object} [deps.log]                              { info, warn, error }(event, data)
 */
export function createLeadsHandler({
  env = {},
  repo = null,
  fetch = globalThis.fetch,
  now = Date.now,
  waitUntil = null,
  log = createLogger(),
  randomUUID = cryptoRandomUUID,
  notifyTimeoutMs = NOTIFY_TIMEOUT_MS,
} = {}) {
  const config = loadConfig(env);
  for (const warning of config.warnings) log.warn('config.warning', { warning });

  const forbidden = () => json(403, { ok: false, error: 'origin_not_allowed' }, { vary: 'Origin' });

  function OPTIONS(request) {
    const origin = request.headers.get('origin');
    if (!isOriginAllowed(origin, config.allowedOrigins)) return forbidden();
    return new Response(null, { status: 204, headers: preflightHeaders(origin) });
  }

  function methodNotAllowed(request) {
    const headers = { ...corsHeaders(request.headers.get('origin'), config.allowedOrigins), allow: ALLOWED_METHODS };
    if (request.method === 'HEAD') {
      return new Response(null, { status: 405, headers: { ...headers, 'cache-control': 'no-store' } });
    }
    return json(405, { ok: false, error: 'method_not_allowed' }, headers);
  }

  async function POST(request) {
    const origin = request.headers.get('origin');
    if (!isOriginAllowed(origin, config.allowedOrigins)) return forbidden();
    const reply = (status, body) => json(status, body, corsHeaders(origin, config.allowedOrigins));
    const invalid = (fields) => reply(400, { ok: false, error: 'validation', fields });

    try {
      if (!isJsonContentType(request.headers.get('content-type'))) {
        return reply(415, { ok: false, error: 'unsupported_media_type' });
      }

      let text;
      try {
        text = await readBodyText(request, MAX_BODY_BYTES);
      } catch (error) {
        if (error instanceof BodyTooLargeError) return reply(413, { ok: false, error: 'payload_too_large' });
        throw error;
      }

      let body;
      try {
        body = JSON.parse(text);
      } catch {
        return invalid({ body: MESSAGES.body });
      }
      if (!isPlainObject(body)) return invalid({ body: MESSAGES.body });

      const receivedAt = now();

      // Bot traps answer exactly like a success, so bots learn nothing.
      const botReason = detectBot(body, receivedAt);
      if (botReason) {
        log.info('lead.dropped', { reason: botReason });
        return reply(201, { ok: true, id: randomUUID() });
      }

      const validation = validateLead(body);
      if (!validation.ok) return invalid(validation.fields);

      if (!repo) {
        log.error('lead.db_not_configured');
        return reply(500, { ok: false, error: 'server' });
      }

      const ipHash = hashIp(clientIp(request.headers), config.ipHashSalt);
      if (ipHash) {
        const recent = await repo.countRecentByIpHash(ipHash, rateLimitWindowStart(receivedAt));
        if (isRateLimited(recent)) {
          log.warn('lead.rate_limited', { recent });
          return reply(429, { ok: false, error: 'rate_limited' });
        }
      }

      const lead = {
        ...validation.lead,
        consentAt: new Date(receivedAt).toISOString(),
        ipHash,
        userAgent: userAgent(request.headers),
      };
      delete lead.startedAt; // only needed for the time trap
      const saved = await repo.insertLeadUnlessDuplicate(lead, {
        duplicateSince: new Date(receivedAt - DUPLICATE_WINDOW_MS),
      });

      if (saved.duplicate) {
        log.info('lead.duplicate', { id: saved.id });
        return reply(201, { ok: true, id: saved.id });
      }
      log.info('lead.created', { id: saved.id });

      const notification = notifyNewLead({
        record: { ...lead, id: saved.id, createdAt: saved.createdAt },
        config,
        repo,
        fetch,
        now,
        log,
        timeoutMs: notifyTimeoutMs,
      });
      let deferred = false;
      if (waitUntil) {
        try {
          waitUntil(notification);
          deferred = true;
        } catch (error) {
          log.warn('lead.wait_until_failed', { error: describeError(error) });
        }
      }
      if (!deferred) await notification;

      return reply(201, { ok: true, id: saved.id });
    } catch (error) {
      log.error('lead.failed', { error: describeError(error) });
      return reply(500, { ok: false, error: 'server' });
    }
  }

  return { POST, OPTIONS, methodNotAllowed, config };
}
