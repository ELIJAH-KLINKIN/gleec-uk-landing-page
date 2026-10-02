// CardReader.jsx — version 2 of "pay with the physical card" (version 1, the
// handheld terminal with keys, is CardTerminal.jsx). A modern square card reader,
// all touchscreen like the readers shops use today (no keypad, no maker's logo),
// and a vertical Gleec Pay card, both drawn in HTML/CSS. Larger amounts go chip
// and PIN: the card goes into the slot from the bottom, chip first, the PIN is
// entered on the screen, Approved, "Remove card", and it slides out. Small
// amounts are a contactless tap on the screen. Each ends with the app's
// notification. It plays itself with Pause/Play beside it, waits off screen or
// in a hidden tab, and under Reduce Motion is a still of the first payment,
// approved.
import { useEffect, useState } from "react";
import logo from "../../assets/logo-g.svg";
import { useAutoAdvance } from "../../lib/useAutoAdvance.js";
import Icon from "../ui/Icon.jsx";
import MerchantLogo from "../ui/MerchantLogo.jsx";
import "./CardReader.css";

// Fictional merchants, except the hotel (the same Ritz-Carlton as the wallet).
// No fee lines (no fees on the page until pricing is published).
const SCENES = [
  {
    id: "dinner",
    mode: "insert",
    merchant: "Telok Ayer Kitchen",
    avatar: { icon: "utensils", bg: "#1f6f4a" },
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
    mode: "insert",
    merchant: "The Ritz-Carlton · Deposit",
    avatar: { merchant: "ritzcarlton" },
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
    mode: "tap",
    merchant: "Onboard café",
    avatar: { icon: "plane", bg: "#1d3f8f" },
    amount: "€9.80",
    team: "Travel",
    notice: { title: "Onboard café", amount: "−€9.80", detail: "Physical · Travel team · from your EUR balance" },
  },
];

// Chip and PIN: line up under the slot, go in, four PIN digits, approved, out.
const INSERT = [
  ["ready", 1400],
  ["align", 650],
  ["insert", 700],
  ["pin1", 280],
  ["pin2", 280],
  ["pin3", 280],
  ["pin4", 420],
  ["processing", 900],
  ["approved", 1000],
  ["remove", 700],
  ["notice", 3000],
  ["out", 500],
];
// Contactless: the card taps the screen.
const TAP = [
  ["ready", 1400],
  ["tap", 650],
  ["processing", 900],
  ["approved", 700],
  ["notice", 3000],
  ["out", 500],
];
const FLOW = SCENES.flatMap((scene, s) =>
  (scene.mode === "insert" ? INSERT : TAP).map(([phase, ms]) => ({ s, phase, ms })),
);
const STILL = { s: 0, phase: "approved" };
const PIN_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", ""];

export default function CardReader() {
  const [paused, setPaused] = useState(false);
  const [i, setI] = useState(0);
  const { ref, running, autoplayAllowed } = useAutoAdvance({ enabled: !paused, threshold: 0.4 });
  const still = !autoplayAllowed;
  useEffect(() => {
    if (still || !running) return undefined;
    const t = setTimeout(() => setI((n) => (n + 1) % FLOW.length), FLOW[i].ms);
    return () => clearTimeout(t);
  }, [i, running, still]);

  const step = still ? STILL : FLOW[i];
  const scene = SCENES[step.s];
  const { phase } = step;
  const pin = phase.startsWith("pin") ? Number(phase.slice(3)) : 0;
  const screen =
    phase === "processing"
      ? "processing"
      : ["approved", "remove", "notice", "out"].includes(phase)
        ? "approved"
        : pin || phase === "insert"
          ? "pin"
          : "ready";
  const noticeOn = phase === "notice" || still;

  return (
    <div ref={ref} className={"cr" + (paused ? " is-paused" : "") + (still ? " is-still" : "")}>
      <div className={`cr-stage is-${phase} mode-${scene.mode}`} aria-hidden="true">
        <div className="cr-reader">
          <span className="cr-slot" />
          <div className="cr-glass">
            <div className={`cr-screen is-${screen}`} key={`${scene.id}-${screen}`}>
              {screen === "ready" ? (
                <>
                  <span className="cr-merchant">{scene.merchant}</span>
                  <strong className="cr-amount">{scene.amount}</strong>
                  <span className="cr-prompt">
                    <Contactless className="cr-nfc" />
                    Tap or insert card
                  </span>
                </>
              ) : screen === "pin" ? (
                <>
                  <span className="cr-merchant">{scene.amount}</span>
                  <strong className="cr-pin-title">Enter PIN</strong>
                  <span className="cr-dots">
                    {[1, 2, 3, 4].map((d) => (
                      <span key={d} className={d <= pin ? "is-on" : undefined} />
                    ))}
                  </span>
                  <span className="cr-pad">
                    {PIN_KEYS.map((k, n) => (
                      <span key={n}>{k}</span>
                    ))}
                  </span>
                </>
              ) : screen === "processing" ? (
                <>
                  <span className="cr-spinner" />
                  <span className="cr-label">Processing</span>
                </>
              ) : (
                <>
                  <span className="cr-ok">
                    <Icon name="check" size="1em" strokeWidth={3.2} />
                  </span>
                  <strong className="cr-label">Approved</strong>
                  <span className="cr-sub">
                    {scene.mode === "insert" && phase === "remove" ? "Remove card" : scene.amount}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="cr-card">
          <span className="cr-card-brand">
            <img src={logo} alt="" width="12" height="16" />
            Gleec Pay
          </span>
          <span className="cr-chip" />
          <Contactless className="cr-card-nfc" />
          <span className="cr-card-foot">
            <span className="cr-card-num">•••• 3310</span>
            <span className="cr-card-type">
              <strong>{scene.team}</strong>
              <span>Physical</span>
            </span>
          </span>
        </div>

        {/* The notification the payment sends, led by the merchant */}
        <div className={"cards-notice cr-notice" + (noticeOn ? " is-on" : "")}>
          <span className="cards-notice-avatar">
            {scene.avatar.merchant ? (
              <MerchantLogo id={scene.avatar.merchant} size={36} className="cards-notice-merchant" />
            ) : (
              <span className="cards-notice-merchant cr-avatar" style={{ background: scene.avatar.bg }}>
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
          className="cr-play"
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
