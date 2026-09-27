// POST /api/leads — the whole request pipeline, with every dependency injected.
import { randomUUID as cryptoRandomUUID } from 'node:crypto';
import { loadConfig } from './config.js';
import { DUPLICATE_WINDOW_MS, NOTIFY_TIMEOUT_MS } from './constants.js';
import { afterResponse, createCorsGate, readJsonObject } from './endpoint.js';
import { describeError, json } from './http.js';
import { clientIp, hashIp, userAgent } from './client.js';
import { createLogger } from './log.js';
import { notifyNewLead } from './notify.js';
import { isRateLimited, rateLimitWindowStart } from './rate-limit.js';
import { leadTokenFor, randomLeadToken } from './token.js';
import { detectBot, validateLead } from './validate.js';

const ALLOWED_METHODS = 'POST, OPTIONS';

/**
 * @param {object} deps
 * @param {Record<string, string|undefined>} deps.env      environment (ALLOWED_ORIGINS, IP_HASH_SALT, LEAD_TOKEN_SECRET, TELEGRAM_*, CRM_*)
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

  const cors = createCorsGate(config.allowedOrigins, ALLOWED_METHODS);
  // token is null when LEAD_TOKEN_SECRET is unset (details step off); bots get the same shape.
  const created = (id) => ({ ok: true, id, token: leadTokenFor(id, config.leadTokenSecret) });
  const fakeCreated = () => ({ ok: true, id: randomUUID(), token: config.leadTokenSecret ? randomLeadToken() : null });

  async function POST(request) {
    const origin = request.headers.get('origin');
    if (!cors.isAllowed(origin)) return cors.forbidden();
    const reply = (status, body) => json(status, body, cors.headers(origin));
    const invalid = (fields) => reply(400, { ok: false, error: 'validation', fields });

    try {
      const parsed = await readJsonObject(request);
      if (!parsed.ok) return reply(parsed.status, parsed.body);
      const { body } = parsed;

      const receivedAt = now();

      // Bot traps answer exactly like a success, so bots learn nothing.
      const botReason = detectBot(body, receivedAt);
      if (botReason) {
        log.info('lead.dropped', { reason: botReason });
        return reply(201, fakeCreated());
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
        return reply(201, created(saved.id));
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
      await afterResponse(notification, { waitUntil, log, event: 'lead.wait_until_failed' });

      return reply(201, created(saved.id));
    } catch (error) {
      log.error('lead.failed', { error: describeError(error) });
      return reply(500, { ok: false, error: 'server' });
    }
  }

  return { POST, OPTIONS: cors.preflight, methodNotAllowed: cors.methodNotAllowed, config };
}
