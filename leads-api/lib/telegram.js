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
const labelled = (label) => (value) => `<b>${label}:</b> ${value}`;

export function buildTelegramParts(lead) {
  const parts = [
    staticLine('🟣 <b>New GLEEC Business waitlist lead</b>'),
    staticLine(''),
    part(lead.fullName, labelled('Name')),
    part(lead.company, labelled('Company')),
    part(lead.country, labelled('Country')),
    part(lead.email, (email) => `<b>Email:</b> <a href="mailto:${email}">${email}</a>`, { fixed: true }),
  ];
  if (lead.phone) parts.push(part(lead.phone, labelled('Phone')));
  if (lead.businessType) {
    parts.push(part(BUSINESS_TYPE_LABELS[lead.businessType] ?? lead.businessType, labelled('Business type')));
  }
  if (lead.currencies && lead.currencies.length > 0) {
    parts.push(part(lead.currencies.join(', '), labelled('Currencies')));
  }
  if (lead.monthlyVolume) {
    parts.push(part(MONTHLY_VOLUME_LABELS[lead.monthlyVolume] ?? lead.monthlyVolume, labelled('Monthly volume')));
  }
  if (lead.message) {
    parts.push(staticLine(''));
    parts.push(part(lead.message, (message) => `<b>Message:</b>\n<blockquote>${message}</blockquote>`));
  }

  const source = lead.source || {};
  const utm = ['source', 'medium', 'campaign', 'term', 'content']
    .filter((key) => source[`utm_${key}`])
    .map((key) => `${key}=${source[`utm_${key}`]}`);
  if (source.page || source.referrer || utm.length > 0) {
    parts.push(staticLine(''));
    if (source.page) parts.push(part(source.page, labelled('Source page')));
    if (source.referrer) parts.push(part(source.referrer, labelled('Referrer')));
    if (utm.length > 0) parts.push(part(utm.join(' · '), labelled('UTM')));
  }

  parts.push(staticLine(''));
  parts.push(part(lead.id, (id) => `<b>Lead ID:</b> <code>${id}</code>`, { fixed: true }));
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
export function formatTelegramMessage(lead, limit = TELEGRAM_MAX_LENGTH) {
  const parts = buildTelegramParts(lead);
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
 * Sends one message. Never throws.
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function sendTelegramMessage({ token, chatId, threadId = null, text, fetch, timeoutMs = NOTIFY_TIMEOUT_MS }) {
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
    const detail = data && data.description ? `${response.status} ${data.description}` : `HTTP ${response.status}`;
    return { ok: false, error: redact(detail, token) };
  } catch (error) {
    return { ok: false, error: redact(describeError(error), token) };
  }
}
