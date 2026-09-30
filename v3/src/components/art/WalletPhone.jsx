// WalletPhone.jsx — "try paying with a virtual card": a phone drawn in HTML/CSS
// that behaves like paying from the phone's wallet. Double-click the side
// button → face check → the card with "Hold Near Reader" → Done, with the
// payment notification. Tap the cards at the bottom to see the whole stack of
// Gleec cards and pick another. A generic phone (no maker's logo, no wallet
// brand): it shows how the card will feel, subject to issuer and scheme approval.
// Nothing moves until the visitor starts it; Reduce Motion drops the animations.
import { useCallback, useEffect, useRef, useState } from "react";
import logoWhite from "../../assets/logo-g-mask.png";
import logoColour from "../../assets/logo-g.png";
import "./WalletPhone.css";

// Example cards (last four digits and merchants are illustrative).
const CARDS = [
  { id: "marketing", team: "Marketing", last4: "7421", tone: "purple", merchant: "Pret A Manger", amount: "−£8.40" },
  { id: "travel", team: "Travel", last4: "5520", tone: "graphite", merchant: "Heathrow Express", amount: "−£25" },
  { id: "engineering", team: "Engineering", last4: "3094", tone: "midnight", merchant: "Currys", amount: "−£149" },
  { id: "office", team: "Office", last4: "8816", tone: "silver", merchant: "Ryman", amount: "−£36.20" },
  { id: "events", team: "Events", last4: "1188", tone: "lilac", merchant: "Dishoom", amount: "−£96.50" },
];

const T = { auth: 1300, pay: 4200, done: 3400 }; // ms in each step
const DOUBLE_CLICK = 650; // two presses within this count as a double-click

export default function WalletPhone() {
  const [state, setState] = useState("lock"); // lock | auth | pay | done | stack
  const [cardId, setCardId] = useState(CARDS[0].id);
  const [nudge, setNudge] = useState(0); // counts nudges, so the glow replays each time
  const timer = useRef(0);
  const lastPress = useRef(0);
  const card = CARDS.find((c) => c.id === cardId);
  const others = CARDS.filter((c) => c.id !== cardId);

  const go = useCallback((next, delay) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState(next), delay);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  // The flow runs itself once started: face check → hold near reader → done → lock.
  useEffect(() => {
    if (state === "auth") go("pay", T.auth);
    else if (state === "pay") go("done", T.pay);
    else if (state === "done") go("lock", T.done);
    else clearTimeout(timer.current);
  }, [state, go]);

  const start = () => {
    setNudge(0);
    setState("auth");
  };
  const hint = () => setNudge((n) => n + 1);

  // Mouse and touch: two presses. Keyboard (Enter/Space, detail 0): one press.
  const onSide = (e) => {
    if (state !== "lock" && state !== "done") return;
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
    lock: "Locked. Double-click the side button to pay.",
    auth: "Checking your face.",
    pay: `${card.team} card ready. Hold near reader.`,
    done: `Done. ${card.merchant} ${card.amount}.`,
    stack: "All cards. Choose a card to pay with.",
  }[state];

  return (
    <div className="wp" data-state={state}>
      <div className="wp-body">
        <span className="wp-vol wp-vol-1" aria-hidden="true" />
        <span className="wp-vol wp-vol-2" aria-hidden="true" />
        <button
          type="button"
          className="wp-side"
          data-nudge={nudge ? (nudge % 2 ? "a" : "b") : undefined}
          onClick={onSide}
          aria-label="Side button. Double-click to pay with a virtual card."
        />

        <div className="wp-screen">
          <div className="wp-island" aria-hidden="true" />
          <StatusBar />

          {/* Lock screen */}
          {/* A tap on the lock screen points at the side button (mouse and touch only). */}
          <div className="wp-lock" aria-hidden={state !== "lock"} onClick={hint}>
            <span className="wp-lock-time">9:41</span>
            <span className="wp-lock-hint">Double-click the side button to pay</span>
          </div>

          {/* Pay: the card, the face check, hold near reader, done */}
          <div className="wp-pay" aria-hidden={state === "lock" || state === "stack"}>
            <CardFace card={card} className="wp-pay-card" />
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
            <button
              type="button"
              className="wp-peek"
              onClick={() => setState("stack")}
              tabIndex={state === "pay" || state === "done" ? 0 : -1}
              aria-label={`Show all cards (${CARDS.length})`}
            >
              {others.slice(0, 3).map((c, i) => (
                <CardFace key={c.id} card={c} className={`wp-peek-card wp-peek-${i}`} />
              ))}
            </button>
          </div>

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

          {/* The notification the payment sends */}
          <div className="wp-banner" aria-hidden="true">
            <span className="wp-banner-icon">
              <img src={logoColour} alt="" width="10" height="14" />
            </span>
            <span className="wp-banner-text">
              <span className="wp-banner-head">
                <span>Gleec Business</span>
                <span>now</span>
              </span>
              <strong>
                {card.merchant} · {card.amount}
              </strong>
              <span>Virtual · {card.team} · within limit</span>
            </span>
          </div>
        </div>
      </div>

      <p className={"wp-hint" + (nudge ? " is-nudged" : "")} aria-hidden="true">
        <span className="wp-hint-arrow">← </span>Double-click
      </p>
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

function StatusBar() {
  return (
    <div className="wp-status" aria-hidden="true">
      <span>9:41</span>
      <span className="wp-status-icons">
        <svg viewBox="0 0 18 12" width="1.6em" height="1.05em" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg viewBox="0 0 16 12" width="1.45em" height="1.05em" fill="currentColor">
          <path d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3C13.5 1.5 10.8.4 8 .4S2.5 1.5.5 3.4l1.2 1.3C3.4 3.1 5.6 2.2 8 2.2Zm0 3.6c1.4 0 2.7.5 3.7 1.4l1.2-1.3C11.6 4.7 9.9 4 8 4s-3.6.7-4.9 1.9l1.2 1.3c1-.9 2.3-1.4 3.7-1.4Zm0 3.6c.5 0 1 .2 1.3.5L8 11.6 6.7 9.9c.3-.3.8-.5 1.3-.5Z" />
        </svg>
        <svg viewBox="0 0 27 12" width="2.4em" height="1.05em">
          <rect x="0.5" y="0.5" width="23" height="11" rx="3.5" fill="none" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" />
          <path d="M25 4v4c.8-.3 1.3-1.1 1.3-2S25.8 4.3 25 4Z" fill="currentColor" opacity="0.4" />
        </svg>
      </span>
    </div>
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
