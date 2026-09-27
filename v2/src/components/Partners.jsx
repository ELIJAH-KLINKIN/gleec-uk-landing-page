// Partners.jsx — infrastructure credibility strip. Names are set as plain
// wordmarks (no official logos) so nothing overclaims a partnership.
import { PARTNERS } from "../content.js";
import SectionHeader from "./ui/SectionHeader.jsx";
import "./Partners.css";

export default function Partners() {
  return (
    <section className="section partners" aria-labelledby="partners-title">
      <div className="container">
        <SectionHeader id="partners-title" eyebrow={PARTNERS.eyebrow} title={PARTNERS.title} lead={PARTNERS.lead} />
        <ul className="partners-list" aria-label="Intended infrastructure providers">
          {PARTNERS.names.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
