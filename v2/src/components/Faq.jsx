// Faq.jsx — questions as native disclosure rows (<details>): the chevron
// points to the trailing edge when closed and down when open.
import { FAQ } from "../content.js";
import SectionHeader from "./ui/SectionHeader.jsx";
import Icon from "./ui/Icon.jsx";
import "./Faq.css";

export default function Faq() {
  return (
    <section id="faq" className="section alt faq" aria-labelledby="faq-title">
      <div className="container">
        <SectionHeader id="faq-title" eyebrow={FAQ.eyebrow} title={FAQ.title} />
        <div className="faq-list">
          {FAQ.items.map((item, i) => (
            <details key={item.q} className="faq-item" open={i === 0}>
              <summary>
                <span className="faq-q">{item.q}</span>
                <Icon name="chevron-right" size={20} className="faq-chevron" />
              </summary>
              <p className="faq-a">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
