// WaitlistForm.jsx — lead capture, laid out like a grouped settings form.
// Posts to the lead-intake API (../../leads-api), which stores the lead,
// alerts the sales Telegram channel and forwards it to the CRM.
import { useEffect, useId, useRef, useState } from "react";
import { WAITLIST } from "../content.js";
import {
  BUSINESS_TYPES,
  CURRENCIES,
  LeadError,
  MONTHLY_VOLUMES,
  hasRequired,
  submitLead,
  validateLead,
} from "../lib/leads.js";
import { PREFILL_EVENT } from "../lib/prefill.js";
import Icon from "./ui/Icon.jsx";
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
  website: "", // honeypot — people never see or fill this
};

const SERVER_MESSAGES = {
  rate_limited: "Too many attempts from this connection. Wait a few minutes, then try again.",
  network: "Unable to reach the server. Check your connection and try again.",
  server: "Unable to send your details right now. Try again in a moment.",
  not_configured: "Waitlist sign-ups aren’t open on this preview yet.",
  validation: "Check the highlighted fields.",
};

export default function WaitlistForm() {
  const uid = useId();
  const id = (name) => `${uid}-${name}`;
  const formRef = useRef(null);
  const successRef = useRef(null);
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

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  const set = (name, value) => {
    const next = { ...values, [name]: value };
    setValues(next);
    if (touched[name]) setErrors((prev) => ({ ...prev, [name]: validateLead(next)[name] }));
  };

  // Validate a field when the person leaves it.
  const onBlur = (e) => {
    const { name } = e.target;
    if (!(name in EMPTY)) return;
    if (!values[name] && name !== "consent") return; // don't nag about a field they only tabbed through
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
      setValues(EMPTY);
      setTouched({});
      setStatus("success");
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
      <div className="wl-success" role="status" tabIndex={-1} ref={successRef}>
        <span className="wl-success-icon">
          <Icon name="check" size={28} strokeWidth={2.6} />
        </span>
        <h3 className="title-3">
          {WAITLIST.successTitle}
          {firstName ? `, ${firstName}` : ""}
        </h3>
        <p className="wl-success-body">{WAITLIST.successBody}</p>
        <button
          type="button"
          className="btn btn-tinted"
          onClick={() => {
            startedAt.current = Date.now();
            setStatus("idle");
          }}
        >
          Register Another Company
        </button>
      </div>
    );
  }

  const describedBy = (name, hint) =>
    [errors[name] ? id(`${name}-err`) : null, hint ? id(`${name}-hint`) : null].filter(Boolean).join(" ") || undefined;

  const field = (name, { hint, ...rest } = {}) => ({
    id: id(name),
    name,
    value: values[name],
    onChange: (e) => set(name, e.target.value),
    onBlur,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": describedBy(name, hint),
    ...rest,
  });

  const error = (name) =>
    errors[name] ? (
      <p className="wl-error" id={id(`${name}-err`)}>
        <Icon name="circle-alert" size={14} strokeWidth={2.4} />
        {errors[name]}
      </p>
    ) : null;

  const label = (name, text, optional) => (
    <label className="wl-label" htmlFor={id(name)}>
      {text}
      {optional ? <span className="wl-optional">Optional</span> : null}
    </label>
  );

  const submitting = status === "submitting";
  const ready = hasRequired(values);

  return (
    <form ref={formRef} className="wl-form" noValidate onSubmit={onSubmit} aria-busy={submitting}>
      <fieldset className="wl-group">
        <legend className="wl-group-title">About you</legend>
        <div className="wl-field">
          {label("fullName", "Full name")}
          <input {...field("fullName")} type="text" autoComplete="name" required maxLength={120} />
          {error("fullName")}
        </div>
        <div className="wl-field">
          {label("email", "Work email")}
          <input
            {...field("email")}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            maxLength={254}
            placeholder="name@company.com"
          />
          {error("email")}
        </div>
        <div className="wl-field">
          {label("phone", "Phone", true)}
          <input
            {...field("phone")}
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            maxLength={40}
            placeholder="+44 20 7946 0000"
          />
          {error("phone")}
        </div>
      </fieldset>

      <fieldset className="wl-group">
        <legend className="wl-group-title">Your company</legend>
        <div className="wl-field">
          {label("company", "Company name")}
          <input {...field("company")} type="text" autoComplete="organization" required maxLength={160} />
          {error("company")}
        </div>
        <div className="wl-field">
          {label("country", "Country of incorporation")}
          <input
            {...field("country")}
            type="text"
            autoComplete="country-name"
            required
            maxLength={80}
            placeholder="United Kingdom"
          />
          {error("country")}
        </div>
        <div className="wl-field">
          {label("businessType", "Business type", true)}
          <div className="wl-select">
            <select {...field("businessType")}>
              <option value="">Choose…</option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <Icon name="chevron-down" size={16} strokeWidth={2.4} />
          </div>
        </div>
        <div className="wl-field">
          {label("monthlyVolume", "Expected monthly volume", true)}
          <div className="wl-select">
            <select {...field("monthlyVolume")}>
              <option value="">Choose…</option>
              {MONTHLY_VOLUMES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <Icon name="chevron-down" size={16} strokeWidth={2.4} />
          </div>
        </div>
        <div className="wl-field" role="group" aria-labelledby={id("currencies-label")}>
          <span className="wl-label" id={id("currencies-label")}>
            Currencies you need<span className="wl-optional">Optional</span>
          </span>
          <div className="wl-toggles">
            {CURRENCIES.map((code) => {
              const on = values.currencies.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  className={"wl-toggle" + (on ? " is-on" : "")}
                  aria-pressed={on}
                  onClick={() => toggleCurrency(code)}
                >
                  {on ? <Icon name="check" size={14} strokeWidth={2.6} /> : null}
                  {code}
                </button>
              );
            })}
          </div>
        </div>
      </fieldset>

      <fieldset className="wl-group">
        <legend className="wl-group-title">Anything else</legend>
        <div className="wl-field">
          {label("message", "Message", true)}
          <textarea {...field("message", { hint: true })} rows={4} maxLength={2000} />
          <p className="wl-hint" id={id("message-hint")}>
            Tell us about your payment activity, currencies and ownership structure.
          </p>
          {error("message")}
        </div>
      </fieldset>

      {/* Honeypot: off-screen and skipped by keyboard + assistive tech. */}
      <div className="wl-hp" aria-hidden="true">
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

      <div className="wl-consent-row">
        <label className="wl-consent" htmlFor={id("consent")}>
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
          <span>{WAITLIST.consent}</span>
        </label>
        {error("consent")}
      </div>

      <div className="wl-actions">
        <button
          type="submit"
          className="btn btn-filled btn-large wl-submit"
          disabled={!ready || submitting}
          aria-describedby={!ready ? id("submit-hint") : undefined}
        >
          {submitting ? (
            <>
              <Icon name="loader" size={18} className="wl-spin" /> Joining…
            </>
          ) : (
            "Join the Waitlist"
          )}
        </button>
        {!ready ? (
          <p className="wl-hint" id={id("submit-hint")}>
            Fill in your name, work email, company and country, and tick the box to continue.
          </p>
        ) : null}
        <div className="wl-status" role="alert">
          {serverError ? (
            <p className="wl-server-error">
              <Icon name="circle-alert" size={16} strokeWidth={2.4} />
              {serverError}
            </p>
          ) : null}
        </div>
        <p className="footnote wl-fineprint">{WAITLIST.fineprint}</p>
      </div>
    </form>
  );
}
