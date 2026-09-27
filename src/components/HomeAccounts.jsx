// HomeAccounts.jsx — "More than just account details".
// Two-column: premium mock account dashboard on left, bullet list + CTA on right.
import Icon from "./Icon.jsx";
import "./HomeAccounts.css";

export default function HomeAccounts() {
  const bullets = [
    "GBP, EUR and USD business account capability",
    "Named virtual IBAN account details",
    "Faster Payments, CHAPS and BACS for UK flows",
    "SEPA and SEPA Instant",
    "SWIFT and USD corridors for international payments",
    "Fiat-to-fiat FX",
    "KYB, sanctions screening and transaction monitoring controls",
  ];

  return (
    <section id="accounts" className="gl-home-section gl-home-accounts">
      <div className="gl-container">
        <div className="gl-acc-grid">
          <div className="gl-acc-mock" aria-hidden="true">
            <AccountMock />
          </div>
          <div className="gl-acc-copy">
            <p className="gl-eyebrow" style={{ color: "var(--gleec-purple)" }}>
              Accounts
            </p>
            <h2 className="gl-acc-h">More than just account details</h2>
            <p className="gl-acc-sub">
              Gleec Business is being built to combine account details, payment routes, FX capability and compliance
              controls in one operating platform
            </p>
            <ul className="gl-acc-list">
              {bullets.map((b, i) => (
                <li key={i} className="gl-acc-item">
                  <span className="gl-acc-tick">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path
                        d="M2 5.6L4.3 8L9 3"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="gl-acc-cta">
              <a className="gl-btn gl-btn-primary" href="#payments">
                Explore accounts <Icon name="arrow-right" size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Premium mock account dashboard card (CSS only).
function AccountMock() {
  return (
    <div className="gl-am">
      <div className="gl-am-card">
        {/* Tabs */}
        <div className="gl-am-tabs">
          <div className="gl-am-tab is-on">Accounts</div>
          <div className="gl-am-tab">Cards</div>
          <div className="gl-am-tab">Transfers</div>
          <div className="gl-am-tab">Statements</div>
        </div>

        {/* Currency balance row */}
        <div className="gl-am-bals">
          <div className="gl-am-bal is-active">
            <span className="gl-am-bal-cur">£ GBP</span>
            <span className="gl-am-bal-amt">84,250.00</span>
          </div>
          <div className="gl-am-bal">
            <span className="gl-am-bal-cur">€ EUR</span>
            <span className="gl-am-bal-amt">36,902.18</span>
          </div>
          <div className="gl-am-bal">
            <span className="gl-am-bal-cur">$ USD</span>
            <span className="gl-am-bal-amt">9,184.40</span>
          </div>
        </div>

        {/* Inflow chart placeholder */}
        <div className="gl-am-chart" aria-hidden="true">
          <svg viewBox="0 0 600 140" preserveAspectRatio="none">
            <defs>
              <linearGradient id="amg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(140,65,255,0.5)" />
                <stop offset="100%" stopColor="rgba(140,65,255,0)" />
              </linearGradient>
            </defs>
            <path
              d="M0,110 C60,90 100,40 160,55 C220,70 270,120 330,90 C400,55 460,30 520,55 C570,75 590,40 600,38 L600,140 L0,140 Z"
              fill="url(#amg)"
            />
            <path
              d="M0,110 C60,90 100,40 160,55 C220,70 270,120 330,90 C400,55 460,30 520,55 C570,75 590,40 600,38"
              stroke="#C7AAFF"
              strokeWidth="1.8"
              fill="none"
            />
          </svg>
        </div>

        {/* Activity rows */}
        <div className="gl-am-list">
          <div className="gl-am-row">
            <div className="gl-am-mark in">↓</div>
            <div className="gl-am-row-text">
              <strong>Acme Studios Ltd</strong>
              <span>Faster Payments · GBP · Today 11:42</span>
            </div>
            <div className="gl-am-amt up">+£12,480.00</div>
          </div>
          <div className="gl-am-row">
            <div className="gl-am-mark out">↑</div>
            <div className="gl-am-row-text">
              <strong>Linde GmbH</strong>
              <span>SEPA Instant · EUR · Yesterday</span>
            </div>
            <div className="gl-am-amt">−€4,210.00</div>
          </div>
          <div className="gl-am-row">
            <div className="gl-am-mark info">⇄</div>
            <div className="gl-am-row-text">
              <strong>FX · GBP → USD</strong>
              <span>Conversion · 1.2734 · Auto-route</span>
            </div>
            <div className="gl-am-amt">$9,184.40</div>
          </div>
          <div className="gl-am-row">
            <div className="gl-am-mark warn">!</div>
            <div className="gl-am-row-text">
              <strong>Counterparty review</strong>
              <span>New beneficiary · Under screening</span>
            </div>
            <div className="gl-am-amt review">REVIEW</div>
          </div>
        </div>
      </div>

      {/* Floating side card */}
      <div className="gl-am-side">
        <span className="gl-am-side-eye">Payment composer</span>
        <div className="gl-am-side-rail">
          <span className="gl-am-side-chip">CHAPS</span>
          <span className="gl-am-side-chip on">FPS</span>
          <span className="gl-am-side-chip">BACS</span>
          <span className="gl-am-side-chip">SEPA</span>
        </div>
        <div className="gl-am-side-amount">
          <span>£</span>12,480<small>.00</small>
        </div>
        <div className="gl-am-side-status">
          <span className="gl-chip-dot" /> Ready to send
        </div>
      </div>
    </div>
  );
}
