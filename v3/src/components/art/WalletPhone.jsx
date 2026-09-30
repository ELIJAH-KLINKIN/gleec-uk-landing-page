// WalletPhone.jsx — "try paying with a virtual card": a phone drawn in HTML/CSS
// that behaves like paying from the phone's wallet. It opens on the card with
// "Double Click to Pay" beside the side button. Double-click it → face check →
// "Hold Near Reader" → Done, with the payment notification. Tap the cards at the
// bottom to see the whole stack of Gleec cards and pick another. A generic phone
// (no maker's logo, no wallet brand): it shows how the card will feel, subject to
// issuer and scheme approval. Nothing moves until the visitor starts it; Reduce
// Motion drops the animations.
import { useCallback, useEffect, useRef, useState } from "react";
import logoWhite from "../../assets/logo-g-mask.png";
import MerchantLogo from "../ui/MerchantLogo.jsx";
import PhoneFrame from "./PhoneFrame.jsx";
import "./WalletPhone.css";

// Example cards (last four digits are illustrative).
const CARDS = [
  { id: "marketing", team: "Marketing", last4: "7421", tone: "purple" },
  { id: "travel", team: "Travel", last4: "5520", tone: "graphite" },
  { id: "engineering", team: "Engineering", last4: "3094", tone: "midnight" },
  { id: "office", team: "Office", last4: "8816", tone: "silver" },
  { id: "events", team: "Events", last4: "1188", tone: "lilac" },
];

// Example payments, in turn: a hotel in pounds, then a coffee in New York in dollars.
const PAYMENTS = [
  { merchant: "ritzcarlton", name: "The Ritz-Carlton", amount: "−£1,240", note: "within limit" },
  { merchant: "bluebottle", name: "Blue Bottle Coffee", amount: "−$7.50", note: "paid from USD" },
];

const T = { auth: 1300, pay: 3600, done: 3600 }; // ms in each step
const DOUBLE_CLICK = 650; // two presses within this count as a double-click

export default function WalletPhone() {
  const [state, setState] = useState("idle"); // idle | auth | pay | done | stack
  const [cardId, setCardId] = useState(CARDS[0].id);
  const [payIdx, setPayIdx] = useState(0);
  const [nudge, setNudge] = useState(0); // counts nudges, so the glow replays each time
  const paid = useRef(0);
  const timer = useRef(0);
  const lastPress = useRef(0);
  const card = CARDS.find((c) => c.id === cardId);
  const others = CARDS.filter((c) => c.id !== cardId);
  const payment = PAYMENTS[payIdx];

  const go = useCallback((next, delay) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState(next), delay);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  // The flow runs itself once started: face check → hold near reader → done → idle.
  useEffect(() => {
    if (state === "auth") go("pay", T.auth);
    else if (state === "pay") go("done", T.pay);
    else if (state === "done") {
      // Each completed payment takes the next merchant.
      setPayIdx(paid.current % PAYMENTS.length);
      paid.current += 1;
      go("idle", T.done);
    } else clearTimeout(timer.current);
  }, [state, go]);

  const start = () => {
    setNudge(0);
    setState("auth");
  };
  const hint = () => setNudge((n) => n + 1);

  // Mouse and touch: two presses. Keyboard (Enter/Space, detail 0): one press.
  const onSide = (e) => {
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
    <div className="wp" data-state={state} data-nudge={nudge ? (nudge % 2 ? "a" : "b") : undefined}>
      <PhoneFrame
        side={
          <button
            type="button"
            className="wp-btn wp-side"
            onClick={onSide}
            aria-label="Side button. Double-click to pay with a virtual card."
          />
        }
      >
        {/* A tap on the screen points at the side button (mouse and touch only). */}
        <div className="wp-tap" onClick={state === "idle" ? hint : undefined} />

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
          <span className="wp-reader-label wp-reader-hold">Hold Near Reader</span>
          <span className="wp-reader-label wp-reader-done">Done</span>
        </div>

        {/* The other cards, peeking at the bottom: tap to see them all */}
        <button
          type="button"
          className="wp-peek"
          onClick={() => setState("stack")}
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
              className="wp-stack-item"
              style={{ "--i": i }}
              onClick={() => pick(c.id)}
              tabIndex={state === "stack" ? 0 : -1}
              aria-label={`Pay with the ${c.team} card ending ${c.last4}`}
            >
              <CardFace card={c} />
            </button>
          ))}
        </div>

        {/* The notification the payment sends: the merchant, badged with our app */}
        <div className="wp-banner" aria-hidden="true">
          <span className="wp-banner-avatar">
            <MerchantLogo id={payment.merchant} size={38} className="wp-banner-merchant" />
            <span className="wp-banner-badge">
              <img src={logoWhite} alt="" width="6" height="8" />
            </span>
          </span>
          <span className="wp-banner-text">
            <span className="wp-banner-head">
              <span>Gleec Business</span>
              <span>now</span>
            </span>
            <strong>
              {payment.name} · {payment.amount}
            </strong>
            <span>
              Virtual · {card.team} · {payment.note}
            </span>
          </span>
        </div>
      </PhoneFrame>

      <p className="visually-hidden" aria-live="polite">
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
      <path d="M6 20V12a6 6 0 0 1 6-6h8M44 6h8a6 6 0 0 1 6 6v8M58 44v8a6 6 0 0 1-6 6h-8M20 58h-8a6 6 0 0 1-6-6v-8" />
      <path className="wp-face-feat" d="M22 24v5M42 24v5M32 24v12h-3M24 44c4.5 4 11.5 4 16 0" />
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
