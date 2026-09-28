// Footer.jsx — legal notices first (as Apple places footnotes), then the
// site directory and the copyright line. Section links ("#faq") stay on the
// landing page; on the legal pages (home={false}) they lead back to it.
import { COMPANY, FOOTER } from "../content.js";
import "./Footer.css";

export default function Footer({ home = true }) {
  const to = (href) => (!home && href.startsWith("#") ? `/${href}` : href);
  return (
    <footer className="footer">
      <div className="container-wide">
        <section id="legal" className="footer-legal" aria-label="Regulatory information">
          {FOOTER.legal.map((p) => (
            <p key={p.slice(0, 32)}>{p}</p>
          ))}
        </section>

        <nav className="footer-directory" aria-label="Footer">
          {FOOTER.columns.map((col) => (
            <div key={col.title}>
              <h2 className="footer-col-title">{col.title}</h2>
              <ul>
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={to(l.href)}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="footer-bottom">
          <p>{FOOTER.copyright}</p>
          <div className="footer-meta">
            {COMPANY.linkedin ? (
              <a className="footer-social" href={COMPANY.linkedin} rel="noopener noreferrer" target="_blank">
                <LinkedInMark />
                LinkedIn
              </a>
            ) : (
              <span className="footer-social" title="LinkedIn page coming soon">
                <LinkedInMark />
                LinkedIn <span className="soon">Soon</span>
              </span>
            )}
            <p>{FOOTER.locale}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

// LinkedIn's "in" mark (Simple Icons path), drawn in the text colour.
function LinkedInMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
