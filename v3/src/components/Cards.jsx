// Cards.jsx — company cards. A segmented control switches between the virtual
// card (an interactive phone: pay from the wallet, see the whole stack) and the
// physical card (a Blender render with a spend notification led by the
// merchant's logo, the app's icon as a small badge).
import { useState } from "react";
import { CARDS } from "../content.js";
import SectionHeader from "./ui/SectionHeader.jsx";
import SegmentedControl from "./ui/SegmentedControl.jsx";
import MerchantLogo from "./ui/MerchantLogo.jsx";
import Stage from "./art/Stage.jsx";
import WalletPhone from "./art/WalletPhone.jsx";
import appIcon from "../assets/logo-g.svg";
import "./Cards.css";

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
            {scene.id === "virtual" ? (
              // Virtual: try paying from a phone (interactive, so not hidden from screen readers).
              <div className="cards-phone" key="virtual">
                <WalletPhone />
              </div>
            ) : (
              <div className="cards-stage" aria-hidden="true" key="physical">
                <div className="cards-scene is-current">
                  {/* Rendered in Blender (art-src/blender/cards.py). */}
                  <img
                    className="cards-render"
                    src={`/art/cards-${scene.id}.webp`}
                    alt=""
                    width="1600"
                    height="1171"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="cards-notice">
                    <span className="cards-notice-avatar">
                      <MerchantLogo id={scene.notice.merchant} size={36} className="cards-notice-merchant" />
                      <span className="cards-notice-badge">
                        <img src={appIcon} alt="" width="6" height="8" />
                      </span>
                    </span>
                    <span className="cards-notice-text">
                      <span className="cards-notice-head">
                        <span>{scene.notice.app}</span>
                        <span>now</span>
                      </span>
                      <strong>
                        {scene.notice.title} · {scene.notice.amount}
                      </strong>
                      <span>{scene.notice.detail}</span>
                    </span>
                  </div>
                </div>
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
