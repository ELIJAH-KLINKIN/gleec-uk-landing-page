// After a lead is stored (or its details are added): Telegram + CRM in parallel, then
// record the outcome. Never throws — a failed notification must not fail the request.
import { NOTIFY_TIMEOUT_MS } from './constants.js';
import { CRM_EVENT, CRM_UPDATED_EVENT, buildCrmPayload, buildCrmUpdatePayload, sendCrmWebhook } from './crm.js';
import { describeError } from './http.js';
import { formatTelegramMessage, sendTelegramMessage, TELEGRAM_MAX_LENGTH } from './telegram.js';

const STATUS_MAX = 300;

// kind -> what is sent and how it is logged. Log events carry ids and statuses only.
const KINDS = {
  created: { crmEvent: CRM_EVENT, crmPayload: buildCrmPayload, logPrefix: 'lead' },
  updated: { crmEvent: CRM_UPDATED_EVENT, crmPayload: buildCrmUpdatePayload, logPrefix: 'details' },
};

function toOutcome(settled, now) {
  if (settled.status === 'rejected') {
    return { status: `failed: ${describeError(settled.reason)}`.slice(0, STATUS_MAX), sentAt: null };
  }
  const result = settled.value;
  if (result === null) return { status: 'not_configured', sentAt: null };
  if (result.ok) return { status: 'sent', sentAt: new Date(now()) };
  return { status: `failed: ${result.error}`.slice(0, STATUS_MAX), sentAt: null };
}

/**
 * @param {object} args
 * @param {'created'|'updated'} [args.kind]  'updated' = details added (Telegram "📝 Lead details added",
 *                                           CRM X-Gleec-Event: lead.updated)
 * The outcome overwrites telegram_status/crm_status (+ *_sent_at): the columns hold the latest attempt.
 */
export async function notifyLead({ kind = 'created', record, config, repo, fetch, now, log, timeoutMs = NOTIFY_TIMEOUT_MS }) {
  const { crmEvent, crmPayload, logPrefix } = KINDS[kind];
  try {
    const [telegramSettled, crmSettled] = await Promise.allSettled([
      (async () => {
        if (!config.telegram) return null;
        const text = formatTelegramMessage(record, TELEGRAM_MAX_LENGTH, { kind });
        return sendTelegramMessage({ ...config.telegram, text, fetch, timeoutMs });
      })(),
      (async () => {
        if (!config.crm) return null;
        return sendCrmWebhook({
          url: config.crm.url,
          secret: config.crm.secret,
          payload: crmPayload(record),
          event: crmEvent,
          fetch,
          timeoutMs,
        });
      })(),
    ]);

    const telegram = toOutcome(telegramSettled, now);
    const crm = toOutcome(crmSettled, now);
    const level = telegram.status.startsWith('failed') || crm.status.startsWith('failed') ? 'error' : 'info';
    log[level](`${logPrefix}.notified`, { id: record.id, telegram: telegram.status, crm: crm.status });

    try {
      await repo.recordNotificationResults(record.id, {
        telegramStatus: telegram.status,
        telegramSentAt: telegram.sentAt,
        crmStatus: crm.status,
        crmSentAt: crm.sentAt,
      });
    } catch (error) {
      log.error(`${logPrefix}.status_update_failed`, { id: record.id, error: describeError(error) });
    }
    return { telegram, crm };
  } catch (error) {
    log.error(`${logPrefix}.notify_failed`, { id: record.id, error: describeError(error) });
    return null;
  }
}

export function notifyNewLead(args) {
  return notifyLead({ ...args, kind: 'created' });
}

export function notifyLeadDetails(args) {
  return notifyLead({ ...args, kind: 'updated' });
}
