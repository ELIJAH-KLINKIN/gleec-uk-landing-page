// Telegram notification: message formatting (HTML parse mode) and sending.
import { BUSINESS_TYPE_LABELS, MONTHLY_VOLUME_LABELS, NOTIFY_TIMEOUT_MS } from './constants.js';
import { describeError, fetchWithTimeout } from './http.js';
import { escapeHtml, truncate } from './text.js';

export const TELEGRAM_MAX_LENGTH = 4096;
const ELLIPSIS = '…';

// A message is a list of lines ("parts"). `value` is untrusted plain text that is
// escaped at render time; `render` wraps the escaped value in trusted markup.
// Only values are ever shortened, so truncation can never break a tag or an entity.
function part(value, render, { fixed = false } = {}) {
  return { value: value == null ? '' : String(value), render, fixed };
}
const staticLine = (html) => part('', () => html, { fixed: true });
const bullet = (value) => `• ${value}`;

const TITLES = {
  created: '🇬🇧 <b>UK Business Banking Lead</b>',
  updated: '🇬🇧 <b>UK Business Banking Lead · Details</b>',
};

/**
 * Title, one unlabelled bullet per known value, the visitor's message as a quote, the id:
 *
 *   🇬🇧 UK Business Banking Lead
 *
 *   • ada@example.co.uk
 *   • https://gleecpay.co.uk/#waitlist
 *
 *   Lead ID: 3f1c…
 *
 * @param {object} lead  the stored lead (camelCase), with id
 * @param {{ kind?: 'created' | 'updated' }} [options]  'updated' = second step of the email-first
 *        form: different title, no source lines (they were in the first message).
 */
export function buildTelegramParts(lead, { kind = 'created' } = {}) {
  // Name, company and country are optional since the email-first form: absent → no line.
  const parts = [staticLine(TITLES[kind] ?? TITLES.created), staticLine('')];
  const name = lead.fullName || [lead.firstName, lead.lastName].filter(Boolean).join(' ');
  if (name) parts.push(part(name, bullet));
  if (lead.company) parts.push(part(lead.company, bullet));
  if (lead.companyWebsite) parts.push(part(lead.companyWebsite, bullet));
  if (lead.country) parts.push(part(lead.country, bullet));
  parts.push(part(lead.email, bullet, { fixed: true }));
  if (lead.phone) parts.push(part(lead.phone, bullet));
  if (lead.businessType) parts.push(part(BUSINESS_TYPE_LABELS[lead.businessType] ?? lead.businessType, bullet));
  if (lead.currencies && lead.currencies.length > 0) parts.push(part(lead.currencies.join(', '), bullet));
  if (lead.monthlyVolume) parts.push(part(MONTHLY_VOLUME_LABELS[lead.monthlyVolume] ?? lead.monthlyVolume, bullet));

  const source = (kind === 'created' && lead.source) || {};
  if (source.page) parts.push(part(source.page, bullet));
  if (source.referrer) parts.push(part(source.referrer, (referrer) => `• from ${referrer}`));
  const utm = ['source', 'medium', 'campaign', 'term', 'content']
    .filter((key) => source[`utm_${key}`])
    .map((key) => `utm_${key}=${source[`utm_${key}`]}`);
  if (utm.length > 0) parts.push(part(utm.join(' · '), bullet));

  if (lead.message) {
    parts.push(staticLine(''));
    parts.push(part(lead.message, (message) => `<blockquote>${message}</blockquote>`));
  }

  parts.push(staticLine(''));
  parts.push(part(lead.id, (id) => `Lead ID: ${id}`, { fixed: true }));
  return parts;
}

function render(parts) {
  return parts.map((p) => p.render(escapeHtml(p.value))).join('\n');
}

/**
 * Builds the HTML message and keeps it within Telegram's limit. The limit is
 * checked against the raw HTML (always >= the parsed length Telegram counts),
 * shortening the longest free-text value first.
 */
export function formatTelegramMessage(lead, limit = TELEGRAM_MAX_LENGTH, options = {}) {
  const parts = buildTelegramParts(lead, options);
  let html = render(parts);
  while (html.length > limit) {
    const candidates = parts.filter((p) => !p.fixed && p.value.length > ELLIPSIS.length);
    if (candidates.length === 0) break; // unreachable with validated input
    const longest = candidates.reduce((a, b) => (b.value.length > a.value.length ? b : a));
    // Removing N plain characters removes at least N characters of HTML.
    const overflow = html.length - limit;
    longest.value = truncate(longest.value, Math.max(0, longest.value.length - overflow - ELLIPSIS.length)) + ELLIPSIS;
    html = render(parts);
  }
  return html;
}

const BOT_TOKEN_PATTERN = /\d{5,}:[A-Za-z0-9_-]{20,}/g;

function redact(text, token) {
  let out = String(text);
  if (token) out = out.split(token).join('[redacted]');
  return out.replace(BOT_TOKEN_PATTERN, '[redacted]');
}

/**
 * Sends one message. Never throws. If the group was upgraded to a supergroup (its chat id
 * changes), Telegram names the new id and the message is resent there once.
 * @returns {Promise<{ ok: true, migratedTo?: string } | { ok: false, error: string }>}
 */
export async function sendTelegramMessage({ token, chatId, threadId = null, text, fetch, timeoutMs = NOTIFY_TIMEOUT_MS, retried = false }) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };
  if (threadId !== null && threadId !== undefined) payload.message_thread_id = threadId;

  try {
    const response = await fetchWithTimeout(
      fetch,
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      },
      timeoutMs,
    );
    let data = null;
    try {
      data = JSON.parse(response.text);
    } catch {
      // non-JSON error page
    }
    if (response.ok && data && data.ok === true) return { ok: true };
    const migrateTo = data && data.parameters && data.parameters.migrate_to_chat_id;
    if (migrateTo && !retried) {
      const result = await sendTelegramMessage({ token, chatId: String(migrateTo), threadId, text, fetch, timeoutMs, retried: true });
      return result.ok ? { ok: true, migratedTo: String(migrateTo) } : result;
    }
    const detail = data && data.description ? `${response.status} ${data.description}` : `HTTP ${response.status}`;
    return { ok: false, error: redact(detail, token) };
  } catch (error) {
    return { ok: false, error: redact(describeError(error), token) };
  }
}
