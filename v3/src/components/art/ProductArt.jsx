// ProductArt.jsx — the drawn art for the product gallery (Apple's approach on the
// MacBook Air page: show the real product, one focal moment per tile, a little
// depth from layers that overlap). Each is a small piece of the app with
// illustrative data, drawn in HTML so it is sharp at any size and follows light
// and dark mode. Decorative: each tile's own text says what the art shows.
// Placeholder bank codes (XXXX) as in the account-details explorer.
import { useContext, useEffect, useRef, useState } from "react";
import Flag from "../ui/Flag.jsx";
import Icon from "../ui/Icon.jsx";
import logo from "../../assets/logo-g.png";
import AddAccountPhone from "./AddAccountPhone.jsx";
import { GalleryPaused } from "../../lib/galleryMotion.js";
import { useAutoAdvance } from "../../lib/useAutoAdvance.js";
import "./ProductArt.css";

// ---------- Scripted art: short "screen recordings" drawn in HTML ----------
// A script is a list of steps: each a full snapshot of the screen and how long
// it lasts (`script` carries values forward; a press lasts one step). It plays
// only while the tile is on screen, holds while the gallery is paused, and
// doesn't play under Reduce Motion (the art shows a still instead).
function script(parts) {
  let state = {};
  return parts.map((p) => (state = { ...state, press: false, ...p }));
}

function useScript(steps) {
  const paused = useContext(GalleryPaused);
  const { ref, running, autoplayAllowed } = useAutoAdvance({ enabled: !paused, threshold: 0.5 });
  const [i, setI] = useState(0);
  const still = !autoplayAllowed;
  useEffect(() => {
    if (still || !running) return undefined;
    const t = setTimeout(() => setI((n) => (n + 1) % steps.length), steps[i].ms);
    return () => clearTimeout(t);
  }, [i, running, still, steps]);
  return { ref, step: steps[i], i, still };
}

