// CardTerminal.jsx — "pay with the physical card": a generic handheld card
// terminal drawn in HTML/CSS (no maker's logo, no card scheme), and a Gleec Pay
// card drawn the same way, so it carries the brand's own logo. It plays three
// moments where business people still reach for a physical card — a client
// dinner abroad, a hotel deposit, a purchase on board — each: the amount on the
// terminal, the card taps it, Approved, then the app's notification.
// It plays itself with Pause/Play beside it, waits off screen or in a hidden
// tab, and under Reduce Motion is a still of the first moment, approved.
import { useEffect, useState } from "react";
import logo from "../../assets/logo-g.svg";
import { useAutoAdvance } from "../../lib/useAutoAdvance.js";
import Icon from "../ui/Icon.jsx";
import MerchantLogo from "../ui/MerchantLogo.jsx";
import "./CardTerminal.css";

// Fictional merchants, except the hotel (the same Ritz-Carlton as the wallet).
// The dinner is in Singapore dollars, paid from the GBP balance; amounts carry
// no fee lines (no fees on the page until pricing is published).
const SCENES = [
  {
    id: "dinner",
    merchant: "Telok Ayer Kitchen",
    avatar: { icon: "utensils", bg: "#1f6f4a" },
    kind: "Sale",
    amount: "S$248.60",
    team: "Sales",
    notice: {
      title: "Telok Ayer Kitchen",
      amount: "−S$248.60",
      detail: "Physical · Sales team · from your GBP balance",
    },
  },
  {
    id: "hotel",
    merchant: "The Ritz-Carlton",
    avatar: { merchant: "ritzcarlton" },
    kind: "Deposit",
    amount: "£300.00",
    team: "Travel",
    notice: {
      title: "The Ritz-Carlton",
      amount: "£300 hold",
      detail: "Physical · Travel team · released at check-out",
    },
  },
  {
    id: "onboard",
    merchant: "Onboard café",
    avatar: { icon: "plane", bg: "#1d3f8f" },
    kind: "Sale",
    amount: "€9.80",
    team: "Travel",
    notice: { title: "Onboard café", amount: "−€9.80", detail: "Physical · Travel team · from your EUR balance" },
  },
];

// One moment: ready → the card taps → processing → approved → notification → out.
const STEPS = [
  ["ready", 1600],
  ["tap", 650],
  ["processing", 1000],
  ["approved", 700],
  ["notice", 3400],
  ["out", 600],
];
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export default function CardTerminal() {
  const [paused, setPaused] = useState(false);
  const [i, setI] = useState(0);
  const { ref, running, autoplayAllowed } = useAutoAdvance({ enabled: !paused, threshold: 0.4 });
  const still = !autoplayAllowed;
  useEffect(() => {
    if (still || !running) return undefined;
    const t = setTimeout(() => setI((n) => (n + 1) % (SCENES.length * STEPS.length)), STEPS[i % STEPS.length][1]);
    return () => clearTimeout(t);
  }, [i, running, still]);

  const scene = SCENES[still ? 0 : Math.floor(i / STEPS.length)];
  const phase = still ? "notice" : STEPS[i % STEPS.length][0];
  const busy = phase === "tap" || phase === "processing";
  const approved = phase === "approved" || phase === "notice" || phase === "out";

  return (
    <div ref={ref} className={"ct" + (paused ? " is-paused" : "") + (still ? " is-still" : "")}>
      <div className={`ct-stage is-${phase}`} aria-hidden="true">
        <div className="ct-terminal">
          <span className="ct-slot" />
          <div className="ct-screen" key={scene.id}>
            <span className="ct-merchant">{scene.merchant}</span>
            <span className="ct-kind">{scene.kind}</span>
            <strong className="ct-amount">{scene.amount}</strong>
            <span className={"ct-status" + (approved ? " is-ok" : "")}>
              {approved ? (
                <>
                  <span className="ct-ok">
                    <Icon name="check" size="0.8em" strokeWidth={3.4} />
                  </span>
                  Approved
                </>
              ) : busy ? (
                "Processing…"
              ) : (
                <>
                  <Contactless className="ct-status-nfc" />
                  Present card
                </>
              )}
            </span>
          </div>
          <div className="ct-keys">
            {KEYS.map((k) => (
              <span key={k}>{k}</span>
            ))}
          </div>
          <div className="ct-fn">
            <span className="is-cancel">✕</span>
            <span className="is-clear">‹</span>
            <span className="is-enter">○</span>
          </div>
        </div>

        <div className="ct-card">
          <span className="ct-card-brand">
            <img src={logo} alt="" width="12" height="16" />
            Gleec Pay
          </span>
          <span className="ct-card-type">
            <strong>{scene.team}</strong>
            <span>Physical</span>
          </span>
          <span className="ct-chip" />
          <Contactless className="ct-card-nfc" />
          <span className="ct-card-num">•••• 3310</span>
        </div>

        {/* The notification the payment sends, led by the merchant */}
        <div className={"cards-notice ct-notice" + (phase === "notice" ? " is-on" : "")}>
          <span className="cards-notice-avatar">
            {scene.avatar.merchant ? (
              <MerchantLogo id={scene.avatar.merchant} size={36} className="cards-notice-merchant" />
            ) : (
              <span className="cards-notice-merchant ct-avatar" style={{ background: scene.avatar.bg }}>
                <Icon name={scene.avatar.icon} size={18} strokeWidth={2} />
              </span>
            )}
            <span className="cards-notice-badge">
              <img src={logo} alt="" width="6" height="8" />
            </span>
          </span>
          <span className="cards-notice-text">
            <span className="cards-notice-head">
              <span>Gleec Pay</span>
              <span>now</span>
            </span>
            <strong>
              {scene.notice.title} · {scene.notice.amount}
            </strong>
            <span>{scene.notice.detail}</span>
          </span>
        </div>
      </div>

      {still ? null : (
        <button
          type="button"
          className="ct-play"
          aria-label={paused ? "Play the card demo" : "Pause the card demo"}
          onClick={() => setPaused((p) => !p)}
        >
          <Icon name={paused ? "play" : "pause"} size={16} strokeWidth={0} />
        </button>
      )}
    </div>
  );
}

function Contactless({ className }) {
  return (
    <svg
      className={className}
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
