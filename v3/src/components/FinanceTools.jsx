// FinanceTools.jsx — "Built for the way finance teams work": bulk payments, API and
// webhooks, machine-readable statements, roles and approvals. Same tile grid as
// Controls (one design for "a set of capabilities"). Until the Payments section
// ships, this is what the menu's "Payments" (#payments) opens.
import { FINANCE } from "../content.js";
import SectionHeader from "./ui/SectionHeader.jsx";
import Icon from "./ui/Icon.jsx";
import "./Controls.css";

export default function FinanceTools() {
  return (
    <section id="payments" className="section alt finance" aria-labelledby="finance-title">
      <div className="container-wide">
        <SectionHeader id="finance-title" eyebrow={FINANCE.eyebrow} title={FINANCE.title} lead={FINANCE.lead} />
        <ul className="ctrl-grid">
          {FINANCE.items.map((c) => (
            <li key={c.title} className="ctrl-card squircle">
              <span className="ctrl-icon">
                <Icon name={c.icon} size={22} />
              </span>
              <h3 className="ctrl-title">{c.title}</h3>
              <p className="ctrl-body">{c.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
