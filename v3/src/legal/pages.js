// pages.js — the legal and regulatory pages: one entry per URL. The prerender
// step writes each to dist/<path>index.html with its own title and description;
// the client picks the same page from location.pathname when it hydrates.
export const LEGAL_UPDATED = "28 September 2026";

export const LEGAL_PAGES = [
  {
    id: "regulatory",
    path: "/regulatory/",
    eyebrow: "Regulatory",
    title: "Regulatory information",
    description:
      "Gleec Pay Ltd’s regulatory status, what an e-money account is and isn’t, and how to check who you are dealing with.",
  },
  {
    id: "safeguarding",
    path: "/safeguarding/",
    eyebrow: "Regulatory",
    title: "How your money will be protected",
    description:
      "How Gleec Pay Ltd will safeguard customer funds if authorised as an electronic money institution, and what safeguarding does and does not cover.",
  },
  {
    id: "privacy",
    path: "/privacy/",
    eyebrow: "Legal",
    title: "Privacy policy",
    description: "How Gleec Pay Ltd collects, uses and protects personal data on this website and the waitlist.",
  },
  {
    id: "cookies",
    path: "/cookies/",
    eyebrow: "Legal",
    title: "Cookie policy",
    description: "This website does not use cookies or similar tracking technologies.",
  },
  {
    id: "terms",
    path: "/terms/",
    eyebrow: "Legal",
    title: "Website terms of use",
    description: "The terms that apply when you use the GLEEC Business website.",
  },
  {
    id: "complaints",
    path: "/complaints/",
    eyebrow: "Support",
    title: "Complaints",
    description:
      "How to make a complaint to Gleec Pay Ltd, how we handle it, and when you can refer it to the Financial Ombudsman Service.",
  },
  {
    id: "contact",
    path: "/contact/",
    eyebrow: "Support",
    title: "Contact us",
    description: "How to reach Gleec Pay Ltd.",
  },
  {
    id: "accessibility",
    path: "/accessibility/",
    eyebrow: "Support",
    title: "Accessibility statement",
    description: "How we make the GLEEC Business website accessible, known limitations and how to ask for help.",
  },
];

// "/privacy", "/privacy/" and "/privacy/index.html" all mean the privacy page.
export function findLegalPage(pathname) {
  const clean = `/${String(pathname || "/")
    .replace(/index\.html$/, "")
    .replace(/^\/+|\/+$/g, "")}/`;
  return LEGAL_PAGES.find((p) => p.path === clean) || null;
}
