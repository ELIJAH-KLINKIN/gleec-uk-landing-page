// HomeCurrencies.jsx — Multi-currency section.
// Three large 3D-style tiles for £/€/$, then a "Coming next" treatment with
// compact pills (tiny circular flag + currency name) and a +N others marker.
import { Fragment } from "react";
import Icon from "./Icon.jsx";
import "./HomeCurrencies.css";

export default function HomeCurrencies() {
  const core = [
    { sym: "£", code: "GBP", name: "British Pound", rails: "FPS · BACS · CHAPS", angle: -6 },
    { sym: "€", code: "EUR", name: "Euro", rails: "SEPA · SEPA Instant", angle: 0 },
    { sym: "$", code: "USD", name: "United States $", rails: "SWIFT · Fedwire", angle: 6 },
  ];

  // 10 displayed examples — 24 currencies total across partner infrastructure,
  // so 24 − 3 core − 10 displayed = +11 others.
  const extras = [
    { iso: "CH", code: "CHF" },
    { iso: "CA", code: "CAD" },
    { iso: "AU", code: "AUD" },
    { iso: "DK", code: "DKK" },
    { iso: "SE", code: "SEK" },
    { iso: "NO", code: "NOK" },
    { iso: "PL", code: "PLN" },
    { iso: "CZ", code: "CZK" },
    { iso: "HU", code: "HUF" },
    { iso: "JP", code: "JPY" },
  ];

  return (
    <section id="currencies" className="gl-home-section gl-home-cur">
      <div className="gl-aura gl-aura-purple gl-cur-aura" aria-hidden="true" />
      <div className="gl-container">
        <div className="gl-home-head">
          <p className="gl-eyebrow">Multi-currency</p>
          <h2 className="gl-home-h">
            GBP, EUR and USD at the core.
            <br />
            More currencies when you need them
          </h2>
          <p className="gl-home-sub">
            Run your operating balances in the currencies that matter most, with additional currency coverage through
            partner banking
          </p>
        </div>

        <div className="gl-cur-stage">
          {core.map((c) => (
            <div key={c.code} className="gl-cur-tile" style={{ transform: `rotate(${c.angle}deg)` }}>
              <div className="gl-cur-tile-inner">
                <span className="gl-cur-sym">{c.sym}</span>
                <span className="gl-cur-shine" aria-hidden="true" />
              </div>
              <div className="gl-cur-label">
                <strong>{c.code}</strong>
                <span>{c.name}</span>
                <span className="gl-cur-rails">{c.rails}</span>
              </div>
            </div>
          ))}
          <div className="gl-cur-shadow" aria-hidden="true" />
        </div>

        <div className="gl-cur-next">
          <div className="gl-cur-next-head">
            <span className="gl-cur-pill-eyebrow">Coming soon</span>
          </div>

          <div className="gl-cur-chip-rail" role="list">
            {extras.map((e) => (
              <div key={e.code} className="gl-cur-chip" role="listitem">
                <span className="gl-cur-chip-flag" aria-hidden="true">
                  <CountryDisc iso={e.iso} />
                </span>
                <span className="gl-cur-chip-code">{e.code}</span>
              </div>
            ))}
            <span className="gl-cur-chip-more" role="listitem">
              +11 others
            </span>
          </div>
        </div>

        <div className="gl-cur-cta">
          <a href="#payments" className="gl-btn gl-btn-primary">
            Explore payments <Icon name="arrow-right" size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------- Tiny circular country flag discs ------------- */
// Stylised, abstracted national-flag discs. Each renders a clipped circle
// using the country's flag colour blocks — recognisable but not photographic.
function CountryDisc({ iso }) {
  const id = "gl-cd-" + iso;
  const wrap = (children) => (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" style={{ display: "block" }}>
      <defs>
        <clipPath id={id}>
          <circle cx="10" cy="10" r="10" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        {children}
        <circle cx="10" cy="10" r="9.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
      </g>
    </svg>
  );
  switch (iso) {
    case "CH": // Swiss — red field, white cross
      return wrap(
        <Fragment>
          <rect width="20" height="20" fill="#D52B1E" />
          <rect x="8.5" y="4" width="3" height="12" fill="#fff" />
          <rect x="4" y="8.5" width="12" height="3" fill="#fff" />
        </Fragment>,
      );
    case "CA": // Canadian — red/white/red bars + maple disc
      return wrap(
        <Fragment>
          <rect width="20" height="20" fill="#fff" />
          <rect x="0" width="5" height="20" fill="#D52B1E" />
          <rect x="15" width="5" height="20" fill="#D52B1E" />
          <circle cx="10" cy="10" r="2.3" fill="#D52B1E" />
        </Fragment>,
      );
    case "AU": // Australian — blue with red/white canton suggestion
      return wrap(
        <Fragment>
          <rect width="20" height="20" fill="#00247D" />
          <rect width="10" height="10" fill="#00247D" />
          <path d="M0 0 L10 10 M10 0 L0 10" stroke="#fff" strokeWidth="2" />
          <path d="M0 0 L10 10 M10 0 L0 10" stroke="#CF142B" strokeWidth="1" />
          <path d="M5 0 V10 M0 5 H10" stroke="#fff" strokeWidth="2.5" />
          <path d="M5 0 V10 M0 5 H10" stroke="#CF142B" strokeWidth="1.2" />
          <circle cx="15" cy="14" r="1" fill="#fff" />
          <circle cx="12.5" cy="16.5" r="0.8" fill="#fff" />
          <circle cx="17" cy="11" r="0.8" fill="#fff" />
        </Fragment>,
      );
    case "DK": // Danish — red with white cross (off-centre)
      return wrap(
        <Fragment>
          <rect width="20" height="20" fill="#C8102E" />
          <rect x="0" y="8.5" width="20" height="3" fill="#fff" />
          <rect x="6" y="0" width="3" height="20" fill="#fff" />
        </Fragment>,
      );
    case "SE": // Swedish — blue with yellow cross
      return wrap(
        <Fragment>
          <rect width="20" height="20" fill="#006AA7" />
          <rect x="0" y="8.5" width="20" height="3" fill="#FECC00" />
          <rect x="6" y="0" width="3" height="20" fill="#FECC00" />
        </Fragment>,
      );
    case "NO": // Norwegian — red with white+blue cross
      return wrap(
        <Fragment>
          <rect width="20" height="20" fill="#EF2B2D" />
          <rect x="0" y="7.5" width="20" height="5" fill="#fff" />
          <rect x="5" y="0" width="5" height="20" fill="#fff" />
          <rect x="0" y="8.5" width="20" height="3" fill="#002868" />
          <rect x="6" y="0" width="3" height="20" fill="#002868" />
        </Fragment>,
      );
    case "PL": // Polish — white over red
      return wrap(
        <Fragment>
          <rect width="20" height="10" fill="#fff" />
          <rect y="10" width="20" height="10" fill="#DC143C" />
        </Fragment>,
      );
    case "CZ": // Czech — white over red with blue triangle
      return wrap(
        <Fragment>
          <rect width="20" height="10" fill="#fff" />
          <rect y="10" width="20" height="10" fill="#D7141A" />
          <path d="M0 0 L10 10 L0 20 Z" fill="#11457E" />
        </Fragment>,
      );
    case "HU": // Hungarian — red/white/green stripes
      return wrap(
        <Fragment>
          <rect width="20" height="6.7" fill="#CD2A3E" />
          <rect y="6.7" width="20" height="6.7" fill="#fff" />
          <rect y="13.4" width="20" height="6.6" fill="#436F4D" />
        </Fragment>,
      );
    case "JP": // Japanese — white with red disc
      return wrap(
        <Fragment>
          <rect width="20" height="20" fill="#fff" />
          <circle cx="10" cy="10" r="5" fill="#BC002D" />
        </Fragment>,
      );
    default:
      return wrap(<rect width="20" height="20" fill="#222" />);
  }
}
