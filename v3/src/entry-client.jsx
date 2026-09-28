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

// Section anchors match the menu labels. Old shared links keep working:
// /#highlights → /#product, /#plans → /#pricing, /#top → the plain address.
const RENAMED = { "#highlights": "#product", "#plans": "#pricing", "#top": "" };
const followRenamed = () => {
  if (!Object.hasOwn(RENAMED, window.location.hash)) return;
  const next = RENAMED[window.location.hash];
  window.history.replaceState(null, "", window.location.pathname + window.location.search + next);
  if (next) document.querySelector(next)?.scrollIntoView();
  else window.scrollTo({ top: 0 });
};
followRenamed();
window.addEventListener("hashchange", followRenamed);

// Turn on smooth scrolling once the initial jump to any #section has happened.
const enableSmoothScroll = () => requestAnimationFrame(() => document.documentElement.classList.add("smooth-scroll"));
if (document.readyState === "complete") enableSmoothScroll();
else window.addEventListener("load", enableSmoothScroll, { once: true });
