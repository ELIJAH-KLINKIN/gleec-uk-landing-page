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
export function validateLead(v) {
  const errors = {};
  const len = (s) => (s || "").trim().length;
  if (len(v.fullName) < 2) errors.fullName = "Please enter your full name.";
  else if (len(v.fullName) > 120) errors.fullName = "Please keep this under 120 characters.";
  if (!len(v.email)) errors.email = "Please enter your work email.";
  else if (!EMAIL_RE.test(v.email.trim()) || len(v.email) > 254) errors.email = "Please enter a valid email address.";
  if (!len(v.company)) errors.company = "Please enter your company name.";
  else if (len(v.company) > 160) errors.company = "Please keep this under 160 characters.";
  if (len(v.country) < 2) errors.country = "Please enter the country your company is registered in.";
  else if (len(v.country) > 80) errors.country = "Please keep this under 80 characters.";
  if (len(v.phone) > 40 || !PHONE_RE.test(v.phone || "")) errors.phone = "Please use digits, spaces and + ( ) - only.";
  else if (len(v.phone) && (v.phone.match(/\d/g) || []).length < 5) errors.phone = "Please enter a full phone number.";
  if (len(v.message) > 2000) errors.message = "Please keep your message under 2,000 characters.";
  if (!v.consent) errors.consent = "Please confirm we may contact you.";
  return errors;
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
