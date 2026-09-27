// HomeFAQ.jsx — Wide, line-separated FAQ. Same visual rhythm as PricingFAQ.
import { useState } from "react";
import Icon from "./Icon.jsx";
import "./HomeFAQ.css";

export default function HomeFAQ() {
  const items = [
    {
      q: "Is Gleec Pay Ltd authorised by the FCA?",
      a: "Gleec Pay Ltd is preparing an application to the FCA to become an Authorised Electronic Money Institution. It is not currently authorised by the FCA and does not currently provide regulated e-money or payment services in the UK.",
    },
    {
      q: "Is Gleec Business a bank?",
      a: "No. Gleec Business is not a bank. The proposed service is an e-money and payment account platform. E-money accounts are not bank accounts and are not protected by the Financial Services Compensation Scheme.",
    },
    {
      q: "Are the products on this website available now?",
      a: "The website describes the proposed Gleec Business product direction. Products, features, pricing, payment routes and card functionality are illustrative and subject to FCA authorisation, onboarding approval, partner availability, final terms and applicable law.",
    },
    {
      q: "Does Gleec Pay Ltd provide crypto services?",
      a: "No. Gleec Pay Ltd's proposed UK services are fiat-only. Gleec Pay Ltd will not provide cryptoasset exchange, custody, brokerage, stablecoin issuance, staking, investment services or cryptoasset settlement.",
    },
    {
      q: "Who can apply?",
      a: "The proposed service is designed for eligible businesses with more complex account and payment needs. Any future onboarding would be subject to customer due diligence, risk assessment, acceptance policy and final approval.",
    },
    {
      q: "Are customer funds protected by FSCS?",
      a: "No. E-money accounts are not bank accounts and are not protected by FSCS. If authorised, relevant customer funds will be safeguarded in accordance with applicable e-money safeguarding requirements.",
    },
    {
      q: "Which currencies and payment routes are planned?",
      a: "The initial operating focus is GBP, EUR and USD, with planned support for Faster Payments, CHAPS, BACS, SEPA, SEPA Instant and SWIFT. Availability of any specific currency or route will depend on authorisation, onboarding outcome, customer profile, corridor and partner availability.",
    },
    {
      q: "Are cards part of the proposed service?",
      a: "Card functionality is shown for illustration and is intended for a later phase. Virtual and physical card concepts are subject to scheme, issuer, operational and compliance readiness, and may be made available following authorisation and final programme approval.",
    },
    {
      q: "How do I express interest?",
      a: "Register your interest using the contact form and the team will follow up with next steps. Any future onboarding would only proceed following authorisation, customer due diligence and acceptance policy review.",
    },
  ];
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="gl-section tight gl-px-faq-section gl-home-faq">
      <div className="gl-container gl-px-faq">
        <div className="gl-px-faq-head">
          <p className="gl-eyebrow">Have questions?</p>
          <h2 className="gl-px-faq-h">GLEEC Business FAQ</h2>
        </div>
        <div className="gl-px-faq-list">
          {items.map((it, i) => (
            <div key={i} className={"gl-px-faq-item " + (open === i ? "open" : "")}>
              <button
                type="button"
                className="gl-px-faq-q"
                onClick={() => setOpen(open === i ? -1 : i)}
                aria-expanded={open === i}
              >
                <span className="gl-px-faq-q-text">{it.q}</span>
                <span className="gl-px-faq-toggle" aria-hidden="true">
                  <Icon name={open === i ? "minus" : "plus"} size={20} strokeWidth={2} />
                </span>
              </button>
              {open === i && <div className="gl-px-faq-a">{it.a}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Borrow the visual style of PricingFAQ exactly. */}
    </section>
  );
}
