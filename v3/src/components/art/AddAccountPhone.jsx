// AddAccountPhone.jsx — art for "One IBAN, 24 currencies": the top of a phone
// showing the app's "Add account" screen (the Revolut pattern): GBP, EUR and USD
// ready to open, and the 21 planned currencies as one row. Decorative: the
// tile's text says the same thing.
import Flag from "../ui/Flag.jsx";
import PhoneFrame from "./PhoneFrame.jsx";
import "./AddAccountPhone.css";

const LIVE = [
  { code: "GBP", flag: "GB", name: "British pound" },
  { code: "EUR", flag: "EU", name: "Euro" },
  { code: "USD", flag: "US", name: "US dollar" },
];

export default function AddAccountPhone() {
  return (
    <div className="aap" aria-hidden="true">
      <PhoneFrame>
        <div className="aap-screen">
          <span className="aap-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
          </span>
          <span className="aap-title">Add account</span>
          <span className="aap-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.6-3.6" />
            </svg>
            Search
          </span>
          <span className="aap-list">
            {LIVE.map((c) => (
              <span key={c.code} className={"aap-row" + (c.code === "GBP" ? " is-picked" : "")}>
                <Flag code={c.flag} size={40} className="flag aap-flag" />
                <span className="aap-text">
                  <strong>{c.name}</strong>
                  <span>{c.code}</span>
                </span>
              </span>
            ))}
            <span className="aap-row aap-more">
              <span className="aap-plus">+21</span>
              <span className="aap-text">
                <strong>21 more currencies</strong>
                <span>Coming soon</span>
              </span>
            </span>
          </span>
        </div>
      </PhoneFrame>
    </div>
  );
}
