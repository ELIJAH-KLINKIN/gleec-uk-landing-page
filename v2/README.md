# GLEEC Business: landing page v2 (Apple HIG redesign)

A new design of the GLEEC Business landing page, built from scratch on Apple's
[Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines).
It uses the same content as version 1 (in the repo root) and the same lead API
(`../leads-api`).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # prerendered production build → dist/
npm run check      # lint + format + build + end-to-end tests
```

## How the HIG shaped it

| HIG guidance                                                                        | What v2 does                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Follow the system appearance; don't add an in-page toggle                           | Full light **and** dark palettes swap automatically via `prefers-color-scheme`.                                                                                                                                                             |
| Use the system font                                                                 | SF Pro on Apple devices, with self-hosted Inter elsewhere. One type ramp in `rem`, so text scales with the reader's settings.                                                                                                               |
| Contrast ≥ 4.5:1; Increase Contrast; Reduce Transparency                            | All text pairs meet WCAG AA. Stronger labels and separators under `prefers-contrast: more`, and an opaque bar under `prefers-reduced-transparency`.                                                                                         |
| Liquid Glass / materials only on navigation and controls                            | The translucent material is used on the navigation bar only. Content sits on solid surfaces.                                                                                                                                                |
| Use the brand colour sparingly                                                      | Purple is kept for primary actions, links and the selected state.                                                                                                                                                                           |
| At most one or two prominent buttons; title-case verb labels                        | One filled action per view ("Join the Waitlist"); secondary actions are plain "View Plans ›" links.                                                                                                                                         |
| Hit targets of 44 × 44 pt                                                           | Every button, link, segment and toggle is at least 44 px tall. A test checks this.                                                                                                                                                          |
| Segmented controls, sidebars, disclosure controls, pop-up buttons                   | Card type and transfer method use segmented controls, markets use a sidebar, the FAQ uses disclosure rows (native `<details>`), and business type and volume use pop-up buttons.                                                            |
| Carousels that play by themselves are an anti-pattern; motion is purposeful         | Nothing moves on its own. The highlights gallery uses native scroll with snap points, paddles and a page control. All motion honours Reduce Motion.                                                                                         |
| Ask only for what you need; progressive disclosure; errors that say how to fix them | Email-first waitlist: a pill field with a Join button, the live number of companies on the list and the planned launch underneath. After joining, an optional details step (Send Details / Not Now) collects company information for sales. |

The design tokens (colours for both appearances, type, spacing, radii, motion)
are in `src/styles/tokens.css`. All copy is in `src/content.js`.

## Config

`.env` holds the public build settings: `VITE_SITE_URL`, `VITE_ROBOTS` and
`VITE_LEADS_ENDPOINT` (see the root README), plus the optional
`VITE_WAITLIST_MIN_COUNT`, which hides the "companies on the list" line
until the count reaches this number (default 1).

The waitlist uses three lead-API endpoints: `POST /api/leads` (email),
`POST /api/leads/details` (optional details) and `GET /api/stats` (count).
The planned-launch text is `WAITLIST.launch` in `src/content.js`.
