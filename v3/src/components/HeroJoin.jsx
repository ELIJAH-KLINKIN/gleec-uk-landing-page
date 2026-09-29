// HeroJoin.jsx — the hero's email pill: the work-email field and "Join the Waitlist"
// in one control (the Ramp pattern). Joining here hands the lead to the waitlist
// section below, which asks for the optional details, and glides there.
import { useEffect, useId, useRef, useState } from "react";
import { HERO } from "../content.js";
import { LEAD_ERROR_MESSAGES, LeadError, joinWaitlist, validateEmail } from "../lib/leads.js";
import { announceJoined } from "../lib/prefill.js";
import Icon from "./ui/Icon.jsx";
import "./WaitlistForm.css";

export default function HeroJoin() {
  const uid = useId();
  const id = (name) => `${uid}-${name}`;
  const startedAt = useRef(0);
  const inputRef = useRef(null);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState("");
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy || joined) return;
    const problem = validateEmail(email);
    setError(problem || "");
    setServerError("");
    if (problem) {
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await joinWaitlist({ email, website }, { startedAt: startedAt.current });
      setJoined(true);
      announceJoined({ id: res.id, token: res.token, email });
      document.getElementById("waitlist")?.scrollIntoView({ block: "start" });
    } catch (err) {
      const kind = err instanceof LeadError ? err.kind : "server";
      if (kind === "validation") {
        setError(err.fields.email || LEAD_ERROR_MESSAGES.validation);
        inputRef.current?.focus();
      } else {
        setServerError(LEAD_ERROR_MESSAGES[kind] || LEAD_ERROR_MESSAGES.server);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hero-join">
      <form noValidate onSubmit={onSubmit} aria-busy={busy}>
        <div className={"wl-pill" + (error ? " is-invalid" : "")}>
          <label className="visually-hidden" htmlFor={id("email")}>
            {HERO.emailLabel}
          </label>
          <input
            ref={inputRef}
            id={id("email")}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            required
            readOnly={joined}
            placeholder={HERO.emailPlaceholder}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(validateEmail(e.target.value) || "");
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? id("err") : undefined}
          />
          {joined ? (
            <span className="tk-pill-check hero-join-check" role="status" aria-label={HERO.joined}>
              <Icon name="check" size={16} strokeWidth={2.8} />
            </span>
          ) : (
            <button type="submit" className="btn btn-filled wl-join-btn" disabled={busy}>
              {busy ? <Icon name="loader" size={16} className="wl-spin" /> : null}
              {HERO.primary.label}
            </button>
          )}
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
      </form>

      {error ? (
        <p className="wl-error" id={id("err")}>
          <Icon name="circle-alert" size={14} strokeWidth={2.4} />
          {error}
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

      {HERO.demo.href ? (
        <a className="link-chevron hero-demo" href={HERO.demo.href}>
          {HERO.demo.label}
          <Icon name="chevron-right" size={18} />
        </a>
      ) : null}
    </div>
  );
}
