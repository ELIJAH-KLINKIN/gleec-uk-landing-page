// Build step: render every page to static HTML so it is fully readable before
// JavaScript runs (faster first paint, crawlable, works with JS disabled). The
// client bundle then hydrates it. The landing page is dist/index.html; each
// legal page is written to dist/<path>/index.html with its own <title>,
// description, canonical URL and Open Graph tags.
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

// Usage: node scripts/prerender.js [clientOutDir=dist] [ssrOutDir=dist-ssr]
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, process.argv[2] || "dist");
const ssrDir = path.join(root, process.argv[3] || "dist-ssr");

const { render, routes } = await import(pathToFileURL(path.join(ssrDir, "entry-server.js")).href);

const template = await readFile(path.join(dist, "index.html"), "utf8");
if (!template.includes("<!--app-html-->")) throw new Error("prerender: <!--app-html--> placeholder missing");

const canonical = template.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? "/";
const siteUrl = canonical.endsWith("/") ? canonical : `${canonical}/`;

const escapeAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const setAttr = (html, pattern, value) => {
  if (!pattern.test(html)) throw new Error(`prerender: tag not found: ${pattern}`);
  return html.replace(pattern, (_, open, close) => `${open}${escapeAttr(value)}${close}`);
};

// The landing page keeps the head written in index.html; legal pages get theirs here.
function headFor(html, page) {
  const url = siteUrl + page.path.slice(1);
  const title = `${page.title} — Gleec Business`;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttr(title)}</title>`);
  html = setAttr(html, /(<meta\s+name="description"\s+content=")[^"]*(")/, page.description);
  html = setAttr(html, /(<link rel="canonical" href=")[^"]*(")/, url);
  html = setAttr(html, /(<meta\s+property="og:url"\s+content=")[^"]*(")/, url);
  html = setAttr(html, /(<meta\s+property="og:title"\s+content=")[^"]*(")/, title);
  html = setAttr(html, /(<meta\s+property="og:description"\s+content=")[^"]*(")/, page.description);
  return html;
}

for (const route of routes) {
  let html = template.replace("<!--app-html-->", render(route.path));
  if (route.path !== "/") html = headFor(html, route);
  const dir = path.join(dist, route.path);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, "index.html");
  await writeFile(file, html);
  console.log(`prerender: wrote ${(html.length / 1024).toFixed(1)} KB ${path.relative(root, file)}`);
}

await rm(ssrDir, { recursive: true, force: true });
