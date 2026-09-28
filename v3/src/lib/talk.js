// Client for "Talk to a human" (../../leads-api, /api/talk):
//   POST {talk}        → save the visitor's details; returns { id, token, booking }
//   GET  {talk}?id&token → free times: { available, timeZone, durationMinutes, days: [{ date, slots: [iso] }] }
//   POST {talk}/book   → { booking: { start, end, meetUrl, hostName } } — Google emails the invitation
import { LEADS_ENDPOINT } from "./leads.js";

export const TALK_ENDPOINT = LEADS_ENDPOINT && LEADS_ENDPOINT.replace(/\/leads$/, "/talk");

export class TalkError extends Error {
  constructor(kind, fields) {
    super(kind);
    // "validation" | "rate_limited" | "network" | "server" | "not_configured" | "slot_taken" | "unavailable"
    this.kind = kind;
    this.fields = fields || {};
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9 +().-]*$/;
const SITE_RE = /^(https?:\/\/)?([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(\/\S*)?$/i;
const len = (s) => (s || "").trim().length;

export function validateTalkEmail(email) {
  if (!len(email)) return "Enter your work email.";
  if (!EMAIL_RE.test(email.trim()) || len(email) > 254) return "Enter an email address like name@company.com.";
  return undefined;
}

export function validateTalkDetails(v) {
  const errors = {};
  if (!len(v.firstName)) errors.firstName = "Enter your first name.";
  else if (len(v.firstName) > 60) errors.firstName = "Shorten your first name to 60 characters or fewer.";
  if (!len(v.lastName)) errors.lastName = "Enter your last name.";
  else if (len(v.lastName) > 60) errors.lastName = "Shorten your last name to 60 characters or fewer.";
  if (len(v.phone) > 40 || !PHONE_RE.test(v.phone || "")) errors.phone = "Use only digits, spaces and + ( ) -.";
  else if (len(v.phone) && (v.phone.match(/\d/g) || []).length < 5)
    errors.phone = "Enter a full phone number, including the area code.";
  if (len(v.company) > 160) errors.company = "Shorten the company name to 160 characters or fewer.";
  if (len(v.companyWebsite) && (!SITE_RE.test(v.companyWebsite.trim()) || len(v.companyWebsite) > 200))
    errors.companyWebsite = "Enter a website like acme.com.";
  if (len(v.message) > 2000) errors.message = "Keep your message to 2,000 characters or fewer.";
  return errors;
}

function sourceInfo() {
  const params = new URLSearchParams(window.location.search);
  const utm = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const val = params.get(k);
    if (val) utm[k] = val.slice(0, 200);
  }
  return { page: window.location.href.slice(0, 500), referrer: (document.referrer || "").slice(0, 500), ...utm };
}

async function call(url, init) {
  if (!TALK_ENDPOINT) throw new TalkError("not_configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let res;
  try {
    res = await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new TalkError("network");
  } finally {
    clearTimeout(timer);
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error page */
  }
  if (res.ok && body?.ok) return body;
  if (res.status === 400 && body?.error === "validation") throw new TalkError("validation", body.fields);
  if (res.status === 429) throw new TalkError("rate_limited");
  if (res.status === 409) throw new TalkError("slot_taken");
  if (res.status === 503) throw new TalkError("unavailable");
  throw new TalkError("server");
}

const postJson = (url, payload) =>
  call(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

// Steps 1 + 2: the email and the details are sent together, when the visitor asks to book.
export function requestCall({ email, website, ...v }, { startedAt }) {
  const clean = (s) => (s || "").trim() || undefined;
  return postJson(TALK_ENDPOINT, {
    email: email.trim(),
    firstName: clean(v.firstName),
    lastName: clean(v.lastName),
    phone: clean(v.phone),
    company: clean(v.company),
    companyWebsite: clean(v.companyWebsite),
    message: clean(v.message),
    website,
    startedAt,
    source: sourceInfo(),
  });
}

export function fetchSlots({ id, token }) {
  const q = new URLSearchParams({ id, token });
  return call(`${TALK_ENDPOINT}?${q}`, { method: "GET" });
}

export function bookSlot({ id, token }, start) {
  return postJson(`${TALK_ENDPOINT}/book`, { id, token, start });
}
