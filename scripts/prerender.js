// Build step: render the React app to static HTML and inline it into
// dist/index.html, so the page is fully readable before JavaScript runs
// (faster first paint, crawlable, works with JS disabled). The client bundle
// then hydrates it. Also preloads the two fonts used above the fold.
import { readFile, writeFile, readdir, rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

// Usage: node scripts/prerender.js [clientOutDir=dist] [ssrOutDir=dist-ssr]
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, process.argv[2] || "dist");
const ssrDir = path.join(root, process.argv[3] || "dist-ssr");

const { render } = await import(pathToFileURL(path.join(ssrDir, "entry-server.js")).href);
const appHtml = render();

const template = await readFile(path.join(dist, "index.html"), "utf8");
if (!template.includes("<!--app-html-->")) throw new Error("prerender: <!--app-html--> placeholder missing");

const assets = await readdir(path.join(dist, "assets"));
const preloadFonts = ["inter-latin-", "poppins-400-latin-"]
  .map((prefix) => assets.find((f) => f.startsWith(prefix) && !f.includes("-ext-") && f.endsWith(".woff2")))
  .filter(Boolean)
  .map((f) => `<link rel="preload" href="./assets/${f}" as="font" type="font/woff2" crossorigin>`)
  .join("\n    ");

const html = template.replace("<!--app-html-->", appHtml).replace("</title>", `</title>\n    ${preloadFonts}`);

await writeFile(path.join(dist, "index.html"), html);
await rm(ssrDir, { recursive: true, force: true });
console.log(`prerender: wrote ${(html.length / 1024).toFixed(1)} KB ${path.relative(root, dist)}/index.html`);
