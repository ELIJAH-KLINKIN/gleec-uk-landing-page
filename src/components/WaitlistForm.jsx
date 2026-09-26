// WaitlistForm.jsx — Lead capture for the waitlist. Posts to the lead-intake
// API (leads-api/), which stores the lead, alerts the sales Telegram channel
// and forwards it to the CRM.
import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { BUSINESS_TYPES, CURRENCIES, LeadError, MONTHLY_VOLUMES, submitLead, validateLead } from "../lib/leads.js";
import { PREFILL_EVENT } from "../lib/prefill.js";
import "./WaitlistForm.css";

const EMPTY = {
  fullName: "",
  email: "",
  company: "",
  country: "",
  phone: "",
  businessType: "",
  currencies: [],
  monthlyVolume: "",
  message: "",
  consent: false,
  website: "", // honeypot — real people never see or fill this
};

const SERVER_MESSAGES = {
  rate_limited: "Too many attempts from this connection. Please wait a few minutes and try again.",
  network: "We couldn't reach our server. Please check your connection and try again.",
  server: "Something went wrong on our side. Please try again in a moment.",
  not_configured: "Waitlist sign-ups aren't open on this preview yet.",
  validation: "Please check the highlighted fields.",
};

export default function WaitlistForm() {
  const uid = useId();
  const id = (name) => `${uid}-${name}`;
  const formRef = useRef(null);
  const startedAt = useRef(0);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [serverError, setServerError] = useState("");
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    startedAt.current = Date.now();
    const onPrefill = (e) => {
      const businessType = e.detail?.businessType;
      if (businessType) setValues((v) => ({ ...v, businessType }));
    };
    window.addEventListener(PREFILL_EVENT, onPrefill);
    return () => window.removeEventListener(PREFILL_EVENT, onPrefill);
  }, []);

  const set = (name, value) => {
    const next = { ...values, [name]: value };
    setValues(next);
    // Re-validate a field live once the user has left it (or tried to submit).
    if (touched[name]) setErrors((prev) => ({ ...prev, [name]: validateLead(next)[name] }));
  };

  const onBlur = (e) => {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateLead(values)[name] }));
  };

  const toggleCurrency = (code) =>
    set(
      "currencies",
      values.currencies.includes(code) ? values.currencies.filter((c) => c !== code) : [...values.currencies, code],
    );

  const focusFirstError = (errs) => {
    const first = Object.keys(EMPTY).find((k) => errs[k]);
    if (first) formRef.current?.querySelector(`[name="${first}"]`)?.focus();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status === "submitting") return;
    const errs = validateLead(values);
    setTouched(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, true])));
    setErrors(errs);
    setServerError("");
    if (Object.keys(errs).length) {
      focusFirstError(errs);
      return;
    }
    setStatus("submitting");
    try {
      await submitLead(values, { startedAt: startedAt.current });
      setFirstName(values.fullName.trim().split(/\s+/)[0]);
      setStatus("success");
      setValues(EMPTY);
      setTouched({});
    } catch (err) {
      const kind = err instanceof LeadError ? err.kind : "server";
      if (kind === "validation") {
        setErrors(err.fields);
        focusFirstError(err.fields);
      }
      setServerError(SERVER_MESSAGES[kind] || SERVER_MESSAGES.server);
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="gl-wl-success" role="status" tabIndex={-1} ref={(el) => el?.focus()}>
        <span className="gl-wl-success-icon">
          <Icon name="check" size={22} strokeWidth={2.2} />
        </span>
        <h3 className="gl-wl-success-h">You're on the list{firstName ? `, ${firstName}` : ""}</h3>
        <p>
          Thanks for your interest in GLEEC Business. We'll follow up once we can confirm what may fit your needs,
          subject to authorisation, onboarding approval and acceptance policy.
        </p>
        <button
          type="button"
          className="gl-wl-link"
          onClick={() => {
            startedAt.current = Date.now();
            setStatus("idle");
          }}
        >
          Register another company
        </button>
      </div>
    );
  }

  const fieldProps = (name) => ({
    id: id(name),
    name,
    value: values[name],
    onChange: (e) => set(name, e.target.value),
    onBlur,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? id(`${name}-err`) : undefined,
  });

  const fieldError = (name) =>
    errors[name] ? (
      <p className="gl-wl-err" id={id(`${name}-err`)}>
        {errors[name]}
      </p>
    ) : null;

  const submitting = status === "submitting";

  return (
    <form ref={formRef} className="gl-wl-form" noValidate onSubmit={onSubmit} aria-busy={submitting}>
      <div className="gl-wl-grid">
        <div className="gl-wl-field">
          <label htmlFor={id("fullName")}>
            Full name{" "}
            <span className="gl-wl-req" aria-hidden="true">
              *
            </span>
          </label>
          <input {...fieldProps("fullName")} type="text" autoComplete="name" required maxLength={120} />
          {fieldError("fullName")}
        </div>

        <div className="gl-wl-field">
          <label htmlFor={id("email")}>
            Work email{" "}
            <span className="gl-wl-req" aria-hidden="true">
              *
            </span>
          </label>
          <input
            {...fieldProps("email")}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            maxLength={254}
          />
          {fieldError("email")}
        </div>

        <div className="gl-wl-field">
          <label htmlFor={id("company")}>
            Company name{" "}
            <span className="gl-wl-req" aria-hidden="true">
              *
            </span>
          </label>
          <input {...fieldProps("company")} type="text" autoComplete="organization" required maxLength={160} />
          {fieldError("company")}
        </div>

        <div className="gl-wl-field">
          <label htmlFor={id("country")}>
            Country of incorporation{" "}
            <span className="gl-wl-req" aria-hidden="true">
              *
            </span>
          </label>
          <input
            {...fieldProps("country")}
            type="text"
            autoComplete="country-name"
            required
            maxLength={80}
            placeholder="e.g. United Kingdom"
          />
          {fieldError("country")}
        </div>

        <div className="gl-wl-field">
          <label htmlFor={id("phone")}>
            Phone <span className="gl-wl-opt">optional</span>
          </label>
          <input {...fieldProps("phone")} type="tel" autoComplete="tel" inputMode="tel" maxLength={40} />
          {fieldError("phone")}
        </div>

        <div className="gl-wl-field">
          <label htmlFor={id("businessType")}>
            Business type <span className="gl-wl-opt">optional</span>
          </label>
          <div className="gl-wl-select">
            <select {...fieldProps("businessType")}>
              <option value="">Select…</option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <Icon name="chevron-down" size={16} />
          </div>
        </div>

        <fieldset className="gl-wl-field gl-wl-fieldset">
          <legend>
            Currencies you need <span className="gl-wl-opt">optional</span>
          </legend>
          <div className="gl-wl-chips">
            {CURRENCIES.map((code) => (
              <label key={code} className={"gl-wl-chip" + (values.currencies.includes(code) ? " is-on" : "")}>
                <input
                  type="checkbox"
                  name="currencies"
                  value={code}
                  checked={values.currencies.includes(code)}
                  onChange={() => toggleCurrency(code)}
                />
                {code}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="gl-wl-field">
          <label htmlFor={id("monthlyVolume")}>
            Expected monthly volume <span className="gl-wl-opt">optional</span>
          </label>
          <div className="gl-wl-select">
            <select {...fieldProps("monthlyVolume")}>
              <option value="">Select…</option>
              {MONTHLY_VOLUMES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <Icon name="chevron-down" size={16} />
          </div>
        </div>

        <div className="gl-wl-field gl-wl-span">
          <label htmlFor={id("message")}>
            Anything we should know? <span className="gl-wl-opt">optional</span>
          </label>
          <textarea
            {...fieldProps("message")}
            rows={4}
            maxLength={2000}
            placeholder="Payment activity, corridors, ownership structure…"
          />
          {fieldError("message")}
        </div>

        {/* Honeypot: off-screen and skipped by keyboard + assistive tech. */}
        <div className="gl-wl-hp" aria-hidden="true">
          <label htmlFor={id("website")}>Website</label>
          <input
            id={id("website")}
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(e) => setValues((v) => ({ ...v, website: e.target.value }))}
          />
        </div>

        <div className="gl-wl-field gl-wl-span">
          <label className="gl-wl-consent" htmlFor={id("consent")}>
            <input
              id={id("consent")}
              name="consent"
              type="checkbox"
              checked={values.consent}
              onChange={(e) => set("consent", e.target.checked)}
              onBlur={onBlur}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? id("consent-err") : undefined}
            />
            <span>
              I agree that Gleec Pay Ltd may contact me about GLEEC Business. I understand the service is not yet
              available and is subject to FCA authorisation and onboarding approval.
            </span>
          </label>
          {fieldError("consent")}
        </div>
      </div>

      <div className="gl-wl-actions">
        <button type="submit" className="gl-btn gl-btn-primary gl-btn-lg gl-wl-submit" disabled={submitting}>
          {submitting ? (
            <>
              <Icon name="loader" size={16} className="gl-wl-spin" /> Sending…
            </>
          ) : (
            <>
              Join waitlist <Icon name="arrow-right" size={16} />
            </>
          )}
        </button>
        <p className="gl-wl-fine">
          We'll only use these details to contact you about GLEEC Business. Registering interest is not an application
          for a regulated service.
        </p>
      </div>

      <div className="gl-wl-status" role="alert">
        {serverError ? (
          <p className="gl-wl-server-err">
            <Icon name="circle-alert" size={16} /> {serverError}
          </p>
        ) : null}
      </div>
    </form>
  );
}
