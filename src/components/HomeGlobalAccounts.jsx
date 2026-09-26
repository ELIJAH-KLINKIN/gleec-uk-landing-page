// HomeGlobalAccounts.jsx — Premium interactive "Global Accounts & Transfers"
// explorer for the GLEEC Business homepage. Replaces the old 8-card rails grid.
//
// Component name: GlobalAccountsTransferExplorer
// Data: driven by MARKETS / METHODS objects below — typed shape documented inline.
// CTA: /payments/transfer-money-globally
// A11y: market list = button list with aria-selected; method pills = role=tablist.
import { useState } from "react";
import Icon from "./Icon.jsx";
import "./HomeGlobalAccounts.css";

/* ----------------------------- Data model ----------------------------- */

const MARKETS = {
  uk: {
    id: "uk",
    label: "United Kingdom",
    flag: "GB",
    methods: ["gbp-local", "swift"],
    holder: "ACME Studios Ltd",
    address: "1 Curtain Road, Shoreditch, London, EC2A 3PA, United Kingdom",
  },
  eu: {
    id: "eu",
    label: "Eurozone",
    flag: "EU",
    methods: ["eur-local", "sepa", "sepa-instant", "swift"],
    holder: "ACME Studios Ltd",
    address: "Friedrichstraße 68, 10117 Berlin, Germany",
  },
  us: {
    id: "us",
    label: "United States",
    flag: "US",
    methods: ["ach", "fedwire", "swift"],
    holder: "ACME Studios Inc",
    address: "228 Park Ave S, New York, NY 10003, United States",
  },
  global: {
    id: "global",
    label: "Global",
    flag: "GL",
    methods: ["swift"],
    holder: "ACME Studios Ltd",
    address: "1 Curtain Road, Shoreditch, London, EC2A 3PA, United Kingdom",
  },
};

// Per (market, method) — what to show in the main details card.
const DETAILS = {
  "uk/gbp-local": {
    currency: "GBP",
    bankName: "GLEEC Business",
    rows: [
      ["Account number", "938206"],
      ["Sort code", "12-34-56"],
    ],
    methods: ["Faster Payments", "BACS", "CHAPS"],
    note: "Domestic GBP rails — same-day to near real-time settlement",
  },
  "uk/swift": {
    currency: "GBP",
    bankName: "GLEEC Business",
    rows: [
      ["SWIFT / BIC", "GLECGB2LXXX"],
      ["Account number", "938206"],
      ["Sort code", "12-34-56"],
    ],
    methods: ["SWIFT"],
    note: "International correspondent route into the GBP account",
  },
  "eu/eur-local": {
    currency: "EUR",
    bankName: "GLEEC Business EU",
    rows: [
      ["IBAN", "DE89 3704 0044 0532 0130 00"],
      ["BIC", "GLECDEFFXXX"],
    ],
    methods: ["SEPA", "SEPA Instant"],
    note: "Local euro account details for European receivables",
  },
  "eu/sepa": {
    currency: "EUR",
    bankName: "GLEEC Business EU",
    rows: [
      ["IBAN", "DE89 3704 0044 0532 0130 00"],
      ["BIC", "GLECDEFFXXX"],
    ],
    methods: ["SEPA"],
    note: "Standard euro credit transfers across the SEPA area",
  },
  "eu/sepa-instant": {
    currency: "EUR",
    bankName: "GLEEC Business EU",
    rows: [
      ["IBAN", "DE89 3704 0044 0532 0130 00"],
      ["BIC", "GLECDEFFXXX"],
    ],
    methods: ["SEPA Instant"],
    note: "Near real-time euro payments — typically under 10 seconds",
  },
  "eu/swift": {
    currency: "EUR",
    bankName: "GLEEC Business EU",
    rows: [
      ["SWIFT / BIC", "GLECDEFFXXX"],
      ["IBAN", "DE89 3704 0044 0532 0130 00"],
    ],
    methods: ["SWIFT"],
    note: "International route into the euro account",
  },
  "us/ach": {
    currency: "USD",
    bankName: "GLEEC Business (US partner)",
    rows: [
      ["Routing number", "026 073 008"],
      ["Account number", "9202 1838 47"],
      ["Account type", "Checking"],
    ],
    methods: ["ACH"],
    note: "Batch USD payments — domestic rails for payroll and recurring debits",
  },
  "us/fedwire": {
    currency: "USD",
    bankName: "GLEEC Business (US partner)",
    rows: [
      ["Routing number", "026 073 008"],
      ["Account number", "9202 1838 47"],
    ],
    methods: ["Fedwire"],
    note: "Same-day high-value USD wire settlement",
  },
  "us/swift": {
    currency: "USD",
    bankName: "GLEEC Business (US partner)",
    rows: [
      ["SWIFT / BIC", "GLECUS33XXX"],
      ["Routing number", "026 073 008"],
      ["Account number", "9202 1838 47"],
    ],
    methods: ["SWIFT"],
    note: "International USD route via correspondent network",
  },
  "global/swift": {
    currency: "Multi",
    bankName: "GLEEC Business",
    rows: [
      ["SWIFT / BIC", "GLECGB2LXXX"],
      ["Correspondent", "Through approved partners"],
    ],
    methods: ["SWIFT"],
    note: "Send and receive across 70+ markets through the SWIFT network",
  },
};

