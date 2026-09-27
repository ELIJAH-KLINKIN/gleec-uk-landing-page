// Waitlist.jsx — Closing section: tailored-setup pitch + the waitlist form.
// Compliance-safe wording. Every "Join waitlist" button on the page lands here.
import WaitlistForm from "./WaitlistForm.jsx";
import "./Waitlist.css";

export default function Waitlist() {
  return (
    <section className="gl-cta-section" id="waitlist" aria-labelledby="gl-waitlist-h">
      <div className="gl-container gl-cta-inner">
        <div className="gl-cta-card">
          <p className="gl-eyebrow">Join the waitlist</p>
          <h2 className="gl-cta-h" id="gl-waitlist-h">
            Need a tailored setup?
          </h2>
          <p className="gl-cta-lead">
            Tell us about your company, expected payment activity, currencies and ownership structure. We'll follow up
            once we can confirm what may fit your needs, subject to authorisation, onboarding approval and acceptance
            policy.
          </p>
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
