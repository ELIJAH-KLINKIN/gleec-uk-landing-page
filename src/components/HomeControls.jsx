// HomeControls.jsx — Compliance / controls section. 4 cards.
import Icon from "./Icon.jsx";
import "./HomeControls.css";

export default function HomeControls() {
  const items = [
    {
      icon: "shield-check",
      title: "KYB & onboarding review",
      body: "Structured review of company, directors and ownership — proportionate to your profile, not box-ticking.",
    },
    {
      icon: "search",
      title: "Sanctions, PEP & adverse-media screening",
      body: "Counterparties and beneficial owners screened at onboarding and continuously over the relationship.",
    },
    {
      icon: "activity",
      title: "Transaction monitoring",
      body: "Rules and behavioural signals flag unusual flows before they settle — with case ownership end-to-end.",
    },
    {
      icon: "vault",
      title: "Safeguarding & reconciliation",
      body: "Client funds are held in line with safeguarding requirements and reconciled on a controlled cadence.",
    },
  ];

  return (
    <section id="controls" className="gl-home-section gl-home-ctrl">
      <div className="gl-container">
        <div className="gl-home-head">
          <p className="gl-eyebrow">Controls</p>
          <h2 className="gl-home-h">Designed for regulated, high-control payments</h2>
          <p className="gl-home-sub">
            GLEEC Business is being built with KYB, screening, monitoring, safeguarding, approval workflows and audit
            trails from day one — not as an afterthought
          </p>
        </div>

        <div className="gl-ctrl-grid">
          {items.map((it) => (
            <article key={it.title} className="gl-ctrl-card">
              <span className="gl-ctrl-icon">
                <Icon name={it.icon} size={18} strokeWidth={1.75} />
              </span>
              <h3>{it.title}</h3>
              <p>{it.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
