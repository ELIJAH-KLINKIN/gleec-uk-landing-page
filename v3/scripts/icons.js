// Renders every raster logo from src/assets/logo-g.svg (Gleec Pay's G, from the
// brand's own file), so a new logo means one file and one run: npm run icons
//   public/favicon.ico (16 + 32), favicon-32.png, apple-touch-icon.png (180),
//   icon-192.png, icon-512.png — the red G on black, as the site's theme colour;
//   src/assets/logo-g-mask.png — the G in white on transparent, for the drawn
//   cards (white logo on a coloured card) and the metal card's mask.
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const svg = readFileSync(new URL("../src/assets/logo-g.svg", import.meta.url), "utf8");
const white = svg.replaceAll('fill="#E61E1E"', 'fill="#FFFFFF"');
const out = (path) => new URL(`../${path}`, import.meta.url).pathname;

const browser = await chromium.launch({ channel: process.env.CI ? undefined : "chrome" });

// A square icon: the G at 62% of the tile's height, centred on black.
async function icon(size) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<!doctype html><style>
    * { margin: 0 } body { width: ${size}px; height: ${size}px; display: grid; place-items: center; background: #000; }
    svg { height: 62%; width: auto; }
  </style>${svg}`);
  const png = await page.screenshot();
  await page.close();
  return png;
}

for (const [size, path] of [
  [32, "public/favicon-32.png"],
  [180, "public/apple-touch-icon.png"],
  [192, "public/icon-192.png"],
  [512, "public/icon-512.png"],
]) {
  writeFileSync(out(path), await icon(size));
}

// favicon.ico: PNG-compressed 16 and 32 px images (valid in every current browser).
const images = [await icon(16), await icon(32)];
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2); // icon
header.writeUInt16LE(images.length, 4);
let offset = 6 + 16 * images.length;
const entries = images.map((png, i) => {
  const size = i === 0 ? 16 : 32;
  const e = Buffer.alloc(16);
  e.writeUInt8(size, 0);
  e.writeUInt8(size, 1);
  e.writeUInt16LE(1, 4); // colour planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += png.length;
  return e;
});
writeFileSync(out("public/favicon.ico"), Buffer.concat([header, ...entries, ...images]));

// The white mask, 242 px wide like the one it replaces.
{
  const w = 242;
  const h = Math.round((w * 1169) / 899);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(`<!doctype html><style>
    * { margin: 0 } body { background: transparent; } svg { display: block; width: ${w}px; height: ${h}px; }
  </style>${white}`);
  writeFileSync(out("src/assets/logo-g-mask.png"), await page.screenshot({ omitBackground: true }));
  await page.close();
}

await browser.close();
console.log("wrote favicon.ico, favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png, logo-g-mask.png");
