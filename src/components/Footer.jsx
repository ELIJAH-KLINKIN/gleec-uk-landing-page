// Footer.jsx — Dense structured footer.
// Legal block uses the full page-width container (not compressed to half).
import Icon from "./Icon.jsx";
import logoG from "../assets/logo-g.png";
import "./Footer.css";

// Links with no destination yet are rendered as plain text ("coming soon")
// rather than as dead `href="#"` links.
const COLS = [
  {
    h: "Product",
    links: [
      { l: "Business accounts", href: "#accounts" },
      { l: "Multi-currency", href: "#accounts" },
      { l: "International payments", href: "#payments" },
      { l: "FX", href: "#payments" },
      { l: "Payment cards", href: "#cards" },
      { l: "Spend controls", href: "#cards" },
    ],
  },
  {
    h: "Resources",
    links: [
      { l: "Plans & pricing", href: "#plans" },
      { l: "FAQ", href: "#faq" },
      { l: "Currency coverage", href: "#currencies" },
      { l: "Regulatory information", href: "#regulatory" },
      { l: "Help centre", soon: true },
    ],
  },
  {
    h: "Company",
    links: [
      { l: "About Gleec Pay", soon: true },
      { l: "Compliance", href: "#controls" },
      { l: "Join the waitlist", href: "#waitlist" },
    ],
  },
  {
    h: "Legal",
    links: [
      { l: "Regulatory information", href: "#regulatory" },
      { l: "Terms of use", soon: true },
      { l: "Privacy policy", soon: true },
      { l: "Cookies", soon: true },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="gl-footer" id="company">
      <div className="gl-container">
        <div className="gl-footer-top">
          <div className="gl-footer-brand">
            <div className="gl-footer-brand-lockup">
              <img src={logoG} alt="" width="21" height="28" loading="lazy" />
              <span>
                GLEEC <span style={{ color: "var(--gleec-purple)" }}>Business</span>
              </span>
            </div>
            <p className="gl-footer-tag">
              Proposed UK business accounts and payment infrastructure for complex companies.
            </p>
            <p className="gl-footer-locale">
              <Icon name="globe" size={14} /> United Kingdom · English
            </p>
          </div>
          <nav className="gl-footer-cols" aria-label="Footer">
            {COLS.map((c) => (
              <div key={c.h} className="gl-footer-col">
                <h2 className="gl-footer-col-h">{c.h}</h2>
                <ul>
                  {c.links.map((l) => (
                    <li key={l.l}>
                      {l.soon ? (
                        <span className="gl-footer-soon">
                          {l.l} <span>Soon</span>
                        </span>
                      ) : (
                        <a href={l.href}>{l.l}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="gl-footer-legal" id="regulatory">
          <p>
            <strong>Gleec Business</strong> is a brand of <strong>Gleec Pay Ltd</strong>, a company registered in
            England and Wales [insert company number]. Gleec Pay Ltd is preparing an application to the Financial
            Conduct Authority to become an Authorised Electronic Money Institution. Gleec Pay Ltd is not currently
            authorised by the FCA and does not currently provide regulated e-money or payment services in the UK.
          </p>
          <p>
            The information on this website is for general information and application-preparation purposes only. It
            does not constitute an offer, invitation or financial promotion to provide regulated services. Any products,
            features, pricing, payment routes, account details or card functionality shown are illustrative and subject
            to authorisation, onboarding approval, partner availability, final terms and applicable law.
          </p>
          <p>
            Gleec Pay Ltd's proposed UK services are fiat-only. Gleec Pay Ltd will not provide cryptoasset exchange,
            custody, brokerage, stablecoin issuance, staking, investment services or cryptoasset settlement. E-money
            accounts are not bank accounts and are not protected by the Financial Services Compensation Scheme. If
            authorised, relevant customer funds will be safeguarded in accordance with applicable e-money safeguarding
            requirements.
          </p>
          <p>All trademarks referenced on this page are the property of their respective owners.</p>
        </div>

        <div className="gl-footer-bottom">
          <span>© 2026 Gleec Pay Ltd. All rights reserved.</span>
          <a href="#top" className="gl-footer-top-link">
            Back to top
          </a>
        </div>
      </div>
    </footer>
  );
}
