// record-payments.cjs — records the Payments section's video from the banking
// app's UK edition (branch uk-emi: GBP-first accounts, UK Ltd/LLP recipients,
// Faster Payments "in seconds"), served locally, in dark and light:
//   New transfer → search "Hart" → Hartwell & Frome LLP → £4,850 from the GBP
//   account, reference INV-2291 → Review (Faster Payments, arrival, approvals)
//   → Send → the payment's panel: Sent, and its tracking.
// 1440 × 900 at 2x, like the Accounts video (see lib.cjs for the assembly).
//
// At capture time only (the app itself is untouched):
//   - names → fictional personas; recipients' real bank codes (BICs, US routing
//     numbers, sort codes, IBAN bank codes) → placeholders;
//   - no fees on screen (Ilia, 2026-09-30: "No need to show fees"): the fee,
//     total and plan-fee lines are hidden;
//   - the app's upgrade and verification notices are hidden.
// (The older no-crypto build also needed the arrival wording, a GBP top-up
// and its real sort codes changing; those swaps are harmless on uk-emi.)
//
// Usage (UK edition on :3100, e.g. `npm run build && npm run start -- -p 3100`
// in its worktree):  node scripts/demo/record-payments.cjs
// Env: BASE (default http://localhost:3100), OUT (default src/assets/demo), MODES.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { W, H, pageSetup, glide, tap, startCapture, assemble } = require("./lib.cjs");

const BASE = process.env.BASE || "http://localhost:3100";
const OUT = process.env.OUT || path.join(__dirname, "../../src/assets/demo");
const MODES = (process.env.MODES || "dark,light").split(",");

const REAL_BICS = [
  "AIBKIE2D",
  "BCOMPTPL",
  "BNPAFRPP",
  "CAIXESBB",
  "CHASUS33",
  "DEUTDEFF",
  "GIBACZPX",
  "INGBNL2A",
  "MAPLCAT2",
  "NDEADKKK",
  "PBNKDEFF",
  "ROYCCAT2",
  "UOVBSGSG",
  "GLEEGB2L",
];
const SETUP = {
  swaps: [
    ["Ilia Klinkin", "Sam Carter"],
    ["ilya@gleec.com", "sam@gleec.com"],
    ...REAL_BICS.map((b) => [b, "XXXX" + b.slice(4)]),
    ...["021000021", "021000089", "026009593"].map((r) => [r, "000000000"]),
    ...["04-00-04", "20-45-77", "23-14-70", "30-91-56", "60-12-08"].map((c) => [c, "00-00-00"]),
    ["Usually arrives within minutes", "Usually arrives in seconds"],
  ],
  // Any IBAN's check digits and bank code.
  reSwaps: [["\\b([A-Z]{2})\\d{2} [A-Z0-9]{4}(?= \\d{4})", "g", "$100 XXXX"]],
  // "To Hartwell…" gets "TH" in the app; the recipient's own avatar says H&.
  initials: { IK: "SC", TH: "H&" },
  hideRows: ["Fee", "Fees", "Total", "Total to pay"],
  // The reference's "Required field" while the amount is typed first.
  hide: ["Required field"],
  hideItems: [["Gleec Business Fee", "button"]],
  hideCards: ["Upgrade to Professional", "Additional verification needed"],
};

async function record(browser, mode) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, colorScheme: mode });
  await ctx.addInitScript(pageSetup, { ...SETUP, mode });
  const page = await ctx.newPage();

  // Off camera: New transfer, paying from the default (GBP) account.
  await page.goto(`${BASE}/transactions/new`, { waitUntil: "networkidle" });
  await page.getByText("New transfer").first().waitFor();
  await page.waitForTimeout(800);
  let at = { x: 1200, y: 700 }; // empty space beside the list: no hover in the first frame
  await page.mouse.move(at.x, at.y);
  await page.waitForTimeout(300);

  // On camera.
  const stop = await startCapture(ctx, page);
  await page.waitForTimeout(1200);
  // Find the supplier
  at = await tap(page, at, page.getByLabel("Search recipients"), 800);
  await page.keyboard.type("Hart", { delay: 170 });
  await page.waitForTimeout(700);
  at = await tap(page, at, page.getByText("Hartwell & Frome LLP").first(), 650);
  // The amount, from the GBP account, and a reference
  await page.getByLabel("Reference").waitFor();
  await page.waitForTimeout(700);
  const amount = page.locator("input").first();
  at = await tap(page, at, amount, 650);
  await page.keyboard.press("Meta+A");
  await page.keyboard.type("4850", { delay: 170 });
  await page.waitForTimeout(500);
  at = await tap(page, at, page.getByLabel("Reference"), 650);
  await page.keyboard.type("INV-2291", { delay: 110 });
  await page.waitForTimeout(600);
  at = await tap(page, at, page.getByRole("button", { name: "Review" }), 700);
  // Review: the payment method, when it arrives, approvals
  await page.getByRole("button", { name: /^Send / }).waitFor();
  const text = await page.locator("body").innerText();
  if (!/Faster Payments/.test(text) || !/in seconds/.test(text))
    throw new Error("review: no Faster Payments / arrival line");
  await page.waitForTimeout(2600);
  at = await tap(page, at, page.getByRole("button", { name: /^Send / }), 800);
  // Sent: the payment's panel with its tracking
  await page.getByText("Transfer tracking").first().waitFor();
  await page.waitForTimeout(600);
  at = await glide(page, at, { x: 520, y: 140 }, 700); // beside the balance: nothing lights up
  await page.waitForTimeout(3000);

  const take = await stop();
  await ctx.close();
  return take;
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  for (const mode of MODES) {
    const take = await record(browser, mode);
    const mp4 = assemble(take, "payments", mode, OUT);
    const kb = Math.round(fs.statSync(mp4).size / 1024);
    console.log(`${mode}: ${take.frames.length} frames, ${take.seconds.toFixed(1)} s → ${mp4} (${kb} KB)`);
  }
  await browser.close();
})();
