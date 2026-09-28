// TalkToHuman.jsx — "Still have questions? Talk to a human." after the FAQ.
//   1. Your email:  a pill field + "Talk to a Human" (no network yet).
//   2. About you:   the card opens underneath; first + last name required.
//   3. Pick a time: the next free slots in the hosts' Google Calendars, shown in the
//                   visitor's time zone; booking sends a Google Meet invitation.
// A stepper above the form shows where the visitor is, so it's clear how short it is.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { TALK } from "../content.js";
import { TalkError, bookSlot, fetchSlots, requestCall, validateTalkDetails, validateTalkEmail } from "../lib/talk.js";
import Icon from "./ui/Icon.jsx";
import SectionHeader from "./ui/SectionHeader.jsx";
import "./WaitlistForm.css";
import "./TalkToHuman.css";

const EMPTY = { firstName: "", lastName: "", phone: "", company: "", companyWebsite: "", message: "" };

const SERVER_MESSAGES = {
  rate_limited: "Too many attempts from this connection. Wait a few minutes, then try again.",
  network: "Unable to reach the server. Check your connection and try again.",
  server: "Unable to send right now. Try again in a moment.",
  validation: "Check the highlighted fields.",
};

const localZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

// Slots come as UTC instants grouped by London date; show them by the visitor's own date.
function groupByLocalDay(days, timeZone) {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const map = new Map();
  for (const d of days) {
    for (const iso of d.slots) {
      const k = key.format(new Date(iso));
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(iso);
    }
  }
  return [...map.entries()].map(([date, slots]) => ({ date, slots: slots.sort() }));
}

const fmt = (timeZone, options) => new Intl.DateTimeFormat("en-GB", { timeZone, ...options });

