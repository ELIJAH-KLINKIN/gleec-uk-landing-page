// Safeguarding.jsx — "How your money will be protected". Explains, in plain
// English and in the future tense (pre-authorisation), how relevant funds will be
// safeguarded, what happens on insolvency, and what safeguarding does not cover.
// Sources: EMRs 2011 regs 20–24 and 45, FCA CASS 15 / CASS 10A / SUP 3A / SUP 16
// (PS25/12, in force 7 May 2026), Payment and Electronic Money Institution
// Insolvency Regulations 2021 regs 12, 18–19, FSCS guidance on e-money.
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
      If {COMPANY.name} ever failed, customers would be paid from the safeguarded money before other creditors. The
      costs of returning it would be taken first, and it could take time.
    </li>
    <li>We are not a bank. E-money is not covered by the FSCS and does not earn interest.</li>
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
          safeguarding rules for payment and e-money firms that apply from 7 May 2026. Its purpose is to make sure
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
            From the moment we receive your money, it will be kept separate from our own money and recorded against your
            business. If we still hold it at the end of the next business day, it will be in a dedicated safeguarding
            account, in our name but separate from our own accounts, at an authorised bank.
          </li>
          <li>
            Each bank we use must confirm in writing that the money belongs to our customers and that it has no claim
            over it. We will name our safeguarding banks on this page once our agreements are in place.
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
        <h3>When protection starts and ends</h3>
        <p>
          Safeguarding starts when we receive money for your account. It continues while that money is held as e-money
          in your account, and ends when the money is paid out, either to someone you have paid or back to you.
        </p>
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
          <strong>Every year</strong>, where the rules require it, a qualified independent auditor will review our
          safeguarding arrangements and report to the FCA.
        </li>
        <li>
          We will keep a <strong>resolution pack</strong>: up-to-date records that an insolvency practitioner could
          retrieve within 48 hours, so every customer’s money can be identified and returned as quickly as possible.
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
          If {COMPANY.name} became insolvent, an insolvency practitioner would take control of the safeguarded money,
          usually under the special administration regime for payment and e-money institutions. Their first objective
          would be to return customers’ money as soon as reasonably practicable. Customers’ claims would be paid from
          the safeguarded money before the claims of any other creditor.
        </p>
        <p>You should know that:</p>
        <ul>
          <li>
            the costs of distributing the safeguarded money are paid from it first, so you may receive less than your
            full balance;
          </li>
          <li>returning money can take time, and you may not be able to use it while this happens;</li>
          <li>
            if there were a shortfall, it would be shared between customers in proportion to their balances, and you
            could claim the rest as an ordinary creditor.
          </li>
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
          <strong>It is not deposit protection.</strong> We are not a bank, and e-money is not a bank deposit. The
          Financial Services Compensation Scheme (FSCS) does not cover you if {COMPANY.name} fails. If a bank holding
          our safeguarded money failed, the FSCS may be able to compensate eligible customers, subject to its rules and
          limits. See the FSCS’s guidance on{" "}
          <a href="https://www.fscs.org.uk/news/protection/e-money-and-fscs-protection/">e-money and FSCS protection</a>
          .
        </li>
        <li>
          <strong>No interest.</strong> We will not pay interest, or any other benefit based on how long you hold
          e-money with us. The law does not allow it.
        </li>
        <li>
          <strong>Payments you have made.</strong> Once a payment has left your account, that money is no longer held by
          us.
        </li>
        <li>
          <strong>Scams and fraud.</strong> Safeguarding protects against our failure. It does not protect against
          losses if you are tricked into sending a payment. Separate rules may entitle some customers to reimbursement
          in those cases. See <a href="/regulatory/#fraud">how to protect yourself from fraud</a>.
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
