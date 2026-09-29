// AccountStack.jsx — art for the "Named virtual IBANs" card: account details drawn
// as cards (real card proportions, as card issuers show them) and stacked the way
// Wallet stacks passes. Each client has its own details; only the front one is
// shown in full. Decorative: the card's own text says what it shows.
import Flag from "../ui/Flag.jsx";
import logo from "../../assets/logo-g.png";
import "./AccountStack.css";

// Example details only (placeholder bank code, like the account-details explorer).
const CARDS = [
  { tone: "silver", holder: "Hartwell & Frome Ltd", flag: "US", currency: "USD" },
  { tone: "graphite", holder: "Northwind Trading Ltd", flag: "EU", currency: "EUR" },
];

export default function AccountStack() {
  return (
    <div className="acs" aria-hidden="true">
      {CARDS.map((c) => (
        <div key={c.holder} className={`acs-card acs-${c.tone}`}>
          <div className="acs-top">
            <span className="acs-holder">{c.holder}</span>
            <span className="acs-cur">
              <Flag code={c.flag} size={16} />
              {c.currency}
            </span>
          </div>
        </div>
      ))}
      <div className="acs-card acs-front">
        <div className="acs-top">
          <img className="acs-logo" src={logo} alt="" width="12" height="16" />
          <span className="acs-cur">
            <Flag code="GB" size={16} />
            GBP
          </span>
        </div>
        <div className="acs-field">
          <span className="acs-label">Account holder</span>
          <span className="acs-name">ACME Studios Ltd</span>
        </div>
        <div className="acs-field">
          <span className="acs-label">IBAN</span>
          <span className="acs-iban">GB00 XXXX 0000 0012 3456 78</span>
        </div>
      </div>
    </div>
  );
}
