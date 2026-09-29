// Explorer.jsx — Global Account details & transfers. A sidebar picks the market; where the
// account has separate local and international details (GBP), a segmented control
// switches between them. The panel lists the (illustrative) details the way a
// payer's bank asks for them: name, identifiers, address, bank, bank address.
import { useState } from "react";
import { EXPLORER } from "../content.js";
import SectionHeader from "./ui/SectionHeader.jsx";
import SegmentedControl from "./ui/SegmentedControl.jsx";
import Flag from "./ui/Flag.jsx";
import Icon from "./ui/Icon.jsx";
import "./Explorer.css";

export default function Explorer() {
  const [marketId, setMarketId] = useState("uk");
  const [viewId, setViewId] = useState("local");
  const market = EXPLORER.markets.find((m) => m.id === marketId);
  const view = market.views.find((v) => v.id === viewId) ?? market.views[0];
  const rows = [
    ["Recipient’s name", market.holder],
    ...view.rows.map(([k, v]) => [k, v, true]),
    ["Recipient’s address", market.address],
    ["Account provider", market.bank.name],
    ["Provider address", market.bank.address],
  ];

  // Keep Local / International when the next market has it, otherwise its first view.
  const selectMarket = (id) => {
    const next = EXPLORER.markets.find((m) => m.id === id);
    setMarketId(id);
    if (!next.views.some((v) => v.id === viewId)) setViewId(next.views[0].id);
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
    <section id="payments" className="section alt explorer" aria-labelledby="explorer-title">
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
            {/* Only a choice gets a chooser: one view, no switch. */}
            {market.views.length > 1 ? (
              <div className="xp-methods">
                <SegmentedControl
                  label="Paying from"
                  options={market.views.map((v) => ({ value: v.id, label: v.label }))}
                  value={view.id}
                  onChange={setViewId}
                  controls="xp-panel"
                />
              </div>
            ) : null}

            <div id="xp-panel" role="tabpanel" aria-label={`${market.title}, account details`}>
              <div className="xp-panel-head" key={`${marketId}/${view.id}`}>
                <h3 className="title-3">{market.title}</h3>
                <p className="footnote">{view.info}</p>
              </div>

              <h4 className="xp-group-title">
                Account details <span className="xp-example">Example</span>
              </h4>
              <dl className="kv xp-details">
                {rows.map(([k, v, mono]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd className={mono ? "mono" : undefined}>{v}</dd>
                  </div>
                ))}
              </dl>
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
