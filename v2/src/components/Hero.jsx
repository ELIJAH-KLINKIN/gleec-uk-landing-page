// Hero.jsx — headline, two actions, and an illustrative account card.
import { DISCLAIMER_SHORT, HERO } from "../content.js";
import Icon from "./ui/Icon.jsx";
import Flag from "./ui/Flag.jsx";
import { CURRENCY_FLAG } from "../lib/flags.js";
import "./Hero.css";

export default function Hero() {
  const m = HERO.mock;
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero-copy">
        <p className="eyebrow">{HERO.eyebrow}</p>
        <h1 className="title-hero" id="hero-title">
          {HERO.title} <span className="hero-em">{HERO.titleEmphasis}</span>
        </h1>
        <p className="lead hero-lead">{HERO.lead}</p>
        <div className="hero-actions">
          <a className="btn btn-filled btn-large" href={HERO.primary.href}>
            {HERO.primary.label}
          </a>
          <a className="link-chevron" href={HERO.secondary.href}>
            {HERO.secondary.label}
            <Icon name="chevron-right" size={18} />
          </a>
        </div>
      </div>

      <div className="container hero-stage" aria-hidden="true">
        <div className="hero-card squircle">
          <div className="hero-card-top">
            <span className="hero-card-label">{m.account}</span>
            <span className="hero-chip">
              <Flag code={CURRENCY_FLAG[m.currency]} size={16} />
              {m.currency}
            </span>
          </div>
          <p className="hero-balance">
            <span className="hero-balance-sym">{m.balance[0]}</span>
            {m.balance[1]}
            <span className="hero-balance-minor">{m.balance[2]}</span>
          </p>
          <div className="hero-card-meta">
            <span className="hero-mono">{m.details}</span>
            <span className="hero-status">
              <span className="hero-dot" />
              {m.status}
            </span>
          </div>
          <div className="hero-subbalances">
            {m.balances.map((b) => (
              <div key={b.code} className="hero-sub">
                <span className="hero-sub-code">
                  <Flag code={CURRENCY_FLAG[b.code]} size={16} />
                  {b.code}
                </span>
                <span className="hero-sub-amount">{b.amount}</span>
                <span className="hero-sub-note">{b.note}</span>
              </div>
            ))}
          </div>
          <ul className="hero-activity">
            {m.activity.map((a) => (
              <li key={a.name}>
                <span className={"hero-activity-icon " + a.dir}>
                  <Icon name={a.dir === "in" ? "arrow-down-left" : "arrow-up-right"} size={16} />
                </span>
                <span className="hero-activity-text">
                  <strong>{a.name}</strong>
                  <span>{a.detail}</span>
                </span>
                <span className={"hero-activity-amount " + a.dir}>{a.amount}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="hero-notice">
          <span className="hero-notice-icon">
            <Icon name="arrow-down-left" size={16} strokeWidth={2.4} />
          </span>
          <span className="hero-notice-text">
            <span className="hero-notice-head">
              <strong>{m.notice.title}</strong>
              <span>now</span>
            </span>
            <span>{m.notice.detail}</span>
          </span>
        </div>
      </div>

      <p className="container footnote hero-disclaimer">{DISCLAIMER_SHORT}</p>
    </section>
  );
}
