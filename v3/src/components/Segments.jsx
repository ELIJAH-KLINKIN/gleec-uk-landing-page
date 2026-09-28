// Segments.jsx — who it's for. Each card's link pre-selects that business
// type in the waitlist form.
import { SEGMENTS } from "../content.js";
import { prefillWaitlist } from "../lib/prefill.js";
import SectionHeader from "./ui/SectionHeader.jsx";
import Icon from "./ui/Icon.jsx";
import "./Segments.css";

export default function Segments() {
  return (
    <section className="section alt segments" aria-labelledby="segments-title">
      <div className="container-wide">
        <SectionHeader id="segments-title" eyebrow={SEGMENTS.eyebrow} title={SEGMENTS.title} lead={SEGMENTS.lead} />
        <ul className="seg-grid">
          {SEGMENTS.items.map((s) => (
            <li key={s.id} className="seg-card squircle">
              <h3 className="title-3">{s.title}</h3>
              <p className="seg-body">{s.body}</p>
              <p className="seg-label">Suitable for</p>
              <ul className="seg-points">
                {s.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <a
                className="link-chevron seg-link"
                href={s.href || "#waitlist"}
                onClick={s.href ? undefined : () => prefillWaitlist(s.id)}
              >
                {s.cta}
                <span className="visually-hidden"> — {s.title}</span>
                <Icon name="chevron-right" size={18} />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
