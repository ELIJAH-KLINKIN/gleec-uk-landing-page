// HomePartners.jsx — Infrastructure credibility strip.
// Logos rendered as clean SVG wordmarks so we never overclaim official partnership.
import "./HomePartners.css";

export default function HomePartners() {
  const partners = [
    { name: "Card scheme partner", node: <WordMark>Card scheme</WordMark> },
    { name: "Thredd", node: <WordMark>Thredd</WordMark> },
    { name: "Banking Circle", node: <WordMark>Banking Circle</WordMark> },
    { name: "Sumsub", node: <WordMark>sumsub</WordMark> },
    { name: "TAG", node: <WordMark>TAG</WordMark> },
    { name: "Stanhope", node: <WordMark>Stanhope</WordMark> },
  ];
  return (
    <section className="gl-home-section tight gl-home-partners">
      <div className="gl-container">
        <div className="gl-partners-head">
          <p className="gl-eyebrow">Infrastructure</p>
          <h2 className="gl-partners-h">Built upon experienced financial infrastructure partners</h2>
          <p className="gl-partners-sub">
            GLEEC Business is being built upon regulated banking, payment, card and compliance infrastructure. Logos
            reflect intended integrations and ongoing provider discussions — not confirmed or live partnerships, and not
            an endorsement by any provider
          </p>
        </div>
        <div className="gl-partners-strip">
          {partners.map((p) => (
            <div className="gl-partner" key={p.name} title={p.name}>
              {p.node}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WordMark({ children }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 19,
        letterSpacing: "-0.02em",
        color: "var(--fg-1)",
      }}
    >
      {children}
    </span>
  );
}

function VisaMark() {
  // Stylised generic wordmark — not the official Visa lockup
  return (
    <span
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: 22,
        letterSpacing: "-0.04em",
        fontStyle: "italic",
        color: "var(--fg-1)",
      }}
    >
      VISA
    </span>
  );
}
