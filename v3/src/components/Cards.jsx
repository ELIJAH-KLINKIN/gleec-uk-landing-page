// Cards.jsx — company cards. A segmented control switches between the virtual
// and physical card; each shows an illustrative spend notification led by the
// merchant's logo, with the app's icon as a small badge (as iOS shows a
// notification about someone else).
import { useState } from "react";
import { CARDS } from "../content.js";
import SectionHeader from "./ui/SectionHeader.jsx";
import SegmentedControl from "./ui/SegmentedControl.jsx";
import MerchantLogo from "./ui/MerchantLogo.jsx";
import Stage from "./art/Stage.jsx";
import appIcon from "../assets/logo-g.png";
import virtualFront from "../assets/cards/card-virtual.svg";
import virtualBack from "../assets/cards/card-virtual-alt.svg";
import physicalFront from "../assets/cards/card-physical.svg";
import physicalBack from "../assets/cards/card-physical-alt.svg";
import "./Cards.css";

const ART = {
  virtual: { front: virtualFront, back: virtualBack },
  physical: { front: physicalFront, back: physicalBack },
};

export default function Cards() {
  const [sceneId, setSceneId] = useState(CARDS.scenes[0].id);
  const scene = CARDS.scenes.find((s) => s.id === sceneId);

  return (
    <section id="cards" className="section cards" aria-labelledby="cards-title">
      <div className="container">
        <SectionHeader id="cards-title" eyebrow={CARDS.eyebrow} title={CARDS.title} lead={CARDS.lead} />

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
            <div className="cards-stage" aria-hidden="true">
              {CARDS.scenes.map((s) => (
                <div key={s.id} className={"cards-scene" + (s.id === sceneId ? " is-current" : "")}>
                  <img
                    className="cards-img back"
                    src={ART[s.id].back}
                    alt=""
                    width="2064"
                    height="1301"
                    loading="lazy"
                    decoding="async"
                  />
                  <img
                    className="cards-img front"
                    src={ART[s.id].front}
                    alt=""
                    width="2064"
                    height="1301"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="cards-notice">
                    <span className="cards-notice-avatar">
                      <MerchantLogo id={s.notice.merchant} size={36} className="cards-notice-merchant" />
                      <span className="cards-notice-badge">
                        <img src={appIcon} alt="" width="6" height="8" />
                      </span>
                    </span>
                    <span className="cards-notice-text">
                      <span className="cards-notice-head">
                        <span>{s.notice.app}</span>
                        <span>now</span>
                      </span>
                      <strong>
                        {s.notice.title} · {s.notice.amount}
                      </strong>
                      <span>{s.notice.detail}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
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
