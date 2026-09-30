// lib.cjs — what the demo recorders share: the capture-time scrubs and a drawn
// pointer (set up in the page before any app code), a human-paced pointer, and
// assembling the captured frames into an MP4 and a poster frame.
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const W = 1440;
const H = 900;

// Runs in the page before any app code. Every text change is scrubbed:
//   swaps     [from, to] pairs of plain text;
//   reSwaps   [source, flags, replacement] regular expressions;
//   initials  leaf texts to replace whole (avatars);
//   hide      texts whose smallest own element is hidden (and a bar just above it);
//   hideRows  labels whose label/value row is hidden (e.g. "Fees" · "No fees");
//   hideItems [text, selector]: the closest selector is hidden, and its group
//             too when only the group's heading is left;
//   hideCards texts whose dismissable notice card is hidden.
function pageSetup(o) {
  try {
    localStorage.setItem("gleec-appearance", JSON.stringify({ mode: o.mode, accent: "blue", navStyle: "expanded" }));
  } catch {}
  const res = (o.reSwaps || []).map(([src, flags, to]) => [new RegExp(src, flags), to]);
  const swap = (s) =>
    res.reduce(
      (acc, [re, to]) => acc.replace(re, to),
      (o.swaps || []).reduce((acc, [a, b]) => acc.split(a).join(b), s),
    );
  const lines = (el) => el.innerText.split("\n").filter((l) => l.trim()).length;
  // The biggest element that still holds only this text (so its icon goes too).
  const own = (el) => {
    const text = el.innerText.trim();
    while (el.parentElement && el.parentElement.innerText.trim() === text) el = el.parentElement;
    return el;
  };
  // A label and its value: the biggest element with at most two lines.
  const row = (el) => {
    while (el.parentElement && el.parentElement !== document.body && lines(el.parentElement) <= 2)
      el = el.parentElement;
    return el;
  };
  const hideEl = (el) => el && el.style.setProperty("display", "none", "important");
  const clean = (root) => {
    if (!root || root.nodeType !== 1) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const next = swap(n.nodeValue);
      if (next !== n.nodeValue) n.nodeValue = next;
      const el = n.parentElement;
      if (!el) continue;
      const t = n.nodeValue.trim();
      if (o.initials && o.initials[t] && el.children.length === 0) n.nodeValue = o.initials[t];
      if ((o.hide || []).some((h) => t.includes(h))) {
        const r = own(el);
        hideEl(r);
        // The allowance line sits under its progress bar: hide the bar too.
        const bar = r.previousElementSibling;
        if (bar && !bar.innerText.trim()) hideEl(bar);
      }
      if ((o.hideRows || []).includes(t)) hideEl(row(el));
      for (const [text, sel] of o.hideItems || []) {
        if (!t.includes(text)) continue;
        const item = el.closest(sel);
        hideEl(item);
        const group = item && item.parentElement;
        if (group && group !== document.body && lines(group) <= 1) hideEl(group);
      }
      if ((o.hideCards || []).some((h) => t === h)) {
        let card = el;
        while (card.parentElement && !card.querySelector('[aria-label="Dismiss notice"]')) card = card.parentElement;
        hideEl(card);
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
// Glide to a control and press it; returns where the pointer is.
async function tap(page, at, loc, ms = 700, settle = 200) {
  at = await glide(page, at, await centre(loc), ms);
  await page.waitForTimeout(settle);
  await page.mouse.down();
  await page.mouse.up();
  return at;
}

// Frame-by-frame capture from Chrome (CDP screencast).
async function startCapture(ctx, page) {
  const frames = [];
  const cdp = await ctx.newCDPSession(page);
  cdp.on("Page.screencastFrame", async (f) => {
    frames.push({ data: f.data, ts: f.metadata.timestamp });
    await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W * 2, maxHeight: H * 2 });
  const t0 = Date.now();
  return async () => {
    await cdp.send("Page.stopScreencast");
    return { frames, seconds: (Date.now() - t0) / 1000 };
  };
}

// The frames, at their own timing, into `<name>-<mode>.mp4` (2000 × 1250) and a
// poster of its first frame.
function assemble({ frames, seconds }, name, mode, out) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `demo-${name}-${mode}-`));
  const list = [];
  frames.forEach((f, i) => {
    const file = path.join(dir, `f${String(i).padStart(5, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, "base64"));
    const next = frames[i + 1] ? frames[i + 1].ts : frames[0].ts + seconds;
    list.push(`file '${file}'`, `duration ${Math.max(0.001, next - f.ts).toFixed(4)}`);
  });
  list.push(`file '${path.join(dir, `f${String(frames.length - 1).padStart(5, "0")}.jpg`)}'`);
  fs.writeFileSync(path.join(dir, "list.txt"), list.join("\n"));
  const mp4 = path.join(out, `${name}-${mode}.mp4`);
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    path.join(dir, "list.txt"),
    "-vf",
    "fps=30,scale=2000:1250:flags=lanczos,format=yuv420p",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "22",
    "-profile:v",
    "high",
    "-movflags",
    "+faststart",
    "-an",
    mp4,
  ]);
  const png = path.join(dir, "poster.png");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", mp4, "-frames:v", "1", png]);
  execFileSync("cwebp", ["-quiet", "-q", "82", png, "-o", path.join(out, `${name}-${mode}-poster.webp`)]);
  fs.rmSync(dir, { recursive: true, force: true });
  return mp4;
}

module.exports = { W, H, pageSetup, glide, dismissNotices, centre, tap, startCapture, assemble };