const METHOD_META = {
  "gbp-local": { label: "GBP Local", tone: "explain-sort" },
  "eur-local": { label: "EUR Local", tone: "explain-iban" },
  sepa: { label: "SEPA", tone: "explain-iban" },
  "sepa-instant": { label: "SEPA Instant", tone: "explain-iban" },
  swift: { label: "SWIFT", tone: "explain-swift" },
  ach: { label: "ACH", tone: "explain-aba" },
  fedwire: { label: "Fedwire", tone: "explain-aba" },
};

const CAPABILITIES = [
  "Designed to support accounts in your business name",
  "Planned support for GBP, EUR and USD as core currencies",
  "Dedicated local account details where available",
  "Account configuration is subject to onboarding approval",
  "Service availability is subject to authorisation and partner readiness",
];

// Methods that the right-hand panel shows for a given market (contextual).
const MARKET_METHODS = {
  uk: [
    ["Faster Payments", "Near real-time GBP payments"],
    ["BACS", "Standard UK bank transfers"],
    ["CHAPS", "Same-day high-value GBP"],
    ["SWIFT", "International correspondent"],
  ],
  eu: [
    ["SEPA", "Euro payments across Europe"],
    ["SEPA Instant", "Near real-time where supported"],
    ["SWIFT", "International correspondent"],
  ],
  us: [
    ["ACH", "Batch USD domestic rail"],
    ["Fedwire", "Same-day high-value USD"],
    ["SWIFT", "International correspondent"],
  ],
  global: [["SWIFT", "International correspondent net"]],
};

const ALL_METHODS = ["Faster Payments", "BACS", "CHAPS", "SEPA", "SEPA Instant", "SWIFT", "ACH", "Fedwire"];

/* ----------------------------- Sub-views ----------------------------- */

// Circular Union Jack — coin-style, mirrors the pattern used in the
// multi-currency account chip elsewhere on the page.
function GBCoin({ size = 22 }) {
  const cid = "gl-gae-uk-" + size;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      aria-hidden="true"
      style={{ display: "block", borderRadius: "50%" }}
    >
      <defs>
        <clipPath id={cid}>
          <circle cx="30" cy="30" r="30" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${cid})`}>
        <rect width="60" height="60" fill="#012169" />
        <path d="M0 0 L60 60 M60 0 L0 60" stroke="#FFFFFF" strokeWidth="12" />
        <path d="M0 0 L60 60 M60 0 L0 60" stroke="#C8102E" strokeWidth="4" strokeDasharray="30,30" />
        <path d="M30 0 V60 M0 30 H60" stroke="#FFFFFF" strokeWidth="20" />
        <path d="M30 0 V60 M0 30 H60" stroke="#C8102E" strokeWidth="12" />
        <circle cx="30" cy="30" r="29.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      </g>
    </svg>
  );
}

// Circular EU flag — 12 stars on blue.
function EUCoin({ size = 22 }) {
  const cid = "gl-gae-eu-" + size;
  const stars = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const r = 20;
    const cx = 30 + Math.cos(a) * r;
    const cy = 30 + Math.sin(a) * r;
    stars.push(<circle key={i} cx={cx} cy={cy} r="2.2" fill="#FFCC00" />);
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      aria-hidden="true"
      style={{ display: "block", borderRadius: "50%" }}
    >
      <defs>
        <clipPath id={cid}>
          <circle cx="30" cy="30" r="30" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${cid})`}>
        <rect width="60" height="60" fill="#003399" />
        {stars}
        <circle cx="30" cy="30" r="29.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      </g>
    </svg>
  );
}

