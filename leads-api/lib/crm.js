// Outbound CRM webhook, signed with HMAC-SHA256 over the exact raw body.
import { createHmac } from 'node:crypto';
import { NOTIFY_TIMEOUT_MS } from './constants.js';
import { describeError, fetchWithTimeout } from './http.js';

export const CRM_EVENT = 'lead.created';

/** Value for the X-Gleec-Signature header: "sha256=<hex HMAC of rawBody>". */
export function signBody(rawBody, secret) {
  return `sha256=${createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')}`;
}

/** The stored lead as the CRM sees it (no IP hash or user agent). */
export function buildCrmPayload(record) {
  return {
    id: record.id,
    createdAt: record.createdAt,
    status: 'new',
    fullName: record.fullName,
    email: record.email,
    company: record.company,
    country: record.country,
    phone: record.phone ?? null,
    businessType: record.businessType ?? null,
    currencies: record.currencies ?? [],
    monthlyVolume: record.monthlyVolume ?? null,
    message: record.message ?? null,
    consent: record.consent === true,
    consentAt: record.consentAt ?? null,
    source: record.source ?? {},
  };
}

/**
 * POSTs the payload. Never throws.
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function sendCrmWebhook({ url, secret, payload, fetch, timeoutMs = NOTIFY_TIMEOUT_MS }) {
  if (!secret) return { ok: false, error: 'CRM_WEBHOOK_SECRET not set' };
  const body = JSON.stringify(payload);
  try {
    const response = await fetchWithTimeout(
      fetch,
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'gleec-leads-api/1.0',
          'X-Gleec-Event': CRM_EVENT,
          'X-Gleec-Signature': signBody(body, secret),
        },
        body,
      },
      timeoutMs,
    );
    if (response.ok) return { ok: true };
    return { ok: false, error: `HTTP ${response.status}` };
  } catch (error) {
    // The URL may carry a token in its query string; keep it out of logs.
    return { ok: false, error: describeError(error).split(url).join('[crm-url]') };
  }
}
