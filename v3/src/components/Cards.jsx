// Cards.jsx — company cards. A segmented control switches between the virtual
// card (an interactive phone: pay from the wallet, see the whole stack) and the
// physical card (chip and PIN or a tap on a modern card reader, in three everyday
// moments, each with the app's notification).
import { useState } from "react";
import { CARDS } from "../content.js";
import SectionHeader from "./ui/SectionHeader.jsx";
import SegmentedControl from "./ui/SegmentedControl.jsx";
import Stage from "./art/Stage.jsx";
import WalletPhone from "./art/WalletPhone.jsx";
import CardReader from "./art/CardReader.jsx";
import "./Cards.css";

export default function Cards() {
  const [sceneId, setSceneId] = useState(CARDS.scenes[0].id);
  const scene = CARDS.scenes.find((s) => s.id === sceneId);

  return (
    <section id="cards" className="section cards" aria-labelledby="cards-title">
      <div className="container">
        <SectionHeader id="cards-title" eyebrow={CARDS.eyebrow} title={CARDS.title} lead={CARDS.lead}>
          <p className="section-note">
            <span className="section-badge">{CARDS.badge}</span> {CARDS.note}
          </p>
        </SectionHeader>

        <div className="cards-switch">
          <SegmentedControl
            label="Card type"
            size="large"
            options={CARDS.scenes.map((s) => ({ value: s.id, label: s.label }))}
            value={sceneId}
            onChange={setSceneId}
            controls="cards-panel"
            idPrefix="cards-tab"
          />
        </div>

        <div id="cards-panel" role="tabpanel" aria-labelledby={`cards-tab-${sceneId}`} className="cards-panel">
          <Stage className="cards-studio">
            {scene.id === "virtual" ? (
              // Virtual: try paying from a phone (interactive, so not hidden from screen readers).
              <div className="cards-phone" key="virtual">
                <WalletPhone />
              </div>
            ) : (
              // Physical: chip and PIN or a tap on a card reader, playing itself (art/CardReader.jsx).
              <div className="cards-stage" key="physical">
                <CardReader />
              </div>
            )}
          </Stage>

          <div className="cards-caption">
            <h3 className="title-3">{scene.title}</h3>
            <ul className="cards-points">
              {scene.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <a className="btn btn-filled" href={CARDS.cta.href}>
              {CARDS.cta.label}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