// Circular US flag — stripes + canton.
function USCoin({ size = 22 }) {
  const cid = "gl-gae-us-" + size;
  const stripes = [];
  for (let i = 0; i < 13; i++) {
    stripes.push(
      <rect key={i} x="0" y={i * (60 / 13)} width="60" height={60 / 13} fill={i % 2 === 0 ? "#B22234" : "#FFFFFF"} />,
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      aria-hidden="true"
      style={{ display: "block", borderRadius: "50%" }}
    >
      <defs>
        <clipPath id={cid}>
          <circle cx="30" cy="30" r="30" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${cid})`}>
        {stripes}
        <rect x="0" y="0" width="28" height={(60 * 7) / 13} fill="#3C3B6E" />
        {/* simplified star grid */}
        {[...Array(5)].map((_, r) =>
          [...Array(6)].map((_, c) => (
            <circle key={r + "-" + c} cx={3 + c * 4.4} cy={3 + r * 5.4} r="0.9" fill="#FFFFFF" />
          )),
        )}
        <circle cx="30" cy="30" r="29.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      </g>
    </svg>
  );
}

// Circular globe — for the "Global" market.
function GlobeCoin({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      aria-hidden="true"
      style={{ display: "block", borderRadius: "50%" }}
    >
      <defs>
        <radialGradient id="gl-gae-globe-bg" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#3B2670" />
          <stop offset="100%" stopColor="#0E0820" />
        </radialGradient>
      </defs>
      <circle cx="30" cy="30" r="30" fill="url(#gl-gae-globe-bg)" />
      <g fill="none" stroke="#D7C2FF" strokeWidth="1.6" strokeLinecap="round" opacity="0.9">
        <circle cx="30" cy="30" r="20" />
        <ellipse cx="30" cy="30" rx="20" ry="8" />
        <ellipse cx="30" cy="30" rx="8" ry="20" />
        <path d="M10 30 H50" />
      </g>
      <circle cx="30" cy="30" r="29.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
    </svg>
  );
}

function MarketIcon({ code }) {
  if (code === "GB") return <GBCoin size={22} />;
  if (code === "EU") return <EUCoin size={22} />;
  if (code === "US") return <USCoin size={22} />;
  return <GlobeCoin size={22} />;
}

// The floating explanation card — visualises the structure of the active identifier.
function ExplainCard({ tone }) {
  if (tone === "explain-sort") {
    return (
      <div className="gl-gae-explain">
        <div className="gl-gae-explain-eye">Sort Code</div>
        <div className="gl-gae-explain-num">
          <span className="seg a">12</span>
          <span className="dash">–</span>
          <span className="seg b">34</span>
          <span className="dash">–</span>
          <span className="seg c">56</span>
        </div>
        <div className="gl-gae-explain-legend">
          <span>
            <i className="dot a" />
            Bank code
          </span>
          <span>
            <i className="dot b" />
            Sub-office
          </span>
          <span>
            <i className="dot c" />
            Branch
          </span>
        </div>
      </div>
    );
  }
  if (tone === "explain-iban") {
    return (
      <div className="gl-gae-explain">
        <div className="gl-gae-explain-eye">IBAN</div>
        <div className="gl-gae-explain-num iban">
          <span className="seg a">DE</span>
          <span className="seg b">89</span>
          <span className="seg c">37040044&nbsp;0532013000</span>
        </div>
        <div className="gl-gae-explain-legend">
          <span>
            <i className="dot a" />
            Country
          </span>
          <span>
            <i className="dot b" />
            Check digits
          </span>
          <span>
            <i className="dot c" />
            Bank &amp; account
          </span>
        </div>
      </div>
    );
  }
  if (tone === "explain-swift") {
    return (
      <div className="gl-gae-explain">
        <div className="gl-gae-explain-eye">SWIFT / BIC</div>
        <div className="gl-gae-explain-num swift">
          <span className="seg a">GLEC</span>
          <span className="seg b">GB</span>
          <span className="seg c">2L</span>
          <span className="seg d">XXX</span>
        </div>
        <div className="gl-gae-explain-legend">
          <span>
            <i className="dot a" />
            Bank
          </span>
          <span>
            <i className="dot b" />
            Country
          </span>
          <span>
            <i className="dot c" />
            Location
          </span>
          <span>
            <i className="dot d" />
            Branch
          </span>
        </div>
      </div>
    );
  }
  // ACH / Fedwire — routing + account
  return (
    <div className="gl-gae-explain">
      <div className="gl-gae-explain-eye">Routing &amp; Account</div>
      <div className="gl-gae-explain-num aba">
        <span className="seg a">026 073 008</span>
        <span className="dash">/</span>
        <span className="seg b">9202 1838 47</span>
      </div>
      <div className="gl-gae-explain-legend">
        <span>
          <i className="dot a" />
          ABA routing
        </span>
        <span>
          <i className="dot b" />
          Account number
        </span>
      </div>
    </div>
  );
}

// Arrow-key navigation between the tabs of a tablist (WAI-ARIA tabs pattern,
// automatic activation): moving focus to a tab also selects it.
function rovingKeys(prevKey, nextKey) {
  return (e) => {
    if (e.key !== prevKey && e.key !== nextKey && e.key !== "Home" && e.key !== "End") return;
    const tabs = Array.from(e.currentTarget.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
    const i = tabs.indexOf(e.currentTarget);
    e.preventDefault();
    let next = i;
    if (e.key === prevKey) next = (i - 1 + tabs.length) % tabs.length;
    if (e.key === nextKey) next = (i + 1) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;
    tabs[next].focus();
    tabs[next].click();
  };
}

/* ----------------------------- Main view ----------------------------- */

export default function HomeGlobalAccounts() {
  const [marketId, setMarketId] = useState("uk");
  const [methodId, setMethodId] = useState("gbp-local");
  const market = MARKETS[marketId];

  // Switching market also picks a method that market supports, in the same
  // render, so the details card and explainer never show a stale combination.
  const selectMarket = (id) => {
    setMarketId(id);
    if (!MARKETS[id].methods.includes(methodId)) setMethodId(MARKETS[id].methods[0]);
  };

  const key = `${marketId}/${methodId}`;
  const details = DETAILS[key];
  const tone = METHOD_META[methodId].tone;

  return (
    <section id="payments" className="gl-home-section gl-home-gae">
      <div className="gl-aura gl-aura-purple gl-gae-aura" aria-hidden="true" />
      <div className="gl-container">
        {/* Header */}
        <div className="gl-home-head">
          <p className="gl-eyebrow">Global accounts &amp; transfers</p>
          <h2 className="gl-home-h">
            Open global accounts
            <br />
            Move money the right way
          </h2>
          <p className="gl-home-sub">
            Receive, hold and move funds across key markets with multi-currency global accounts, local account details
            and trusted domestic and international transfer methods
          </p>
          <div className="gl-gae-ctas">
            <a className="gl-btn gl-btn-primary" href="#accounts">
              Explore global accounts <Icon name="arrow-right" size={14} />
            </a>
          </div>
        </div>

        {/* Explorer */}
        <div className="gl-gae-shell">
          {/* LEFT — markets */}
          <aside className="gl-gae-markets" aria-label="Choose market">
            <div className="gl-gae-eye">Markets</div>
            <ul role="tablist" aria-orientation="vertical" aria-label="Markets">
              {Object.values(MARKETS).map((m) => (
                <li key={m.id} role="presentation">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={marketId === m.id}
                    aria-controls="gl-gae-details"
                    tabIndex={marketId === m.id ? 0 : -1}
                    className={"gl-gae-market" + (marketId === m.id ? " is-on" : "")}
                    onClick={() => selectMarket(m.id)}
                    onKeyDown={rovingKeys("ArrowUp", "ArrowDown")}
                  >
                    <span className={"gl-gae-mflag" + (marketId === m.id ? " is-on" : "")}>
                      <MarketIcon code={m.flag} />
                    </span>
                    <span className="gl-gae-market-name">{m.label}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="gl-gae-markets-foot">
              <div className="gl-gae-stat">
                <strong>70+</strong>
                <span>payout markets via SWIFT &amp; partners</span>
              </div>
            </div>
          </aside>

          {/* CENTRE — pills + details + floating explain card */}
          <div className="gl-gae-centre">
            <div className="gl-gae-pills" role="tablist" aria-label="Transfer method">
              {market.methods.map((mid) => (
                <button
                  key={mid}
                  type="button"
                  role="tab"
                  aria-selected={methodId === mid}
                  aria-controls="gl-gae-details"
                  tabIndex={methodId === mid ? 0 : -1}
                  onKeyDown={rovingKeys("ArrowLeft", "ArrowRight")}
                  className={"gl-gae-pill" + (methodId === mid ? " is-on" : "")}
                  onClick={() => setMethodId(mid)}
                >
                  {METHOD_META[mid].label}
                </button>
              ))}
            </div>

            <div
              className="gl-gae-stage"
              id="gl-gae-details"
              role="tabpanel"
              aria-label={`${details.currency} account details · ${market.label}`}
            >
              <article key={"d" + key} className="gl-gae-card gl-gae-card-details">
                <div className="gl-gae-card-head">
                  <div>
                    <div className="gl-gae-eye">Account details</div>
                    <h3 className="gl-gae-card-h">
                      {details.currency} Account · {market.label}
                    </h3>
                  </div>
                  <span className="gl-gae-cur-chip">
                    {details.currency === "GBP" && "£"}
                    {details.currency === "EUR" && "€"}
                    {details.currency === "USD" && "$"}
                    {details.currency === "Multi" && "∞"}
                    <span>{details.currency}</span>
                  </span>
                </div>

                <div className="gl-gae-card-grid">
                  <div className="gl-gae-card-col">
                    <div className="gl-gae-eye dim">Bank details</div>
                    <dl>
                      <div>
                        <dt>Bank name</dt>
                        <dd>{details.bankName}</dd>
                      </div>
                      {details.rows.map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd className="mono">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="gl-gae-card-col">
                    <div className="gl-gae-eye dim">Recipient details</div>
                    <dl>
                      <div>
                        <dt>Account holder</dt>
                        <dd>{market.holder}</dd>
                      </div>
                      <div>
                        <dt>Address</dt>
                        <dd className="addr">{market.address}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="gl-gae-card-foot">
                  <div className="gl-gae-eye dim">Supported methods</div>
                  <div className="gl-gae-method-row">
                    {details.methods.map((m) => (
                      <span key={m} className="gl-gae-mchip">
                        {m}
                      </span>
                    ))}
                  </div>
                  <p className="gl-gae-note">{details.note}</p>
                </div>
              </article>

              <div key={"e" + key} className="gl-gae-explain-wrap" aria-hidden="true">
                <ExplainCard tone={tone} />
              </div>
            </div>
          </div>

          {/* RIGHT — capabilities + contextual methods */}
          <aside className="gl-gae-side">
            <div className="gl-gae-side-block">
              <div className="gl-gae-eye">Account capabilities</div>
              <ul className="gl-gae-bullets">
                {CAPABILITIES.map((c) => (
                  <li key={c}>
                    <span className="gl-gae-tick">
                      <svg width="10" height="10" viewBox="0 0 11 11">
                        <path
                          d="M2 5.6L4.3 8L9 3"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    </span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="gl-gae-side-block">
              <div className="gl-gae-eye">Transfer methods · {market.label}</div>
              <ul key={"m" + marketId} className="gl-gae-methods-list">
                {MARKET_METHODS[marketId].map(([name, desc]) => (
                  <li key={name}>
                    <strong>{name}</strong>
                    <span>{desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {/* Bottom slim strip */}
        <div className="gl-gae-strip">
          <div className="gl-gae-strip-pills">
            {ALL_METHODS.map((m) => (
              <span key={m} className="gl-gae-strip-pill">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
