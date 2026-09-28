// Root.jsx — picks what to render for a URL: a legal page or the landing page.
import App from "./App.jsx";
import LegalPage from "./legal/LegalPage.jsx";
import { findLegalPage } from "./legal/pages.js";

export default function Root({ path }) {
  const page = findLegalPage(path);
  return page ? <LegalPage page={page} /> : <App />;
}
