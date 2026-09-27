// Accounts.jsx — "More than just account details": copy + checklist beside an
// illustrative desktop app window (sidebar + balances + activity).
import { ACCOUNTS } from "../content.js";
import Icon from "./ui/Icon.jsx";
import Flag from "./ui/Flag.jsx";
import { CURRENCY_FLAG } from "../lib/flags.js";
import "./Accounts.css";

const SIDEBAR = ["Accounts", "Cards", "Transfers", "Statements"];
const ACTIVITY_ICON = {
  in: "arrow-down-left",
  out: "arrow-up-right",
  fx: "arrow-left-right",
  review: "triangle-alert",
};

export default function Accounts() {
  const m = ACCOUNTS.mock;
  return (
    <section id="accounts" className="section alt accounts" aria-labelledby="accounts-title">
      <div className="container-wide accounts-grid">
        <div className="accounts-copy">
          <p className="eyebrow">{ACCOUNTS.eyebrow}</p>
          <h2 className="title-1" id="accounts-title">
            {ACCOUNTS.title}
          </h2>
          <p className="lead accounts-lead">{ACCOUNTS.lead}</p>
          <ul className="checklist">
            {ACCOUNTS.points.map((p) => (
              <li key={p}>
                <Icon name="check" size={18} strokeWidth={2.4} />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <a className="link-chevron" href={ACCOUNTS.link.href}>
            {ACCOUNTS.link.label}
            <Icon name="chevron-right" size={18} />
          </a>
        </div>

        <div className="app-window squircle" aria-hidden="true">
          <aside className="app-sidebar">
            <span className="app-sidebar-title">GLEEC Business</span>
            <ul>
              {SIDEBAR.map((item, i) => (
                <li key={item} className={i === 0 ? "is-selected" : undefined}>
                  {item}
                </li>
              ))}
            </ul>
          </aside>
          <div className="app-main">
            <p className="app-main-title">Accounts</p>
            <div className="app-balances">
              {m.balances.map((b, i) => (
                <div key={b.code} className={"app-balance" + (i === 0 ? " is-selected" : "")}>
                  <span>
                    <Flag code={CURRENCY_FLAG[b.code]} size={14} />
                    {b.code}
                  </span>
                  <strong>
                    {b.symbol}
                    {b.amount}
                  </strong>
                </div>
              ))}
            </div>
            <p className="app-section-label">Recent activity</p>
            <ul className="app-activity">
              {m.activity.map((a) => (
                <li key={a.name}>
                  <span className={"app-activity-icon " + a.dir}>
                    <Icon name={ACTIVITY_ICON[a.dir]} size={15} strokeWidth={2.2} />
                  </span>
                  <span className="app-activity-text">
                    <strong>{a.name}</strong>
                    <span>{a.detail}</span>
                  </span>
                  <span className={"app-activity-amount " + a.dir}>{a.amount}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
