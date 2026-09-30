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
  titleSpoken:
    "Global business accounts, corporate cards and cross-border payments for companies that don’t fit the default box.",
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
  // One qualifier for the whole gallery, instead of one in every card.
  note: "Products shown are planned and subject to FCA authorisation, onboarding approval and partner availability.",
  title: "The all-in-one account for complex business flows.",
  lead: "Accounts, payments, FX, payment cards and controls — designed for companies that need fiat payment routes across GBP, EUR and USD.",
  items: [
    {
      id: "accounts",
      eyebrow: "Global Account",
      title: "One IBAN, 24 currencies",
      body: "GBP, EUR and USD from launch, 21 more planned — all on one IBAN in your company’s name.",
      // The top of a phone with the app's "Add account" screen: GBP, EUR, USD and
      // "+21 more" (components/art/AddAccountPhone.jsx). All tiles are drawn.
      art: "add-account",
    },
    {
      // Business banking, as at Revolut Business: extra details for the company's
      // own regions, products or purposes, never for its customers' clients (no BaaS).
      id: "ibans",
      eyebrow: "Account details",
      title: "Separate details, one account",
      body: "Get account details for each region, product or purpose — all in your company’s name, all in one Global Account.",
      art: "named",
    },
    {
      id: "uk-rails",
      eyebrow: "Payments",
      title: "Faster Payments, CHAPS & BACS",
      // Timings from the partners' documents: FPS seconds 24/7, CHAPS same day, Bacs inbound only.
      body: "Faster Payments in seconds, CHAPS the same day, and Bacs for the payments you receive.",
      art: "uk-rails",
    },
    {
      id: "sepa",
      eyebrow: "Euro rails",
      title: "SEPA & SEPA Instant",
      body: "Euro payments across Europe: SEPA Instant in seconds, or SEPA by the next business day.",
      art: "sepa",
    },
    {
      id: "cop",
      eyebrow: "Fraud protection",
      title: "Confirmation of Payee",
      // Both checks are planned: Confirmation of Payee (UK) and Verification of Payee (euros).
      body: "Before you pay, the name is checked with the recipient’s bank — Confirmation of Payee in the UK, Verification of Payee for euros — so a fake invoice is caught first.",
      art: "cop",
    },
    {
      id: "swift",
      eyebrow: "International",
      title: "SWIFT & USD connectivity",
      body: "Pay abroad in USD and more. Choose who pays the fees (OUR, SHA or BEN), and follow each payment as it moves.",
      art: "swift",
    },
    {
      id: "cards",
      eyebrow: "Cards",
      title: "Virtual cards for team spend",
      // Cards are not day-one in the business plan: keep "later phase".
      body: "Per-card limits and category controls for team spend and subscriptions. Planned for a later phase.",
      art: "cards",
    },
    {
      id: "compliance",
      eyebrow: "Compliance",
      title: "Compliance-led onboarding",
      body: "Structured KYB, enhanced due diligence and ongoing monitoring, built for companies with complex structures.",
      art: "kyb",
    },
  ],
};

// Global Account details, by where the payer is: GBP on UK details, everything else
// on one Luxembourg IBAN (SEPA, SEPA Instant and SWIFT in 24 currencies), so only GBP
// needs a Local / International switch. Gleec Pay is shown as the account provider
// and the bank codes are placeholders (XXXX): the partner banks' NDAs keep the talks
// confidential, so their names and codes go on the page only once they agree in writing.
const PROVIDER = { name: COMPANY.name, address: COMPANY.office.join(", ") };

