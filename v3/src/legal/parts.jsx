// parts.jsx — building blocks shared by the legal pages.
import { COMPANY } from "../content.js";

// An "In short" summary, an on-this-page index (for longer pages) and the
// numbered sections themselves. Each section is { id, title, body }.
export function LegalSections({ summary, sections, index = sections.length > 3 }) {
  return (
    <>
      {summary ? (
        <aside className="legal-summary" aria-labelledby="legal-summary-title">
          <h2 id="legal-summary-title">In short</h2>
          {summary}
        </aside>
      ) : null}
      {index ? (
        <nav className="legal-toc" aria-labelledby="legal-toc-title">
          <h2 id="legal-toc-title">On this page</h2>
          <ol>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      {sections.map((s) => (
        <section key={s.id} id={s.id} className="legal-section" aria-labelledby={`${s.id}-title`}>
          <h2 id={`${s.id}-title`}>{s.title}</h2>
          {s.body}
        </section>
      ))}
    </>
  );
}

// Registered office, one line per row.
export function Address() {
  return (
    <address className="legal-address">
      {COMPANY.name}
      {COMPANY.office.map((line) => (
        <span key={line}>
          <br />
          {line}
        </span>
      ))}
    </address>
  );
}

// The email route when a mailbox exists; otherwise the postal route.
export function WriteToUs({ subject }) {
  if (COMPANY.email) {
    const href = `mailto:${COMPANY.email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
    return (
      <>
        email <a href={href}>{COMPANY.email}</a> or write to us at the address below
      </>
    );
  }
  return <>write to us at the address below</>;
}

// A simple data table. On phones each row becomes a stacked block, with the
// column name shown above each value, so nothing scrolls sideways.
export function LegalTable({ caption, head, rows }) {
  return (
    <div className="legal-table-wrap">
      <table className="legal-table">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              {r.map((c, i) =>
                i === 0 ? (
                  <th key={i} scope="row">
                    {c}
                  </th>
                ) : (
                  <td key={i} data-label={head[i]}>
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
