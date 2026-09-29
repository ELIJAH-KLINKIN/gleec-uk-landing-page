// content.js — every word on the page, in one place.
// Copy is carried over from version 1 of the site. Components only lay it out.

export const NAV = [
  { label: "Product", href: "#product" },
  { label: "Accounts", href: "#accounts" },
  { label: "Payments", href: "#payments" },
  { label: "Cards", href: "#cards" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

// The legal entity behind the site. Used by the footer and the legal pages.
export const COMPANY = {
  name: "Gleec Pay Ltd",
  brand: "Gleec Business",
  number: "14776628",
  registeredIn: "England and Wales",
  office: ["Tower 42", "25 Old Broad Street", "London EC2N 1HN", "United Kingdom"],
  // Shown in the footer and on every legal page (contact, complaints, privacy…).
  email: "hello@gleecpay.co.uk",
  // Company page URL. Until it is set, the footer shows a "Soon" placeholder
  // instead of a link.
  linkedin: null,
};

export const DISCLAIMER_SHORT =
  "Gleec Pay Ltd is preparing an application to the FCA to become an Authorised Electronic Money Institution. Products and services shown are subject to authorisation, onboarding approval, partner availability and final terms.";

export const HERO = {
  // The headline's first line rotates with the demo tab below it
  // ("Global accounts" ↔ Accounts, …); the rest of the sentence stays put.
  titleRest: "for companies that don’t fit the default box.",
  // What screen readers hear: one stable sentence.
  // Keeps "business accounts" for search; the visible phrase is the product name.
  titleSpoken: "Global business accounts, corporate cards and cross-border payments for companies that don’t fit the default box.",
  // The hero's email pill (field + button in one) and the link to the product demo.
  primary: { label: "Join the Waitlist", href: "#waitlist" },
  emailLabel: "Work email",
  emailPlaceholder: "Work email",
  joined: "You’re on the list.",
  // Set VITE_DEMO_URL to show "See the demo"; without it the link is hidden.
  demo: { label: "See the demo", href: import.meta.env.VITE_DEMO_URL || "" },
  // Product demo under the headline: one tab per area, auto-advancing every 7 s.
  demoNote: "Product preview. Features shown are illustrative and subject to authorisation.",
  demos: [
    {
      id: "accounts",
      label: "Accounts",
      phrase: "Global accounts",
      caption: "GBP, EUR and USD in one account, with local details.",
    },
    {
      id: "cards",
      label: "Cards",
      phrase: "Corporate cards",
      caption: "Virtual and physical company cards with limits and spend controls.",
    },
    {
      id: "payments",
      label: "Payments",
      // Not "Global payments": one "Global" in the rotation is enough.
      phrase: "Cross-border payments",
      caption: "Faster Payments, SEPA and SWIFT from a single payment flow.",
    },
  ],
};

export const HIGHLIGHTS = {
  eyebrow: "Product",
  title: "The all-in-one account for complex business flows.",
  lead: "Accounts, payments, FX, payment cards and controls — designed for companies that need fiat payment routes across GBP, EUR and USD.",
  items: [
    {
      id: "accounts",
      eyebrow: "Global Account",
      title: "One IBAN, 24 currencies",
      body: "Hold, receive and send GBP, EUR and USD from launch, with 21 more currencies planned — all under one IBAN in your company’s name, with fiat-to-fiat FX between them. Subject to authorisation, onboarding approval and partner availability.",
      notice: { kind: "balance", flag: "GB", title: "Main GBP", detail: "Operating account", amount: "£84,250" },
    },
    {
      id: "ibans",
      eyebrow: "Account details",
      title: "Named virtual IBANs",
      body: "Dedicated account details where available, intended to help approved businesses separate flows by client, region or product.",
      notice: {
        kind: "details",
        rows: [
          ["Beneficiary", "ACME Studios Ltd"],
          ["Sort code", "00-00-00"],
          ["Account number", "12345678"],
        ],
      },
    },
    {
      id: "uk-rails",
      eyebrow: "Payments",
      title: "Faster Payments, CHAPS & BACS",
      body: "Domestic UK payments planned through standard and same-day routes, with Confirmation of Payee on every payment you send. Subject to authorisation, partner setup and operational readiness.",
      notice: {
        kind: "event",
        flag: "GB", // a flag, not the Faster Payments logo (scheme marks are for participants)
        title: "FPS payment",
        detail: "Sample inflow · £12,480",
      },
    },
    {
      id: "cop",
      eyebrow: "Fraud protection",
      title: "Confirmation of Payee",
      body: "Before a UK payment leaves your account, the recipient’s name is checked against their bank’s records. A mismatch is flagged before you send, so a misdirected payment or a fake invoice gets caught before it becomes a loss.",
      notice: {
        kind: "event",
        icon: "check",
        tone: "green",
        title: "Name matches",
        detail: "Hartwell & Frome Ltd · Confirmation of Payee",
      },
    },
    {
      id: "sepa",
      eyebrow: "Euro rails",
      title: "SEPA & SEPA Instant",
      body: "Planned support for sending and receiving euro payments via SEPA and, where available, SEPA Instant — subject to authorisation and partner availability.",
      notice: {
        kind: "event",
        flag: "EU",
        title: "EUR → SEPA",
        detail: "Sample outflow · €4,210",
      },
    },
    {
      id: "swift",
      eyebrow: "International",
      title: "SWIFT & USD connectivity",
      body: "Planned international and USD payments via SWIFT. You choose who pays the fees — you (OUR), the recipient (BEN) or shared (SHA) — and can follow each payment as it moves. Subject to authorisation, corridor availability and onboarding approval.",
      notice: {
        kind: "event",
        flag: "US",
        title: "USD wire",
        detail: "Sample beneficiary · $9,184",
      },
    },
    {
      id: "cards",
      eyebrow: "Cards",
      title: "Virtual cards for team spend",
      body: "Payment cards for team spend, subscriptions and operating expenses, with per-card limits and category controls. Card functionality is intended for a later phase, subject to scheme, issuer, operational and compliance readiness.",
      notice: {
        kind: "event",
        icon: "credit-card",
        tone: "blue",
        title: "Virtual card",
        detail: "Marketing · •••• 7421",
      },
    },
    {
      id: "compliance",
      eyebrow: "Compliance",
      title: "Compliance-led onboarding",
      body: "Designed to support more complex customers through structured KYB, EDD and ongoing monitoring. Any future onboarding would be subject to customer due diligence and acceptance policy.",
      notice: {
        kind: "event",
        icon: "shield-check",
        tone: "purple",
        title: "KYB review · In progress",
        detail: "Documents 8 of 10 received",
      },
    },
  ],
};

export const PARTNERS = {
  eyebrow: "Infrastructure",
  title: "Built upon experienced financial infrastructure partners.",
  lead: "Gleec Business is being built upon regulated banking, payment, card and compliance infrastructure. Logos reflect intended integrations and ongoing provider discussions — not confirmed or live partnerships, and not an endorsement by any provider.",
  names: ["ClearBank", "Banking Circle", "Sumsub", "Card scheme"],
};

export const ACCOUNTS = {
  eyebrow: "Global Account",
  title: "More than just account details.",
  lead: "Gleec Business is being built to combine account details, payment routes, FX capability and compliance controls in one operating platform.",
  points: [
    "GBP, EUR and USD at launch, 24 currencies planned",
    "UK account details, and a Luxembourg IBAN for euros",
    "Named virtual IBAN account details",
    "Faster Payments, CHAPS and BACS for UK flows",
    "SEPA and SEPA Instant",
    "SWIFT and USD corridors for international payments",
    "Fiat-to-fiat FX",
    "KYB, sanctions screening and transaction monitoring controls",
  ],
  link: { label: "See Account Details", href: "#payments" },
  mock: {
    balances: [
      { code: "GBP", symbol: "£", amount: "84,250" },
      { code: "EUR", symbol: "€", amount: "36,902.18" },
      { code: "USD", symbol: "$", amount: "9,184.40" },
    ],
    activity: [
      { dir: "in", name: "Acme Studios Ltd", detail: "Faster Payments · GBP · Today 11:42", amount: "+£12,480" },
      { dir: "out", name: "Linde GmbH", detail: "SEPA Instant · EUR · Yesterday", amount: "−€4,210" },
      { dir: "fx", name: "FX · GBP → USD", detail: "Conversion · 1.2734 · Auto-route", amount: "$9,184.40" },
      { dir: "review", name: "Counterparty review", detail: "New beneficiary · Under screening", amount: "Review" },
    ],
  },
};

// Who issues each set of account details. Named as the payer's bank needs it.
const CLEARBANK = {
  name: "ClearBank Limited",
  address: "Borough Yards, 13 Dirty Lane, London SE1 9PA, United Kingdom",
};
const BANKING_CIRCLE = {
  name: "Banking Circle S.A.",
  address: "2 Boulevard de la Foire, L-1528 Luxembourg",
};

// Global Account details, by where the payer is. Each set comes from the partner
// that issues it (Altery / Revolut layout: name, identifiers, address, bank):
// - GBP: ClearBank (sort code locally, GB IBAN from abroad).
// - Everything else: one Banking Circle IBAN in Luxembourg. Their product sheet: a
//   LU IBAN takes SEPA, SEPA Instant and SWIFT in 24 currencies (a DE IBAN would
//   take SEPA only), so EUR, USD and the rest share it and need no switch.
export const EXPLORER = {
  eyebrow: "Global accounts & transfers",
  // Kept as is on purpose during the FCA review (Ilia's call).
  title: "Open global accounts. Move money the right way.",
  lead: "UK account details for pounds, and a Luxembourg IBAN for euros, dollars and more, so European clients pay you like a local supplier. All in your company’s name.",
  stat: { value: "60+", label: "payout markets via SWIFT & partners" },
  markets: [
    {
      id: "uk",
      label: "United Kingdom",
      flag: "GB",
      title: "Global Account · GBP",
      bank: CLEARBANK,
      holder: "ACME Studios Ltd",
      address: "1 Example Street, London, EC1A 1AA, United Kingdom",
      views: [
        {
          id: "local",
          label: "Local",
          info: "For GBP payments from UK banks, via Faster Payments, BACS or CHAPS.",
          rows: [
            ["Sort code", "00-00-00"],
            ["Account number", "12345678"],
          ],
        },
        {
          id: "international",
          label: "International",
          info: "For payments from banks outside the UK, via SWIFT. The sender’s bank or an intermediary may charge a fee.",
          rows: [
            ["IBAN", "GB00 CLRB 0000 0012 3456 78"],
            ["SWIFT/BIC", "CLRBGB22"],
          ],
        },
      ],
      routes: [
        ["Faster Payments", "Near real-time GBP payments"],
        ["BACS", "Standard UK bank transfers"],
        ["CHAPS", "Same-day high-value GBP"],
        ["SWIFT", "International correspondent"],
      ],
    },
    {
      id: "eu",
      label: "Eurozone",
      flag: "EU",
      title: "Global Account · EUR",
      bank: BANKING_CIRCLE,
      holder: "ACME Studios Ltd",
      address: "1 Example Street, 10115 Berlin, Germany",
      views: [
        {
          id: "all",
          info: "For EUR payments via SEPA and SEPA Instant, and via SWIFT from outside the SEPA area.",
          rows: [
            ["IBAN", "LU00 4080 0000 1234 5678"],
            ["SWIFT/BIC", "BCIRLULL"],
          ],
        },
      ],
      routes: [
        ["SEPA", "Euro payments across Europe"],
        ["SEPA Instant", "Near real-time where supported"],
        ["SWIFT", "International correspondent"],
      ],
    },
    {
      id: "us",
      label: "United States",
      flag: "US",
      title: "Global Account · USD",
      bank: BANKING_CIRCLE,
      holder: "ACME Studios Inc",
      address: "1 Example Street, New York, NY 10001, United States",
      views: [
        {
          id: "all",
          info: "For USD payments via SWIFT. The sender’s bank or an intermediary may charge a fee.",
          rows: [
            ["IBAN", "LU00 4080 0000 1234 5678"],
            ["SWIFT/BIC", "BCIRLULL"],
          ],
        },
      ],
      routes: [["SWIFT", "International correspondent"]],
    },
    {
      id: "global",
      label: "Global",
      flag: "GL",
      title: "Global Account · Other currencies",
      bank: BANKING_CIRCLE,
      holder: "ACME Studios Ltd",
      address: "1 Example Street, London, EC1A 1AA, United Kingdom",
      views: [
        {
          id: "all",
          info: "For payments in other supported currencies via SWIFT. The sender’s bank or an intermediary may charge a fee.",
          rows: [
            ["IBAN", "LU00 4080 0000 1234 5678"],
            ["SWIFT/BIC", "BCIRLULL"],
          ],
        },
      ],
      routes: [["SWIFT", "International correspondent network"]],
    },
  ],
  capabilities: [
    "Designed to support accounts in your business name",
    "Planned support for GBP, EUR and USD as core currencies",
    "Dedicated local account details where available",
    "Account configuration is subject to onboarding approval",
    "Service availability is subject to authorisation and partner readiness",
  ],
};

export const CURRENCIES = {
  eyebrow: "Multi-currency",
  title: "GBP, EUR and USD at launch. 24 currencies on one IBAN.",
  lead: "Hold and receive up to 24 currencies under one IBAN through our banking partners. GBP, EUR and USD come first; the rest follow, subject to authorisation and partner availability.",
  core: [
    { code: "GBP", name: "British pound", routes: "FPS · BACS · CHAPS" },
    { code: "EUR", name: "Euro", routes: "SEPA · SEPA Instant" },
    { code: "USD", name: "US dollar", routes: "SWIFT" },
  ],
  soonLabel: "Coming soon",
  soon: ["CHF", "CAD", "AUD", "DKK", "SEK", "NOK", "PLN", "CZK", "HUF", "JPY"],
  more: "+11 others",
  link: { label: "Explore Payments", href: "#payments" },
};

export const CARDS = {
  eyebrow: "Cards",
  title: "Company cards with controls built in.",
  lead: "Virtual and physical cards for team spend, supplier payments and subscriptions — with limits, visibility and controls built into every purchase.",
  scenes: [
    {
      id: "virtual",
      label: "Virtual",
      title: "Virtual cards for subscriptions, suppliers and team spend.",
      points: [
        "Create cards for teams, projects or vendors",
        "Set daily, monthly and category limits",
        "Track every transaction from one workspace",
      ],
      notice: {
        app: "Gleec Business",
        merchant: "openai",
        title: "OpenAI · Subscription",
        detail: "Virtual · Marketing · within limit",
        amount: "−£82",
      },
    },
    {
      id: "physical",
      label: "Physical",
      title: "Physical cards for teams on the move.",
      points: [
        "Separate travel and field-team spend from operating accounts",
        "Set card limits from central controls",
        "Keep card activity visible in one workspace",
      ],
      notice: {
        app: "Gleec Business",
        merchant: "booking",
        title: "Booking.com · Travel",
        detail: "Physical · Travel team · within limit",
        amount: "−£420",
      },
    },
  ],
  cta: { label: "Join the Waitlist", href: "#waitlist" },
};

export const SEGMENTS = {
  eyebrow: "Who it’s for",
  title: "Built for businesses traditional banking leaves behind.",
  lead: "Gleec Business is for companies that often struggle to open or keep a business bank account — including regulated digital-asset businesses that need fiat GBP, EUR and USD accounts. Gleec Pay Ltd provides fiat services only and does not handle cryptoassets. Where high-street banks see complexity, we see customers worth serving.",
  items: [
    {
      id: "local",
      title: "Local businesses",
      body: "For UK companies — including those underserved by high-street business banking — with straightforward ownership and UK-focused payment needs.",
      points: [
        "Simple UK company structure",
        "Limited number of UBOs",
        "GBP and EUR payment needs",
        "Often turned away by high-street banks",
      ],
      cta: "See If It Fits",
    },
    {
      id: "international",
      title: "International businesses",
      body: "For companies operating across markets, currencies and counterparties.",
      points: [
        "Cross-border operations",
        "Multiple operating currencies",
        "International suppliers and customers",
        "Higher payment volumes",
        "Enhanced onboarding where required",
      ],
      cta: "See If It Fits",
    },
    {
      id: "group",
      title: "Holdings & corporate groups",
      body: "For groups, platforms and complex ownership structures that need a tailored review.",
      points: [
        "Multi-layer ownership",
        "Holding companies",
        "Regulated or financial counterparties",
        "Payments between group entities",
        "Bespoke limits and approval model",
      ],
      cta: "Contact Us",
      href: "#talk",
    },
  ],
};

export const PLANS = {
  eyebrow: "Plans",
  title: "Find the plan that fits your operating model.",
  lead: "Choose a plan based on your structure, payment needs and onboarding complexity. Plans are indicative and subject to authorisation, onboarding approval, partner availability and final terms.",
  items: [
    {
      id: "core",
      audience: "For local businesses",
      name: "Core",
      summary: "Straightforward UK and EU operating model with everyday rails.",
      features: [
        "GBP & EUR business account (planned)",
        "Faster Payments · BACS · CHAPS · SEPA (planned)",
        "Standard KYB review",
        "Card functionality on request (subject to readiness)",
      ],
    },
    {
      id: "professional",
      audience: "For international businesses",
      name: "Professional",
      summary: "Cross-border flows, USD corridors and team spend controls.",
      features: [
        "GBP, EUR & USD accounts (planned)",
        "SWIFT, SEPA Instant, USD wires (planned)",
        "Enhanced KYB / EDD where required",
        "Card functionality with limits, API access (intended)",
      ],
    },
  ],
  bespoke: {
    audience: "Complex structures?",
    body: "Holdings, platforms and multi-layer groups are reviewed case by case.",
    cta: "Speak to Us",
  },
  cta: { label: "Request Pricing", href: "#talk" },
  note: "Pricing is indicative — final fees depend on profile, volumes, corridors, partner availability and approval.",
};

export const CONTROLS = {
  eyebrow: "Controls",
  title: "Designed for regulated, high-control payments.",
  lead: "Gleec Business is being built with KYB, screening, monitoring, Confirmation of Payee, safeguarding, approval workflows and audit trails from day one — not as an afterthought.",
  items: [
    {
      icon: "shield-check",
      title: "KYB & onboarding review",
      body: "Structured review of company, directors and ownership — proportionate to your profile, not box-ticking.",
    },
    {
      icon: "search",
      title: "Sanctions, PEP & adverse-media screening",
      body: "Counterparties and beneficial owners screened at onboarding and continuously over the relationship.",
    },
    {
      icon: "activity",
      title: "Transaction monitoring",
      body: "Rules and behavioural signals flag unusual flows before they settle — with case ownership end-to-end.",
    },
    {
      icon: "vault",
      title: "Safeguarding & reconciliation",
      body: "If authorised, funds will be kept in a segregated safeguarding account at a UK bank and reconciled daily.",
    },
  ],
};

// "For finance teams": the tools corporate treasury and finance teams look for.
// Backed by the banking partners' channels (bulk files, API + webhooks, ISO 20022
// statements); roles and approvals are the platform's own.
export const FINANCE = {
  eyebrow: "Finance teams",
  title: "Built for the way finance teams work.",
  lead: "Pay in bulk, connect your systems and reconcile without copy and paste. Planned from launch, subject to authorisation.",
  items: [
    {
      icon: "file-spreadsheet",
      title: "Bulk payments",
      body: "Pay hundreds of suppliers or staff from one CSV file, checked and approved in one go.",
    },
    {
      icon: "code",
      title: "API and instant notifications",
      body: "Create payments, read balances and get a webhook the moment money arrives or leaves.",
    },
    {
      icon: "file-text",
      title: "Statements your systems read",
      body: "Download statements as CSV, PDF or ISO 20022 (camt.053), ready for your accounting software.",
    },
    {
      icon: "users",
      title: "Roles and approvals",
      body: "Give each person the access they need, and send payments over your limits for a second approval.",
    },
  ],
};

export const WAITLIST = {
  // Step 1 — email only.
  eyebrow: "Waitlist",
  title: "We’ll contact eligible companies as onboarding opens.",
  lead: "Leave your work email to register your interest in Gleec Business.",
  emailLabel: "Work email",
  emailPlaceholder: "Work email",
  join: "Join",
  joining: "Joining…",
  // Shown under the field. A target, not a promise: launch depends on FCA authorisation.
  launch: "Target launch 2027, subject to FCA authorisation",
  count: (n) => `${n.toLocaleString("en-GB")} ${n === 1 ? "company" : "companies"} on the list`,
  // Joining only means "tell me when onboarding opens"; marketing is a separate, unticked box.
  updates: "Send me product updates",
  consent:
    "We’ll use your email only to contact you about onboarding, and to send product updates if you tick the box. The service isn’t available yet and is subject to FCA authorisation and onboarding approval. Registering interest is not an application for a regulated service.",

  // Step 2 — optional details (sales uses these to prepare a setup).
  joinedTitle: "You’re on the list.",
  joinedBody: "We’ll contact you as onboarding opens to eligible companies.",
  detailsTitle: "Need a tailored setup?",
  detailsLead:
    "Only your name is required. We’ll follow up once we can confirm what may fit your needs, subject to authorisation, onboarding approval and acceptance policy.",
  sendDetails: "Send Details",
  sending: "Sending…",
  skip: "Not Now",
  doneTitle: "Thanks — we’ll be in touch.",
  doneBody: "We’ll use these details to prepare, once onboarding opens.",
};

// "Talk to a human": email → about you → pick a time (Google Meet), after the FAQ.
export const TALK = {
  eyebrow: "Talk to a human",
  title: "Still have questions? Talk to a human.",
  lead: "No bots and no scripts. Book a 20-minute video call with someone from our team, at a time that suits you.",
  steps: ["Your email", "About you", "Pick a time"],
  emailLabel: "Work email",
  start: "Talk to a Human",
  detailsTitle: "Who are we meeting?",
  detailsLead: "Only your name is required. Anything else helps us prepare.",
  book: "Book a Call",
  finding: "Finding times…",
  pickTitle: "Pick a time",
  pickLead: (minutes) => `${minutes}-minute Google Meet call.`,
  timeZoneNote: (zone) => `Times are in your time zone (${zone}).`,
  confirm: (time) => `Book ${time}`,
  confirming: "Booking…",
  taken: "That time was just taken. Please pick another.",
  doneTitle: "You’re booked.",
  doneInvite: (email) => `A Google Meet invitation is on its way to ${email}.`,
  join: "Join the call",
  laterTitle: "We’ll email you to arrange a time.",
  laterBody: "Online booking isn’t available right now, but we have your details and will be in touch shortly.",
  notLive: "Call booking isn’t open on this preview yet. Join the waitlist and we’ll be in touch.",
  note: "Calls are introductory. Gleec Pay Ltd is not yet authorised by the FCA, so we can’t open accounts or accept money yet. We use your details only to arrange and hold the call.",
};

export const FAQ = {
  eyebrow: "Have questions?",
  title: "Frequently asked questions.",
  items: [
    {
      q: "Is Gleec Pay Ltd authorised by the FCA?",
      a: "Gleec Pay Ltd is preparing an application to the FCA to become an Authorised Electronic Money Institution. It is not currently authorised by the FCA and does not currently provide regulated e-money or payment services in the UK.",
    },
    {
      q: "Is Gleec Business a bank?",
      a: "No. Gleec Business is not a bank. The proposed service is an e-money and payment account platform. E-money accounts are not bank accounts and are not protected by the Financial Services Compensation Scheme.",
    },
    {
      q: "Are the products on this website available now?",
      a: "The website describes the proposed Gleec Business product direction. Products, features, pricing, payment routes and card functionality are illustrative and subject to FCA authorisation, onboarding approval, partner availability, final terms and applicable law.",
    },
    {
      q: "Does Gleec Pay Ltd provide crypto services?",
      a: "No. Gleec Pay Ltd’s proposed UK services are fiat-only. Gleec Pay Ltd will not provide cryptoasset exchange, custody, brokerage, stablecoin issuance, staking, investment services or cryptoasset settlement.",
    },
    {
      q: "How is Gleec Pay Ltd related to other Gleec companies?",
      a: "Gleec Pay Ltd is the only Gleec company that would provide the services on this website. Other Gleec-branded companies, including those offering digital-asset services, are separate legal entities: their products are not offered by Gleec Pay Ltd and are not covered by its application to the FCA or, if granted, its authorisation. If authorised, customer funds would be safeguarded by Gleec Pay Ltd and never held by another Gleec company.",
    },
    {
      q: "Who can apply?",
      a: "The proposed service is designed for eligible businesses with more complex account and payment needs. Any future onboarding would be subject to customer due diligence, risk assessment, acceptance policy and final approval.",
    },
    {
      q: "Are customer funds protected by FSCS?",
      a: "No. E-money accounts are not bank accounts and are not protected by FSCS. If authorised, relevant customer funds will be safeguarded in accordance with applicable e-money safeguarding requirements.",
    },
    {
      q: "Which currencies and payment routes are planned?",
      a: "The initial operating focus is GBP, EUR and USD, with up to 24 currencies planned under one IBAN, and planned support for Faster Payments, CHAPS, BACS, SEPA, SEPA Instant and SWIFT. Availability of any specific currency or route will depend on authorisation, onboarding outcome, customer profile, corridor and partner availability.",
    },
    {
      q: "Are cards part of the proposed service?",
      a: "Card functionality is shown for illustration and is intended for a later phase. Virtual and physical card concepts are subject to scheme, issuer, operational and compliance readiness, and may be made available following authorisation and final programme approval.",
    },
    {
      q: "How do I express interest?",
      a: "Register your interest using the waitlist form and the team will follow up with next steps. Any future onboarding would only proceed following authorisation, customer due diligence and acceptance policy review.",
    },
  ],
};

export const FOOTER = {
  tagline: "Proposed UK business accounts and payment infrastructure for complex companies.",
  legal: [
    "Gleec Business is a brand of Gleec Pay Ltd, a company registered in England and Wales, company number 14776628. Registered office: Tower 42, 25 Old Broad Street, London EC2N 1HN, United Kingdom. Gleec Pay Ltd is preparing an application to the Financial Conduct Authority to become an Authorised Electronic Money Institution. Gleec Pay Ltd is not currently authorised by the FCA and does not currently provide regulated e-money or payment services in the UK.",
    "The information on this website is for general information and application-preparation purposes only. It does not constitute an offer, invitation or financial promotion to provide regulated services. Any products, features, pricing, payment routes, account details or card functionality shown are illustrative and subject to authorisation, onboarding approval, partner availability, final terms and applicable law.",
    "Gleec Pay Ltd’s proposed UK services are fiat-only. Gleec Pay Ltd will not provide cryptoasset exchange, custody, brokerage, stablecoin issuance, staking, investment services or cryptoasset settlement. E-money accounts are not bank accounts and are not protected by the Financial Services Compensation Scheme. If authorised, relevant customer funds will be safeguarded in accordance with applicable e-money safeguarding requirements.",
    "All trademarks referenced on this page are the property of their respective owners.",
  ],
  columns: [
    {
      title: "Product",
      links: [
        { label: "Global Account", href: "#accounts" },
        { label: "Multi-currency", href: "#currencies" },
        { label: "International payments", href: "#payments" },
        { label: "Payment cards", href: "#cards" },
        { label: "Spend controls", href: "#cards" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Plans & pricing", href: "#pricing" },
        { label: "FAQ", href: "#faq" },
        { label: "Regulatory information", href: "/regulatory/" },
        { label: "How your money will be protected", href: "/safeguarding/" },
        { label: "Fraud and scams", href: "/regulatory/#fraud" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "Contact us", href: "/contact/" },
        { label: "Complaints", href: "/complaints/" },
        { label: "Compliance", href: "#controls" },
        { label: "Join the waitlist", href: "#waitlist" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Terms of use", href: "/terms/" },
        { label: "Privacy policy", href: "/privacy/" },
        { label: "Cookies", href: "/cookies/" },
        { label: "Accessibility", href: "/accessibility/" },
      ],
    },
  ],
  copyright: "Copyright © 2026 Gleec Pay Ltd. All rights reserved.",
  locale: "United Kingdom",
};
