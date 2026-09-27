import { configStatus, loadConfig } from './config.js';
import { json } from './http.js';

/** GET /api/health — which integrations are configured, as booleans only. */
export function healthResponse(env = {}) {
  return json(200, { ok: true, ...configStatus(loadConfig(env)) });
}
