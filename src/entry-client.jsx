import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./App.jsx";

const root = document.getElementById("root");
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Production HTML is prerendered at build time (scripts/prerender.js), so we
// hydrate it; the dev server serves an empty #root, so we render from scratch.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
