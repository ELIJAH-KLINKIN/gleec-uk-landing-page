// WalletPhone.jsx — "try paying with a virtual card": a phone drawn in HTML/CSS
// that behaves like paying from the phone's wallet. It opens on the card with
// "Double Click to Pay" beside the side button. Double-click it → face check →
// "Hold Near Reader" → Done, with the payment notification. Tap the cards at the
// bottom to see the whole stack of Gleec cards and pick another. A generic phone
// (no maker's logo, no wallet brand): it shows how the card will feel, subject to
// issuer and scheme approval.
// It plays itself (not everyone will guess it can be tapped): the stack opens and
// each card pays in turn, Travel first. A Pause/Play button sits beside it. The
// visitor can take over at any moment: any tap on the phone stops the autoplay and
// hands them the controls. It waits while the pointer or keyboard focus is on it,
// off screen or in a hidden tab, and never plays under Reduce Motion.
import { useEffect, useRef, useState } from "react";
import logoWhite from "../../assets/logo-g-mask.png";
import { useAutoAdvance } from "../../lib/useAutoAdvance.js";
import Icon from "../ui/Icon.jsx";
import MerchantLogo from "../ui/MerchantLogo.jsx";
import PhoneFrame from "./PhoneFrame.jsx";
import "./WalletPhone.css";

// Example payments: each team card pays a merchant that team would. Travel takes a
// hotel in pounds, then a coffee in New York in dollars.
// Prices as published (30 Sep 2026): ChatGPT ads (OpenAI's self-serve Ads Manager,
// no minimum; $25–60 per thousand views), so $2,400 buys about 60,000 views;
// SuperGrok Heavy, $300 a month (shown as "SuperGrok" so the line fits); a 4-person
// WeWork private office in West London, from £1,840 a month before VAT; a Burning
// Man 2026 "Pay your Way" ticket, $775 before Nevada tax and fees, sold by Burning
// Man Project itself.
const RITZ = { merchant: "ritzcarlton", name: "The Ritz-Carlton", amount: "−£1,240", note: "within limit" };
const BLUE_BOTTLE = { merchant: "bluebottle", name: "Blue Bottle Coffee", amount: "−$7.50", note: "paid from USD" };

// Example cards (last four digits are illustrative).
const CARDS = [
  {
    id: "marketing",
    team: "Marketing",
    last4: "7421",
    tone: "purple",
    payments: [{ merchant: "openai", name: "OpenAI", amount: "−$2,400", note: "ChatGPT ads" }],
  },
  { id: "travel", team: "Travel", last4: "5520", tone: "graphite", payments: [RITZ, BLUE_BOTTLE] },
  {
    id: "engineering",
    team: "Engineering",
    last4: "3094",
    tone: "midnight",
    payments: [{ merchant: "xai", name: "xAI", amount: "−$300", note: "SuperGrok" }],
  },
  {
    id: "office",
    team: "Office",
    last4: "8816",
    tone: "silver",
    payments: [{ merchant: "wework", name: "WeWork", amount: "−£1,840", note: "4 desks, monthly" }],
  },
  {
    id: "events",
    team: "Events",
    last4: "1188",
    tone: "lilac",
    payments: [{ merchant: "burningman", name: "Burning Man Project", amount: "−$775", note: "entry ticket" }],
  },
];

const T = { auth: 1800, pay: 3600, done: 3600 }; // ms in each step
const DOUBLE_CLICK = 650; // two presses within this count as a double-click
// Autoplay: every card in turn, Travel first; and how long it lingers between steps.
const AUTO_ORDER = ["travel", "engineering", "office", "events", "marketing"];
const AUTO = { first: 2200, idle: 1600, stack: 1100, press: 350 };

