import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import Root from "./Root.jsx";
import { LEGAL_PAGES } from "./legal/pages.js";

// Every URL the prerender step writes: the landing page plus each legal page.
export const routes = [{ path: "/" }, ...LEGAL_PAGES];

export function render(path = "/") {
  return renderToString(
    <StrictMode>
      <Root path={path} />
    </StrictMode>,
  );
}
