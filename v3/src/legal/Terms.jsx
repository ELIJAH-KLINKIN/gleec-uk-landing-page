// Terms.jsx — website terms of use (the site, not a customer account).
import { COMPANY } from "../content.js";
import { Address, LegalSections, WriteToUs } from "./parts.jsx";

const SECTIONS = [
  {
    id: "about",
    title: "About these terms",
    body: (
      <>
        <p>
          These terms apply to your use of this website, which is operated by {COMPANY.name} (“we”, “us”), a company
          registered in {COMPANY.registeredIn} with company number {COMPANY.number}.
        </p>
        <p>
          By using the website you agree to these terms. If you do not agree, please do not use it. These terms cover
          the website only. If we open an account for your business in the future, that relationship will be governed by
          separate customer terms, which we will give you before you apply.
        </p>
      </>
    ),
  },
  {
    id: "status",
    title: "Our regulatory status",
    body: (
      <>
        <p>
          {COMPANY.name} has applied to the Financial Conduct Authority (FCA) for authorisation as an Authorised
          Electronic Money Institution. Authorisation has not yet been granted: it is not currently authorised by the
          FCA and does not currently provide regulated e-money or payment services. See{" "}
          <a href="/regulatory/">Regulatory information</a>.
        </p>
        <p>
          Nothing on this website is an offer, invitation or recommendation to open an account or to use any regulated
          service. Any future service will be available only if we are authorised, and then only to businesses that meet
          our eligibility criteria and complete our onboarding checks.
        </p>
      </>
    ),
  },
  {
    id: "information",
    title: "Information, not advice",
    body: (
      <>
        <p>
          The website gives general information about the service we are planning. It is not financial, legal, tax or
          investment advice, and it does not take your circumstances into account. Please take your own professional
          advice before making decisions.
        </p>
        <p>
          We work to keep the website accurate and up to date, but plans can change as we complete the authorisation
          process and agree arrangements with our partners. Features, currencies, payment routes, timings, fees and
          pricing described here are indicative and may change before launch.
        </p>
      </>
    ),
  },
  {
    id: "illustrations",
    title: "Illustrations and examples",
    body: (
      <p>
        Product screens, balances, account details, transactions, fees and timings shown on the website are
        illustrations of the planned service. Example account numbers, sort codes, IBANs, BICs, names and addresses are
        fictional and must not be used to make payments. Third-party names and logos appear only to illustrate how the
        product may look; they do not mean those businesses use, endorse or partner with us.
      </p>
    ),
  },
  {
    id: "waitlist",
    title: "Registering interest",
    body: (
      <>
        <p>Joining the waitlist lets us tell you when the service becomes available. It:</p>
        <ul>
          <li>is not an application for an account or any regulated service;</li>
          <li>does not create a contract between us or oblige either of us to enter into one;</li>
          <li>does not guarantee that we will offer your business an account.</li>
        </ul>
        <p>
          Please give accurate details and use a work email address you are entitled to use. We use the information as
          described in our <a href="/privacy/">Privacy policy</a>.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "Using the website",
    body: (
      <>
        <p>You may use the website for lawful purposes only. You must not:</p>
        <ul>
          <li>try to gain unauthorised access to the website, its servers or any connected system or database;</li>
          <li>introduce viruses or other harmful material, or overload or disrupt the website;</li>
          <li>
            submit false, misleading or automated registrations, or register on someone else’s behalf without their
            permission;
          </li>
          <li>copy, scrape or reuse the website’s content for commercial purposes without our written permission;</li>
          <li>present yourself as connected with us, or use our name or brand in a way that could mislead others.</li>
        </ul>
        <p>
          We may suspend access to the website, or remove registrations, if we reasonably believe these terms are being
          broken.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    title: "Intellectual property",
    body: (
      <p>
        The website, including its text, design, graphics and software, belongs to us or our licensors. You may view it,
        and print or save pages, to evaluate our planned service for your business. Any other use needs our written
        permission. Other businesses’ names and trade marks belong to their owners.
      </p>
    ),
  },
  {
    id: "links",
    title: "Links to other websites",
    body: (
      <p>
        Where the website links to other sites, such as the FCA or the Financial Ombudsman Service, those links are for
        information only. We are not responsible for the content, availability or privacy practices of other websites.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Availability and changes",
    body: (
      <p>
        The website is provided free of charge. We do not guarantee that it will always be available or free from
        errors, and we may change, suspend or withdraw any part of it at any time. We may update these terms; the date
        at the top of this page shows when they last changed.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Our liability",
    body: (
      <>
        <p>
          Nothing in these terms limits or excludes our liability for death or personal injury caused by our negligence,
          for fraud or fraudulent misrepresentation, or for anything else that cannot be limited or excluded by law.
        </p>
        <p>
          Subject to that, we are not liable for any loss arising from your use of, or reliance on, the website or its
          content. If you use the website for business purposes, we are not liable for loss of profits, revenue,
          business, opportunity or goodwill, or for any indirect or consequential loss. If you are a consumer, these
          terms do not affect your statutory rights.
        </p>
      </>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    body: (
      <p>
        These terms are governed by the laws of England and Wales, and the courts of England and Wales have
        jurisdiction. If you are a consumer living in Scotland or Northern Ireland, you may also bring proceedings in
        your local courts.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <>
        <p>
          For questions about these terms, <WriteToUs subject="Website terms" />:
        </p>
        <Address />
      </>
    ),
  },
];

export default function Terms() {
  return <LegalSections sections={SECTIONS} />;
}
