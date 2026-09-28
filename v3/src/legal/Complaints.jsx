// Complaints.jsx — complaints procedure (DISP 1.2 summary) and Financial
// Ombudsman Service information. Honest about the pre-authorisation stage.
// Sources: DISP 1.5 (summary resolution), 1.6.2R / 1.6.2AR (8 weeks; 15/35
// business days for PSD/EMD complaints), 2.7.3R (eligible complainants), 2.8.2R
// (time limits); FOS contact page.
import { COMPANY } from "../content.js";
import { Address, LegalSections, WriteToUs } from "./parts.jsx";

const SUMMARY = (
  <ul>
    <li>Tell us what went wrong. Complaining is free, and you don’t need to use any special wording.</li>
    <li>
      Once we are authorised, we will answer complaints about payment services and e-money within 15 business days (35
      in exceptional cases) and other complaints within 8 weeks.
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
          The Financial Ombudsman Service can only consider complaints about firms and activities within its
          jurisdiction, so it may not be able to look at complaints about the period before we are authorised. For
          complaints about your personal data, see the <a href="/privacy/#complain">Privacy policy</a>.
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
          You can complain by any reasonable means, and you don’t need to use the word “complaint”. For now,{" "}
          <WriteToUs subject="Complaint" />:
        </p>
        <Address />
        <p>
          Once our service is live, customers will also be able to complain in the app and through our support chat. To
          help us look into it quickly, please tell us:
        </p>
        <ul>
          <li>your name, and your business’s name if relevant;</li>
          <li>what happened, and when;</li>
          <li>what you would like us to do to put things right;</li>
          <li>the best way to contact you, and any support you need from us.</li>
        </ul>
        <p>Someone else, such as a colleague, relative or adviser, can complain on your behalf with your permission.</p>
      </>
    ),
  },
  {
    id: "next",
    title: "What happens next",
    body: (
      <>
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
            <strong>We respond in writing.</strong> If we resolve your complaint by the end of the third business day
            after we receive it, we will confirm this in writing. Otherwise:
            <ul>
              <li>
                for complaints about payment services or e-money, we will send our final response within 15 business
                days. If, in exceptional circumstances beyond our control, we need longer, we will write by then to
                explain why and send our final response within 35 business days;
              </li>
              <li>for other complaints, we will send our final response within 8 weeks.</li>
            </ul>
          </li>
        </ol>
        <p>
          Our final response will explain what we found, whether we uphold your complaint, what we will do to put things
          right, and your right to refer the complaint to the Financial Ombudsman Service. There is no further internal
          stage after our final response.
        </p>
      </>
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
          to contact it within six months of the date of our final response. The complaint must also normally be made
          within six years of the event, or within three years of when you knew, or should reasonably have known, about
          the problem, if that is later.
        </p>
        <p>You may be able to use the ombudsman if you are:</p>
        <ul>
          <li>a consumer;</li>
          <li>
            a micro-enterprise: fewer than 10 employees and annual turnover or balance sheet of no more than €2 million;
          </li>
          <li>
            a small business: annual turnover under £6.5 million, and either fewer than 50 employees or a balance sheet
            under £5 million;
          </li>
          <li>
            a charity with annual income under £6.5 million, or a trustee of a trust with net assets under £5 million.
          </li>
        </ul>
        <p>
          Larger businesses are not normally eligible. Our final response will tell you whether you can refer your
          complaint.
        </p>
        <dl className="legal-dl">
          <dt>Website</dt>
          <dd>
            <a href="https://www.financial-ombudsman.org.uk/">financial-ombudsman.org.uk</a>
          </dd>
          <dt>Telephone</dt>
          <dd>0800 023 4567 (free), 0300 123 9 123, or +44 20 7964 0500 from abroad; Monday to Friday, 8am to 5pm</dd>
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
        circumstances, tell us and we will do what we reasonably can. We can provide information in other formats, such
        as large print, on request.
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
