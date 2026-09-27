import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative URLs everywhere, so one build works on the GitHub Pages sub-path
// (/gleec-uk-landing-page/) and on a root custom domain alike.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
  },
  experimental: {
    // Assets imported from JS (logo, card faces) are used as <img src>, which
    // resolves against the page URL. Emit a plain "./assets/…" string so the
    // prerendered HTML and the hydrated client produce identical markup.
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === "js") return `./${filename}`;
      return undefined;
    },
  },
});
