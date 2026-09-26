// HomeCards.jsx — Premium "Company cards" hero section.
// Single, focused, Revolut/Apple-style composition: centered header, one large
// card visual that swaps between Virtual and Physical states, pill switchers
// with a smooth progress fill, and a dynamic caption — all in one viewport.
// Card visuals are the real uploaded GLEEC SVG card faces (no hand-drawn cards).
import { useState } from "react";
import { useAutoplay } from "../lib/useAutoplay.js";
import cardVirtual from "../assets/cards/card-virtual.svg";
import cardVirtualAlt from "../assets/cards/card-virtual-alt.svg";
import cardPhysical from "../assets/cards/card-physical.svg";
import cardPhysicalAlt from "../assets/cards/card-physical-alt.svg";
import Icon from "./Icon.jsx";
import "./HomeCards.css";

export default function HomeCards() {
  const scenes = [
    {
      id: "virtual",
      pill: "Virtual cards",
      title: "Virtual cards for subscriptions, suppliers and team spend",
      bullets: [
        "Create cards for teams, projects or vendors",
        "Set daily, monthly and category limits",
        "Track every transaction from one workspace",
      ],
    },
    {
      id: "physical",
      pill: "Physical cards",
      title: "Physical cards for teams on the move",
      bullets: [
        "Separate travel and field-team spend from operating accounts",
        "Set card limits from central controls",
        "Keep card activity visible in one workspace",
      ],
    },
  ];

  const N = scenes.length;
  const SCENE_MS = 7600;
  const [active, setActive] = useState(0);
  // `runId` bumps every time the fill should restart from 0 (on auto-advance
  // and on manual click). Changing it remounts the fill bar via React `key`,
  // so the CSS keyframe replays cleanly from 0% — no rAF, no transform/opacity
  // layering, identical in Safari and Chrome.
  const [runId, setRunId] = useState(0);
  const { ref, running, pauseProps } = useAutoplay();

  const go = (i) => {
    setActive(((i % N) + N) % N);
    setRunId((r) => r + 1);
  };
  // When the active pill's fill animation completes, advance to the next state.
  const onFillEnd = () => {
    setActive((a) => (a + 1) % N);
    setRunId((r) => r + 1);
  };

  const scene = scenes[active];

  return (
    <section id="cards" className="gl-home-section gl-home-cards">
      <div className="gl-container">
        <div className="gl-home-head gl-hc-head">
          <p className="gl-eyebrow">Cards</p>
          <h2 className="gl-home-h">Company cards with controls built in</h2>
          <p className="gl-home-sub">
            Virtual and physical cards for team spend, supplier payments and subscriptions — with limits, visibility and
            controls built into every purchase
          </p>
        </div>

        <div ref={ref} {...pauseProps}>
          {/* Visual stage */}
          <div className="gl-hc-stage">
            <div className="gl-hc-aura" aria-hidden="true" />

            <div className={"gl-hc-scene " + (active === 0 ? "is-on" : "is-off")} aria-hidden={active !== 0}>
              <CardVisual
                backSrc={cardVirtualAlt}
                frontSrc={cardVirtual}
                notif={{
                  icon: "openai",
                  name: "OpenAI · Subscription",
                  amount: "−£82.00",
                  meta: "Virtual · Marketing · within limit",
                }}
              />
            </div>

            <div className={"gl-hc-scene " + (active === 1 ? "is-on" : "is-off")} aria-hidden={active !== 1}>
              <CardVisual
                backSrc={cardPhysicalAlt}
                frontSrc={cardPhysical}
                notif={{
                  icon: "booking",
                  name: "Booking.com · Travel",
                  amount: "−£420.00",
                  meta: "Physical · Travel team · within limit",
                }}
              />
            </div>
          </div>

          {/* Pill switchers */}
          <div className="gl-hc-pills" role="tablist" aria-label="Card type">
            {scenes.map((s, i) => {
              const isActive = i === active;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  id={`gl-hc-tab-${s.id}`}
                  aria-selected={isActive}
                  aria-controls="gl-hc-panel"
                  tabIndex={isActive ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      e.preventDefault();
                      const next = (i + (e.key === "ArrowRight" ? 1 : -1) + N) % N;
                      go(next);
                      e.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus();
                    }
                  }}
                  onClick={() => go(i)}
                  className={"gl-hc-pill " + (isActive ? "is-on" : "")}
                >
                  {isActive ? (
                    <span
                      key={runId}
                      className="gl-hc-pill-fill"
                      aria-hidden="true"
                      onAnimationEnd={onFillEnd}
                      style={{
                        animationDuration: SCENE_MS + "ms",
                        animationPlayState: running ? "running" : "paused",
                      }}
                    />
                  ) : null}
                  <span className="gl-hc-pill-label">{s.pill}</span>
                </button>
              );
            })}
          </div>

          {/* Dynamic caption */}
          <div className="gl-hc-caption" id="gl-hc-panel" role="tabpanel" aria-labelledby={`gl-hc-tab-${scene.id}`}>
            <h3 className="gl-hc-cap-h" key={scene.id}>
              {scene.title}
            </h3>
            <ul className="gl-hc-bullets" key={scene.id + "-b"}>
              {scene.bullets.map((b) => (
                <li key={b}>
                  <span className="gl-hc-bullet-dot" aria-hidden="true" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <a className="gl-btn gl-btn-primary gl-hc-cta" href="#waitlist">
              Join waitlist <Icon name="arrow-right" size={14} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Card visual: stacked SVG cards + floating notification ---------------- */
function CardVisual({ backSrc, frontSrc, notif }) {
  return (
    <div className="gl-cv">
      <div className="gl-cv-deck" aria-hidden="true">
        <img
          className="gl-cv-card gl-cv-card-back"
          src={backSrc}
          alt=""
          width="2064"
          height="1301"
          loading="lazy"
          decoding="async"
          draggable="false"
        />
        <img
          className="gl-cv-card gl-cv-card-front"
          src={frontSrc}
          alt=""
          width="2064"
          height="1301"
          loading="lazy"
          decoding="async"
          draggable="false"
        />
      </div>

      <div className="gl-cv-notif" role="img" aria-label={`${notif.name}, ${notif.amount}, ${notif.meta}`}>
        <VendorIcon name={notif.icon} />
        <div className="gl-cv-notif-text">
          <div className="gl-cv-notif-row1">
            <span className="gl-cv-notif-name">{notif.name}</span>
            <strong className="gl-cv-notif-amt">{notif.amount}</strong>
          </div>
          <div className="gl-cv-notif-meta">{notif.meta}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Vendor app icons (original, brand-neutral placeholders) ---------------- */
function VendorIcon({ name }) {
  if (name === "openai") {
    return (
      <span className="gl-vicon gl-vicon-openai" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2.6c1.6 0 3 .86 3.78 2.14a4.36 4.36 0 0 1 3.1 6.6 4.36 4.36 0 0 1-3.1 6.6A4.37 4.37 0 0 1 12 21.4a4.37 4.37 0 0 1-3.78-2.46 4.36 4.36 0 0 1-3.1-6.6 4.36 4.36 0 0 1 3.1-6.6A4.37 4.37 0 0 1 12 2.6Z"
            stroke="#fff"
            strokeWidth="1.4"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M12 8.4v7.2M8.7 10.2 12 12l3.3-1.8M8.7 13.8 12 12M15.3 13.8 12 12"
            stroke="#fff"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  // booking
  return (
    <span className="gl-vicon gl-vicon-booking" aria-hidden="true">
      <span className="gl-vicon-booking-glyph">B.</span>
    </span>
  );
}
