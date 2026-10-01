// Hero.jsx — a quiet header in the Cursor manner: a modest two-line headline, the
// email pill (field + Join the Waitlist, as on ramp.com) and "See the demo" under it, so the product demo is on screen, and moving, the
// moment the page loads. The headline's first line rotates with the demo tab ("Global
// accounts" ↔ Accounts, "Corporate cards" ↔ Cards, "Cross-border payments" ↔ Payments).
// A pill tab bar inside the demo frame (Accounts / Cards / Payments) picks
// the demo. It advances by itself every 7 s — shown as a fill inside the
// current pill — until the visitor picks a tab, then stays on their choice.
// It never advances while hovered, focused, off screen, in a background tab,
// or under Reduce Motion.
import { useRef, useState } from "react";
import { DISCLAIMER_SHORT, HERO } from "../content.js";
import { DEMO_MEDIA, DEMO_SIZE, DEMO_SIZE_MOBILE, PHONE_QUERY, VIDEO_QUERY } from "../lib/demoMedia.js";
import { useMediaQuery } from "../lib/useMediaQuery.js";
import { useAutoAdvance } from "../lib/useAutoAdvance.js";
import HeroJoin from "./HeroJoin.jsx";
import RotatingPhrase from "./RotatingPhrase.jsx";
import DemoScreen from "./DemoScreen.jsx";
import "./Hero.css";

const ADVANCE_MS = 7000;

export default function Hero() {
  const demos = HERO.demos;
  const N = demos.length;
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [runId, setRunId] = useState(0); // restarts the progress fill
  const { ref, running, autoplayAllowed, pauseProps } = useAutoAdvance({ enabled: auto, threshold: 0.2 });
  const tabsRef = useRef(null);

  const pick = (i) => {
    setAuto(false);
    setActive(i);
  };
  const advance = () => {
    setActive((a) => (a + 1) % N);
    setRunId((r) => r + 1);
  };

  const onTabKey = (e, i) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    let next = null;
    if (step) next = (i + step + N) % N;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = N - 1;
    if (next === null) return;
    e.preventDefault();
    pick(next);
    tabsRef.current?.querySelectorAll('[role="tab"]')[next]?.focus();
  };

  const current = demos[active];
  // A tab with a recording stays up for the whole recording (where it plays).
  const wide = useMediaQuery(VIDEO_QUERY);
  const phone = useMediaQuery(PHONE_QUERY);
  const videoPlays = wide && !phone;
  const video = DEMO_MEDIA[current.id].video;
  const advanceMs = videoPlays && video ? video.seconds * 1000 + 400 : ADVANCE_MS;

  return (
    <section id="top" className="hero" aria-labelledby="hero-title">
      <div className="container-wide hero-top">
        <h1 className="hero-title" id="hero-title">
          <span className="visually-hidden">{HERO.titleSpoken}</span>
          <RotatingPhrase phrases={demos.map((d) => d.phrase)} index={active} />
          <span aria-hidden="true">{HERO.titleRest}</span>
        </h1>
        <HeroJoin />
      </div>

      <div className="container-wide demo" ref={ref} {...pauseProps}>
        <div className="demo-stage squircle">
          <div className="demo-tabs" role="tablist" aria-label="Product demo" ref={tabsRef}>
            {demos.map((d, i) => {
              const selected = i === active;
              return (
                <button
                  key={d.id}
                  type="button"
                  role="tab"
                  id={`demo-tab-${d.id}`}
                  aria-selected={selected}
                  aria-controls="demo-panel"
                  tabIndex={selected ? 0 : -1}
                  className={"demo-tab" + (selected ? " is-selected" : "")}
                  onClick={() => pick(i)}
                  onKeyDown={(e) => onTabKey(e, i)}
                >
                  {selected && auto && autoplayAllowed ? (
                    <span
                      key={runId}
                      className="demo-tab-progress"
                      aria-hidden="true"
                      onAnimationEnd={advance}
                      style={{
                        animationDuration: `${advanceMs}ms`,
                        animationPlayState: running ? "running" : "paused",
                      }}
                    />
                  ) : null}
                  <span className="demo-tab-label">{d.label}</span>
                </button>
              );
            })}
          </div>

          <div className="demo-window" id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${current.id}`}>
            <div className="demo-window-bar" aria-hidden="true">
              <span className="demo-window-dots">
                <span />
                <span />
                <span />
              </span>
              <span className="demo-window-title">Gleec Pay</span>
            </div>
            <div
              className="demo-screens"
              style={{
                "--demo-ar": `${DEMO_SIZE.width} / ${DEMO_SIZE.height}`,
                "--demo-ar-phone": `${DEMO_SIZE_MOBILE.width} / ${DEMO_SIZE_MOBILE.height}`,
              }}
            >
              {demos.map((d, i) => (
                <DemoScreen
                  key={d.id}
                  media={DEMO_MEDIA[d.id]}
                  size={DEMO_SIZE}
                  active={i === active}
                  eager={i === 0}
                  alt={`Gleec Pay app, ${d.label.toLowerCase()} screen (illustrative)`}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="demo-caption">{current.caption}</p>
      </div>

      <p className="container footnote hero-disclaimer">
        {HERO.demoNote} {DISCLAIMER_SHORT}
      </p>
    </section>
  );
}
