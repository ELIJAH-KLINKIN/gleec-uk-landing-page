// Telegram messages for "Talk to a human": one when someone asks for a call, one when
// they book a time. Values are escaped; sending never throws (the outcome is recorded).
import { NOTIFY_TIMEOUT_MS } from './constants.js';
import { describeError } from './http.js';
import { sendTelegramMessage } from './telegram.js';
import { escapeHtml, truncate } from './text.js';

/** "Tue 29 Sep, 10:00–10:20 (London)" */
export function formatCallTime(startIso, endIso, timeZone = 'Europe/London') {
  const day = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', day: 'numeric', month: 'short' }).format(
    new Date(startIso),
  );
  const time = (iso) =>
    new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
      new Date(iso),
    );
  const place = timeZone.split('/').pop().replace(/_/g, ' ');
  return `${day}, ${time(startIso)}–${time(endIso)} (${place})`;
}

const clip = (value) => escapeHtml(truncate(String(value), 400));
const bullet = (value) => (value ? `• ${clip(value)}` : null);

/** Same shape as the lead ping: title, unlabelled bullets, the visitor's notes as a quote, then status. */
export function requestMessage(r, { booking = true } = {}) {
  return [
    '🇬🇧 <b>UK Business Banking Call Request</b>',
    '',
    bullet(`${r.firstName} ${r.lastName}`),
    bullet(r.company),
    bullet(r.companyWebsite),
    bullet(r.email),
    bullet(r.phone),
    bullet(r.source?.page),
    r.source?.utm_source ? bullet(`utm_source=${r.source.utm_source}`) : null,
    r.message ? `\n<blockquote>${clip(r.message)}</blockquote>` : null,
    '',
    booking ? '<i>Choosing a time…</i>' : '<i>Online booking is off: email them to arrange a time.</i>',
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export function bookedMessage(r, { startAt, endAt, hostName, meetUrl, timeZone }) {
  return [
    '🇬🇧 <b>UK Business Banking Call Booked</b>',
    '',
    `<b>${escapeHtml(formatCallTime(startAt, endAt, timeZone))}</b>`,
    hostName ? `• with ${clip(hostName)}` : null,
    bullet(`${r.firstName} ${r.lastName}${r.company ? `, ${r.company}` : ''}`),
    bullet(r.email),
    bullet(meetUrl),
  ]
    .filter((l) => l !== null)
    .join('\n');
}

/** Sends `text` if Telegram is configured and records 'sent' | 'not_configured' | 'failed: …'. */
export async function notifyTalk({ id, text, config, repo, fetch, log, timeoutMs = NOTIFY_TIMEOUT_MS }) {
  let status = 'not_configured';
  if (config.telegram) {
    const result = await sendTelegramMessage({ ...config.telegram, text, fetch, timeoutMs });
    status = result.ok ? 'sent' : `failed: ${result.error}`;
    if (!result.ok) log.warn('talk.telegram_failed', { id, error: result.error });
    if (result.migratedTo) log.warn('telegram.chat_moved', { id, setTelegramChatIdTo: result.migratedTo });
  }
  try {
    await repo.recordTelegram(id, status);
  } catch (error) {
    log.warn('talk.record_telegram_failed', { id, error: describeError(error) });
  }
}
