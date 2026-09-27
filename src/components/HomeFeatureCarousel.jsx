// HomeFeatureCarousel.jsx — Portrait feature carousel inspired by premium business
// product carousels: tall rounded cards, generous chip overlays, slow auto-rotate.
// Eyebrow + label + title + body + large notification chip at the foot.
import { useRef, useState } from "react";
import { useAutoplay } from "../lib/useAutoplay.js";
import Icon from "./Icon.jsx";
import "./HomeFeatureCarousel.css";

export default function HomeFeatureCarousel() {
  const cards = [
    {
      id: "accounts",
      eyebrow: "Multi-currency",
      title: "GBP, EUR & USD business accounts",
      body: "Designed to support GBP, EUR and USD business accounts in one place, with fiat-to-fiat FX through approved partners — subject to authorisation, onboarding approval and provider availability",
      chip: {
        kind: "balance",
        flag: "GB",
        primary: "Main GBP",
        amount: "£84,250.00",
        meta: "Operating account",
      },
      bg: "linear-gradient(160deg, #1B1430 0%, #11101A 55%, #0A0A11 100%)",
    },
    {
      id: "ibans",
      eyebrow: "Account details",
      title: "Named virtual IBANs",
      body: "Dedicated account details where available, intended to help approved businesses separate flows by client, region or product",
      panel: "account-details",
      bg: "linear-gradient(160deg, #11141F 0%, #0E0E14 60%, #08080C 100%)",
    },
    {
      id: "uk-rails",
      eyebrow: "Payments",
      title: "Faster Payments, CHAPS & BACS",
      body: "Domestic UK payment methods planned through standard and same-day routes, subject to authorisation, partner setup and operational readiness",
      chip: {
        kind: "event",
        icon: "zap",
        primary: "FPS payment · Illustrative",
        secondary: "Sample inflow · £12,480.00",
        dot: "warn",
      },
      bg: "linear-gradient(160deg, #161620 0%, #0E0E14 60%, #08080C 100%)",
    },
    {
      id: "sepa",
      eyebrow: "Euro rails",
      title: "SEPA & SEPA Instant",
      body: "Planned support for sending and receiving euro payments via SEPA and, where available, SEPA Instant — subject to authorisation and partner availability",
      chip: {
        kind: "event",
        icon: "send",
        primary: "EUR → SEPA · Illustrative",
        secondary: "Sample outflow · €4,210.00",
        dot: "purple",
      },
      bg: "linear-gradient(160deg, #1B1430 0%, #11101A 55%, #0A0A11 100%)",
    },
    {
      id: "swift",
      eyebrow: "International",
      title: "SWIFT & USD connectivity",
      body: "Planned international and USD payment routes via correspondent and partner networks, subject to authorisation, corridor availability and onboarding approval",
      chip: {
        kind: "event",
        icon: "globe",
        primary: "USD wire · Illustrative",
        secondary: "Sample beneficiary · $9,184.00",
        dot: "warn",
      },
      bg: "linear-gradient(160deg, #11141F 0%, #0E0E14 60%, #08080C 100%)",
    },
    {
      id: "cards",
      eyebrow: "Cards",
      title: "Virtual cards for team spend",
      body: "Payment cards for team spend, subscriptions and operating expenses, with per-card limits and category controls. Card functionality is intended for a later phase, subject to scheme, issuer, operational and compliance readiness",
      chip: {
        kind: "event",
        icon: "credit-card",
        primary: "Virtual card · Illustrative",
        secondary: "Marketing · ···· 7421",
        dot: "info",
      },
      bg: "linear-gradient(160deg, #161620 0%, #0E0E14 60%, #08080C 100%)",
    },
    {
      id: "compliance",
      eyebrow: "Compliance",
      title: "Compliance-led onboarding",
      body: "Designed to support more complex customers through structured KYB, EDD and ongoing monitoring. Any future onboarding would be subject to customer due diligence and acceptance policy",
      chip: {
        kind: "event",
        icon: "shield-check",
        primary: "KYB review · In progress",
        secondary: "Documents 8 / 10 received",
        dot: "purple",
      },
      bg: "linear-gradient(160deg, #1B1430 0%, #11101A 55%, #0A0A11 100%)",
    },
  ];

  const N = cards.length;
  const ROTATE_MS = 9000;

  const [active, setActive] = useState(0);
  // Bumped on every slide change; used as the timer bar's `key` so its CSS
  // animation restarts from zero.
  const [runId, setRunId] = useState(0);
  const { ref, playing, running, setPlaying, pauseProps } = useAutoplay();

  const go = (i) => {
    setActive(((i % N) + N) % N);
    setRunId((r) => r + 1);
  };

  // Touch swipe (horizontal only; vertical scrolling is left alone).
  const touch = useRef(null);
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(active + (dx < 0 ? 1 : -1));
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(active + 1);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(active - 1);
    }
  };

  return (
    <section id="product" className="gl-home-section gl-home-fc">
      <div className="gl-container">
        <div className="gl-home-head">
          <p className="gl-eyebrow">Product</p>
          <h2 className="gl-home-h">The all-in-one account for complex business flows</h2>
          <p className="gl-home-sub">
            Accounts, payments, FX, payment cards and controls — designed for companies that need fiat payment routes
            across GBP, EUR and USD
          </p>
        </div>

        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- arrow keys + swipe mirror the buttons below */}
        <div
          ref={ref}
          className="gl-fc-carousel"
          role="region"
          aria-roledescription="carousel"
          aria-label="Product features"
          onKeyDown={onKeyDown}
          {...pauseProps}
        >
          <div className="gl-fc-viewport" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="gl-fc-track" style={{ "--fc-i": active }}>
              {cards.map((c, i) => {
                const isActive = i === active;
                return (
                  // Side cards are clickable shortcuts; the buttons below are the accessible controls.
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                  <article
                    key={c.id}
                    id={`gl-fc-slide-${i}`}
                    className={"gl-fc-card " + (isActive ? "is-active" : "is-side")}
                    onClick={isActive ? undefined : () => go(i)}
                    aria-roledescription="slide"
                    aria-label={`${i + 1} of ${N}: ${c.title}`}
                    aria-hidden={!isActive}
                    style={{ background: c.bg }}
                  >
                    <div className="gl-fc-card-body">
                      <span className="gl-fc-eyebrow">{c.eyebrow}</span>
                      <h3 className="gl-fc-title">{c.title}</h3>
                      <p className="gl-fc-body">{c.body}</p>
                    </div>
                    {c.panel === "account-details" ? <AccountDetailsPanel /> : <NotificationChip chip={c.chip} />}
                  </article>
                );
              })}
            </div>

            <div className="gl-fc-fade gl-fc-fade-l" aria-hidden="true" />
            <div className="gl-fc-fade gl-fc-fade-r" aria-hidden="true" />
          </div>

          <div className="gl-fc-controls">
            <button type="button" className="gl-fc-ctrl" onClick={() => go(active - 1)} aria-label="Previous slide">
              <Icon name="arrow-left" size={14} strokeWidth={2} />
            </button>

            <div className="gl-fc-dots">
              {cards.map((c, i) => {
                const isActive = i === active;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={`Go to slide ${i + 1}: ${c.title}`}
                    aria-controls={`gl-fc-slide-${i}`}
                    aria-current={isActive ? "true" : undefined}
                    className={"gl-fc-dot " + (isActive ? "is-on" : "")}
                    onClick={() => go(i)}
                  >
                    {isActive && (
                      <span
                        key={runId}
                        className="gl-fc-dot-fill"
                        aria-hidden="true"
                        onAnimationEnd={() => go(active + 1)}
                        style={{
                          animationDuration: ROTATE_MS + "ms",
                          animationPlayState: running ? "running" : "paused",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="gl-fc-ctrl gl-fc-play"
              data-autoplay-toggle
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause automatic slide show" : "Start automatic slide show"}
            >
              <Icon name={playing ? "pause" : "play"} size={13} strokeWidth={2} />
            </button>

            <button type="button" className="gl-fc-ctrl" onClick={() => go(active + 1)} aria-label="Next slide">
              <Icon name="arrow-right" size={14} strokeWidth={2} />
            </button>
          </div>
          <p className="gl-visually-hidden" aria-live={running ? "off" : "polite"} aria-atomic="true">
            Slide {active + 1} of {N}: {cards[active].title}
          </p>
        </div>
      </div>
    </section>
  );
}

// Mini "Account details" product surface — embedded in the lower half of the
// Named virtual IBANs card. Purely illustrative (sample data), so it is drawn
// with non-interactive elements and hidden from assistive tech.
function AccountDetailsPanel() {
  return (
    <div className="gl-fc-adpanel" aria-hidden="true">
      <div className="gl-fc-adpanel-head">
        <span className="gl-fc-adpanel-eyebrow">Account details</span>
        <span className="gl-fc-adpanel-currency">
          <span className="gl-fc-adpanel-flag">
            <UKFlag />
          </span>
          <span className="gl-fc-adpanel-ccy">British pound</span>
          <Icon name="chevron-down" size={12} strokeWidth={2} />
        </span>
      </div>

      <div className="gl-fc-adpanel-tabs">
        <span className="gl-fc-adpanel-tab is-on">Local</span>
        <span className="gl-fc-adpanel-tab">International</span>
      </div>

      <p className="gl-fc-adpanel-helper">For domestic GBP transfers</p>

      <ul className="gl-fc-adpanel-fields">
        <li>
          <span className="gl-fc-adpanel-lbl">Beneficiary</span>
          <span className="gl-fc-adpanel-val">GLEEC Studios Ltd</span>
        </li>
        <li>
          <span className="gl-fc-adpanel-lbl">Sort code</span>
          <span className="gl-fc-adpanel-val gl-fc-adpanel-mono">12-34-56</span>
          <span className="gl-fc-adpanel-copy">
            <Icon name="copy" size={13} strokeWidth={1.8} />
          </span>
        </li>
        <li>
          <span className="gl-fc-adpanel-lbl">Account number</span>
          <span className="gl-fc-adpanel-val gl-fc-adpanel-mono">12345678</span>
          <span className="gl-fc-adpanel-copy">
            <Icon name="copy" size={13} strokeWidth={1.8} />
          </span>
        </li>
        <li>
          <span className="gl-fc-adpanel-lbl">Address</span>
          <span className="gl-fc-adpanel-val">London, United Kingdom</span>
          <span className="gl-fc-adpanel-copy">
            <Icon name="copy" size={13} strokeWidth={1.8} />
          </span>
        </li>
      </ul>

      <span className="gl-fc-adpanel-share">
        <Icon name="share" size={13} strokeWidth={2} />
        <span>Share details</span>
      </span>
    </div>
  );
}

function UKFlag() {
  // Stylized circular Union Jack — purely decorative.
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true">
      <defs>
        <clipPath id="gl-fc-ukclip">
          <circle cx="10" cy="10" r="10" />
        </clipPath>
      </defs>
      <g clipPath="url(#gl-fc-ukclip)">
        <rect width="20" height="20" fill="#012169" />
        {/* white diagonals */}
        <path d="M-2 -2 L22 22 M22 -2 L-2 22" stroke="#FFFFFF" strokeWidth="4" />
        {/* red diagonals (thinner) */}
        <path d="M-2 -2 L22 22 M22 -2 L-2 22" stroke="#C8102E" strokeWidth="1.6" />
        {/* white cross */}
        <path d="M10 -2 V22 M-2 10 H22" stroke="#FFFFFF" strokeWidth="5" />
        {/* red cross */}
        <path d="M10 -2 V22 M-2 10 H22" stroke="#C8102E" strokeWidth="2.6" />
        <circle cx="10" cy="10" r="9.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      </g>
    </svg>
  );
}

// Circular Union Jack placeholder. Hand-drawn approximation — swap for an
// official GB/UK flag SVG asset later.
function UKFlagCircle({ size = 36 }) {
  const id = "gl-uk-clip";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      role="img"
      aria-label="United Kingdom flag"
      style={{ display: "block", borderRadius: "50%" }}
    >
      <defs>
        <clipPath id={id}>
          <circle cx="30" cy="30" r="30" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        {/* Field — St Andrew's blue */}
        <rect width="60" height="60" fill="#012169" />
        {/* White diagonals (St Andrew's saltire) */}
        <path d="M0 0 L60 60 M60 0 L0 60" stroke="#FFFFFF" strokeWidth="12" />
        {/* Red diagonals (St Patrick's saltire), offset on the white */}
        <path d="M0 0 L60 60 M60 0 L0 60" stroke="#C8102E" strokeWidth="4" strokeDasharray="30,30" />
        {/* White cross of St George */}
        <path d="M30 0 V60 M0 30 H60" stroke="#FFFFFF" strokeWidth="20" />
        {/* Red cross of St George */}
        <path d="M30 0 V60 M0 30 H60" stroke="#C8102E" strokeWidth="12" />
        {/* Subtle inner ring for the coin-style look */}
        <circle cx="30" cy="30" r="29.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      </g>
    </svg>
  );
}

// Currency flag renderer. GB uses a circular Union Jack SVG; EUR/USD remain
// gradient-disc placeholders ready to be swapped for official flag SVGs.
function CurrencyFlag({ code }) {
  if (code === "GB") {
    return (
      <div className="gl-fc-chip-flag gl-fc-chip-flag-img">
        <UKFlagCircle size={36} />
      </div>
    );
  }
  const flagBg = {
    EU: "linear-gradient(135deg, #003399 0%, #FFCC00 100%)",
    US: "linear-gradient(135deg, #B22234 0%, #3C3B6E 100%)",
  };
  return (
    <div className="gl-fc-chip-flag" style={{ background: flagBg[code] || flagBg.EU }} aria-hidden="true">
      <span>{code}</span>
    </div>
  );
}

// Large premium chip — two-line, soft glass surface, optional icon/flag on the left.
function NotificationChip({ chip }) {
  if (chip.kind === "balance") {
    return (
      <div className="gl-fc-chip gl-fc-chip-balance">
        <CurrencyFlag code={chip.flag} />
        <div className="gl-fc-chip-text">
          <div className="gl-fc-chip-row1">
            <span className="gl-fc-chip-label">{chip.primary}</span>
            <span className="gl-fc-chip-amount">{chip.amount}</span>
          </div>
          <div className="gl-fc-chip-row2">{chip.meta}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="gl-fc-chip gl-fc-chip-event">
      <div className={"gl-fc-chip-iconwrap " + (chip.dot || "")}>
        <Icon name={chip.icon || "bell"} size={18} strokeWidth={1.8} />
      </div>
      <div className="gl-fc-chip-text">
        <div className="gl-fc-chip-row1">
          <span className="gl-fc-chip-primary">{chip.primary}</span>
        </div>
        {chip.secondary && <div className="gl-fc-chip-row2">{chip.secondary}</div>}
      </div>
    </div>
  );
}
