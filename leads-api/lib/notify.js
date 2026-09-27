// After a lead is stored: Telegram + CRM in parallel, then record the outcome.
// Never throws — a failed notification must not fail the request.
import { NOTIFY_TIMEOUT_MS } from './constants.js';
import { buildCrmPayload, sendCrmWebhook } from './crm.js';
import { describeError } from './http.js';
import { formatTelegramMessage, sendTelegramMessage } from './telegram.js';

const STATUS_MAX = 300;

function toOutcome(settled, now) {
  if (settled.status === 'rejected') {
    return { status: `failed: ${describeError(settled.reason)}`.slice(0, STATUS_MAX), sentAt: null };
  }
  const result = settled.value;
  if (result === null) return { status: 'not_configured', sentAt: null };
  if (result.ok) return { status: 'sent', sentAt: new Date(now()) };
  return { status: `failed: ${result.error}`.slice(0, STATUS_MAX), sentAt: null };
}

export async function notifyNewLead({ record, config, repo, fetch, now, log, timeoutMs = NOTIFY_TIMEOUT_MS }) {
  try {
    const [telegramSettled, crmSettled] = await Promise.allSettled([
      (async () => {
        if (!config.telegram) return null;
        const text = formatTelegramMessage(record);
        return sendTelegramMessage({ ...config.telegram, text, fetch, timeoutMs });
      })(),
      (async () => {
        if (!config.crm) return null;
        return sendCrmWebhook({
          url: config.crm.url,
          secret: config.crm.secret,
          payload: buildCrmPayload(record),
          fetch,
          timeoutMs,
        });
      })(),
    ]);

    const telegram = toOutcome(telegramSettled, now);
    const crm = toOutcome(crmSettled, now);
    const level = telegram.status.startsWith('failed') || crm.status.startsWith('failed') ? 'error' : 'info';
    log[level]('lead.notified', { id: record.id, telegram: telegram.status, crm: crm.status });

    try {
      await repo.recordNotificationResults(record.id, {
        telegramStatus: telegram.status,
        telegramSentAt: telegram.sentAt,
        crmStatus: crm.status,
        crmSentAt: crm.sentAt,
      });
    } catch (error) {
      log.error('lead.status_update_failed', { id: record.id, error: describeError(error) });
    }
    return { telegram, crm };
  } catch (error) {
    log.error('lead.notify_failed', { id: record.id, error: describeError(error) });
    return null;
  }
}
