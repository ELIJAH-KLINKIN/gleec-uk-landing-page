// SectionHeader.jsx — eyebrow → title → lead, centred. The title is the
// section's h2 and labels the section (pass the same id to aria-labelledby).
export default function SectionHeader({ id, eyebrow, title, lead, children }) {
  return (
    <header className="section-head">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className="title-1" id={id}>
        {title}
      </h2>
      {lead ? <p className="lead">{lead}</p> : null}
      {children}
    </header>
  );
}
