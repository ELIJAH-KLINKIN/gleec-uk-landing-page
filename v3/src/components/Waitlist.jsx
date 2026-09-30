// Waitlist.jsx — the closing section every "Join the Waitlist" action leads to.
import { WAITLIST } from "../content.js";
import SectionHeader from "./ui/SectionHeader.jsx";
import BrandMetal from "./art/BrandMetal.jsx";
import WaitlistForm from "./WaitlistForm.jsx";

export default function Waitlist() {
  return (
    <section id="waitlist" className="section" aria-labelledby="waitlist-title">
      <div className="container">
        <BrandMetal size={84} className="waitlist-mark" />
        <SectionHeader id="waitlist-title" eyebrow={WAITLIST.eyebrow} title={WAITLIST.title} lead={WAITLIST.lead} />
        <WaitlistForm />
      </div>
    </section>
  );
}
