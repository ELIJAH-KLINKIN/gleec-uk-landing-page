// HomeHero.jsx — Dramatic dark hero with abstract account-tile visual.
// Eyebrow / huge headline / supporting line / two CTAs / small compliance line.
import Icon from "./Icon.jsx";
import "./HomeHero.css";

export default function HomeHero() {
  return (
    <section className="gl-section gl-home-hero">
      <div className="gl-aura gl-aura-purple gl-home-hero-aura" aria-hidden="true" />
      <div className="gl-aura gl-aura-purple gl-home-hero-aura-2" aria-hidden="true" />

      <div className="gl-container gl-home-hero-grid">
        <div className="gl-home-hero-copy">
          <p className="gl-eyebrow gl-home-hero-eyebrow">UK Business Accounts</p>
          <h1 className="gl-home-hero-h">
            Business accounts for companies that <span className="gl-home-hero-em">don't fit the default box</span>
          </h1>
          <p className="gl-home-hero-lead">
            Designed for UK and international businesses that need GBP, EUR and USD accounts, reliable fiat payment
            routes underpinned by efficient KYB and personalised client support
          </p>
          <div className="gl-home-hero-cta">
            <a href="#waitlist" className="gl-btn gl-btn-primary gl-btn-lg">
              Join waitlist <Icon name="arrow-right" size={15} />
            </a>
            <a href="#plans" className="gl-btn gl-btn-secondary gl-btn-lg">
              View pricing
            </a>
          </div>
        </div>

        <div className="gl-home-hero-visual" aria-hidden="true">
          <HeroVisual />
        </div>
      </div>

      <p className="gl-home-hero-disclaimer">
        Gleec Pay Ltd is preparing an application to the FCA to become an Authorised Electronic Money Institution.
        Products and services shown are subject to authorisation, onboarding approval, partner availability and final
        terms.
      </p>
    </section>
  );
}

// Abstract product visual — stack of premium account tiles + floating currency badges.
// CSS-only, no stock photography.
function HeroVisual() {
  return (
    <div className="gl-hv">
      {/* Backdrop concrete-like surface band */}
      <div className="gl-hv-stage" />

      {/* Main "business account" tile */}
      <div className="gl-hv-tile gl-hv-tile-main">
        <div className="gl-hv-tile-top">
          <div className="gl-hv-brand">
            <span className="gl-hv-brand-mark">G</span>
            <span className="gl-hv-brand-text">
              GLEEC <em>Business</em>
            </span>
          </div>
          <span className="gl-hv-chip">Main · GBP</span>
        </div>
        <div className="gl-hv-tile-bal">
          <span className="gl-hv-sym">£</span>
          <span className="gl-hv-bal">84,250</span>
          <span className="gl-hv-cents">.00</span>
        </div>
        <div className="gl-hv-tile-meta">
          <span>GB28 GLEC 4023 9100 7184</span>
          <span className="gl-hv-status">
            <span className="gl-hv-dot" /> Active
          </span>
        </div>
        <div className="gl-hv-tile-rows">
          <div className="gl-hv-row">
            <div className="gl-hv-row-mark gl-hv-row-mark-in">↓</div>
            <div className="gl-hv-row-text">
              <strong>Stripe Payments</strong>
              <span>Faster Payments · 11:42</span>
            </div>
            <div className="gl-hv-row-amt up">+£12,480.00</div>
          </div>
          <div className="gl-hv-row">
            <div className="gl-hv-row-mark gl-hv-row-mark-out">↑</div>
            <div className="gl-hv-row-text">
              <strong>Linde GmbH</strong>
              <span>SEPA Instant · EUR</span>
            </div>
            <div className="gl-hv-row-amt">−€4,210.00</div>
          </div>
        </div>
      </div>

      {/* Floating EUR tile */}
      <div className="gl-hv-tile gl-hv-tile-eur">
        <span className="gl-hv-mini-eyebrow">EUR · SEPA</span>
        <div className="gl-hv-tile-bal small">
          <span className="gl-hv-sym">€</span>
          <span className="gl-hv-bal">36,902</span>
        </div>
        <span className="gl-hv-chip subtle">DE89 · Berlin</span>
      </div>

      {/* Floating USD tile */}
      <div className="gl-hv-tile gl-hv-tile-usd">
        <span className="gl-hv-mini-eyebrow">USD · SWIFT</span>
        <div className="gl-hv-tile-bal small">
          <span className="gl-hv-sym">$</span>
          <span className="gl-hv-bal">9,184</span>
        </div>
        <span className="gl-hv-chip subtle">Under review</span>
      </div>

      {/* Floating currency glyphs */}
      <div className="gl-hv-glyph gl-hv-glyph-pound">£</div>
      <div className="gl-hv-glyph gl-hv-glyph-dollar">$</div>
    </div>
  );
}
