# gleec-uk-landing-page

# GLEEC Business

**UK business accounts and payment infrastructure for complex companies.**

Static marketing homepage for GLEEC Business, deployed as a single self-contained HTML file.

## Overview

GLEEC Business targets UK-based companies with complex banking needs — including crypto-adjacent businesses, fintechs, and high-risk verticals that are underserved by traditional banks. The site presents the product proposition, account features, payment rails, and pricing.

## Stack

- Single standalone `.html` file — no build step, no dependencies, no server required
- All assets (styles, scripts, fonts) bundled inline
- Built with React + Babel (in-browser), rendered client-side

## Deployment

The file can be deployed to any static hosting provider:

**GitHub Pages**
1. Push the file to a repo (e.g. rename to `index.html`)
2. Go to **Settings → Pages**, set source to `main` branch, root directory
3. The site will be live at `https://<your-username>.github.io/<repo-name>/`

**Other options:** Netlify drag-and-drop, Vercel, Cloudflare Pages — all support single-file static deploys with zero configuration.

## Local Preview

```bash
# Any of these work:
open index.html                    # macOS
python3 -m http.server 8080        # then visit localhost:8080
npx serve .                        # Node
```

> Note: The file requires JavaScript enabled to render (assets are unpacked client-side on load).

## Brand

- Primary colour: `#8C41FF` (GLEEC purple)
- Background: `#000000` / `#0A0A0B`
- Typeface: Inter
