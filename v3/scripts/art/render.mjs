// render.mjs — renders the product-card art (scripts/art/*.html, three.js) in
// Chrome and writes WebP files to public/art/. Rendered at 2x and scaled down
// for clean edges. Run: node scripts/art/render.mjs [name]
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const tmp = join(root, "node_modules/.cache/art");
const outDir = join(root, "public/art");
mkdirSync(tmp, { recursive: true });
mkdirSync(outDir, { recursive: true });

// One entry per card. Size is the displayed box at 3x (336 × 240 CSS px).
const ART = {
  coins: {
    page: "coins.html",
    w: 1008,
    h: 720,
    variants: { light: { shadow: 0.2, exposure: 1 }, dark: { shadow: 0.5, exposure: 1.08 } },
  },
  ibans: {
    page: "ibans.html",
    w: 1008,
    h: 720,
    variants: { light: { shadow: 0.2, exposure: 1 }, dark: { shadow: 0.5, exposure: 1.08 } },
  },
};

const only = process.argv[2];
const browser = await chromium.launch({ channel: "chrome", args: ["--ignore-gpu-blocklist"] });
const page = await browser.newPage();
page.on("console", (m) => m.type() === "error" && console.error("page:", m.text()));
page.on("pageerror", (e) => console.error("page error:", e.message));
await page.route("http://art.local/**", (route) => {
  const path = new URL(route.request().url()).pathname;
  const file = path.startsWith("/three/")
    ? join(root, "node_modules", path)
    : join(root, "scripts/art", path);
  route.fulfill({ path: file });
});

for (const [name, art] of Object.entries(ART)) {
  if (only && only !== name) continue;
  const scale = 2;
  await page.setViewportSize({ width: art.w * scale, height: art.h * scale });
  await page.goto(`http://art.local/${art.page}?w=${art.w * scale}&h=${art.h * scale}`);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 60_000 });
  for (const [variant, opts] of Object.entries(art.variants)) {
    const url = await page.evaluate((o) => window.renderArt(o), opts);
    const big = join(tmp, `${name}-${variant}@2.png`);
    writeFileSync(big, Buffer.from(url.split(",")[1], "base64"));
    const png = join(tmp, `${name}-${variant}.png`);
    execFileSync("python3", ["-c", `from PIL import Image; Image.open(${JSON.stringify(big)}).resize((${art.w}, ${art.h}), Image.LANCZOS).save(${JSON.stringify(png)})`]);
    const webp = join(outDir, `${name}-${variant}.webp`);
    execFileSync("cwebp", ["-quiet", "-q", "88", "-alpha_q", "90", "-m", "6", png, "-o", webp]);
    console.log("wrote", webp.replace(root + "/", ""));
  }
}
await browser.close();
