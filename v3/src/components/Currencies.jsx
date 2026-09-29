// Currencies.jsx — the three core currencies, each led by its flag (the same
// round flags as the account tiles and the coming-soon chips), then the
// currencies planned next.
import { CURRENCIES } from "../content.js";
import SectionHeader from "./ui/SectionHeader.jsx";
import Icon from "./ui/Icon.jsx";
import Flag from "./ui/Flag.jsx";
import { CURRENCY_FLAG } from "../lib/flags.js";
import "./Currencies.css";

export default function Currencies() {
  return (
    <section id="currencies" className="section currencies" aria-labelledby="currencies-title">
      <div className="container">
        <SectionHeader
          id="currencies-title"
          eyebrow={CURRENCIES.eyebrow}
          title={CURRENCIES.title}
          lead={CURRENCIES.lead}
        />

        <ul className="cur-core">
          {CURRENCIES.core.map((c) => (
            <li key={c.code} className="cur-tile squircle">
              <Flag code={CURRENCY_FLAG[c.code]} size={72} className="flag cur-flag" />
              <span className="cur-code">{c.code}</span>
              <span className="cur-name">{c.name}</span>
              <span className="cur-routes">{c.routes}</span>
            </li>
          ))}
        </ul>

        <div className="cur-soon">
          <h3 className="cur-soon-title">
            <span className="soon">{CURRENCIES.soonLabel}</span>
          </h3>
          <ul className="cur-chips">
            {CURRENCIES.soon.map((code) => (
              <li key={code}>
                <Flag code={CURRENCY_FLAG[code]} size={18} />
                {code}
              </li>
            ))}
            <li className="cur-more">{CURRENCIES.more}</li>
          </ul>
        </div>

        <p className="cur-link">
          <a className="link-chevron" href={CURRENCIES.link.href}>
            {CURRENCIES.link.label}
            <Icon name="chevron-right" size={18} />
          </a>
        </p>
      </div>
    </section>
  );
}
