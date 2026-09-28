// Plans.jsx — two indicative plans plus a case-by-case option.
import { PLANS } from "../content.js";
import { prefillWaitlist } from "../lib/prefill.js";
import SectionHeader from "./ui/SectionHeader.jsx";
import Icon from "./ui/Icon.jsx";
import "./Plans.css";

export default function Plans() {
  return (
    <section id="pricing" className="section plans" aria-labelledby="plans-title">
      <div className="container-wide">
        <SectionHeader id="plans-title" eyebrow={PLANS.eyebrow} title={PLANS.title} lead={PLANS.lead} />
        <div className="plans-grid">
          {PLANS.items.map((p) => (
            <article key={p.id} className="plan squircle" aria-labelledby={`plan-${p.id}`}>
              <p className="plan-audience">{p.audience}</p>
              <h3 className="plan-name" id={`plan-${p.id}`}>
                {p.name}
              </h3>
              <p className="plan-summary">{p.summary}</p>
              <ul className="plan-features">
                {p.features.map((f) => (
                  <li key={f}>
                    <Icon name="check" size={16} strokeWidth={2.4} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
          <article className="plan plan-bespoke squircle" aria-labelledby="plan-bespoke">
            <h3 className="plan-audience" id="plan-bespoke">
              {PLANS.bespoke.audience}
            </h3>
            <p className="plan-bespoke-body">{PLANS.bespoke.body}</p>
            <a className="link-chevron" href="#waitlist" onClick={() => prefillWaitlist("group")}>
              {PLANS.bespoke.cta}
              <Icon name="chevron-right" size={18} />
            </a>
          </article>
        </div>
        <div className="plans-cta">
          <a className="btn btn-filled btn-large" href={PLANS.cta.href}>
            {PLANS.cta.label}
          </a>
          <p className="footnote">{PLANS.note}</p>
        </div>
      </div>
    </section>
  );
}
