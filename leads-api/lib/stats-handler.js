// GET /api/stats — the public waitlist size, { ok: true, companies: N }, and nothing else.
import { loadConfig } from './config.js';
import { STATS_CACHE_CONTROL } from './constants.js';
import { createCorsGate } from './endpoint.js';
import { describeError, json } from './http.js';
import { createLogger } from './log.js';

const ALLOWED_METHODS = 'GET, HEAD, OPTIONS';

/**
 * @param {object} deps
 * @param {Record<string, string|undefined>} deps.env  environment (ALLOWED_ORIGINS)
 * @param {object|null} deps.repo                      lead repository (see lib/db.js), null when DATABASE_URL is missing
 * @param {object} [deps.log]                          { info, warn, error }(event, data)
 */
export function createStatsHandler({ env = {}, repo = null, log = createLogger() } = {}) {
  const config = loadConfig(env);
  const cors = createCorsGate(config.allowedOrigins, ALLOWED_METHODS);

  // The count is public and not personal, so every caller gets it. Only an allowed origin is
  // echoed in Access-Control-Allow-Origin (always with Vary: Origin, which Vercel's CDN keys
  // its cache on), so other sites' scripts cannot read it. Errors are never cached.
  async function GET(request) {
    const headers = cors.headers(request.headers.get('origin'));
    if (!repo) {
      log.error('stats.db_not_configured');
      return json(503, { ok: false, error: 'unavailable' }, headers);
    }
    try {
      const companies = await repo.countCompanies();
      return json(200, { ok: true, companies }, { ...headers, 'cache-control': STATS_CACHE_CONTROL });
    } catch (error) {
      log.error('stats.failed', { error: describeError(error) });
      return json(500, { ok: false, error: 'server' }, headers);
    }
  }

  async function HEAD(request) {
    const response = await GET(request);
    return new Response(null, { status: response.status, headers: response.headers });
  }

  return { GET, HEAD, OPTIONS: cors.preflight, methodNotAllowed: cors.methodNotAllowed, config };
}