export default function WalletPhone() {
  const [state, setState] = useState("idle"); // idle | auth | pay | done | stack
  const [cardId, setCardId] = useState(CARDS[0].id);
  const [payment, setPayment] = useState(CARDS[0].payments[0]);
  const [nudge, setNudge] = useState(0); // counts nudges, so the glow replays each time
  // auto: it plays itself · paused: frozen by the Pause button · manual: the visitor drives
  const [mode, setMode] = useState("auto");
  const [pressing, setPressing] = useState(null); // the card autoplay is about to tap
  const paid = useRef({}); // payments made per card, to take each card's next merchant
  const autoNext = useRef(0); // position in AUTO_ORDER
  const autoStarted = useRef(false);
  const timer = useRef(0);
  const autoTimer = useRef(0);
  const lastPress = useRef(0);
  const card = CARDS.find((c) => c.id === cardId);
  const others = CARDS.filter((c) => c.id !== cardId);
  const { ref: autoRef, running, autoplayAllowed, pauseProps } = useAutoAdvance({ enabled: mode === "auto" });
  const autoOn = mode === "auto" && autoplayAllowed;

  // The flow runs itself once started: face check → hold near reader → done → idle.
  // Pause freezes it where it is; Play picks it up again.
  const cardRef = useRef(card);
  cardRef.current = card;
  useEffect(() => {
    clearTimeout(timer.current);
    if (mode === "paused") return undefined;
    const ms = { auth: T.auth, pay: T.pay, done: T.done }[state];
    if (!ms) return undefined;
    timer.current = setTimeout(() => {
      if (state === "auth") setState("pay");
      else if (state === "pay") {
        // Each completed payment takes this card's next merchant.
        const c = cardRef.current;
        const n = paid.current[c.id] ?? 0;
        setPayment(c.payments[n % c.payments.length]);
        paid.current[c.id] = n + 1;
        setState("done");
      } else setState("idle");
    }, ms);
    return () => clearTimeout(timer.current);
  }, [state, mode]);

  // Autoplay: from the resting card, open the stack, tap the next card in turn.
  // It only takes a new step while it may run (on screen, not hovered, and so on).
  useEffect(() => {
    clearTimeout(autoTimer.current);
    if (!autoOn || !running) return undefined;
    if (state === "idle") {
      autoTimer.current = setTimeout(() => setState("stack"), autoStarted.current ? AUTO.idle : AUTO.first);
    } else if (state === "stack") {
      const id = AUTO_ORDER[autoNext.current % AUTO_ORDER.length];
      autoTimer.current = setTimeout(() => {
        setPressing(id);
        autoTimer.current = setTimeout(() => {
          autoStarted.current = true;
          autoNext.current += 1;
          setPressing(null);
          setCardId(id);
          setState("auth");
        }, AUTO.press);
      }, AUTO.stack);
    }
    return () => clearTimeout(autoTimer.current);
  }, [state, autoOn, running]);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(autoTimer.current);
    },
    [],
  );

  // Any tap on the phone hands it to the visitor: autoplay stops (Play resumes it).
  const takeOver = () => {
    if (mode !== "manual") setMode("manual");
    setPressing(null);
  };
  const togglePlay = () => setMode((m) => (m === "auto" ? "paused" : "auto"));

  const start = () => {
    setNudge(0);
    setState("auth");
  };
  const hint = () => setNudge((n) => n + 1);

  // Mouse and touch: two presses. Keyboard (Enter/Space, detail 0): one press.
  const onSide = (e) => {
    takeOver();
    if (state !== "idle" && state !== "done") return;
    const now = Date.now();
    if (e.detail === 0 || now - lastPress.current < DOUBLE_CLICK) {
      lastPress.current = 0;
      start();
    } else {
      lastPress.current = now;
      hint();
    }
  };

  const pick = (id) => {
    takeOver();
    setCardId(id);
    setState("auth");
  };

  const status = {
    idle: `${card.team} card. Double-click the side button to pay.`,
    auth: "Checking your face.",
    pay: `${card.team} card ready. Hold near reader.`,
    done: `Done. ${payment.name} ${payment.amount}.`,
    stack: "All cards. Choose a card to pay with.",
  }[state];

  return (
    <div
      ref={autoRef}
      className="wp"
      data-state={state}
      data-nudge={nudge ? (nudge % 2 ? "a" : "b") : undefined}
      data-paused={mode === "paused" ? "" : undefined}
    >
      {/* Hover and keyboard focus hold the autoplay only over the phone itself, so
          Play takes effect at once with the pointer still on the button. */}
      <div className="wp-device" {...pauseProps}>
        <PhoneFrame
          side={
            <>
              <button
                type="button"
                className="wp-btn wp-side"
                onClick={onSide}
                aria-label="Side button. Double-click to pay with a virtual card."
              />
              {/* A generous target for pointers: from "Double Click to Pay" to the
                side button. The side button stays the one keyboard control. */}
              <span className="wp-dcp-hit" onClick={onSide} aria-hidden="true" />
            </>
          }
        >
          {/* A tap on the screen points at the side button (mouse and touch only). */}
          <div
            className="wp-tap"
            onClick={() => {
              takeOver();
              if (state === "idle") hint();
            }}
          />

          {/* Beside the side button, as the phone shows it */}
          <div className="wp-dcp" aria-hidden="true">
            <span className="wp-dcp-text">
              Double Click
              <br />
              to Pay
            </span>
            <span className="wp-dcp-pill" />
          </div>

          {/* The chosen card: low on the screen at first, at the top while paying */}
          <CardFace card={card} className="wp-main-card" />

          <div className="wp-face" aria-hidden="true">
            <FaceGlyph />
          </div>

          <div className="wp-reader" aria-hidden="true">
            <span className="wp-ring">
              <PhoneGlyph />
              <CheckGlyph />
            </span>
            {/* One label, swapped (never two crossfading over each other). */}
            <span key={state === "pay" ? "hold" : "done"} className="wp-reader-label">
              {state === "pay" ? "Hold Near Reader" : "Done"}
            </span>
          </div>

          {/* The other cards, peeking at the bottom: tap to see them all */}
          <button
            type="button"
            className="wp-peek"
            onClick={() => {
              takeOver();
              setState("stack");
            }}
            tabIndex={state === "idle" || state === "pay" || state === "done" ? 0 : -1}
            aria-label={`Show all cards (${CARDS.length})`}
          >
            {others.map((c, i) => (
              <CardFace key={c.id} card={c} className={`wp-peek-card wp-peek-${i}`} />
            ))}
          </button>

          {/* The whole stack */}
          <div className="wp-stack" aria-hidden={state !== "stack"}>
            {CARDS.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className={"wp-stack-item" + (pressing === c.id ? " is-pressed" : "")}
                style={{ "--i": i }}
                onClick={() => pick(c.id)}
                tabIndex={state === "stack" ? 0 : -1}
                aria-label={`Pay with the ${c.team} card ending ${c.last4}`}
              >
                <CardFace card={c} />
              </button>
            ))}
          </div>

          {/* The notification the payment sends, with the merchant's circled logo */}
          <div className="wp-banner" aria-hidden="true">
            <span className="wp-banner-avatar">
              <MerchantLogo id={payment.merchant} size={38} className="wp-banner-merchant" />
            </span>
            <span className="wp-banner-text">
              <span className="wp-banner-head">
                <span>Gleec Business</span>
                <span>now</span>
              </span>
              <strong>
                {payment.name} · {payment.amount}
              </strong>
              {/* The card face already says Virtual: here, which card and why. */}
              <span>
                {card.team} card · {payment.note}
              </span>
            </span>
          </div>
        </PhoneFrame>
      </div>

      {/* Pause / Play, beside the phone (WCAG 2.2.2). Not offered under Reduce Motion. */}
      {autoplayAllowed ? (
        <button
          type="button"
          className="wp-play"
          aria-label={mode === "auto" ? "Pause the wallet demo" : "Play the wallet demo"}
          onClick={togglePlay}
        >
          <Icon name={mode === "auto" ? "pause" : "play"} size={16} />
        </button>
      ) : null}

      {/* Quiet while it plays itself, so a screen reader isn't interrupted. */}
      <p className="visually-hidden" aria-live={autoOn ? "off" : "polite"}>
        {status}
      </p>
    </div>
  );
}

