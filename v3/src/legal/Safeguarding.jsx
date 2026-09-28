// Safeguarding.jsx — "How your money will be protected". Explains, in plain
// English and in the future tense (pre-authorisation), how relevant funds will be
// safeguarded, what happens on insolvency, and what safeguarding does not cover.
import { COMPANY } from "../content.js";
import { Address, LegalSections, WriteToUs } from "./parts.jsx";

const SUMMARY = (
  <ul>
    <li>We are not authorised yet and do not hold any customer money. Please do not send us money.</li>
    <li>
      If we are authorised, the money your business pays in will be kept separate from our own money, in safeguarding
      accounts at authorised banks. It will never be used to run our business or lent to anyone.
    </li>
    <li>We will check it against our records every business day.</li>
    <li>
      If {COMPANY.name} ever failed, customers would be paid from the safeguarded money before other creditors, although
      the costs of returning it could be deducted and it could take time.
    </li>
    <li>E-money is not a bank deposit, is not covered by the FSCS, and does not earn interest.</li>
  </ul>
);

const SECTIONS = [
  {
    id: "now",
    title: "Before we are authorised",
    body: (
      <div className="legal-note">
        <p>
          {COMPANY.name} is not yet authorised by the FCA. We do not open accounts or hold customer money, and we will
          not ask you to send us any. This page explains how we will protect customers’ money if we are authorised.
        </p>
      </div>
    ),
  },
  {
    id: "what",
    title: "What safeguarding means",
    body: (
      <>
        <p>
          When your business pays money into an e-money account, it receives e-money of the same value. The law requires
          the e-money institution to protect the money it received, known as “relevant funds”, by keeping it separate
          from its own money. This is called safeguarding.
        </p>
        <p>
          Safeguarding is set out in the Electronic Money Regulations 2011 and the FCA’s rules, including the stronger
          safeguarding requirements that apply to payment and e-money firms from 7 May 2026. Its purpose is to make sure
          customers’ money can be returned to them if the firm fails.
        </p>
      </>
    ),
  },
  {
    id: "how",
    title: "How we will safeguard your money",
    body: (
      <>
        <p>If we are authorised, we will use the segregation method:</p>
        <ul>
          <li>
            By the end of the business day after we receive it, your money will be held in one or more dedicated
            safeguarding accounts, in our name but separate from our own money, at authorised banks. Each bank must
            confirm that the money belongs to our customers and that it has no claim over it.
          </li>
          <li>
            We will not use safeguarded money to pay our costs. It will not be lent, invested, pledged or used as
            security, and it will not be mixed with our own money.
          </li>
          <li>
            Customer money will stay with {COMPANY.name}. It will not be held by, or passed to, any other Gleec company.
          </li>
          <li>
            Each currency and payment route will open only when its safeguarding arrangements are in place and tested.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "checks",
    title: "Checks and oversight",
    body: (
      <ul>
        <li>
          <strong>Every business day</strong>, we will reconcile the money in our safeguarding accounts against what we
          owe customers, and fix any difference straight away.
        </li>
        <li>
          <strong>Every month</strong>, we will report our safeguarding position to the FCA.
        </li>
        <li>
          <strong>Every year</strong>, where the rules require it, an independent auditor will review our safeguarding
          arrangements.
        </li>
        <li>
          We will keep a <strong>resolution pack</strong>: up-to-date records that would let an insolvency practitioner
          identify every customer’s money and return it quickly.
        </li>
        <li>
          Our Board will oversee safeguarding, supported by our compliance function and a written safeguarding policy.
        </li>
      </ul>
    ),
  },
  {
    id: "failure",
    title: "If Gleec Pay Ltd failed",
    body: (
      <>
        <p>
          If {COMPANY.name} became insolvent, an insolvency practitioner would take control of the safeguarded money.
          This would usually happen under the special administration regime for payment and e-money institutions. That
          money would be used to pay customers’ claims before the claims of any other creditor.
        </p>
        <p>You should know that:</p>
        <ul>
          <li>the insolvency practitioner’s costs of distributing the safeguarded money may be deducted from it;</li>
          <li>returning money can take time, and you may not have access to it while this happens;</li>
          <li>if there were a shortfall in the safeguarded money, customers could receive less than they are owed.</li>
        </ul>
      </>
    ),
  },
  {
    id: "limits",
    title: "What safeguarding does not cover",
    body: (
      <ul>
        <li>
          <strong>It is not deposit protection.</strong> E-money is not a bank deposit, and the Financial Services
          Compensation Scheme (FSCS) does not cover you if {COMPANY.name} fails.
        </li>
        <li>
          <strong>No interest.</strong> E-money institutions are not allowed to pay interest on the money you hold with
          them.
        </li>
        <li>
          <strong>Payments you have made.</strong> Once a payment has left your account, that money is no longer held by
          us.
        </li>
        <li>
          <strong>Scams and fraud.</strong> Safeguarding protects against our failure. It does not protect against
          losses if you are tricked into sending a payment. Separate rules may entitle some customers to reimbursement
          in those cases.
        </li>
      </ul>
    ),
  },
  {
    id: "questions",
    title: "Questions",
    body: (
      <>
        <p>
          If you have questions about safeguarding, <WriteToUs subject="Safeguarding" />:
        </p>
        <Address />
      </>
    ),
  },
];

export default function Safeguarding() {
  return <LegalSections summary={SUMMARY} sections={SECTIONS} />;
}
