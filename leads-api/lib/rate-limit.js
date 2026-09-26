import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from './constants.js';

/** Start of the rate-limit window ending at `now` (ms epoch). */
export function rateLimitWindowStart(now, windowMs = RATE_LIMIT_WINDOW_MS) {
  return new Date(now - windowMs);
}

/** True when this IP already created `recentCount` leads and may not create another. */
export function isRateLimited(recentCount, max = RATE_LIMIT_MAX) {
  return recentCount >= max;
}