function CardFace({ card, className = "" }) {
  return (
    <span className={`wp-card wp-card-${card.tone} ${className}`}>
      <span className="wp-card-brand">
        <img className="wp-card-logo" src={logoWhite} alt="" width="12" height="16" />
        Gleec
      </span>
      {/* Like a wallet card: what it's for on top, so the stack is easy to tell apart. */}
      <span className="wp-card-type">
        <strong>{card.team}</strong>
        <span>Virtual</span>
      </span>
      <span className="wp-card-num">•••• {card.last4}</span>
    </span>
  );
}

// Our own drawings (not the platform's symbols).
function FaceGlyph() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Looking: the square frame, blinking */}
      <g className="wp-face-scan">
        <path d="M6 20V12a6 6 0 0 1 6-6h8M44 6h8a6 6 0 0 1 6 6v8M58 44v8a6 6 0 0 1-6 6h-8M20 58h-8a6 6 0 0 1-6-6v-8" />
        <path d="M22 24v5M42 24v5M32 24v12h-3M24 44c4.5 4 11.5 4 16 0" />
      </g>
      {/* Recognised: a round face with a wide smile, the ring drawn in from the top */}
      <g className="wp-face-ok">
        <circle className="wp-face-ring" cx="32" cy="32" r="27" pathLength="1" transform="rotate(-90 32 32)" />
        <path d="M23.5 23.5v5M40.5 23.5v5M32 24v11h-3M21.5 40.5c5.8 6.2 15.2 6.2 21 0" />
      </g>
    </svg>
  );
}

function PhoneGlyph() {
  return (
    <svg className="wp-glyph-phone" viewBox="0 0 40 40">
      <rect x="12" y="5" width="16" height="30" rx="3.5" fill="#1b6fe0" />
      <path d="M12 26 28 13v18.5a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 12 31.5Z" fill="#0d4fb0" />
      <rect x="17" y="7.2" width="6" height="1.4" rx="0.7" fill="#0b3f8c" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg
      className="wp-glyph-check"
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 20.5 17.5 27 29.5 14" />
    </svg>
  );
}