// Where the pointer goes: the named target ([ref, x, y] as fractions of its
// box), measured as each step begins (after any scroll of the screen), so it
// lands on the drawing at any tile size.
function usePointer(root, targets, at, i) {
  const [spot, setSpot] = useState(null);
  const [resized, setResized] = useState(0);
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setResized((n) => n + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [root]);
  useEffect(() => {
    const r = root.current?.getBoundingClientRect();
    if (!r || !at) return;
    const [target, fx, fy] = targets[at] || [];
    if (!target?.current) {
      setSpot([r.width * 0.9, r.height * 0.94]);
      return;
    }
    const b = target.current.getBoundingClientRect();
    setSpot([b.left - r.left + b.width * fx, b.top - r.top + b.height * fy]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- targets are refs
  }, [at, i, resized, root]);
  return spot;
}

function Pointer({ spot, press }) {
  return (
    <span
      className={"art-pointer" + (spot ? " is-on" : "") + (press ? " is-pressed" : "")}
      style={spot ? { translate: `${spot[0]}px ${spot[1]}px` } : undefined}
    >
      <svg viewBox="0 0 22 28">
        <path
          d="M2 2v20.5l5.2-5 3.3 7.6 3.4-1.5-3.2-7.4H18L2 2Z"
          fill="#000"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

const Caret = () => <span className="art-caret" />;

// 2 · Separate details, one account — the app's own new-account flow: "Kensington"
// is typed into the account name (the counter climbs to 24/30), the pointer taps
// Create account, the "created" dialog appears and it taps Not now (skipping team
// access), then the new GBP account's details slide in. Placeholder codes, as in
// the account-details explorer.
const ACCT_NAME = "London Office Kensington";
const ACCT_TYPED = 14; // "London Office " is already typed
const ACCT_STEPS = script([
  { typed: ACCT_TYPED, at: "field", dialog: false, details: false, out: false, ms: 1000 },
  ...Array.from({ length: ACCT_NAME.length - ACCT_TYPED }, (_, k) => ({ typed: ACCT_TYPED + k + 1, ms: 120 })),
  { ms: 600 },
  { at: "create", ms: 700 },
  { press: true, ms: 200 },
  { dialog: true, ms: 1400 },
  { at: "notnow", ms: 700 },
  { press: true, ms: 200 },
  { at: "rest", dialog: false, details: true, ms: 3600 },
  { out: true, ms: 500 },
]);

function NewAccount() {
  const { ref, step, i, still } = useScript(ACCT_STEPS);
  const field = useRef(null);
  const create = useRef(null);
  const notNow = useRef(null);
  const s = still ? { typed: ACCT_NAME.length } : step;
  const spot = usePointer(
    ref,
    { field: [field, 0.86, 0.72], create: [create, 0.62, 0.55], notnow: [notNow, 0.58, 0.55] },
    still ? null : s.at,
    i,
  );
  return (
    <div
      ref={ref}
      className={"art art-newacct" + (s.dialog ? " is-dialog" : "") + (s.details && !s.out ? " is-details" : "")}
    >
      <div className="art-panel">
        <div className="art-title">
          <strong>Account name</strong>
          <span className="art-currency art-muted">
            <Flag code="GB" size="1.15em" /> British pound · GBP
          </span>
        </div>
        <div className="art-cell" ref={field}>
          <span className="art-muted">Account name</span>
          <strong>
            {ACCT_NAME.slice(0, s.typed)}
            <Caret />
          </strong>
        </div>
        <span className="art-counter art-muted">{s.typed}/30</span>
        <span ref={create} className={"art-cta" + (s.press && s.at === "create" ? " is-pressed" : "")}>
          Create account
        </span>

        {/* The app's "created" dialog; the team-access step is skipped */}
        <div className="art-dialog-wrap">
          <div className="art-dialog">
            <span className="art-dialog-check">
              <Icon name="check" size="1.4em" strokeWidth={3} />
            </span>
            <strong>{ACCT_NAME} created</strong>
            <span className="art-muted">Choose which team members can view it.</span>
            <span className="art-btn is-primary">Manage access</span>
            <span ref={notNow} className={"art-btn" + (s.press && s.at === "notnow" ? " is-pressed" : "")}>
              Not now
            </span>
          </div>
        </div>

        {/* The new account's own details, in the company's name */}
        <div className="art-acct-details">
          <p className="art-head">
            <span>Account details</span>
          </p>
          <span className="art-acct-chip">
            <Flag code="GB" size="1.5em" />
            <strong>{ACCT_NAME} · GBP</strong>
          </span>
          <span className="art-kv">
            <span className="art-muted">Recipient</span>
            <strong>ACME Studios Ltd</strong>
          </span>
          <span className="art-kv">
            <span className="art-muted">Sort code</span>
            <strong>00-00-00</strong>
          </span>
          <span className="art-kv">
            <span className="art-muted">Account number</span>
            <strong>12345678</strong>
          </span>
        </div>
      </div>

      {still ? (
        // The still picture: the finished form, and the account it made.
        <div className="art-float art-created">
          <Flag code="GB" size="2.2em" />
          <span className="art-grow">
            <strong>{ACCT_NAME}</strong>
            <span className="art-muted">GBP · 00-00-00 · 12345678</span>
          </span>
          <span className="art-amount">£0</span>
        </div>
      ) : (
        <Pointer spot={spot} press={s.press} />
      )}
    </div>
  );
}

// 3 · Faster Payments, CHAPS & Bacs — the big number, and the three routes.
function UkPayments() {
  const routes = [
    { name: "Faster Payments", when: "Seconds, 24/7", on: true },
    { name: "CHAPS", when: "Same day" },
    { name: "Bacs", when: "Receiving" },
  ];
  return (
    <div className="art art-uk">
      <div className="art-panel art-hero">
        <span className="art-kicker">
          <Flag code="GB" size="1.25em" />
          Received
        </span>
        <span className="art-big">£12,480</span>
        <span className="art-status">
          <span className="art-live" />
          Faster Payments · moments ago
        </span>
      </div>
      <div className="art-seg">
        {routes.map((r) => (
          <span key={r.name} className={"art-seg-item" + (r.on ? " is-on" : "")}>
            <strong>{r.name}</strong>
            <span className="art-muted">{r.when}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// 5 · Confirmation of Payee — adding a business recipient, as the app does it:
// France and Euro already chosen, the last digits of the IBAN typed (the bank
// shows up), the company name typed with a typo, "Name is a close match" →
// Replace and continue, then the review: amount, reference, Add to trusted,
// Send. About 19 seconds (Ilia: 0.7× the first cut's pace). The IBAN is made
// up (French format; the bank code is CIC's, whose name and logo the app shows);
// the payee is fictional.
const COP_IBAN_HEAD = "FR76 3006 6100 1123 4";
const COP_IBAN_TAIL = "567 890";
const COP_IBAN_CUTS = [0, 1, 2, 3, 5, 6, 7]; // after each digit typed (the space comes with the next)
const COP_PACE = 1 / 0.7;
const COP_TYPO = "Acome Logistics";
const COP_PAYEE = "Acme Logistics";
const COP_AMOUNTS = ["€0", "€3", "€33", "€330", "€3,300"];
const COP_REF = "Contract 121110-1";
const COP_START = {
  screen: "form",
  iban: 0,
  bank: false,
  scroll: false,
  name: 0,
  replaced: false,
  sheet: false,
  amount: 0,
  ref: 0,
  rscroll: false,
  trusted: false,
  sent: false,
  out: false,
  at: "iban",
};
const COP_STEPS = script([
  { ...COP_START, reset: true, ms: 700 },
  { reset: false, iban: 1, ms: 180 },
  ...[2, 3, 4, 5].map((k) => ({ iban: k, ms: 180 })),
  { iban: 6, ms: 250 },
  { bank: true, ms: 600 },
  { scroll: true, ms: 450 },
  { at: "company", ms: 500 },
  ...Array.from({ length: COP_TYPO.length }, (_, k) => ({ name: k + 1, ms: 75 })),
  { at: "add", ms: 550 },
  { press: true, ms: 180 },
  { sheet: true, ms: 1300 },
  { at: "replace", ms: 550 },
  { press: true, ms: 180 },
  { sheet: false, replaced: true, screen: "review", at: "amount", ms: 500 },
  ...[1, 2, 3, 4].map((k) => ({ amount: k, ms: 130 })),
  { at: "ref", ms: 450 },
  ...Array.from({ length: COP_REF.length }, (_, k) => ({ ref: k + 1, ms: 45 })),
  { rscroll: true, ms: 450 },
  { at: "trust", ms: 500 },
  { press: true, trusted: true, ms: 250 },
  { at: "send", ms: 500 },
  { press: true, ms: 180 },
  { sent: true, at: "rest", ms: 1800 },
  { out: true, ms: 400 },
]).map((step) => ({ ...step, ms: Math.round(step.ms * COP_PACE) }));
// Under Reduce Motion: the name check itself, over the filled form.
const COP_STILL = { ...COP_START, iban: 6, bank: true, scroll: true, name: COP_TYPO.length, sheet: true, at: null };

// CIC's mark (public domain, Wikimedia Commons: "Crédit Industriel et Commercial
// Logo.svg"), on a white disc as the app shows a recipient's bank.
function CicLogo({ badge }) {
  return (
    <span className={"art-bank-logo" + (badge ? " is-badge" : "")}>
      <svg viewBox="388.78 509.44 113.87 51.56">
        <path d="m451.09 561v-11.11h-10.76l.007-40.44h-51.55v51.55z" fill="#254aa5" />
        <path d="m502.64 561v-51.55h-62.3v11.12l10.75.002v40.43z" fill="#008b91" />
        <path
          d="m427.63 543.72-1.32 4.8c-2.71 1.31-5.93 1.82-8.96 1.82-9.69 0-17.02-5.58-17.02-14.25 0-11.04 8.14-16.07 18.01-16.07 2.99 0 6.61.72 9.24 2.07-.41 1.44-.85 3.6-1.21 5.08l-.47-.72c-1.67-2.28-4.57-3.89-7.51-3.89-7.52 0-10.55 6.73-10.55 12.94 0 7.24 3.8 12.31 10.77 12.31 2.8 0 6.06-1.36 8.1-3.17l.91-.92z"
          fill="#fff"
        />
        <path
          d="m490.07 543.77-1.32 4.8c-2.72 1.31-5.93 1.82-8.96 1.82-9.69 0-17.01-5.59-17.01-14.26 0-11.04 8.14-16.07 18.01-16.07 2.99 0 6.61.72 9.24 2.07-.41 1.44-.84 3.59-1.21 5.07l-.47-.72c-1.67-2.28-4.57-3.89-7.51-3.89-7.51 0-10.54 6.72-10.54 12.94 0 7.24 3.8 12.31 10.77 12.31 2.8 0 6.06-1.35 8.1-3.17l.91-.91z"
          fill="#fff"
        />
        <path d="m451.09 549.88v-29.32h-10.75v29.32z" fill="#f1471d" stroke="#f1471d" strokeWidth="1.25" />
      </svg>
    </span>
  );
}

function PayeeCheck() {
  const { ref, step, i, still } = useScript(COP_STEPS);
  const s = still ? COP_STILL : step;
  const iban = useRef(null);
  const company = useRef(null);
  const add = useRef(null);
  const replace = useRef(null);
  const amount = useRef(null);
  const refField = useRef(null);
  const trust = useRef(null);
  const send = useRef(null);
  const spot = usePointer(
    ref,
    {
      iban: [iban, 0.82, 0.72],
      company: [company, 0.82, 0.72],
      add: [add, 0.62, 0.55],
      replace: [replace, 0.6, 0.55],
      amount: [amount, 0.9, 0.85],
      ref: [refField, 0.86, 0.72],
      trust: [trust, 0.9, 0.55],
      send: [send, 0.6, 0.55],
    },
    still ? null : s.at,
    i,
  );
  const review = s.screen === "review";
  const pressed = (at) => (s.press && s.at === at ? " is-pressed" : "");
  return (
    <div
      ref={ref}
      className={
        "art art-cop" +
        (s.sheet ? " is-sheet" : "") +
        (s.sent && !s.out ? " is-sent" : "") +
        (s.out ? " is-out" : "") +
        (s.reset ? " is-reset" : "")
      }
    >
      <div className="art-panel art-screen">
        <div className="art-view" style={{ translate: `${review ? "-100%" : "0"} ${s.scroll ? -2.65 : 0}em` }}>
          <strong className="art-screen-title">Add recipient</strong>
          <div className="art-pair">
            <div className="art-cell">
              <span className="art-muted">Country or region</span>
              <strong className="art-currency">
                <Flag code="FR" size="1.15em" /> France
              </strong>
            </div>
            <div className="art-cell">
              <span className="art-muted">Currency</span>
              <strong className="art-currency">
                <Flag code="EU" size="1.15em" /> Euro
              </strong>
            </div>
          </div>
          <div className="art-cell" ref={iban}>
            <span className="art-muted">IBAN</span>
            <strong>
              {COP_IBAN_HEAD + COP_IBAN_TAIL.slice(0, COP_IBAN_CUTS[s.iban])}
              {s.at === "iban" ? <Caret /> : null}
            </strong>
          </div>
          <span className={"art-bank" + (s.bank ? " is-on" : "")}>
            <CicLogo /> CM - CIC Banques
          </span>
          <div className="art-cell" ref={company}>
            <span className="art-muted">Company name</span>
            <strong>
              {s.replaced ? COP_PAYEE : COP_TYPO.slice(0, s.name)}
              {s.at === "company" ? <Caret /> : "\u200b" /* holds the line while empty */}
            </strong>
          </div>
          <span ref={add} className={"art-cta" + pressed("add")}>
            Add recipient
          </span>
        </div>

        <div className="art-scrim" />
        {/* The name check: a close match, as the payer's bank reports it */}
        <div className="art-sheet">
          <span className="art-sheet-grip" />
          <Icon name="triangle-alert" size="1.7em" strokeWidth={2.2} />
          <strong>Name is a close match</strong>
          <span className="art-sheet-text">Money sent to the wrong account may not come back.</span>
          <span className="art-sheet-kv">
            <span>
              <span className="art-muted">You entered</span>
              <span>{COP_TYPO}</span>
            </span>
            <span>
              <span className="art-muted">Did you mean</span>
              <span>ACME LOGISTICS?</span>
            </span>
          </span>
          <span ref={replace} className={"art-btn is-primary" + pressed("replace")}>
            Replace and continue
          </span>
          <span className="art-btn">Keep what I entered</span>
        </div>

        <div className="art-view" style={{ translate: `${review ? "0" : "100%"} ${s.rscroll ? -5.5 : 0}em` }}>
          <span className="art-review-head">Review transfer</span>
          <strong ref={amount} className="art-review-amount">
            {COP_AMOUNTS[s.amount]}
          </strong>
          <div className="art-cop-payee">
            <span className="art-avatar purple">
              AL
              <CicLogo badge />
            </span>
            <span className="art-grow">
              <strong>
                {COP_PAYEE}
                <span className="art-ok">
                  <Icon name="check" size="0.75em" strokeWidth={3.4} />
                </span>
              </strong>
              <span className="art-match">All details match</span>
              <span className="art-muted">{COP_IBAN_HEAD + COP_IBAN_TAIL}</span>
              <span className="art-muted">CM - CIC Banques</span>
            </span>
          </div>
          <div className="art-cell" ref={refField}>
            <span className="art-muted">Reference</span>
            <strong>
              {COP_REF.slice(0, s.ref)}
              {s.at === "ref" ? <Caret /> : " "}
            </strong>
          </div>
          <div className="art-toggle-row" ref={trust}>
            <span>Add to trusted</span>
            <span className={"art-switch" + (s.trusted ? " is-on" : "")} />
          </div>
          <span ref={send} className={"art-cta" + pressed("send")}>
            Send
          </span>
        </div>

        <div className="art-sent">
          <span className="art-dialog-check">
            <Icon name="check" size="1.6em" strokeWidth={3} />
          </span>
          <strong>€3,300 sent</strong>
          <span className="art-muted">to {COP_PAYEE}</span>
        </div>
      </div>
      {still ? null : <Pointer spot={spot} press={s.press} />}
    </div>
  );
}

// 4 · SEPA & SEPA Instant — the same payment, two speeds.
function EuroPayment() {
  return (
    <div className="art art-sepa">
      <div className="art-panel">
        <div className="art-payee">
          <span className="art-avatar graphite">LG</span>
          <span className="art-grow">
            <strong>Linde GmbH</strong>
            <span className="art-mono art-muted">DE00 XXXX ···· 4410</span>
          </span>
          <Flag code="EU" size="1.6em" />
        </div>
        <span className="art-big">€4,210</span>
        <div className="art-options">
          <span className="art-option is-on">
            <span className="art-grow">
              <strong>SEPA Instant</strong>
              <span className="art-muted">Arrives in seconds</span>
            </span>
            <span className="art-radio" />
          </span>
          <span className="art-option">
            <span className="art-grow">
              <strong>SEPA</strong>
              <span className="art-muted">Next business day</span>
            </span>
            <span className="art-radio" />
          </span>
        </div>
      </div>
    </div>
  );
}

// 6 · SWIFT — follow the payment, and choose who pays the fees.
function SwiftTracker() {
  const steps = [
    { label: "Sent", time: "09:14", state: "done" },
    { label: "With the correspondent bank", time: "11:02", state: "done" },
    { label: "Arriving today", time: "", state: "now" },
  ];
  return (
    <div className="art art-swift">
      <div className="art-panel">
        <div className="art-payee">
          <Flag code="US" size="1.9em" />
          <span className="art-grow">
            <strong className="art-amount-lg">$9,184</strong>
            <span className="art-muted">To Pacific Supply Co · SWIFT</span>
          </span>
        </div>
        <ol className="art-track">
          {steps.map((s) => (
            <li key={s.label} className={`is-${s.state}`}>
              <span className="art-step" />
              <span className="art-grow">{s.label}</span>
              <span className="art-muted">{s.time}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="art-float art-fees">
        <span className="art-muted">Fees paid by</span>
        <span className="art-chips">
          <span className="is-on">You</span>
          <span>Shared</span>
          <span>Them</span>
        </span>
      </div>
    </div>
  );
}

// 7 · Virtual cards — the company's cards, and a card's monthly limit.
function CompanyCards() {
  return (
    <div className="art art-cards">
      <div className="art-card art-card-back">
        <span className="art-card-type">Physical</span>
        <span className="art-card-num">•••• 3310</span>
      </div>
      <div className="art-card art-card-front">
        <div className="art-card-top">
          <img className="art-card-logo" src={logo} alt="" width="12" height="16" />
          <span className="art-card-type">Virtual</span>
        </div>
        <Contactless />
        <div className="art-card-bottom">
          <span>Marketing</span>
          <span className="art-card-num">•••• 7421</span>
        </div>
      </div>
      <div className="art-float art-limit">
        <span className="art-limit-row">
          <strong>£1,240</strong>
          <span className="art-muted">of £2,000 this month</span>
        </span>
        <span className="art-bar">
          <span style={{ width: "62%" }} />
        </span>
      </div>
    </div>
  );
}

function Contactless() {
  return (
    <svg
      className="art-contactless"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M8.5 8.5a5 5 0 0 1 0 7" />
      <path d="M12 6a8.5 8.5 0 0 1 0 12" />
      <path d="M15.5 3.5a12 12 0 0 1 0 17" />
    </svg>
  );
}

// 8 · Compliance-led onboarding — a verification checklist, including the group.
function Onboarding() {
  const rows = [
    { label: "Company details", state: "done" },
    { label: "Directors and owners", state: "done" },
    { label: "Group structure", state: "done" },
    { label: "Source of funds", state: "review" },
  ];
  return (
    <div className="art art-kyb">
      <div className="art-panel">
        <p className="art-head">
          <span>Business verification</span>
          <span className="art-muted">3 of 4</span>
        </p>
        <span className="art-bar">
          <span style={{ width: "75%" }} />
        </span>
        <ul className="art-checks">
          {rows.map((r) => (
            <li key={r.label} className={`is-${r.state}`}>
              <span className={"art-dot " + (r.state === "done" ? "green" : "purple")}>
                <Icon name={r.state === "done" ? "check" : "loader"} size="1em" strokeWidth={3} />
              </span>
              <span className="art-grow">{r.label}</span>
              {r.state === "review" ? <span className="art-pill">In review</span> : null}
            </li>
          ))}
        </ul>
      </div>
      <div className="art-float art-doc">
        <span className="art-doc-icon">
          <Icon name="file-text" size="1.1em" />
        </span>
        <span className="art-grow">
          <strong>Group chart.pdf</strong>
          <span className="art-muted">Uploaded</span>
        </span>
      </div>
    </div>
  );
}

export const PRODUCT_ART = {
  "add-account": AddAccountPhone,
  named: NewAccount,
  "uk-rails": UkPayments,
  cop: PayeeCheck,
  sepa: EuroPayment,
  swift: SwiftTracker,
  cards: CompanyCards,
  kyb: Onboarding,
};
