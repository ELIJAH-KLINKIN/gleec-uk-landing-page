import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/base.css";
import Root from "./Root.jsx";

const root = document.getElementById("root");
const app = (
  <StrictMode>
    <Root path={window.location.pathname} />
  </StrictMode>
);

// Production HTML is prerendered (scripts/prerender.js), so hydrate it; the
// dev server serves an empty #root, so render from scratch.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
