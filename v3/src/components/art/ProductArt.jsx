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

// 2 · Separate details, one account — the app's own new-account flow, played
// like a short screen recording: "Kensington" is typed into the account name
// (the counter climbs to 24/30), a pointer taps Create account, the "created"
// dialog appears and it taps Not now (skipping team access), then the new GBP
// account's details slide in. It plays only while the tile is on screen, holds
// when the gallery is paused, and is a still picture under Reduce Motion.
// Placeholder codes, as in the account-details explorer.
const ACCT_NAME = "London Office Kensington";
const ACCT_TYPED = 14; // "London Office " is already typed
const ACCT_STEPS = [
  { typed: ACCT_TYPED, at: "field", ms: 1000 },
  ...Array.from({ length: ACCT_NAME.length - ACCT_TYPED }, (_, i) => ({ typed: ACCT_TYPED + i + 1, at: "field", ms: 120 })),
  { at: "field", ms: 600 },
  { at: "create", ms: 700 },
  { at: "create", press: true, ms: 200 },
  { at: "create", dialog: true, ms: 1400 },
  { at: "notnow", dialog: true, ms: 700 },
  { at: "notnow", dialog: true, press: true, ms: 200 },
  { at: "rest", details: true, ms: 3600 },
  { at: "rest", details: true, out: true, ms: 500 },
];

function NewAccount() {
  const paused = useContext(GalleryPaused);
  const { ref, running, autoplayAllowed } = useAutoAdvance({ enabled: !paused, threshold: 0.5 });
  const [i, setI] = useState(0);
  const [spots, setSpots] = useState(null);
  const field = useRef(null);
  const create = useRef(null);
  const notNow = useRef(null);
  const still = !autoplayAllowed; // Reduce Motion
  const step = still ? { typed: ACCT_NAME.length } : ACCT_STEPS[i];
  const typed = step.typed ?? ACCT_NAME.length;

  // Where the pointer goes, measured from the drawing itself (it scales with the tile).
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const measure = () => {
      const r = root.getBoundingClientRect();
      const at = (el, fx, fy) => {
        const b = el.getBoundingClientRect();
        return [b.left - r.left + b.width * fx, b.top - r.top + b.height * fy];
      };
      setSpots({
        field: at(field.current, 0.86, 0.72),
        create: at(create.current, 0.62, 0.55),
        notnow: at(notNow.current, 0.58, 0.55),
        rest: [r.width * 0.9, r.height * 0.92],
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [ref]);

  useEffect(() => {
    if (still || !running) return undefined;
    const t = setTimeout(() => setI((n) => (n + 1) % ACCT_STEPS.length), ACCT_STEPS[i].ms);
    return () => clearTimeout(t);
  }, [i, running, still]);

  const spot = spots && !still ? spots[step.at] : null;
  return (
    <div
      ref={ref}
      className={
        "art art-newacct" + (step.dialog ? " is-dialog" : "") + (step.details && !step.out ? " is-details" : "")
      }
    >
      <div className="art-panel">
        <div className="art-title">
          <strong>Account name</strong>
          <span className="art-currency art-muted">
            <Flag code="GB" size="1.15em" /> British pound · GBP
          </span>
        </div>
        <div className="art-cell">
          <span className="art-muted">Account name</span>
          <strong ref={field}>
            {ACCT_NAME.slice(0, typed)}
            <span className="art-caret" />
          </strong>
        </div>
        <span className="art-counter art-muted">{typed}/30</span>
        <span ref={create} className={"art-cta" + (step.press && step.at === "create" ? " is-pressed" : "")}>
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
            <span ref={notNow} className={"art-btn" + (step.press && step.at === "notnow" ? " is-pressed" : "")}>
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
        <span
          className={"art-pointer" + (spot ? " is-on" : "") + (step.press ? " is-pressed" : "")}
          style={spot ? { translate: `${spot[0]}px ${spot[1]}px` } : undefined}
        >
          <svg viewBox="0 0 22 28">
            <path d="M2 2v20.5l5.2-5 3.3 7.6 3.4-1.5-3.2-7.4H18L2 2Z" fill="#000" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </span>
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
          Faster Payments · 4 seconds
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

// 4 · Confirmation of Payee — the name is checked before the money moves.
function PayeeCheck() {
  return (
    <div className="art art-cop">
      <div className="art-panel">
        <p className="art-head">
          <span>New payee</span>
        </p>
        <div className="art-cell">
          <span className="art-muted">Name on the invoice</span>
          <strong>Hartwell & Frome Ltd</strong>
        </div>
        <div className="art-pair">
          <div className="art-cell">
            <span className="art-muted">Sort code</span>
            <strong className="art-mono">00-00-00</strong>
          </div>
          <div className="art-cell">
            <span className="art-muted">Account</span>
            <strong className="art-mono">12345678</strong>
          </div>
        </div>
      </div>
      <div className="art-float art-alert">
        <span className="art-dot orange">
          <Icon name="triangle-alert" size="1em" strokeWidth={2.6} />
        </span>
        <span className="art-grow">
          <strong>Name doesn’t match</strong>
          <span className="art-muted">Held by “HF Trading”. Check before you pay.</span>
        </span>
      </div>
    </div>
  );
}

// 5 · SEPA & SEPA Instant — the same payment, two speeds.
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
    <svg className="art-contactless" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
