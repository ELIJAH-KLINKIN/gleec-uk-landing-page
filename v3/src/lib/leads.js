// Client for the lead-intake API (../../leads-api). Email first:
//   POST {endpoint}           → join with an email; returns { id, token }
//   POST {endpoint}/details   → optional company details for that lead
//   GET  …/stats              → { companies } — how many are on the list

export const LEADS_ENDPOINT = (import.meta.env.VITE_LEADS_ENDPOINT || "").trim().replace(/\/+$/, "");
const DETAILS_ENDPOINT = LEADS_ENDPOINT && `${LEADS_ENDPOINT}/details`;
const STATS_ENDPOINT = LEADS_ENDPOINT && LEADS_ENDPOINT.replace(/\/leads$/, "/stats");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const len = (s) => (s || "").trim().length;

// Messages say how to fix the problem (HIG: plain, direct, no blame).
export function validateEmail(email) {
  if (!len(email)) return "Enter your work email.";
  if (!EMAIL_RE.test(email.trim()) || len(email) > 254) return "Enter an email address like name@company.com.";
  return undefined;
}

// Step two: first and last name, then optional country, company, website and a note.
export { validateContactDetails as validateDetails } from "./contact.js";

// What each API outcome means to a visitor (shared by every waitlist form).
export const LEAD_ERROR_MESSAGES = {
  rate_limited: "Too many attempts from this connection. Wait a few minutes, then try again.",
  network: "Unable to reach the server. Check your connection and try again.",
  server: "Unable to send right now. Try again in a moment.",
  not_configured: "Waitlist sign-ups aren’t open on this preview yet.",
  validation: "Check the highlighted fields.",
};

export class LeadError extends Error {
  constructor(kind, fields) {
    super(kind);
    // "validation" | "rate_limited" | "network" | "server" | "not_configured" | "already_submitted"
    this.kind = kind;
    this.fields = fields || {};
  }
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

async function post(url, payload) {
  if (!url) throw new LeadError("not_configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let res;
  try {
    res = await fetch(url, {
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
  if (res.status === 409) throw new LeadError("already_submitted");
  throw new LeadError("server");
}

// Step 1: join with an email. Joining = "contact me about onboarding" (the notice under the
// button); product updates are a separate opt-in (`updates`, unticked by default).
export function joinWaitlist({ email, website, updates = false }, { startedAt }) {
  return post(LEADS_ENDPOINT, {
    email: email.trim(),
    consent: true,
    updates: updates === true,
    website,
    startedAt,
    source: sourceInfo(),
  });
}

// Step 2: optional details for the lead created in step 1. `businessType` comes from the
// segment CTA the visitor clicked (see prefill.js), not from a field.
export function sendDetails({ id, token }, v) {
  const clean = (s) => (s || "").trim() || undefined;
  return post(DETAILS_ENDPOINT, {
    id,
    token,
    firstName: clean(v.firstName),
    lastName: clean(v.lastName),
    country: clean(v.country),
    company: clean(v.company),
    companyWebsite: clean(v.companyWebsite),
    businessType: v.businessType || undefined,
    message: clean(v.message),
  });
}

// How many companies are on the list, or null when unknown.
export async function fetchWaitlistCount() {
  if (!STATS_ENDPOINT) return null;
  try {
    const res = await fetch(STATS_ENDPOINT, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const body = await res.json();
    return Number.isInteger(body?.companies) ? body.companies : null;
  } catch {
    return null;
  }
}
