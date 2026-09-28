// Footer.jsx — legal notices first (as Apple places footnotes), then the
// site directory and the copyright line. Pages that don't exist yet are shown
// as plain text marked "Coming soon", never as dead links.
import { FOOTER } from "../content.js";
import "./Footer.css";

export default function Footer() {
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
                    {l.soon ? (
                      <span className="footer-soon">
                        {l.label} <span className="soon">Coming soon</span>
                      </span>
                    ) : (
                      <a href={l.href}>{l.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="footer-bottom">
          <p>{FOOTER.copyright}</p>
          <p>{FOOTER.locale}</p>
        </div>
      </div>
    </footer>
  );
}