// The Accounts section: the details a company gives its payers, per region, and
// the currencies still to come. (Sending is the Payments section.)
export const EXPLORER = {
  eyebrow: "Global Account",
  // Kept as is on purpose during the FCA review (Ilia's call).
  title: "Open global accounts. Move money the right way.",
  lead: "UK account details for pounds, and a Luxembourg IBAN for euros, dollars and more, so European clients pay you like a local supplier. All in your company’s name.",
  stat: { value: "24", label: "currencies on one IBAN, GBP, EUR and USD first" },
  soonLabel: "Coming soon",
  soon: ["CHF", "CAD", "AUD", "DKK", "SEK", "NOK", "PLN", "CZK", "HUF", "JPY"],
  more: "+11 others",
  markets: [
    {
      id: "uk",
      label: "United Kingdom",
      flag: "GB",
      title: "Global Account · GBP",
      bank: PROVIDER,
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
            ["IBAN", "GB00 XXXX 0000 0012 3456 78"],
            ["SWIFT/BIC", "XXXXGB2L"],
          ],
        },
      ],
    },
    {
      id: "eu",
      label: "Eurozone",
      flag: "EU",
      title: "Global Account · EUR",
      bank: PROVIDER,
      holder: "ACME Studios Ltd",
      address: "1 Example Street, 10115 Berlin, Germany",
      views: [
        {
          id: "all",
          info: "For EUR payments via SEPA and SEPA Instant, and via SWIFT from outside the SEPA area.",
          rows: [
            ["IBAN", "LU00 XXX0 0000 1234 5678"],
            ["SWIFT/BIC", "XXXXLULL"],
          ],
        },
      ],
    },
    {
      id: "us",
      label: "United States",
      flag: "US",
      title: "Global Account · USD",
      bank: PROVIDER,
      holder: "ACME Studios Inc",
      address: "1 Example Street, New York, NY 10001, United States",
      views: [
        {
          id: "all",
          info: "For USD payments via SWIFT. The sender’s bank or an intermediary may charge a fee.",
          rows: [
            ["IBAN", "LU00 XXX0 0000 1234 5678"],
            ["SWIFT/BIC", "XXXXLULL"],
          ],
        },
      ],
    },
    {
      id: "global",
      label: "Global",
      flag: "GL",
      title: "Global Account · Other currencies",
      bank: PROVIDER,
      holder: "ACME Studios Ltd",
      address: "1 Example Street, London, EC1A 1AA, United Kingdom",
      views: [
        {
          id: "all",
          info: "For payments in other supported currencies via SWIFT. The sender’s bank or an intermediary may charge a fee.",
          rows: [
            ["IBAN", "LU00 XXX0 0000 1234 5678"],
            ["SWIFT/BIC", "XXXXLULL"],
          ],
        },
      ],
    },
  ],
};

// The Payments section: sending money. The recording is the app's own send
// flow (scripts/demo/record-payments.cjs). Timings come from the partners'
// documents (feedback rule 51); no fees on the page (Ilia, 2026-09-30).
export const PAYMENTS = {
  eyebrow: "Payments",
  title: "Pay suppliers and staff. See when it lands.",
  lead: "Choose who to pay and which account to pay from. Before you send, you see how the payment travels and when it will arrive. After, you can follow it to the recipient’s bank.",
  videoLabel:
    "Recording of the Gleec Business app: a payment of £4,850 to Hartwell & Frome LLP by Faster Payments, reviewed and sent, then tracked to the recipient’s bank.",
  timingsTitle: "How long it takes",
  timings: [
    ["Faster Payments", "Usually within seconds, 24/7"],
    ["CHAPS", "The same working day, before the cut-off"],
    ["SEPA Instant", "Usually within seconds"],
    ["SEPA", "The next business day"],
    ["SWIFT", "Sent the same day, before the cut-off"],
  ],
  reach: "60+ payout markets via SWIFT and our partners.",
  toolsTitle: "Built for finance teams",
  tools: [
    {
      icon: "file-spreadsheet",
      title: "Bulk payments",
      body: "Pay hundreds of suppliers or staff from one CSV file, checked and approved in one go.",
    },
    {
      icon: "users",
      title: "Roles and approvals",
      body: "Give each person the access they need, and send payments over your limits for a second approval.",
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
  ],
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
  // No privacy paragraph under the form: the footer's Privacy policy link covers it,
  // and the launch line above keeps the FCA qualifier.

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
        { label: "Payments", href: "#payments" },
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
