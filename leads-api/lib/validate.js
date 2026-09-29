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
  firstName: 'Please enter your first name (up to 60 characters).',
  lastName: 'Please enter your last name (up to 60 characters).',
  companyWebsite: 'Please enter a valid website, e.g. acme.com.',
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
  noDetails: 'Please fill in at least one field.',
};

// Fields that POST /api/leads/details may add (all optional on POST /api/leads too).
export const DETAIL_FIELDS = [
  'fullName',
  'firstName',
  'lastName',
  'company',
  'companyWebsite',
  'country',
  'phone',
  'businessType',
  'currencies',
  'monthlyVolume',
  'message',
];

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

/** Absent/empty → null; otherwise one line of min–max characters. */
function optionalText(value, min, max) {
  if (isBlank(value)) return { value: null };
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

/** Collects normalised values into `out` and error messages into `fields`. */
function createChecker(out, fields) {
  return (name, result, message) => {
    if (result.error) fields[name] = typeof result.error === 'string' ? result.error : message;
    else out[name] = result.value;
  };
}

/** The optional company details, with the same rules on both endpoints. */
function checkDetailFields(body, check) {
  check('fullName', optionalText(body.fullName, 2, 120), MESSAGES.fullName);
  check('firstName', optionalText(body.firstName, 1, 60), MESSAGES.firstName);
  check('lastName', optionalText(body.lastName, 1, 60), MESSAGES.lastName);
  check('company', optionalText(body.company, 1, 160), MESSAGES.company);
  check('companyWebsite', normalizeWebsite(body.companyWebsite), MESSAGES.companyWebsite);
  check('country', optionalText(body.country, 2, 80), MESSAGES.country);
  check('phone', validatePhone(body.phone));
  check('businessType', optionalEnum(body.businessType, BUSINESS_TYPES), MESSAGES.businessType);
  check('currencies', validateCurrencies(body.currencies), MESSAGES.currencies);
  check('monthlyVolume', optionalEnum(body.monthlyVolume, MONTHLY_VOLUMES), MESSAGES.monthlyVolume);
  check('message', validateMessage(body.message), MESSAGES.message);
}

/**
 * Validates a parsed POST /api/leads body. Only email, consent and startedAt are required;
 * the details are optional (email-first form) but validated whenever they are present.
 * @returns {{ ok: true, lead: object } | { ok: false, fields: Record<string, string> }}
 */
export function validateLead(body) {
  if (!isPlainObject(body)) return { ok: false, fields: { body: MESSAGES.body } };

  const fields = {};
  const lead = {};
  const check = createChecker(lead, fields);

  check('email', validateEmail(body.email), MESSAGES.email);
  checkDetailFields(body, check);

  if (body.consent === true) lead.consent = true;
  else fields.consent = MESSAGES.consent;
  // "Send me product updates": a separate, unticked box. Only an explicit true opts in.
  lead.updatesOptIn = body.updates === true;

  if (typeof body.startedAt === 'number' && Number.isFinite(body.startedAt)) lead.startedAt = body.startedAt;
  else fields.startedAt = MESSAGES.startedAt;

  lead.source = normalizeSource(body.source);

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, lead };
}

/**
 * Validates the detail fields of a POST /api/leads/details body (id and token are checked
 * by the handler). At least one field must carry a value.
 * @returns {{ ok: true, details: object } | { ok: false, fields: Record<string, string> }}
 */
export function validateDetails(body) {
  if (!isPlainObject(body)) return { ok: false, fields: { body: MESSAGES.body } };

  const fields = {};
  const details = {};
  checkDetailFields(body, createChecker(details, fields));

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  if (!hasAnyDetail(details)) return { ok: false, fields: { body: MESSAGES.noDetails } };
  return { ok: true, details };
}

export function hasAnyDetail(details) {
  return DETAIL_FIELDS.some((name) => {
    const value = details[name];
    return Array.isArray(value) ? value.length > 0 : value != null;
  });
}

// ---------------------------------------------------------------------------
// "Talk to a human" (POST /api/talk)
// ---------------------------------------------------------------------------

export const TALK_MESSAGES = {
  firstName: 'Please enter your first name.',
  lastName: 'Please enter your last name.',
  companyWebsite: 'Please enter a valid website, e.g. acme.com.',
  start: 'Please choose one of the times offered.',
};

const HOSTNAME_RE = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** "acme.com", "www.acme.com/about" or "https://acme.com" → "https://acme.com/…"; else error. */
export function normalizeWebsite(value) {
  if (isBlank(value)) return { value: null };
  if (typeof value !== 'string') return { error: true };
  const raw = value.trim();
  if (raw.length > 200 || /\s/.test(raw)) return { error: true };
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { error: true };
  }
  if (!['http:', 'https:'].includes(url.protocol) || !HOSTNAME_RE.test(url.hostname.toLowerCase())) return { error: true };
  if (url.username || url.password) return { error: true };
  url.hash = '';
  return { value: url.toString().replace(/\/$/, '') };
}

/**
 * Validates a POST /api/talk body: email, first and last name are required; phone,
 * company, company website and message are optional but checked when present.
 * @returns {{ ok: true, request: object } | { ok: false, fields: Record<string, string> }}
 */
export function validateTalkRequest(body) {
  if (!isPlainObject(body)) return { ok: false, fields: { body: MESSAGES.body } };
  const fields = {};
  const request = {};
  const check = createChecker(request, fields);

  check('email', validateEmail(body.email), MESSAGES.email);
  const name = (value, message) => {
    const r = optionalText(value, 1, 60);
    return r.value == null && !r.error ? { error: message } : r.error ? { error: message } : r;
  };
  check('firstName', name(body.firstName, TALK_MESSAGES.firstName), TALK_MESSAGES.firstName);
  check('lastName', name(body.lastName, TALK_MESSAGES.lastName), TALK_MESSAGES.lastName);
  check('phone', validatePhone(body.phone), MESSAGES.phoneChars);
  check('company', optionalText(body.company, 1, 160), MESSAGES.company);
  check('companyWebsite', normalizeWebsite(body.companyWebsite), TALK_MESSAGES.companyWebsite);
  check('message', validateMessage(body.message), MESSAGES.message);

  if (typeof body.startedAt === 'number' && Number.isFinite(body.startedAt)) request.startedAt = body.startedAt;
  else fields.startedAt = MESSAGES.startedAt;
  request.source = normalizeSource(body.source);

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, request };
}
