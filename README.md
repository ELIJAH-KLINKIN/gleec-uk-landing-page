# GLEEC Business — UK landing page

Marketing homepage for **GLEEC Business**, the proposed UK business-account and payments brand of Gleec Pay Ltd.
Includes a waitlist form whose leads are stored in Postgres and posted to a Telegram channel.

- **Site:** static React app built with Vite, prerendered to HTML at build time, hosted on GitHub Pages.
- **Lead API:** [`leads-api/`](leads-api/README.md), a Vercel Function backed by Neon Postgres.

Live (staging): https://elijah-klinkin.github.io/gleec-uk-landing-page/

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173 (hot reload)
npm run build        # production build → dist/ (prerendered HTML + hashed assets)
npm run preview      # serve dist/ at http://localhost:4173
npm run check        # lint + format check + build + end-to-end tests
```

Requires Node 20.19+ (CI uses Node 24).

## How it's built

| Concern       | Approach                                                                                                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rendering     | React 19. `scripts/prerender.js` renders the app to HTML during `npm run build`, so content is visible before JavaScript runs; the client then hydrates it.                                  |
| Styling       | Plain CSS: design tokens in `src/styles/tokens.css`, one stylesheet per component next to its `.jsx`.                                                                                        |
| Fonts         | Inter (variable) and Poppins, self-hosted `woff2`, latin + latin-ext subsets. The two above-the-fold files are preloaded.                                                                    |
| Icons         | `lucide-react`, tree-shaken. Only icons listed in `src/components/Icon.jsx` are shipped.                                                                                                     |
| Motion        | Carousels auto-advance only while on screen, in a visible tab, and not hovered or keyboard-focused. With the OS "reduce motion" setting they start paused and decorative animations are off. |
| Accessibility | Skip link, landmarks, one `h1`, labelled controls, WAI-ARIA tabs with arrow-key support, carousel controls, visible focus rings, WCAG AA text contrast, mobile menu.                         |
| SEO / sharing | Title, description, canonical URL, Open Graph + Twitter card (`public/og-image.png`), favicons, web manifest. `noindex` while on the staging domain.                                         |
| Portability   | All asset URLs are relative, so the same build works under `/gleec-uk-landing-page/` or at a domain root.                                                                                    |

```
index.html               HTML shell + meta tags (values come from .env)
src/
  entry-client.jsx       hydrates the prerendered HTML
  entry-server.jsx       used at build time by scripts/prerender.js
  App.jsx                page composition (section order)
  components/            one .jsx + .css per section
  lib/                   autoplay hook, lead-API client, form prefill helper
  styles/                fonts, tokens, base, shared kit styles
  assets/                logo, card artwork, fonts
public/                  favicons, OG image, manifest (copied as-is)
tests/site.spec.js       Playwright end-to-end suite
leads-api/               lead-intake API (separate Vercel project)
```

## Configuration

Build-time settings live in [`.env`](.env). They are public: every `VITE_*` value ends up in the page.

| Variable              | Purpose                                                          |
| --------------------- | ---------------------------------------------------------------- |
| `VITE_SITE_URL`       | Absolute URL of the site, used for canonical and Open Graph tags |
| `VITE_ROBOTS`         | `noindex, nofollow` on staging; `index, follow` in production    |
| `VITE_LEADS_ENDPOINT` | URL of the lead API, `https://<leads-api host>/api/leads`        |

## Tests

`npm run test:e2e` builds the site against a fake lead endpoint (`.env.test`) and runs Playwright at desktop and phone sizes. It covers:

- clean console output and no hydration mismatches
- every in-page link resolves; there are no dead links
- images load, and there's no horizontal overflow
- nav links and the mobile menu
- carousel controls, autoplay and reduced motion
- card tabs and the accounts explorer, including keyboard use
- FAQ
- the waitlist form: validation, success, server errors, rate limiting, network failure, prefill

The lead API is always mocked, so tests never create real leads. Locally the suite runs in your installed Google Chrome; CI installs Playwright's own Chromium.

## Deployment

- **Site:** every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) (lint → build → GitHub Pages). The repo's Pages source must be set to **GitHub Actions**.
- **CI:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs lint, format check, build and the end-to-end suite on every PR, plus the lead-API unit tests.
- **Lead API:** deployed from `leads-api/` to the Vercel project `gleec-uk-leads-api` (team `elijah-builds`). See [`leads-api/README.md`](leads-api/README.md).

### Moving to the corporate GitHub / domain

1. Transfer the repo, or push it to the new org, and set Pages → Source to **GitHub Actions**.
2. Update `.env`: `VITE_SITE_URL` to the new URL. Switch `VITE_ROBOTS` to `index, follow` once the site should appear in search.
3. Add the new site origin to the lead API's `ALLOWED_ORIGINS` env var on Vercel.

## Open content items

These are content or legal decisions, not code:

- Footer legal text still says `[insert company number]`.
- The Privacy policy, Terms and Cookies pages don't exist yet; they're marked "Soon" in the footer. The waitlist form collects personal data, so a privacy notice should go live with it.
- The "International Businesses" segment mentions accepting cryptocurrency payments, while the footer and FAQ say the proposed services are fiat-only. Worth a compliance read.
