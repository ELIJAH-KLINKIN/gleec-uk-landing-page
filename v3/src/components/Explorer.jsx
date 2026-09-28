// Explorer.jsx — Global accounts & transfers. A sidebar picks the market, a
// segmented control picks the transfer method, and the panel shows matching
// (illustrative) account details as label/value rows, plus what each part of
// the identifier means.
import { useState } from "react";
import { EXPLORER } from "../content.js";
import SectionHeader from "./ui/SectionHeader.jsx";
import SegmentedControl from "./ui/SegmentedControl.jsx";
import Flag from "./ui/Flag.jsx";
import Icon from "./ui/Icon.jsx";
import "./Explorer.css";

const PART_TONES = ["purple", "blue", "green", "orange"];

export default function Explorer() {
  const [marketId, setMarketId] = useState("uk");
  const [methodId, setMethodId] = useState("gbp-local");
  const market = EXPLORER.markets.find((m) => m.id === marketId);
  const details = EXPLORER.details[`${marketId}/${methodId}`];
  const explainer = EXPLORER.explainers[EXPLORER.methods[methodId].explain];

  // Keep the current method when the new market supports it, otherwise use its first.
  const selectMarket = (id) => {
    const next = EXPLORER.markets.find((m) => m.id === id);
    setMarketId(id);
    if (!next.methods.includes(methodId)) setMethodId(next.methods[0]);
  };

  const onSidebarKey = (e, i) => {
    const list = EXPLORER.markets;
    const map = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let next = null;
    if (e.key in map) next = (i + map[e.key] + list.length) % list.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = list.length - 1;
    if (next === null) return;
    e.preventDefault();
    selectMarket(list[next].id);
    e.currentTarget.parentElement.parentElement.querySelectorAll('[role="tab"]')[next].focus();
  };

  return (
    <section id="payments" className="section explorer" aria-labelledby="explorer-title">
      <div className="container">
        <SectionHeader id="explorer-title" eyebrow={EXPLORER.eyebrow} title={EXPLORER.title} lead={EXPLORER.lead} />
      </div>

      <div className="container-wide">
        <div className="xp squircle">
          <nav className="xp-sidebar" aria-label="Markets">
            <ul role="tablist" aria-orientation="vertical" aria-label="Markets">
              {EXPLORER.markets.map((m, i) => {
                const selected = m.id === marketId;
                return (
                  <li key={m.id} role="presentation">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls="xp-panel"
                      tabIndex={selected ? 0 : -1}
                      className={"xp-market" + (selected ? " is-selected" : "")}
                      onClick={() => selectMarket(m.id)}
                      onKeyDown={(e) => onSidebarKey(e, i)}
                    >
                      <Flag code={m.flag} size={24} />
                      <span>{m.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="xp-stat">
              <strong>{EXPLORER.stat.value}</strong> {EXPLORER.stat.label}
            </p>
          </nav>

          <div className="xp-main">
            <div className="xp-methods">
              <SegmentedControl
                label="Transfer method"
                options={market.methods.map((id) => ({ value: id, label: EXPLORER.methods[id].label }))}
                value={methodId}
                onChange={setMethodId}
                controls="xp-panel"
              />
            </div>

            <div id="xp-panel" role="tabpanel" aria-label={`${details.currency} account details, ${market.label}`}>
              <div className="xp-panel-head" key={`${marketId}/${methodId}`}>
                <h3 className="title-3">
                  {details.currency} account · {market.label}
                </h3>
                <p className="footnote">{details.note}</p>
              </div>

              <div className="xp-groups">
                <div className="xp-group">
                  <h4 className="xp-group-title">Bank details</h4>
                  <dl className="kv">
                    <div>
                      <dt>Bank name</dt>
                      <dd>{details.bank}</dd>
                    </div>
                    {details.rows.map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd className="mono">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="xp-group">
                  <h4 className="xp-group-title">Recipient details</h4>
                  <dl className="kv">
                    <div>
                      <dt>Account holder</dt>
                      <dd>{market.holder}</dd>
                    </div>
                    <div>
                      <dt>Address</dt>
                      <dd>{market.address}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="xp-explain" aria-label={`How to read the ${explainer.title}`} role="group">
                <p className="xp-group-title">{explainer.title}</p>
                <p className="xp-explain-value">
                  {explainer.parts.map(([value], i) => (
                    <span key={i}>
                      {i > 0 && explainer.joiner ? <span className="xp-joiner">{explainer.joiner}</span> : null}
                      <span className={"xp-part " + PART_TONES[i]}>{value}</span>
                    </span>
                  ))}
                </p>
                <ul className="xp-legend">
                  {explainer.parts.map(([, label], i) => (
                    <li key={label}>
                      <span className={"xp-swatch " + PART_TONES[i]} aria-hidden="true" />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="xp-below">
          <div>
            <h3 className="xp-below-title">Account capabilities</h3>
            <ul className="checklist">
              {EXPLORER.capabilities.map((c) => (
                <li key={c}>
                  <Icon name="check" size={18} strokeWidth={2.4} />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="xp-below-title">
              Transfer methods ·
              <Flag code={market.flag} size={22} />
              {market.label}
            </h3>
            <dl className="kv kv-inset">
              {market.routes.map(([name, desc]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
