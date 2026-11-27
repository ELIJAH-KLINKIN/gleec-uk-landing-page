// Regulatory.jsx — regulatory status, what e-money is and isn't, the fiat-only
// scope, separation from other Gleec companies, and fraud awareness. Written for
// the pre-authorisation stage; update the status section on submission day and
// again, with the FRN, on authorisation.
import { COMPANY } from "../content.js";
import { Address, LegalSections, WriteToUs } from "./parts.jsx";

const SUMMARY = (
  <ul>
    <li>
      {COMPANY.name} is <strong>not yet authorised</strong> by the FCA. It has applied for authorisation as an
      Authorised Electronic Money Institution.
    </li>
    <li>We do not open accounts, hold customer money or provide payment services yet.</li>
    <li>
      An e-money account is not a bank account. The money in it is not covered by the Financial Services Compensation
      Scheme (FSCS). If we are authorised, it will be protected by <a href="/safeguarding/">safeguarding</a> instead.
    </li>
    <li>Our planned services are fiat-only: we will not provide cryptoasset services.</li>
    <li>Other Gleec-branded companies are separate businesses and are not covered by our application.</li>
  </ul>
);

const SECTIONS = [
  {
    id: "who",
    title: "Who we are",
    body: (
      <>
        <p>
          {COMPANY.name} is a private limited company registered in {COMPANY.registeredIn} with company number{" "}
          {COMPANY.number}. Our registered office is:
        </p>
        <Address />
        <p>
          You can check our company details on the{" "}
          <a href={`https://find-and-update.company-information.service.gov.uk/company/${COMPANY.number}`}>
            Companies House register
          </a>
          .
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
          Electronic Money Institution under the Electronic Money Regulations 2011. If authorised, we will issue
          electronic money and provide payment services connected to it.
        </p>
        <div className="legal-note">
          <p>
            {COMPANY.name} is not currently authorised by the FCA. It does not currently issue e-money, provide payment
            services, open accounts or accept money from customers.
          </p>
        </div>
        <p>
          Joining our waitlist is not an application for an account or any regulated service. If we are authorised, this
          page will show our FCA Firm Reference Number (FRN), and you will be able to check our entry on the{" "}
          <a href="https://register.fca.org.uk/s/">FCA Register</a>.
        </p>
      </>
    ),
  },
  {
    id: "emoney",
    title: "What an e-money account is, and isn’t",
    body: (
      <>
        <p>
          Electronic money (e-money) is a digital store of value. An e-money institution issues it in exchange for the
          money you pay in, at the same value (at par), and you can use it to make payments or ask for it back (“redeem”
          it) at par.
        </p>
        <ul>
          <li>
            <strong>It is not a bank account.</strong> E-money institutions are not banks, and e-money is not a bank
            deposit.
          </li>
          <li>
            <strong>The FSCS does not cover it.</strong> Instead, the law requires the money you pay in to be
            safeguarded, which means kept separate from the firm’s own money. Read{" "}
            <a href="/safeguarding/">how your money will be protected</a>.
          </li>
          <li>
            <strong>No interest.</strong> E-money institutions are not allowed to pay interest, or give any other
            benefit, based on how long you hold e-money.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "scope",
    title: "What we plan to do, and what we won’t do",
    body: (
      <>
        <p>If authorised, we plan to provide approved business customers with:</p>
        <ul>
          <li>e-money accounts in GBP, EUR and USD;</li>
          <li>payments into and out of those accounts, through authorised banking and payment partners;</li>
          <li>currency conversion between those currencies, as part of making payments.</li>
        </ul>
        <p>
          Each currency, payment route and feature will launch only when the related arrangements are ready and
          approved.
        </p>
        <p>We will not provide:</p>
        <ul>
          <li>cryptoasset exchange, custody, brokerage, dealing, settlement or stablecoin issuance;</li>
          <li>investments, lending, overdrafts or other credit;</li>
          <li>payment initiation or account information services.</li>
        </ul>
        <p>
          Payment cards are not part of our initial service. Any future card programme would be launched separately,
          once it has been approved.
        </p>
      </>
    ),
  },
  {
    id: "group",
    title: "Other Gleec companies",
    body: (
      <>
        <p>
          {COMPANY.name} is part of a wider group of companies under common ownership, some of which use the Gleec name.
          Only {COMPANY.name} would provide the services described on this website.
        </p>
        <p>
          Other Gleec-branded companies, including those offering digital-asset services, are separate legal entities.
          Their products are not offered by {COMPANY.name}, and they are not covered by our application to the FCA or,
          if it is granted, our authorisation. Customer money would be safeguarded by {COMPANY.name} and never held by
          another Gleec company. Other group companies cannot approve customers or make decisions about accounts on our
          behalf.
        </p>
      </>
    ),
  },
  {
    id: "fraud",
    title: "Protect yourself from fraud",
    body: (
      <>
        <p>
          Fraudsters sometimes pretend to be financial firms, or copy a real firm’s name and details (a “clone firm”).
          To protect yourself:
        </p>
        <ul>
          <li>
            We are not accepting money from anyone yet. We will never ask you to transfer money to us, or to a “safe
            account”, before your account is opened.
          </li>
          <li>We will never ask for your passwords, full card details or one-time security codes.</li>
          <li>
            Before dealing with any financial firm, check it on the FCA’s{" "}
            <a href="https://www.fca.org.uk/consumers/fca-firm-checker">Firm Checker</a> or the{" "}
            <a href="https://register.fca.org.uk/s/">Financial Services Register</a>, and contact it only using the
            details listed there. Until we are authorised, we will not appear there as an authorised firm.
          </li>
          <li>
            If someone contacts you claiming to be from {COMPANY.brand} or the FCA and asks for money or security
            details, stop, do not reply, and contact us using the details on this website.
          </li>
          <li>
            The FCA explains how to spot scams and clone firms on its{" "}
            <a href="https://www.fca.org.uk/consumers/protect-yourself-scams">Protect yourself from scams</a> page. If
            in doubt, call the FCA Consumer Helpline on 0800 111 6768.
          </li>
        </ul>
        <p>
          If you think someone is pretending to be us, please <WriteToUs subject="Suspected impersonation" /> so we can
          act.
        </p>
      </>
    ),
  },
  {
    id: "complaints",
    title: "Complaints",
    body: (
      <p>
        You can read how to complain, and when you may be able to refer a complaint to the Financial Ombudsman Service,
        on our <a href="/complaints/">Complaints</a> page.
      </p>
    ),
  },
  {
    id: "trademarks",
    title: "Trade marks",
    body: (
      <p>
        Names of banks, payment schemes, service providers and merchants mentioned on this website belong to their
        owners. Naming a provider describes the arrangements we plan or are discussing; it does not mean the provider
        endorses us.
      </p>
    ),
  },
];

export default function Regulatory() {
  return <LegalSections summary={SUMMARY} sections={SECTIONS} />;
}
