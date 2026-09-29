// WaitlistForm.jsx — email-first waitlist.
//   1. Join: a pill-shaped email field + Join button, with the live count of
//      companies on the list and the planned launch underneath.
//   2. Details (optional): name, then country, company, website and a note.
//   3. Done.
// Posts to the lead-intake API (../../leads-api): the lead is stored, the
// sales Telegram channel is alerted and the CRM webhook fires.
import { useEffect, useId, useRef, useState } from "react";
import { WAITLIST } from "../content.js";
import {
  LEAD_ERROR_MESSAGES as SERVER_MESSAGES,
  LeadError,
  fetchWaitlistCount,
  joinWaitlist,
  sendDetails,
  validateDetails,
  validateEmail,
} from "../lib/leads.js";
import { JOINED_EVENT, PREFILL_EVENT } from "../lib/prefill.js";
import CountrySelect from "./ui/CountrySelect.jsx";
import Icon from "./ui/Icon.jsx";
import "./WaitlistForm.css";

// Hide the count until the list is big enough to be worth showing.
const MIN_COUNT = Number(import.meta.env.VITE_WAITLIST_MIN_COUNT || 1);

// In the order the fields appear (the first field with an error gets focus).
const EMPTY_DETAILS = {
  firstName: "",
  lastName: "",
  country: "",
  company: "",
  companyWebsite: "",
  message: "",
  businessType: "", // set by a segment CTA, never shown
};

export default function WaitlistForm() {
  const uid = useId();
  const id = (name) => `${uid}-${name}`;
  const startedAt = useRef(0);
  const statusRef = useRef(null);
  const emailRef = useRef(null);
  const detailsRef = useRef(null);
  const fromHero = useRef(false); // joined in the hero: the hero glides here, don't jump

  const [step, setStep] = useState("join"); // join | details | done
  const [skipped, setSkipped] = useState(false);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [updates, setUpdates] = useState(false); // "Send me product updates", unticked by default
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
    // Joined from the hero pill: carry on here with the optional details.
    const onJoined = (e) => {
      const { id, token, email: joinedEmail } = e.detail || {};
      if (!id) return;
      fromHero.current = true;
      setEmail(joinedEmail || "");
      setLead({ id, token });
      setSkipped(!token);
      setStep(token ? "details" : "done");
    };
    window.addEventListener(PREFILL_EVENT, onPrefill);
    window.addEventListener(JOINED_EVENT, onJoined);
    return () => {
      alive = false;
      window.removeEventListener(PREFILL_EVENT, onPrefill);
      window.removeEventListener(JOINED_EVENT, onJoined);
    };
  }, []);

  // Move focus to the new content when the step changes (not on first render).
  useEffect(() => {
    if (step !== "join") statusRef.current?.focus({ preventScroll: fromHero.current });
    fromHero.current = false;
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
      const res = await joinWaitlist({ email, website, updates }, { startedAt: startedAt.current });
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
    const input = (name, text, extra = {}, optional = true) => (
      <div className="wl-field">
        <label className="wl-label" htmlFor={id(name)}>
          {text}
          {optional ? <span className="wl-optional"> (optional)</span> : null}
        </label>
        <input {...field(name, extra)} />
        {error(name)}
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
          <div className="wl-row">
            {input("firstName", "First name", { type: "text", autoComplete: "given-name", maxLength: 60 }, false)}
            {input("lastName", "Last name", { type: "text", autoComplete: "family-name", maxLength: 60 }, false)}
          </div>
          <div className="wl-field">
            <span className="wl-label" id={id("country-label")}>
              Country of incorporation<span className="wl-optional"> (optional)</span>
            </span>
            <CountrySelect
              id={id("country")}
              name="country"
              labelId={id("country-label")}
              value={details.country}
              onChange={(v) => setDetail("country", v)}
            />
          </div>
          <div className="wl-row">
            {input("company", "Company name", { type: "text", autoComplete: "organization", maxLength: 160 })}
            {input("companyWebsite", "Company website", {
              type: "text",
              inputMode: "url",
              autoComplete: "url",
              autoCapitalize: "none",
              spellCheck: false,
              maxLength: 200,
              placeholder: "acme.com",
            })}
          </div>
          <div className="wl-field">
            <label className="wl-label" htmlFor={id("message")}>
              Anything else we should know?<span className="wl-optional"> (optional)</span>
            </label>
            <textarea {...field("message")} rows={3} maxLength={2000} />
            {error("message")}
          </div>

          <div className="wl-actions">
            <div className="wl-actions-row">
              <button type="submit" className="btn btn-filled btn-large" disabled={busy}>
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
          aria-describedby={emailError ? id("email-err") : undefined}
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

      <label className="wl-updates">
        <input type="checkbox" name="updates" checked={updates} onChange={(e) => setUpdates(e.target.checked)} />
        {WAITLIST.updates}
      </label>

      <p className="wl-meta">
        {showCount ? (
          <>
            <strong>{WAITLIST.count(count)}</strong>
            <span aria-hidden="true"> · </span>
          </>
        ) : null}
        <span>{WAITLIST.launch}</span>
      </p>
    </form>
  );
}
