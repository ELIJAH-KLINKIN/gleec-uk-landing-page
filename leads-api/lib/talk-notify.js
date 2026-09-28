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

function line(label, value) {
  return value ? `<b>${label}:</b> ${escapeHtml(truncate(String(value), 400))}` : null;
}

export function requestMessage(r) {
  return [
    '🙋 <b>Talk to a human — new request</b>',
    line('Name', `${r.firstName} ${r.lastName}`),
    line('Company', r.company),
    line('Website', r.companyWebsite),
    `<b>Email:</b> ${escapeHtml(r.email)}`,
    line('Phone', r.phone),
    line('Notes', r.message),
    line('Page', r.source?.page),
    line('Source', r.source?.utm_source),
    '<i>Choosing a time…</i>',
  ]
    .filter(Boolean)
    .join('\n');
}

export function bookedMessage(r, { startAt, endAt, hostName, meetUrl, timeZone }) {
  return [
    '📅 <b>Call booked</b>',
    `<b>${escapeHtml(formatCallTime(startAt, endAt, timeZone))}</b>`,
    line('With', hostName),
    line('Guest', `${r.firstName} ${r.lastName}${r.company ? `, ${r.company}` : ''}`),
    `<b>Email:</b> ${escapeHtml(r.email)}`,
    meetUrl ? `<b>Meet:</b> ${escapeHtml(meetUrl)}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Sends `text` if Telegram is configured and records 'sent' | 'not_configured' | 'failed: …'. */
export async function notifyTalk({ id, text, config, repo, fetch, log, timeoutMs = NOTIFY_TIMEOUT_MS }) {
  let status = 'not_configured';
  if (config.telegram) {
    const result = await sendTelegramMessage({ ...config.telegram, text, fetch, timeoutMs });
    status = result.ok ? 'sent' : `failed: ${result.error}`;
    if (!result.ok) log.warn('talk.telegram_failed', { id, error: result.error });
  }
  try {
    await repo.recordTelegram(id, status);
  } catch (error) {
    log.warn('talk.record_telegram_failed', { id, error: describeError(error) });
  }
}
