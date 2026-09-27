// HomeSegments.jsx — Who it's for. Three large rounded "customer-fit" cards.
import Icon from "./Icon.jsx";
import { prefillWaitlist } from "../lib/prefill.js";
import "./HomeSegments.css";

export default function HomeSegments() {
  const segs = [
    {
      id: "local",
      title: "Local Businesses",
      body: "For UK companies \u2014 including those underserved by high-street business banking \u2014 with straightforward ownership and UK-focused payment needs.",
      bullets: [
        "Simple UK company structure",
        "Limited number of UBOs",
        "GBP and EUR payment needs",
        "Often turned away by high-street banks",
      ],
      cta: { label: "See if it fits", type: "local" },
    },
    {
      id: "intl",
      title: "International Businesses",
      body: "For companies operating across markets, currencies and counterparties.",
      bullets: [
        "Cross-border operations",
        "Multiple operating currencies",
        "International suppliers and customers",
        "Higher payment volumes",
        "Accepting and making third-party supported cryptocurrency payments",
        "Enhanced onboarding where required",
      ],
      cta: { label: "See if it fits", type: "international" },
      featured: true,
    },
    {
      id: "groups",
      title: "Holdings & Corporate Groups",
      body: "For groups, platforms and complex ownership structures that need a tailored review.",
      bullets: [
        "Multi-layer ownership",
        "Holding companies",
        "Regulated or financial counterparties",
        "Declined or offboarded elsewhere for complexity",
        "Bespoke limits and approval model",
      ],
      cta: { label: "Contact us", type: "group" },
    },
  ];

  return (
    <section className="gl-home-section gl-home-segs">
      <div className="gl-container">
        <div className="gl-home-head">
          <p className="gl-eyebrow">Who it's for</p>
          <h2 className="gl-home-h">Built for businesses traditional banking leaves behind</h2>
          <p className="gl-home-sub">
            GLEEC Business is for companies that often struggle to open or keep a business bank account — including
            those that need to accept and make third-party supported cryptocurrency payments. Where high-street banks
            see complexity, we see customers worth serving.
          </p>
        </div>

        <div className="gl-segs-grid">
          {segs.map((s) => (
            <article key={s.id} className={"gl-seg " + (s.featured ? "is-featured" : "")}>
              <h3 className="gl-seg-h">{s.title}</h3>
              <p className="gl-seg-body">{s.body}</p>

              <div className="gl-seg-block">
                <p className="gl-seg-label">Suitable for</p>
                <ul className="gl-seg-bullets">
                  {s.bullets.map((b) => (
                    <li key={b}>
                      <span className="gl-seg-dash" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              <a className="gl-seg-cta" href="#waitlist" onClick={() => prefillWaitlist(s.cta.type)}>
                {s.cta.label} <Icon name="arrow-right" size={14} />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
