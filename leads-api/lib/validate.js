// Request-body validation and bot traps. Pure functions: no I/O.
import {
  BUSINESS_TYPES,
  CURRENCIES,
  MIN_FILL_TIME_MS,
  MONTHLY_VOLUMES,
  SOURCE_FIELD_MAX,
  SOURCE_KEYS,
} from './constants.js';
import { multiLine, singleLine, truncate } from './text.js';

const EMAIL_RE =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;
const PHONE_RE = /^[0-9 +().-]+$/;
const MIN_PHONE_DIGITS = 5;

export const MESSAGES = {
  body: 'Request body must be a JSON object.',
  fullName: 'Please enter your full name (2–120 characters).',
  email: 'Please enter a valid email address.',
  company: 'Please enter your company name (up to 160 characters).',
  country: 'Please enter your country of incorporation (2–80 characters).',
  phoneChars: 'Phone number can only contain digits, spaces and + ( ) - .',
  phoneLength: 'Phone number must be 40 characters or fewer.',
  phoneDigits: 'Please enter a valid phone number.',
  businessType: 'Please choose a valid business type.',
  currencies: 'Please choose currencies from the list.',
  monthlyVolume: 'Please choose a valid monthly volume.',
  message: 'Message must be 2000 characters or fewer.',
  consent: 'Please tick the box to agree to be contacted.',
  startedAt: 'Something went wrong with the form. Please reload the page and try again.',
};

export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isBlank(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

/**
 * Silent bot traps, checked before validation so bots never see field errors.
 * Returns 'honeypot' | 'too_fast' | null.
 *
 * A negative elapsed time means the browser clock is ahead of ours; that is
 * treated as human, because dropping a real lead is worse than letting one bot through.
 */
export function detectBot(body, now) {
  if (!isBlank(body.website)) return 'honeypot';
  const { startedAt } = body;
  if (typeof startedAt === 'number' && Number.isFinite(startedAt)) {
    const elapsed = now - startedAt;
    if (elapsed >= 0 && elapsed < MIN_FILL_TIME_MS) return 'too_fast';
  }
  return null;
}

function requiredText(value, min, max) {
  if (typeof value !== 'string') return { error: true };
  const text = singleLine(value);
  if (text.length < min || text.length > max) return { error: true };
  return { value: text };
}

function validateEmail(value) {
  if (typeof value !== 'string') return { error: true };
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return { error: true };
  if (email.split('@')[0].length > 64) return { error: true };
  return { value: email };
}

function validatePhone(value) {
  if (isBlank(value)) return { value: null };
  if (typeof value !== 'string') return { error: MESSAGES.phoneChars };
  const phone = value.trim().replace(/\s+/g, ' ');
  if (phone.length > 40) return { error: MESSAGES.phoneLength };
  if (!PHONE_RE.test(phone)) return { error: MESSAGES.phoneChars };
  if ((phone.match(/\d/g) || []).length < MIN_PHONE_DIGITS) return { error: MESSAGES.phoneDigits };
  return { value: phone };
}

function optionalEnum(value, allowed) {
  if (isBlank(value)) return { value: null };
  if (typeof value !== 'string' || !allowed.includes(value)) return { error: true };
  return { value };
}

function validateCurrencies(value) {
  if (value === undefined || value === null) return { value: [] };
  if (!Array.isArray(value) || value.length > 20) return { error: true };
  const out = [];
  for (const item of value) {
    if (typeof item !== 'string' || !CURRENCIES.includes(item)) return { error: true };
    if (!out.includes(item)) out.push(item);
  }
  return { value: out };
}

function validateMessage(value) {
  if (isBlank(value)) return { value: null };
  if (typeof value !== 'string') return { error: true };
  const message = multiLine(value);
  if (message.length > 2000) return { error: true };
  return { value: message || null };
}

/** Tracking data is never the visitor's fault: bad values are dropped/truncated, not rejected. */
export function normalizeSource(value) {
  const source = {};
  if (!isPlainObject(value)) return source;
  for (const key of SOURCE_KEYS) {
    if (typeof value[key] !== 'string') continue;
    const cleaned = truncate(singleLine(value[key]), SOURCE_FIELD_MAX);
    if (cleaned) source[key] = cleaned;
  }
  return source;
}

/**
 * Validates a parsed JSON body.
 * @returns {{ ok: true, lead: object } | { ok: false, fields: Record<string, string> }}
 */
export function validateLead(body) {
  if (!isPlainObject(body)) return { ok: false, fields: { body: MESSAGES.body } };

  const fields = {};
  const lead = {};

  const check = (name, result, message) => {
    if (result.error) fields[name] = typeof result.error === 'string' ? result.error : message;
    else lead[name] = result.value;
  };

  check('fullName', requiredText(body.fullName, 2, 120), MESSAGES.fullName);
  check('email', validateEmail(body.email), MESSAGES.email);
  check('company', requiredText(body.company, 1, 160), MESSAGES.company);
  check('country', requiredText(body.country, 2, 80), MESSAGES.country);
  check('phone', validatePhone(body.phone));
  check('businessType', optionalEnum(body.businessType, BUSINESS_TYPES), MESSAGES.businessType);
  check('currencies', validateCurrencies(body.currencies), MESSAGES.currencies);
  check('monthlyVolume', optionalEnum(body.monthlyVolume, MONTHLY_VOLUMES), MESSAGES.monthlyVolume);
  check('message', validateMessage(body.message), MESSAGES.message);

  if (body.consent === true) lead.consent = true;
  else fields.consent = MESSAGES.consent;

  if (typeof body.startedAt === 'number' && Number.isFinite(body.startedAt)) lead.startedAt = body.startedAt;
  else fields.startedAt = MESSAGES.startedAt;

  lead.source = normalizeSource(body.source);

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, lead };
}
