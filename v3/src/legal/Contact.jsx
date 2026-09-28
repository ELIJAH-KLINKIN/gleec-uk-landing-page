// Contact.jsx — how to reach Gleec Pay Ltd. Shows only routes that exist: the
// email line appears automatically once COMPANY.email is set.
import { COMPANY } from "../content.js";
import { Address, LegalSections } from "./parts.jsx";

const SECTIONS = [
  {
    id: "interest",
    title: "Register your interest",
    body: (
      <p>
        The quickest way to tell us about your business is to <a href="/#waitlist">join the waitlist</a>. You can add
        details about your company and payment needs, and our team will contact eligible businesses as onboarding opens.
      </p>
    ),
  },
  {
    id: "write",
    title: "Write to us",
    body: (
      <>
        {COMPANY.email ? (
          <p>
            Email <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>, or write to our registered office:
          </p>
        ) : (
          <p>Write to our registered office:</p>
        )}
        <Address />
        <p>
          For a complaint, see <a href="/complaints/">Complaints</a>. For a question about your personal data, see our{" "}
          <a href="/privacy/">Privacy policy</a>.
        </p>
      </>
    ),
  },
  {
    id: "company",
    title: "Company details",
    body: (
      <dl className="legal-dl">
        <dt>Registered name</dt>
        <dd>{COMPANY.name}</dd>
        <dt>Company number</dt>
        <dd>
          {COMPANY.number} (registered in {COMPANY.registeredIn})
        </dd>
        <dt>Registered office</dt>
        <dd>{COMPANY.office.join(", ")}</dd>
        {COMPANY.linkedin ? (
          <>
            <dt>LinkedIn</dt>
            <dd>
              <a href={COMPANY.linkedin} rel="noopener noreferrer" target="_blank">
                {COMPANY.brand} on LinkedIn
              </a>
            </dd>
          </>
        ) : null}
        <dt>Regulatory status</dt>
        <dd>
          Not currently authorised by the FCA. See <a href="/regulatory/">Regulatory information</a>.
        </dd>
      </dl>
    ),
  },
  {
    id: "safety",
    title: "Staying safe",
    body: (
      <p>
        We do not hold customer money and we will not ask you to send us money, share passwords or one-time codes, or
        move funds to a “safe account”. If someone claiming to be from {COMPANY.brand} asks you to, do not respond. See{" "}
        <a href="/regulatory/#fraud">how to protect yourself from fraud</a>.
      </p>
    ),
  },
];

export default function Contact() {
  return <LegalSections sections={SECTIONS} index={false} />;
}
