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
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const BASE = process.env.BASE || "http://localhost:3100";
const OUT = process.env.OUT || path.join(__dirname, "../../src/assets/demo");
const MODES = (process.env.MODES || "dark,light").split(",");
const W = 1440;
const H = 900;

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
// The incoming-fee line, and the allowance line in both its wordings.
const HIDE = ["We don't charge any fees for transfers to this account.", "monthly no-fee"];

// Runs in the page before any app code: scrubs every text change, hides the
// lines above, and draws a pointer that follows the mouse.
function pageSetup({ swaps, hide, mode }) {
  try {
    localStorage.setItem("gleec-appearance", JSON.stringify({ mode, accent: "blue", navStyle: "expanded" }));
  } catch {}
  const initials = { IK: "SC", DR: "JE", PN: "MO", KY: "RC" };
  const swap = (s) =>
    swaps.reduce((acc, [a, b]) => acc.split(a).join(b), s).replace(/GB\d{2} GLEE /g, "GB00 XXXX ");
  // The biggest element that still holds only this text (so its icon goes too).
  const row = (el) => {
    const text = el.innerText.trim();
    while (el.parentElement && el.parentElement.innerText.trim() === text) el = el.parentElement;
    return el;
  };
  const clean = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const next = swap(n.nodeValue);
      if (next !== n.nodeValue) n.nodeValue = next;
      const el = n.parentElement;
      if (!el) continue;
      if (initials[n.nodeValue.trim()] && el.children.length === 0) n.nodeValue = initials[n.nodeValue.trim()];
      if (hide.some((h) => n.nodeValue.includes(h))) {
        const r = row(el);
        r.style.display = "none";
        // The allowance line sits under its progress bar: hide the bar too.
        const bar = r.previousElementSibling;
        if (bar && !bar.innerText.trim()) bar.style.display = "none";
      }
    }
  };
  const start = () => {
    clean(document.body);
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "characterData") clean(m.target.parentElement || document.body);
        for (const n of m.addedNodes) clean(n.nodeType === 1 ? n : n.parentElement || document.body);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
    const cursor = document.createElement("div");
    cursor.innerHTML =
      '<svg width="22" height="28" viewBox="0 0 22 28"><path d="M2 2v20.5l5.2-5 3.3 7.6 3.4-1.5-3.2-7.4H18L2 2Z" fill="#000" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    Object.assign(cursor.style, {
      position: "fixed",
      left: "0",
      top: "0",
      zIndex: "2147483647",
      pointerEvents: "none",
      transformOrigin: "2px 2px",
      transition: "scale 120ms ease",
      filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,.35))",
      translate: "720px 520px",
    });
    document.body.appendChild(cursor);
    // The app's first render can drop foreign nodes: re-attach when needed.
    addEventListener(
      "mousemove",
      (e) => {
        if (!cursor.isConnected) document.documentElement.appendChild(cursor);
        cursor.style.translate = `${e.clientX - 2}px ${e.clientY - 2}px`;
      },
      true,
    );
    addEventListener("mousedown", () => (cursor.style.scale = "0.85"), true);
    addEventListener("mouseup", () => (cursor.style.scale = "1"), true);
  };
  if (document.body) start();
  else addEventListener("DOMContentLoaded", start);
}

// A human-paced pointer: eased glide at 60 steps a second.
async function glide(page, from, to, ms = 650) {
  const steps = Math.max(8, Math.round(ms / 16));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    await page.mouse.move(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
    await page.waitForTimeout(16);
  }
  return to;
}
async function dismissNotices(page) {
  for (let i = 0; i < 4; i++) {
    const x = page.getByRole("button", { name: /dismiss/i });
    if (!(await x.count())) break;
    await x.first().click();
    await page.waitForTimeout(150);
  }
}
const centre = async (loc) => {
  const b = await loc.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

async function record(browser, mode) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, colorScheme: mode });
  await ctx.addInitScript(pageSetup, { swaps: SWAPS, hide: HIDE, mode });
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
  const frames = [];
  const cdp = await ctx.newCDPSession(page);
  cdp.on("Page.screencastFrame", async (f) => {
    frames.push({ data: f.data, ts: f.metadata.timestamp });
    await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W * 2, maxHeight: H * 2 });
  const t0 = Date.now();

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

  await cdp.send("Page.stopScreencast");
  const seconds = (Date.now() - t0) / 1000;
  await ctx.close();
  return { frames, seconds };
}

function assemble({ frames, seconds }, mode) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `demo-${mode}-`));
  const list = [];
  frames.forEach((f, i) => {
    const file = path.join(dir, `f${String(i).padStart(5, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, "base64"));
    const next = frames[i + 1] ? frames[i + 1].ts : frames[0].ts + seconds;
    list.push(`file '${file}'`, `duration ${Math.max(0.001, next - f.ts).toFixed(4)}`);
  });
  list.push(`file '${path.join(dir, `f${String(frames.length - 1).padStart(5, "0")}.jpg`)}'`);
  fs.writeFileSync(path.join(dir, "list.txt"), list.join("\n"));
  const mp4 = path.join(OUT, `accounts-${mode}.mp4`);
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.txt"),
    "-vf", "fps=30,scale=2000:1250:flags=lanczos,format=yuv420p",
    "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-profile:v", "high", "-movflags", "+faststart", "-an", mp4,
  ]);
  const png = path.join(dir, "poster.png");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", mp4, "-frames:v", "1", png]);
  execFileSync("cwebp", ["-quiet", "-q", "82", png, "-o", path.join(OUT, `accounts-${mode}-poster.webp`)]);
  fs.rmSync(dir, { recursive: true, force: true });
  return mp4;
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  for (const mode of MODES) {
    const take = await record(browser, mode);
    const mp4 = assemble(take, mode);
    const kb = Math.round(fs.statSync(mp4).size / 1024);
    console.log(`${mode}: ${take.frames.length} frames, ${take.seconds.toFixed(1)} s → ${mp4} (${kb} KB)`);
  }
  await browser.close();
})();