function Stepper({ step }) {
  const index = { email: 0, details: 1, time: 2, done: 3, later: 3 }[step];
  return (
    <ol className="tk-steps" aria-label="Steps">
      {TALK.steps.map((label, i) => {
        const state = i < index ? "done" : i === index ? "current" : "todo";
        return (
          <li
            key={label}
            className="tk-step"
            data-state={state}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className="tk-step-dot" aria-hidden="true">
              {state === "done" ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}
            </span>
            <span className="tk-step-label">
              {label}
              {state === "done" ? <span className="visually-hidden"> (done)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function TalkToHuman() {
  const uid = useId();
  const id = (name) => `${uid}-${name}`;
  const startedAt = useRef(0);
  const cardRef = useRef(null);
  const headingRef = useRef(null);

  const [step, setStep] = useState("email"); // email | details | time | done | later
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [emailError, setEmailError] = useState("");
  const [details, setDetails] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [call, setCall] = useState(null); // { id, token }
  const [slots, setSlots] = useState(null); // { timeZone, durationMinutes, days }
  const [day, setDay] = useState(null);
  const [slot, setSlot] = useState(null);
  const [booking, setBooking] = useState(null);
  // The visitor's time zone. Only shown after they interact, so the server-rendered
  // HTML (which can't know it) never differs from the first client render.
  const zone = useMemo(localZone, []);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // Move focus to the new step's heading, so keyboard and screen-reader users follow along.
  useEffect(() => {
    if (step !== "email") headingRef.current?.focus({ preventScroll: true });
    if (step !== "email") cardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [step]);

  const days = useMemo(() => (slots ? groupByLocalDay(slots.days, zone) : []), [slots, zone]);
  const activeDay = days.find((d) => d.date === day) || days[0] || null;

  const onStart = (e) => {
    e.preventDefault();
    const problem = validateTalkEmail(email);
    setEmailError(problem || "");
    if (problem) return;
    setStep((s) => (s === "email" ? "details" : s));
  };

  const loadSlots = async (c) => {
    const data = await fetchSlots(c);
    if (!data.available) {
      setStep("later");
      return;
    }
    setSlots(data);
    setDay(null);
    setSlot(null);
    setStep("time");
  };

  const onBook = async (e) => {
    e.preventDefault();
    const found = validateTalkDetails(details);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      document.getElementById(id(first))?.focus();
      return;
    }
    setBusy(true);
    setServerError("");
    try {
      let c = call;
      if (!c) {
        const created = await requestCall({ email, website, ...details }, { startedAt: startedAt.current });
        c = { id: created.id, token: created.token };
        setCall(c);
        if (created.booking === false) {
          setStep("later");
          return;
        }
      }
      await loadSlots(c);
    } catch (err) {
      const kind = err instanceof TalkError ? err.kind : "server";
      if (kind === "validation") setErrors(err.fields);
      if (kind === "unavailable") setStep("later");
      else setServerError(kind === "not_configured" ? TALK.notLive : SERVER_MESSAGES[kind] || SERVER_MESSAGES.server);
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async (e) => {
    e.preventDefault();
    if (!slot || !call) return;
    setBusy(true);
    setServerError("");
    try {
      const data = await bookSlot(call, slot);
      setBooking(data.booking);
      setStep("done");
    } catch (err) {
      const kind = err instanceof TalkError ? err.kind : "server";
      if (kind === "slot_taken" || kind === "validation") {
        setServerError(TALK.taken);
        try {
          await loadSlots(call);
        } catch {
          /* keep the old list; the message above explains */
        }
      } else if (kind === "unavailable") setStep("later");
      else setServerError(SERVER_MESSAGES[kind] || SERVER_MESSAGES.server);
    } finally {
      setBusy(false);
    }
  };

  const setDetail = (name, value) => {
    setDetails((d) => ({ ...d, [name]: value }));
    if (errors[name]) setErrors((x) => ({ ...x, [name]: undefined }));
  };

  const field = (name, extra = {}) => ({
    id: id(name),
    name,
    value: details[name],
    onChange: (e) => setDetail(name, e.target.value),
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
  const input = (name, label, extra = {}, optional = true) => (
    <div className="wl-field">
      <label className="wl-label" htmlFor={id(name)}>
        {label}
        {optional ? <span className="tk-optional"> (optional)</span> : null}
      </label>
      <input {...field(name, extra)} />
      {error(name)}
    </div>
  );

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

  const spinner = (text) => (
    <>
      <Icon name="loader" size={18} className="wl-spin" /> {text}
    </>
  );

  // "Tuesday 29 September, 10:30–10:50" — the time range never breaks across lines.
  const when = (b) => {
    const dayText = fmt(zone, { weekday: "long", day: "numeric", month: "long" }).format(new Date(b.start));
    const t = (iso) => fmt(zone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
    return (
      <>
        {dayText}, <span className="tk-when-time">{`${t(b.start)}–${t(b.end)}`}</span>
      </>
    );
  };

  return (
    <section id="talk" className="section talk" aria-labelledby="talk-title">
      <div className="container">
        <SectionHeader id="talk-title" eyebrow={TALK.eyebrow} title={TALK.title} lead={TALK.lead} />

        <div className="tk">
          <Stepper step={step} />

          {/* Step 1 — stays on screen (and editable) until the call is requested. */}
          {step === "email" || step === "details" ? (
            <form className="wl-join tk-join" noValidate onSubmit={onStart}>
              <div className={"wl-pill" + (emailError ? " is-invalid" : "")}>
                <label className="visually-hidden" htmlFor={id("email")}>
                  {TALK.emailLabel}
                </label>
                <input
                  id={id("email")}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={254}
                  required
                  placeholder={TALK.emailLabel}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(validateTalkEmail(e.target.value) || "");
                  }}
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? id("email-err") : undefined}
                />
                {step === "email" ? (
                  <button type="submit" className="btn btn-filled wl-join-btn tk-start" disabled={!email.trim()}>
                    {TALK.start}
                  </button>
                ) : (
                  <span className="tk-pill-check" aria-hidden="true">
                    <Icon name="check" size={16} strokeWidth={2.8} />
                  </span>
                )}
              </div>
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
            </form>
          ) : null}

          {/* Step 2 — opens underneath the pill. */}
          {step === "details" ? (
            <div className="wl-card tk-card" ref={cardRef}>
              <h3 className="title-3 tk-card-title" tabIndex={-1} ref={headingRef}>
                {TALK.detailsTitle}
              </h3>
              <p className="wl-card-body tk-card-lead">{TALK.detailsLead}</p>
              <form className="wl-form tk-form" noValidate onSubmit={onBook} aria-busy={busy}>
                <div className="tk-row">
                  {input("firstName", "First name", { type: "text", autoComplete: "given-name", maxLength: 60 }, false)}
                  {input("lastName", "Last name", { type: "text", autoComplete: "family-name", maxLength: 60 }, false)}
                </div>
                {input("phone", "Phone number", {
                  type: "tel",
                  autoComplete: "tel",
                  inputMode: "tel",
                  maxLength: 40,
                  placeholder: "+44 20 7946 0000",
                })}
                <div className="tk-row">
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
                    Anything else we should know?<span className="tk-optional"> (optional)</span>
                  </label>
                  <textarea {...field("message")} rows={3} maxLength={2000} />
                  {error("message")}
                </div>
                <div className="wl-actions">
                  <div className="wl-actions-row">
                    <button type="submit" className="btn btn-filled btn-large" disabled={busy}>
                      {busy ? spinner(TALK.finding) : TALK.book}
                    </button>
                  </div>
                  {serverAlert}
                  <p className="tk-note">
                    {TALK.note} See our <a href="/privacy/">Privacy policy</a>.
                  </p>
                </div>
              </form>
            </div>
          ) : null}

          {/* Step 3 — pick a time. */}
          {step === "time" && activeDay ? (
            <div className="wl-card tk-card" ref={cardRef}>
              <h3 className="title-3 tk-card-title" tabIndex={-1} ref={headingRef}>
                {TALK.pickTitle}
              </h3>
              <p className="wl-card-body tk-card-lead">
                {TALK.pickLead(slots.durationMinutes)} {TALK.timeZoneNote(zone.replace(/_/g, " "))}
              </p>
              <form noValidate onSubmit={onConfirm} aria-busy={busy}>
                <fieldset className="tk-days">
                  <legend className="visually-hidden">Day</legend>
                  <div className="tk-chips tk-chips-days">
                    {days.map((d) => {
                      const date = new Date(`${d.date}T12:00:00Z`);
                      const on = d.date === activeDay.date;
                      return (
                        <label key={d.date} className={"tk-chip tk-day" + (on ? " is-on" : "")}>
                          <input
                            type="radio"
                            name={id("day")}
                            value={d.date}
                            checked={on}
                            onChange={() => {
                              setDay(d.date);
                              setSlot(null);
                            }}
                          />
                          <span className="tk-day-name">{fmt("UTC", { weekday: "short" }).format(date)}</span>
                          <span className="tk-day-date">
                            {fmt("UTC", { day: "numeric", month: "short" }).format(date)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <fieldset className="tk-times">
                  <legend className="visually-hidden">Time</legend>
                  <div className="tk-chips tk-chips-times">
                    {activeDay.slots.map((iso) => {
                      const label = fmt(zone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
                        new Date(iso),
                      );
                      return (
                        <label key={iso} className={"tk-chip tk-time" + (slot === iso ? " is-on" : "")}>
                          <input
                            type="radio"
                            name={id("time")}
                            value={iso}
                            checked={slot === iso}
                            onChange={() => setSlot(iso)}
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <div className="wl-actions tk-confirm">
                  <div className="wl-actions-row">
                    <button type="submit" className="btn btn-filled btn-large" disabled={busy || !slot}>
                      {busy
                        ? spinner(TALK.confirming)
                        : slot
                          ? TALK.confirm(
                              fmt(zone, {
                                weekday: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                                hourCycle: "h23",
                              }).format(new Date(slot)),
                            )
                          : TALK.book}
                    </button>
                  </div>
                  {serverAlert}
                </div>
              </form>
            </div>
          ) : null}

          {/* Done — booked, or we'll arrange a time by email. */}
          {step === "done" && booking ? (
            <div className="wl-card wl-done tk-card" ref={cardRef} role="status">
              <span className="wl-check">
                <Icon name="check" size={26} strokeWidth={2.6} />
              </span>
              <h3 className="title-3" tabIndex={-1} ref={headingRef}>
                {TALK.doneTitle}
              </h3>
              <p className="tk-when">{when(booking)}</p>
              <p className="wl-card-body">
                {TALK.doneInvite(email.trim())}
                {booking.hostName ? ` You’ll be talking to ${booking.hostName}.` : ""}
              </p>
              {booking.meetUrl ? (
                <a className="link-chevron" href={booking.meetUrl} rel="noopener noreferrer" target="_blank">
                  {TALK.join}
                  <Icon name="chevron-right" size={18} />
                </a>
              ) : null}
            </div>
          ) : null}
          {step === "later" ? (
            <div className="wl-card wl-done tk-card" ref={cardRef} role="status">
              <span className="wl-check">
                <Icon name="check" size={26} strokeWidth={2.6} />
              </span>
              <h3 className="title-3" tabIndex={-1} ref={headingRef}>
                {TALK.laterTitle}
              </h3>
              <p className="wl-card-body">{TALK.laterBody}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
