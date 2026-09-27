// Controls.jsx — compliance and control capabilities.
import { CONTROLS } from "../content.js";
import SectionHeader from "./ui/SectionHeader.jsx";
import Icon from "./ui/Icon.jsx";
import "./Controls.css";

export default function Controls() {
  return (
    <section id="controls" className="section alt controls" aria-labelledby="controls-title">
      <div className="container-wide">
        <SectionHeader id="controls-title" eyebrow={CONTROLS.eyebrow} title={CONTROLS.title} lead={CONTROLS.lead} />
        <ul className="ctrl-grid">
          {CONTROLS.items.map((c) => (
            <li key={c.title} className="ctrl-card squircle">
              <span className="ctrl-icon">
                <Icon name={c.icon} size={22} />
              </span>
              <h3 className="ctrl-title">{c.title}</h3>
              <p className="ctrl-body">{c.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
