import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from a domain root (Vercel now, gleecpay.co.uk at launch), so assets
// use absolute "/assets/…" URLs. That keeps nested pages (/privacy/, …) and the
// prerendered HTML pointing at the same files as the hydrated client.
export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
  },
});
