// POST /api/leads/details — optional second step of the email-first form: adds company
// details to a lead once. Authorised by the token POST /api/leads returned with the id.
import { loadConfig } from './config.js';
import { NOTIFY_TIMEOUT_MS } from './constants.js';
import { afterResponse, createCorsGate, readJsonObject } from './endpoint.js';
import { describeError, json } from './http.js';
import { clientIp, hashIp } from './client.js';
import { createLogger } from './log.js';
import { notifyLeadDetails } from './notify.js';
import { isRateLimited, rateLimitWindowStart } from './rate-limit.js';
import { normalizeLeadId, verifyLeadToken } from './token.js';
import { validateDetails } from './validate.js';

const ALLOWED_METHODS = 'POST, OPTIONS';

/**
 * Same dependencies as createLeadsHandler (lib/leads-handler.js).
 *
 * Order of checks: origin (403) → LEAD_TOKEN_SECRET set (503) → JSON body (415/413/400) →
 * token (403) → fields (400) → database (500) → rate limit (429) → update (404/409/200).
 * The token is checked before the fields, so without a valid token nothing else is revealed.
 */
export function createDetailsHandler({
  env = {},
  repo = null,
  fetch = globalThis.fetch,
  now = Date.now,
  waitUntil = null,
  log = createLogger(),
  notifyTimeoutMs = NOTIFY_TIMEOUT_MS,
} = {}) {
  const config = loadConfig(env);
  for (const warning of config.warnings) log.warn('config.warning', { warning });

  const cors = createCorsGate(config.allowedOrigins, ALLOWED_METHODS);

  async function POST(request) {
    const origin = request.headers.get('origin');
    if (!cors.isAllowed(origin)) return cors.forbidden();
    const reply = (status, body) => json(status, body, cors.headers(origin));

    try {
      // Already reported once per cold start as a config.warning.
      if (!config.leadTokenSecret) return reply(503, { ok: false, error: 'details_disabled' });

      const parsed = await readJsonObject(request);
      if (!parsed.ok) return reply(parsed.status, parsed.body);
      const { body } = parsed;

      const id = normalizeLeadId(body.id);
      if (!id || !verifyLeadToken(id, body.token, config.leadTokenSecret)) {
        log.warn('details.invalid_token');
        return reply(403, { ok: false, error: 'invalid_token' });
      }

      const validation = validateDetails(body);
      if (!validation.ok) return reply(400, { ok: false, error: 'validation', fields: validation.fields });

      if (!repo) {
        log.error('details.db_not_configured');
        return reply(500, { ok: false, error: 'server' });
      }

      // Same limits as lead creation (5 per IP hash per 10 min), counted over details_ip_hash.
      const ipHash = hashIp(clientIp(request.headers), config.ipHashSalt);
      if (ipHash) {
        const recent = await repo.countRecentDetailsByIpHash(ipHash, rateLimitWindowStart(now()));
        if (isRateLimited(recent)) {
          log.warn('details.rate_limited', { recent });
          return reply(429, { ok: false, error: 'rate_limited' });
        }
      }

      const result = await repo.addDetailsOnce(id, validation.details, { ipHash });
      if (result.outcome === 'not_found') {
        log.warn('details.not_found', { id });
        return reply(404, { ok: false, error: 'not_found' });
      }
      if (result.outcome === 'already_submitted') {
        log.info('details.already_submitted', { id });
        return reply(409, { ok: false, error: 'already_submitted' });
      }
      log.info('details.added', { id });

      const notification = notifyLeadDetails({
        record: result.record,
        config,
        repo,
        fetch,
        now,
        log,
        timeoutMs: notifyTimeoutMs,
      });
      await afterResponse(notification, { waitUntil, log, event: 'details.wait_until_failed' });

      return reply(200, { ok: true });
    } catch (error) {
      log.error('details.failed', { error: describeError(error) });
      return reply(500, { ok: false, error: 'server' });
    }
  }

  return { POST, OPTIONS: cors.preflight, methodNotAllowed: cors.methodNotAllowed, config };
}
