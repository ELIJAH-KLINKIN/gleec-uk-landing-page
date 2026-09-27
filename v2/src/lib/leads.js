// Client for the lead-intake API (see leads-api/README.md for the contract).

export const LEADS_ENDPOINT = (import.meta.env.VITE_LEADS_ENDPOINT || "").trim();

export const BUSINESS_TYPES = [
  { value: "local", label: "UK business" },
  { value: "international", label: "International business" },
  { value: "group", label: "Holding / corporate group" },
  { value: "other", label: "Other" },
];

export const CURRENCIES = ["GBP", "EUR", "USD", "Other"];

export const MONTHLY_VOLUMES = [
  { value: "lt_50k", label: "Under £50k" },
  { value: "50k_250k", label: "£50k – £250k" },
  { value: "250k_1m", label: "£250k – £1m" },
  { value: "1m_5m", label: "£1m – £5m" },
  { value: "gt_5m", label: "Over £5m" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9 +().-]*$/;

// Mirrors the server-side rules so people get instant, specific feedback.
// Messages say how to fix the problem (HIG: plain, direct, no blame).
export function validateLead(v) {
  const errors = {};
  const len = (s) => (s || "").trim().length;
  if (len(v.fullName) < 2) errors.fullName = "Enter your full name.";
  else if (len(v.fullName) > 120) errors.fullName = "Shorten your name to 120 characters or fewer.";
  if (!len(v.email)) errors.email = "Enter your work email.";
  else if (!EMAIL_RE.test(v.email.trim()) || len(v.email) > 254)
    errors.email = "Enter an email address like name@company.com.";
  if (!len(v.company)) errors.company = "Enter your company name.";
  else if (len(v.company) > 160) errors.company = "Shorten the company name to 160 characters or fewer.";
  if (len(v.country) < 2) errors.country = "Enter the country where your company is registered.";
  else if (len(v.country) > 80) errors.country = "Shorten the country to 80 characters or fewer.";
  if (len(v.phone) > 40 || !PHONE_RE.test(v.phone || "")) errors.phone = "Use only digits, spaces and + ( ) -.";
  else if (len(v.phone) && (v.phone.match(/\d/g) || []).length < 5)
    errors.phone = "Enter a full phone number, including the area code.";
  if (len(v.message) > 2000) errors.message = "Keep your message to 2,000 characters or fewer.";
  if (!v.consent) errors.consent = "Tick the box to confirm Gleec Pay Ltd may contact you.";
  return errors;
}

// True once every required field has something in it (the submit button is
// unavailable until then).
export function hasRequired(v) {
  return ["fullName", "email", "company", "country"].every((k) => (v[k] || "").trim().length > 0) && v.consent === true;
}

function sourceInfo() {
  const params = new URLSearchParams(window.location.search);
  const utm = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const val = params.get(k);
    if (val) utm[k] = val.slice(0, 200);
  }
  return {
    page: window.location.href.slice(0, 500),
    referrer: (document.referrer || "").slice(0, 500),
    ...utm,
  };
}

export class LeadError extends Error {
  constructor(kind, fields) {
    super(kind);
    this.kind = kind; // "validation" | "rate_limited" | "network" | "server" | "not_configured"
    this.fields = fields || {};
  }
}

export async function submitLead(values, { startedAt }) {
  if (!LEADS_ENDPOINT) throw new LeadError("not_configured");

  const payload = {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    company: values.company.trim(),
    country: values.country.trim(),
    phone: values.phone.trim() || undefined,
    businessType: values.businessType || undefined,
    currencies: values.currencies.length ? values.currencies : undefined,
    monthlyVolume: values.monthlyVolume || undefined,
    message: values.message.trim() || undefined,
    consent: values.consent === true,
    website: values.website,
    startedAt,
    source: sourceInfo(),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let res;
  try {
    res = await fetch(LEADS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch {
    throw new LeadError("network");
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
  if (res.status === 400 && body?.error === "validation") throw new LeadError("validation", body.fields);
  if (res.status === 429) throw new LeadError("rate_limited");
  throw new LeadError("server");
}
