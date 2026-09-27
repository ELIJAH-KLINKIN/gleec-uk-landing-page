// HomePlans.jsx — Plans CTA section.
// Two main plan cards (Core / Professional) + a small "Complex structures?" callout.
// A teaser, not a full pricing table: pricing requests go through the waitlist form.
import Icon from "./Icon.jsx";
import { prefillWaitlist } from "../lib/prefill.js";
import "./HomePlans.css";

export default function HomePlans() {
  return (
    <section id="plans" className="gl-home-section gl-home-plans">
      <div className="gl-container">
        <div className="gl-home-head">
          <p className="gl-eyebrow">Plans</p>
          <h2 className="gl-home-h">Find the plan that fits your operating model</h2>
          <p className="gl-home-sub">
            Choose a plan based on your structure, payment needs and onboarding complexity. Plans are indicative and
            subject to authorisation, onboarding approval, partner availability and final terms
          </p>
        </div>

        <div className="gl-plans-grid">
          <article className="gl-plan">
            <div className="gl-plan-head">
              <span className="gl-plan-eye">For local businesses</span>
              <h3>Core</h3>
              <p>Straightforward UK and EU operating model with everyday rails.</p>
            </div>
            <ul className="gl-plan-list">
              <li>GBP &amp; EUR business account (planned)</li>
              <li>Faster Payments · BACS · CHAPS · SEPA (planned)</li>
              <li>Standard KYB review</li>
              <li>Card functionality on request (subject to readiness)</li>
            </ul>
          </article>

          <article className="gl-plan is-feat">
            <div className="gl-plan-head">
              <span className="gl-plan-eye">For international businesses</span>
              <h3>Professional</h3>
              <p>Cross-border flows, USD corridors and team spend controls.</p>
            </div>
            <ul className="gl-plan-list">
              <li>GBP, EUR &amp; USD accounts (planned)</li>
              <li>SWIFT, SEPA Instant, USD wires (planned)</li>
              <li>Enhanced KYB / EDD where required</li>
              <li>Card functionality with limits, API access (intended)</li>
            </ul>
          </article>

          <aside className="gl-plan-callout">
            <span className="gl-plan-eye">Complex structures?</span>
            <p>Holdings, platforms and multi-layer groups are reviewed case by case.</p>
            <a className="gl-btn gl-btn-secondary gl-btn-sm" href="#waitlist" onClick={() => prefillWaitlist("group")}>
              Speak to us <Icon name="arrow-right" size={13} />
            </a>
          </aside>
        </div>

        <div className="gl-plans-cta">
          <a className="gl-btn gl-btn-primary gl-btn-lg" href="#waitlist">
            Request pricing <Icon name="arrow-right" size={15} />
          </a>
          <p className="gl-plans-note">
            Pricing is indicative — final fees depend on profile, volumes, corridors, partner availability and approval.
          </p>
        </div>
      </div>
    </section>
  );
}
