// Renders public/og-image.png: the 1200×630 card shown when the site link is shared
// (LinkedIn, WhatsApp, Telegram, iMessage…). It travels without the page, so it carries
// its own "subject to FCA authorisation" line. Run: npm run og-image
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const asset = (path) => new URL(`../src/assets/${path}`, import.meta.url);
const dataUrl = (path, type) => `data:${type};base64,${readFileSync(asset(path)).toString("base64")}`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face { font-family: Inter; font-weight: 100 900; src: url(${dataUrl("fonts/inter-latin.woff2", "font/woff2")}) format("woff2"); }
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; overflow: hidden;
    display: grid; place-content: center; justify-items: center; gap: 30px;
    font-family: Inter, sans-serif; color: #1d1d1f; text-align: center;
    background: radial-gradient(ellipse 60% 45% at 50% 108%, rgba(140, 65, 255, 0.16), transparent 70%), #ffffff;
  }
  .brand { display: flex; align-items: center; gap: 12px; font-size: 26px; font-weight: 700; letter-spacing: -0.01em; }
  .brand img { height: 32px; }
  h1 { max-width: 900px; font-size: 76px; line-height: 1.04; font-weight: 700; letter-spacing: -0.035em; }
  h1 em { font-style: normal; color: #8c41ff; }
  p { font-size: 25px; color: #6e6e73; }
</style></head><body>
  <div class="brand"><img src="${dataUrl("logo-g.svg", "image/svg+xml")}" alt=""><b>Gleec Pay</b></div>
  <h1>Business accounts for companies that <em>don’t fit the default box.</em></h1>
  <p>GBP, EUR and USD accounts · Planned, subject to FCA authorisation</p>
</body></html>`;

const browser = await chromium.launch({ channel: process.env.CI ? undefined : "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: new URL("../public/og-image.png", import.meta.url).pathname });
await browser.close();
console.log("wrote public/og-image.png");
