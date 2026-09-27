// Client identity helpers: IP (hashed only) and user agent.
import { createHmac } from 'node:crypto';
import { USER_AGENT_MAX } from './constants.js';

/** First x-forwarded-for entry, else x-real-ip, else null. */
export function clientIp(headers) {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first.slice(0, 100).toLowerCase();
  }
  const realIp = headers.get('x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim().slice(0, 100).toLowerCase();
  return null;
}

/**
 * Salted SHA-256 of the IP, as HMAC-SHA256 keyed with the salt (hex).
 * Returns null when there is no IP or no salt: a raw or unsalted IP is never stored.
 */
export function hashIp(ip, salt) {
  if (!ip || !salt) return null;
  return createHmac('sha256', salt).update(ip).digest('hex');
}

export function userAgent(headers) {
  const value = headers.get('user-agent');
  if (!value) return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, USER_AGENT_MAX) : null;
}
