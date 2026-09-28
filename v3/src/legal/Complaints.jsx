// Complaints.jsx — complaints procedure (DISP 1.2 summary) and Financial
// Ombudsman Service information. Honest about the pre-authorisation stage.
import { COMPANY } from "../content.js";
import { Address, LegalSections, WriteToUs } from "./parts.jsx";

const SUMMARY = (
  <ul>
    <li>Tell us what went wrong. It is free, and we will acknowledge your complaint promptly.</li>
    <li>
      We aim to resolve complaints about payment services and e-money within 15 business days (35 in exceptional cases),
      and all other complaints within 8 weeks.
    </li>
    <li>
      If you are not satisfied, eligible customers can refer the complaint to the Financial Ombudsman Service, free of
      charge.
    </li>
  </ul>
);

const SECTIONS = [
  {
    id: "now",
    title: "While we are not yet authorised",
    body: (
      <>
        <p>
          {COMPANY.name} is not yet authorised by the FCA and does not provide regulated services. You can still
          complain to us about this website, our waitlist or how we have treated you, and we will handle your complaint
          in the way described on this page.
        </p>
        <p>
          The Financial Ombudsman Service may not be able to consider complaints about activities that are not
          regulated. For complaints about your personal data, see the <a href="/privacy/#complain">Privacy policy</a>.
        </p>
      </>
    ),
  },
  {
    id: "how",
    title: "How to complain",
    body: (
      <>
        <p>
          You can complain by any reasonable means. For now, <WriteToUs subject="Complaint" />:
        </p>
        <Address />
        <p>
          Once our service is live, customers will also be able to complain in the app or through our support chat. To
          help us look into it quickly, please tell us:
        </p>
        <ul>
          <li>your name, and your business’s name if relevant;</li>
          <li>what happened, and when;</li>
          <li>what you would like us to do to put things right;</li>
          <li>the best way to contact you, and any support you need from us.</li>
        </ul>
      </>
    ),
  },
  {
    id: "next",
    title: "What happens next",
    body: (
      <ol>
        <li>
          <strong>We acknowledge it.</strong> We will confirm that we have received your complaint promptly, normally
          within three business days, and tell you who is handling it.
        </li>
        <li>
          <strong>We investigate fairly.</strong> Someone who was not involved in what went wrong will look into it,
          with the authority to put things right.
        </li>
        <li>
          <strong>We respond in writing.</strong> For complaints about payment services or e-money, we will send our
          final response within 15 business days. If, in exceptional circumstances beyond our control, we need longer,
          we will write to explain why and send our final response within 35 business days. For other complaints, we
          will send our final response within 8 weeks.
        </li>
      </ol>
    ),
  },
  {
    id: "ombudsman",
    title: "The Financial Ombudsman Service",
    body: (
      <>
        <p>
          If you are not happy with our final response, or we have not sent one within the time limits above, you may be
          able to refer your complaint to the Financial Ombudsman Service. It is free and independent. You normally need
          to contact it within six months of the date of our final response.
        </p>
        <p>
          The ombudsman can consider complaints from consumers, micro-enterprises, small businesses, charities and
          trusts that meet its eligibility rules; larger businesses may not be eligible. Our final response will tell
          you whether you can refer your complaint.
        </p>
        <dl className="legal-dl">
          <dt>Website</dt>
          <dd>
            <a href="https://www.financial-ombudsman.org.uk/">financial-ombudsman.org.uk</a>
          </dd>
          <dt>Telephone</dt>
          <dd>0800 023 4567</dd>
          <dt>Post</dt>
          <dd>Financial Ombudsman Service, Exchange Tower, London E14 9SR</dd>
        </dl>
      </>
    ),
  },
  {
    id: "support",
    title: "Extra support",
    body: (
      <p>
        If you need us to adjust how we communicate, for example because of a disability, illness or difficult
        circumstances, tell us and we will do what we reasonably can. Someone else, such as a relative or adviser, can
        complain on your behalf with your permission.
      </p>
    ),
  },
  {
    id: "learning",
    title: "How we learn from complaints",
    body: (
      <p>
        We record every complaint, look for the root cause, and fix problems so they do not happen again. Our senior
        management and Board regularly review what customers tell us through complaints.
      </p>
    ),
  },
];

export default function Complaints() {
  return <LegalSections summary={SUMMARY} sections={SECTIONS} />;
}
