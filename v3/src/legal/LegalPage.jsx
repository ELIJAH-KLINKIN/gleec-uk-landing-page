// LegalPage.jsx — the frame every legal and regulatory page shares: the global
// nav (its links lead back to the landing page), a title block with the date
// of the last update, the page body, and the same footer as the landing page.
import Nav from "../components/Nav.jsx";
import Footer from "../components/Footer.jsx";
import { LEGAL_UPDATED } from "./pages.js";
import Regulatory from "./Regulatory.jsx";
import Safeguarding from "./Safeguarding.jsx";
import Privacy from "./Privacy.jsx";
import Cookies from "./Cookies.jsx";
import Terms from "./Terms.jsx";
import Complaints from "./Complaints.jsx";
import Contact from "./Contact.jsx";
import Accessibility from "./Accessibility.jsx";
import "./legal.css";

const BODIES = {
  regulatory: Regulatory,
  safeguarding: Safeguarding,
  privacy: Privacy,
  cookies: Cookies,
  terms: Terms,
  complaints: Complaints,
  contact: Contact,
  accessibility: Accessibility,
};

export default function LegalPage({ page }) {
  const Body = BODIES[page.id];
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to Content
      </a>
      <Nav home={false} />
      <main id="main" tabIndex={-1} className="legal">
        <article className="container legal-article">
          <header className="legal-head">
            <p className="eyebrow">{page.eyebrow}</p>
            <h1 className="legal-title">{page.title}</h1>
            <p className="legal-updated">Last updated {LEGAL_UPDATED}</p>
          </header>
          <Body />
        </article>
      </main>
      <Footer home={false} />
    </>
  );
}
