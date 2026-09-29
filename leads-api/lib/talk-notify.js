// Telegram for "Talk to a human": one message per request. It is posted when someone asks
// for a call and edited into "Call Booked" when they pick a time. Values are escaped;
// sending never throws (the outcome is recorded).
import { NOTIFY_TIMEOUT_MS } from './constants.js';
import { describeError } from './http.js';
import { editTelegramMessage, sendTelegramMessage } from './telegram.js';
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

/** Title, who is asking (unlabelled bullets), their notes as a quote, then a status footer. */
function callMessage(title, r, footer) {
  return [
    `🇬🇧 <b>${title}</b>`,
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
    ...footer,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export function requestMessage(r, { booking = true } = {}) {
  return callMessage('UK Business Banking Call Request', r, [
    booking ? '<i>Choosing a time…</i>' : '<i>Online booking is off: email them to arrange a time.</i>',
  ]);
}

/** The request message once a time is booked: same details, the footer becomes the booking. */
export function bookedMessage(r, { startAt, endAt, hostName, meetUrl, timeZone }) {
  return callMessage('UK Business Banking Call Booked', r, [
    `<b>${escapeHtml(formatCallTime(startAt, endAt, timeZone))}</b>${hostName ? ` with ${clip(hostName)}` : ''}`,
    meetUrl ? clip(meetUrl) : null,
  ]);
}

/**
 * Posts `text`, or with `edit` ({ chatId, messageId } of the request ping) replaces that message;
 * if the edit is refused the text is posted as a new message. Records 'sent' | 'edited' |
 * 'not_configured' | 'failed: …', plus the ping's ids the first time.
 */
export async function notifyTalk({ id, text, edit = null, config, repo, fetch, log, timeoutMs = NOTIFY_TIMEOUT_MS }) {
  let status = 'not_configured';
  let ping = null;
  if (config.telegram) {
    const telegram = { ...config.telegram, text, fetch, timeoutMs };
    let result = null;
    if (edit?.chatId && edit?.messageId) {
      const edited = await editTelegramMessage({ ...telegram, chatId: edit.chatId, messageId: edit.messageId });
      if (edited.ok) result = { ok: true, edited: true };
      else log.warn('talk.telegram_edit_failed', { id, error: edited.error });
    }
    result ??= await sendTelegramMessage(telegram);
    status = result.ok ? (result.edited ? 'edited' : 'sent') : `failed: ${result.error}`;
    if (!result.ok) log.warn('talk.telegram_failed', { id, error: result.error });
    if (result.migratedTo) log.warn('telegram.chat_moved', { id, setTelegramChatIdTo: result.migratedTo });
    if (!edit && result.ok && result.messageId) ping = { chatId: result.chatId, messageId: result.messageId };
  }
  try {
    await repo.recordTelegram(id, status, ping);
  } catch (error) {
    log.warn('talk.record_telegram_failed', { id, error: describeError(error) });
  }
}
