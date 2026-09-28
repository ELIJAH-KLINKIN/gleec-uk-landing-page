// WaitlistForm.jsx — email-first waitlist.
//   1. Join: a pill-shaped email field + Join button, with the live count of
//      companies on the list and the planned launch underneath.
//   2. Details (optional): company details that help sales prepare a setup.
//   3. Done.
// Posts to the lead-intake API (../../leads-api): the lead is stored, the
// sales Telegram channel is alerted and the CRM webhook fires.
import { useEffect, useId, useRef, useState } from "react";
import { WAITLIST } from "../content.js";
import {
  BUSINESS_TYPES,
  CURRENCIES,
  LeadError,
  MONTHLY_VOLUMES,
  fetchWaitlistCount,
  hasAnyDetail,
  joinWaitlist,
  sendDetails,
  validateDetails,
  validateEmail,
} from "../lib/leads.js";
import { PREFILL_EVENT } from "../lib/prefill.js";
import Icon from "./ui/Icon.jsx";
import "./WaitlistForm.css";

// Hide the count until the list is big enough to be worth showing.
const MIN_COUNT = Number(import.meta.env.VITE_WAITLIST_MIN_COUNT || 1);

const EMPTY_DETAILS = {
  fullName: "",
  company: "",
  country: "",
  phone: "",
  businessType: "",
  currencies: [],
  monthlyVolume: "",
  message: "",
};

const SERVER_MESSAGES = {
  rate_limited: "Too many attempts from this connection. Wait a few minutes, then try again.",
  network: "Unable to reach the server. Check your connection and try again.",
  server: "Unable to send right now. Try again in a moment.",
  not_configured: "Waitlist sign-ups aren’t open on this preview yet.",
  validation: "Check the highlighted fields.",
};

