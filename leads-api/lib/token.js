// Per-lead token: proves the caller is the browser that just created the lead, so it may
// add details to it once (POST /api/leads/details). token = base64url(HMAC-SHA256 of the
// lead id, key LEAD_TOKEN_SECRET) — 43 characters, no padding.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/** The id in canonical (lower-case) form, or null when it is not a UUID string. */
export function normalizeLeadId(value) {
  return typeof value === 'string' && UUID_RE.test(value) ? value.toLowerCase() : null;
}

export function signLeadToken(id, secret) {
  return createHmac('sha256', secret).update(id, 'utf8').digest('base64url');
}

/** A token for the id, or null when LEAD_TOKEN_SECRET is not set. */
export function leadTokenFor(id, secret) {
  return secret ? signLeadToken(id, secret) : null;
}

/** Same shape as a real token; given to bots so their response looks like a real one. */
export function randomLeadToken() {
  return randomBytes(32).toString('base64url');
}

/** Timing-safe check of a token against a (normalised) lead id. Never throws. */
export function verifyLeadToken(id, token, secret) {
  if (!secret || typeof id !== 'string' || typeof token !== 'string' || !TOKEN_RE.test(token)) return false;
  const expected = Buffer.from(signLeadToken(id, secret), 'utf8');
  const given = Buffer.from(token, 'utf8');
  return expected.length === given.length && timingSafeEqual(expected, given);
}
