// Payments.jsx — the Payments section: sending money. A recording of the app's
// own send flow (payee → amount → review → sent, and tracked to the recipient's
// bank), how long each payment method takes, and the tools finance teams use.
// The recording plays muted from the start while it's on screen, in the
// visitor's colour scheme; otherwise, and under Reduce Motion, its first frame
// shows as a still. Phones see the app's centre column, and at the end (Home,
// with the payment's panel) the view pans right to the panel.
// (Receiving — account details — is the Accounts section.)
import { useState } from "react";
import { PAYMENTS } from "../content.js";
import SectionHeader from "./ui/SectionHeader.jsx";
import Icon from "./ui/Icon.jsx";
import { useAutoAdvance } from "../lib/useAutoAdvance.js";
import { useMediaQuery } from "../lib/useMediaQuery.js";
import videoDark from "../assets/demo/payments-dark.mp4";
import videoLight from "../assets/demo/payments-light.mp4";
import posterDark from "../assets/demo/payments-dark-poster.webp";
import posterLight from "../assets/demo/payments-light-poster.webp";
import "./Payments.css";

const SIZE = { width: 2000, height: 1250 };
// When the app returns Home after Send (both recordings; see record-payments.cjs).
const HOME_AT = 15.4;

function SendRecording() {
  const { ref, running } = useAutoAdvance({ enabled: true, threshold: 0.4 });
  const dark = useMediaQuery("(prefers-color-scheme: dark)");
  const clip = dark ? { mp4: videoDark, poster: posterDark } : { mp4: videoLight, poster: posterLight };
  const [home, setHome] = useState(false);
  return (
    <div
      ref={ref}
      className={"pay-screen" + (running && home ? " is-home" : "")}
      role="img"
      aria-label={PAYMENTS.videoLabel}
    >
      <picture>
        <source srcSet={posterDark} media="(prefers-color-scheme: dark)" />
        <img src={posterLight} alt="" width={SIZE.width} height={SIZE.height} loading="lazy" decoding="async" />
      </picture>
      {running ? (
        <video
          key={clip.mp4} // a new colour scheme loads its own recording
          autoPlay
          muted
          loop
          playsInline
          poster={clip.poster}
          width={SIZE.width}
          height={SIZE.height}
          aria-hidden="true"
          onLoadStart={() => setHome(false)}
          onTimeUpdate={(e) => setHome(e.currentTarget.currentTime >= HOME_AT)}
        >
          <source src={clip.mp4} type="video/mp4" />
        </video>
      ) : null}
    </div>
  );
}

export default function Payments() {
  return (
    <section id="payments" className="section alt payments" aria-labelledby="payments-title">
      <div className="container">
        <SectionHeader id="payments-title" eyebrow={PAYMENTS.eyebrow} title={PAYMENTS.title} lead={PAYMENTS.lead} />
      </div>

      <div className="container-wide">
        <div className="demo-window pay-window">
          <div className="demo-window-bar" aria-hidden="true">
            <span className="demo-window-dots">
              <span />
              <span />
              <span />
            </span>
            <span className="demo-window-title">Gleec Business</span>
          </div>
          <SendRecording />
        </div>

        <div className="pay-below">
          <div>
            <h3 className="pay-below-title">{PAYMENTS.timingsTitle}</h3>
            <dl className="kv pay-timings">
              {PAYMENTS.timings.map(([name, when]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{when}</dd>
                </div>
              ))}
            </dl>
            <p className="footnote pay-reach">{PAYMENTS.reach}</p>
          </div>
          <div>
            <h3 className="pay-below-title">{PAYMENTS.toolsTitle}</h3>
            <ul className="pay-tools">
              {PAYMENTS.tools.map((t) => (
                <li key={t.title}>
                  <span className="pay-tool-icon">
                    <Icon name={t.icon} size={20} />
                  </span>
                  <span>
                    <strong>{t.title}</strong>
                    <span className="pay-tool-body">{t.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
