// Currencies.jsx — the three core currencies as large symbol tiles, then the
// currencies planned next.
import { CURRENCIES } from "../content.js";
import SectionHeader from "./ui/SectionHeader.jsx";
import Icon from "./ui/Icon.jsx";
import "./Currencies.css";

export default function Currencies() {
  return (
    <section id="currencies" className="section alt currencies" aria-labelledby="currencies-title">
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
              <span className="cur-symbol" aria-hidden="true">
                {c.symbol}
              </span>
              <span className="cur-code">{c.code}</span>
              <span className="cur-name">{c.name}</span>
              <span className="cur-routes">{c.routes}</span>
            </li>
          ))}
        </ul>

        <div className="cur-soon">
          <h3 className="cur-soon-title">{CURRENCIES.soonLabel}</h3>
          <ul className="cur-chips">
            {CURRENCIES.soon.map((code) => (
              <li key={code}>{code}</li>
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
