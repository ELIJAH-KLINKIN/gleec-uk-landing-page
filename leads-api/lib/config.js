// Reads environment variables into a plain config object. Never log the values.

function clean(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

/** "https://a.com, http://localhost:5173/" -> Set { 'https://a.com', 'http://localhost:5173' } */
export function parseAllowedOrigins(value) {
  return new Set(
    clean(value)
      .split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .filter(Boolean),
  );
}

export function loadConfig(env = {}) {
  const telegramToken = clean(env.TELEGRAM_BOT_TOKEN);
  const telegramChatId = clean(env.TELEGRAM_CHAT_ID);
  const threadRaw = clean(env.TELEGRAM_THREAD_ID);
  const threadId = /^\d+$/.test(threadRaw) ? Number(threadRaw) : null;
  const crmUrl = clean(env.CRM_WEBHOOK_URL);
  const crmSecret = clean(env.CRM_WEBHOOK_SECRET);

  return {
    allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
    databaseUrl: clean(env.DATABASE_URL),
    ipHashSalt: clean(env.IP_HASH_SALT),
    telegram:
      telegramToken && telegramChatId
        ? { token: telegramToken, chatId: telegramChatId, threadId }
        : null,
    // A URL without a secret is kept so the lead row can record why nothing was sent.
    crm: crmUrl ? { url: crmUrl, secret: crmSecret } : null,
    warnings: collectWarnings({
      env,
      telegramToken,
      telegramChatId,
      threadRaw,
      threadId,
      crmUrl,
      crmSecret,
    }),
  };
}

function collectWarnings({ env, telegramToken, telegramChatId, threadRaw, threadId, crmUrl, crmSecret }) {
  const warnings = [];
  if (!clean(env.ALLOWED_ORIGINS)) warnings.push('ALLOWED_ORIGINS is not set: every browser request will get 403');
  if (!clean(env.DATABASE_URL)) warnings.push('DATABASE_URL is not set: leads cannot be stored (500)');
  if (!clean(env.IP_HASH_SALT)) warnings.push('IP_HASH_SALT is not set: IPs are not stored and rate limiting is off');
  if (Boolean(telegramToken) !== Boolean(telegramChatId)) {
    warnings.push('Only one of TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID is set: Telegram is off');
  }
  if (threadRaw && threadId === null) warnings.push('TELEGRAM_THREAD_ID is not a positive integer: ignored');
  if (crmUrl && !crmSecret) warnings.push('CRM_WEBHOOK_URL is set without CRM_WEBHOOK_SECRET: webhook is not sent');
  return warnings;
}

/** Booleans only — safe to expose on /api/health. */
export function configStatus(config) {
  return {
    db: Boolean(config.databaseUrl),
    telegram: Boolean(config.telegram),
    crm: Boolean(config.crm && config.crm.url && config.crm.secret),
  };
}