export default function WaitlistForm() {
  const uid = useId();
  const id = (name) => `${uid}-${name}`;
  const startedAt = useRef(0);
  const statusRef = useRef(null);
  const emailRef = useRef(null);
  const detailsRef = useRef(null);

  const [step, setStep] = useState("join"); // join | details | done
  const [skipped, setSkipped] = useState(false);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [emailError, setEmailError] = useState("");
  const [lead, setLead] = useState(null); // { id, token }
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [count, setCount] = useState(null);

  useEffect(() => {
    startedAt.current = Date.now();
    let alive = true;
    fetchWaitlistCount().then((n) => alive && setCount(n));
    // "See If It Fits" / "Speak to Us" elsewhere pre-select the business type.
    const onPrefill = (e) => {
      const businessType = e.detail?.businessType;
      if (businessType) setDetails((d) => ({ ...d, businessType }));
    };
    window.addEventListener(PREFILL_EVENT, onPrefill);
    return () => {
      alive = false;
      window.removeEventListener(PREFILL_EVENT, onPrefill);
    };
  }, []);

  // Move focus to the new content when the step changes (not on first render).
  useEffect(() => {
    if (step !== "join") statusRef.current?.focus();
  }, [step]);

  const failWith = (err) => {
    const kind = err instanceof LeadError ? err.kind : "server";
    setServerError(SERVER_MESSAGES[kind] || SERVER_MESSAGES.server);
    return kind;
  };

  // ---------- Step 1: join ----------
  const onJoin = async (e) => {
    e.preventDefault();
    if (busy) return;
    const problem = validateEmail(email);
    setEmailError(problem || "");
    setServerError("");
    if (problem) {
      emailRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await joinWaitlist({ email, website }, { startedAt: startedAt.current });
      setLead({ id: res.id, token: res.token });
      setSkipped(!res.token);
      setStep(res.token ? "details" : "done");
    } catch (err) {
      const kind = failWith(err);
      if (kind === "validation") {
        setServerError("");
        setEmailError(err.fields.email || SERVER_MESSAGES.validation);
        emailRef.current?.focus();
      }
    } finally {
      setBusy(false);
    }
  };

  // ---------- Step 2: details ----------
  const setDetail = (name, value) => {
    const next = { ...details, [name]: value };
    setDetails(next);
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: validateDetails(next)[name] }));
  };
  const onDetailBlur = (e) => {
    const { name } = e.target;
    if (!(name in EMPTY_DETAILS)) return;
    setErrors((prev) => ({ ...prev, [name]: validateDetails(details)[name] }));
  };
  const toggleCurrency = (code) =>
    setDetail(
      "currencies",
      details.currencies.includes(code) ? details.currencies.filter((c) => c !== code) : [...details.currencies, code],
    );

  const focusDetail = (errs) => {
    const first = Object.keys(EMPTY_DETAILS).find((k) => errs[k]);
    if (first) detailsRef.current?.querySelector(`[name="${first}"]`)?.focus();
    return Boolean(first);
  };

  const onSendDetails = async (e) => {
    e.preventDefault();
    if (busy) return;
    const errs = validateDetails(details);
    setErrors(errs);
    setServerError("");
    if (focusDetail(errs)) return;
    setBusy(true);
    try {
      await sendDetails(lead, details);
      setStep("done");
    } catch (err) {
      const kind = failWith(err);
      if (kind === "already_submitted") {
        setServerError("");
        setStep("done");
      } else if (kind === "validation") {
        setErrors(err.fields);
        focusDetail(err.fields);
      }
    } finally {
      setBusy(false);
    }
  };

  const serverAlert = (
    <div className="wl-status" role="alert">
      {serverError ? (
        <p className="wl-server-error">
          <Icon name="circle-alert" size={16} strokeWidth={2.4} />
          {serverError}
        </p>
      ) : null}
    </div>
  );

  // ---------- Step 3: done ----------
  if (step === "done") {
    return (
      <div className="wl-card wl-done" role="status" tabIndex={-1} ref={statusRef}>
        <span className="wl-check">
          <Icon name="check" size={26} strokeWidth={2.6} />
        </span>
        <h3 className="title-3">{skipped ? WAITLIST.joinedTitle : WAITLIST.doneTitle}</h3>
        <p className="wl-card-body">{skipped ? WAITLIST.joinedBody : WAITLIST.doneBody}</p>
      </div>
    );
  }

  // ---------- Step 2 view ----------
  if (step === "details") {
    const field = (name, extra = {}) => ({
      id: id(name),
      name,
      value: details[name],
      onChange: (e) => setDetail(name, e.target.value),
      onBlur: onDetailBlur,
      "aria-invalid": errors[name] ? true : undefined,
      "aria-describedby": errors[name] ? id(`${name}-err`) : undefined,
      ...extra,
    });
    const error = (name) =>
      errors[name] ? (
        <p className="wl-error" id={id(`${name}-err`)}>
          <Icon name="circle-alert" size={14} strokeWidth={2.4} />
          {errors[name]}
        </p>
      ) : null;
    const label = (name, text) => (
      <label className="wl-label" htmlFor={id(name)}>
        {text}
      </label>
    );
    const select = (name, text, options) => (
      <div className="wl-field">
        {label(name, text)}
        <div className="wl-select">
          <select {...field(name)}>
            <option value="">Choose…</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" size={16} strokeWidth={2.4} />
        </div>
      </div>
    );

    return (
      <div className="wl-card">
        <div className="wl-joined" role="status" tabIndex={-1} ref={statusRef}>
          <span className="wl-check wl-check-small">
            <Icon name="check" size={18} strokeWidth={2.8} />
          </span>
          <span>{WAITLIST.joinedTitle}</span>
        </div>
        <h3 className="title-2 wl-details-title">{WAITLIST.detailsTitle}</h3>
        <p className="wl-card-body">{WAITLIST.detailsLead}</p>

        <form ref={detailsRef} className="wl-form" noValidate onSubmit={onSendDetails} aria-busy={busy}>
          <fieldset className="wl-group">
            <legend className="wl-group-title">About you</legend>
            <div className="wl-field">
              {label("fullName", "Full name")}
              <input {...field("fullName")} type="text" autoComplete="name" maxLength={120} />
              {error("fullName")}
            </div>
            <div className="wl-field">
              {label("phone", "Phone")}
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
              <input {...field("company")} type="text" autoComplete="organization" maxLength={160} />
              {error("company")}
            </div>
            <div className="wl-field">
              {label("country", "Country of incorporation")}
              <input
                {...field("country")}
                type="text"
                autoComplete="country-name"
                maxLength={80}
                placeholder="United Kingdom"
              />
              {error("country")}
            </div>
            {select("businessType", "Business type", BUSINESS_TYPES)}
            {select("monthlyVolume", "Expected monthly volume", MONTHLY_VOLUMES)}
            <div className="wl-field" role="group" aria-labelledby={id("currencies-label")}>
              <span className="wl-label" id={id("currencies-label")}>
                Currencies you need
              </span>
              <div className="wl-toggles">
                {CURRENCIES.map((code) => {
                  const on = details.currencies.includes(code);
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
              {label("message", "Message")}
              <textarea {...field("message")} rows={4} maxLength={2000} />
              {error("message")}
            </div>
          </fieldset>

          <div className="wl-actions">
            <div className="wl-actions-row">
              <button type="submit" className="btn btn-filled btn-large" disabled={busy || !hasAnyDetail(details)}>
                {busy ? (
                  <>
                    <Icon name="loader" size={18} className="wl-spin" /> {WAITLIST.sending}
                  </>
                ) : (
                  WAITLIST.sendDetails
                )}
              </button>
              <button
                type="button"
                className="btn wl-plain"
                onClick={() => {
                  setSkipped(true);
                  setStep("done");
                }}
              >
                {WAITLIST.skip}
              </button>
            </div>
            {serverAlert}
          </div>
        </form>
      </div>
    );
  }

  // ---------- Step 1 view ----------
  const showCount = count !== null && count >= MIN_COUNT;
  return (
    <form className="wl-join" noValidate onSubmit={onJoin} aria-busy={busy}>
      <div className={"wl-pill" + (emailError ? " is-invalid" : "")}>
        <label className="visually-hidden" htmlFor={id("email")}>
          {WAITLIST.emailLabel}
        </label>
        <input
          ref={emailRef}
          id={id("email")}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          required
          placeholder={WAITLIST.emailPlaceholder}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(validateEmail(e.target.value) || "");
          }}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={[emailError ? id("email-err") : null, id("consent")].filter(Boolean).join(" ")}
        />
        <button type="submit" className="btn btn-filled wl-join-btn" disabled={busy || !email.trim()}>
          {busy ? (
            <>
              <Icon name="loader" size={16} className="wl-spin" />
              <span className="visually-hidden">{WAITLIST.joining}</span>
            </>
          ) : (
            WAITLIST.join
          )}
        </button>
      </div>

      {/* Honeypot: off-screen and skipped by keyboard + assistive tech. */}
      <div className="wl-hp" aria-hidden="true">
        <label htmlFor={id("website")}>Website</label>
        <input
          id={id("website")}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {emailError ? (
        <p className="wl-error wl-join-error" id={id("email-err")}>
          <Icon name="circle-alert" size={14} strokeWidth={2.4} />
          {emailError}
        </p>
      ) : null}
      {serverAlert}

      <p className="wl-meta">
        {showCount ? (
          <>
            <strong>{WAITLIST.count(count)}</strong>
            <span aria-hidden="true"> · </span>
          </>
        ) : null}
        <span>{WAITLIST.launch}</span>
      </p>
      <p className="footnote wl-consent-note" id={id("consent")}>
        {WAITLIST.consent}
      </p>
    </form>
  );
}
