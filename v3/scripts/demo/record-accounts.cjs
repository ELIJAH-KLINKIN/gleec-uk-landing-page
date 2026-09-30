// record-accounts.cjs — records the hero demo's Accounts video from the banking
// app (branch no-crypto, served locally), in dark and light:
//   Accounts → the default account's details → Move → $2,500 USD to EUR →
//   Review → Sell → "You moved…".
// 1440 × 900 at 2x, like the stills, captured frame by frame from Chrome and
// assembled by ffmpeg into a 2000 × 1250 MP4 plus a poster frame.
//
// At capture time only (the app itself is untouched), as for the stills:
//   - team names → fictional personas, and their initials;
//   - account codes → placeholders (GB00 XXXX…, XXXXGB2L; no partner BICs);
//   - fees: the exchange fee is the app's own, 1.35% on Professional (financial
//     model v46). The app's no-fee exchange allowance is a proposed feature the
//     model doesn't have, so it is used up off camera first and its bar and
//     line are hidden; so is the incoming-payment fee line, which the model
//     prices per rail, not per plan;
//   - a drawn pointer, since a screen capture has none.
//
// Usage (app on :3100, e.g. `npm run build && npm run start -- -p 3100` in the
// app repo):  node scripts/demo/record-accounts.cjs
// Env: BASE (default http://localhost:3100), OUT (default src/assets/demo), MODES.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { W, H, pageSetup, glide, dismissNotices, centre, startCapture, assemble } = require("./lib.cjs");

const BASE = process.env.BASE || "http://localhost:3100";
const OUT = process.env.OUT || path.join(__dirname, "../../src/assets/demo");
const MODES = (process.env.MODES || "dark,light").split(",");

const SWAPS = [
  ["Ilia Klinkin", "Sam Carter"],
  ["Dana Reyes", "Jordan Ellis"],
  ["Priya Nair", "Maya Ortiz"],
  ["Kim Yoshida", "Riley Chen"],
  ["ilya@gleec.com", "sam@gleec.com"],
  ["026073150", "000000000"],
  ["026073008", "000000000"],
  ["8301234567", "1234567890"],
  ["GLEEGB2L", "XXXXGB2L"],
  ["BARCGB22", "XXXXGB22"],
];
const SETUP = {
  swaps: SWAPS,
  reSwaps: [["GB\\d{2} GLEE ", "g", "GB00 XXXX "]],
  initials: { IK: "SC", DR: "JE", PN: "MO", KY: "RC" },
  // The incoming-fee line, and the allowance line in both its wordings.
  hide: ["We don't charge any fees for transfers to this account.", "monthly no-fee"],
};

async function record(browser, mode) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, colorScheme: mode });
  await ctx.addInitScript(pageSetup, { ...SETUP, mode });
  const page = await ctx.newPage();

  // Off camera: open Accounts, dismiss the notices, and use up the no-fee
  // allowance with one move, then come back (client-side, so it sticks).
  await page.goto(`${BASE}/accounts`, { waitUntil: "networkidle" });
  await dismissNotices(page);
  await page.getByRole("button", { name: "Move", exact: true }).first().click();
  await page.getByLabel("From amount in USD").click();
  await page.keyboard.press("Meta+A");
  await page.keyboard.type("9000");
  await page.getByRole("button", { name: "Review order" }).click();
  await page.getByRole("button", { name: /^Sell / }).click();
  await page.waitForTimeout(1500);
  await page.goBack();
  await page.waitForURL(/\/accounts/);
  await page.waitForTimeout(800);
  await dismissNotices(page); // they come back after the move
  let at = { x: 980, y: 820 }; // empty space below the list: no hover in the first frame
  await page.mouse.move(at.x, at.y);
  await page.waitForTimeout(400);

  // On camera.
  const stop = await startCapture(ctx, page);

  await page.waitForTimeout(1300);
  // The default account's details
  const iban = page.getByText(/GB00 XXXX 2301 6390 5708 93/).first();
  at = await glide(page, at, await centre(iban), 800);
  await page.waitForTimeout(250);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(2300);
  // Move $2,500 into euros
  at = await glide(page, at, await centre(page.getByRole("button", { name: "Move", exact: true }).first()), 750);
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.mouse.up();
  await page.getByLabel("From amount in USD").waitFor();
  await page.waitForTimeout(700);
  at = await glide(page, at, await centre(page.getByLabel("From amount in USD")), 650);
  await page.mouse.down();
  await page.mouse.up();
  await page.keyboard.press("Meta+A");
  await page.keyboard.type("2500", { delay: 160 });
  await page.waitForTimeout(1400);
  const text = await page.locator("main").innerText();
  if (!/exchange fee/.test(text)) throw new Error("the allowance is not used up: no exchange fee on screen");
  at = await glide(page, at, await centre(page.getByRole("button", { name: "Review order" })), 800);
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(2200);
  at = await glide(page, at, await centre(page.getByRole("button", { name: /^Sell / })), 700);
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(3200);

  const take = await stop();
  await ctx.close();
  return take;
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  for (const mode of MODES) {
    const take = await record(browser, mode);
    const mp4 = assemble(take, "accounts", mode, OUT);
    const kb = Math.round(fs.statSync(mp4).size / 1024);
    console.log(`${mode}: ${take.frames.length} frames, ${take.seconds.toFixed(1)} s → ${mp4} (${kb} KB)`);
  }
  await browser.close();
})();
