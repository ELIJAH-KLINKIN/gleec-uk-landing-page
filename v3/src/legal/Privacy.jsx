// Privacy.jsx — privacy notice for website visitors, waitlist registrants and
// people who contact us (UK GDPR Articles 13 and 14). Customers will get a
// separate notice at onboarding covering identity checks and AML.
import { COMPANY } from "../content.js";
import { Address, LegalSections, LegalTable, WriteToUs } from "./parts.jsx";

const SUMMARY = (
  <ul>
    <li>
      {COMPANY.name} is responsible for your personal data. We collect what you give us when you join the waitlist or
      contact us, plus limited technical data to keep the website secure.
    </li>
    <li>We use it to tell you about our launch and to talk to eligible businesses about opening an account.</li>
    <li>We don’t sell your data, and the website uses no cookies or trackers.</li>
    <li>You can ask to see, correct or delete your data, or stop hearing from us, at any time.</li>
  </ul>
);

const SECTIONS = [
  {
    id: "who",
    title: "Who we are",
    body: (
      <>
        <p>
          {COMPANY.name} (“we”, “us”) is the controller of the personal data described in this policy. We are a company
          registered in {COMPANY.registeredIn} with company number {COMPANY.number}, and {COMPANY.brand} is our brand.
        </p>
        <p>
          We have appointed a Data Protection Officer (DPO). To contact our DPO, <WriteToUs subject="Data protection" />
          , marking your letter “For the attention of the Data Protection Officer”:
        </p>
        <Address />
      </>
    ),
  },
  {
    id: "scope",
    title: "Who this policy covers",
    body: (
      <>
        <p>
          This policy covers people who visit our website, join our waitlist, or contact us. Most of the people we hear
          from are directors, employees or representatives of businesses.
        </p>
        <p>
          If we are authorised and your business applies for an account, we will give you a separate customer privacy
          notice first. It will explain the identity, anti-money-laundering and sanctions checks we must carry out.
        </p>
      </>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <LegalTable
        head={["Type of data", "What it includes", "Where it comes from"]}
        rows={[
          [
            "Contact details",
            "Your work email address (required to join the waitlist). Optionally your full name and phone number.",
            "You",
          ],
          [
            "Business details (optional)",
            "Company name, country of incorporation, type of business, expected monthly payment volume, currencies you need, and any message you send us.",
            "You",
          ],
          [
            "Registration details",
            "When you registered, the page you registered from, the website that referred you, and campaign tags in the link you followed (for example, utm_source).",
            "Your browser, when you submit the form",
          ],
          [
            "Security data",
            "A one-way coded version of your IP address (we never store the address itself) and your browser type. We use these to limit repeated or automated sign-ups.",
            "Your browser, when you submit the form",
          ],
          [
            "Delivery data",
            "Your IP address and the pages requested, processed by our hosting provider to deliver the website securely.",
            "Your browser, when you visit",
          ],
          ["Correspondence", "Anything you tell us when you write to us, and our replies.", "You"],
        ]}
      />
    ),
  },
  {
    id: "use",
    title: "How we use it, and our lawful basis",
    body: (
      <>
        <p>Data protection law requires a lawful basis for each way we use personal data. Ours are:</p>
        <LegalTable
          head={["What we do", "Lawful basis"]}
          rows={[
            [
              "Keep a record of your registration and tell you when the service becomes available",
              "Legitimate interests: responding to the interest you have shown in our service",
            ],
            [
              "Contact eligible businesses about onboarding and prepare for it, using the business details you share",
              "Legitimate interests: discussing a possible business relationship you asked about",
            ],
            [
              "Send product news and updates",
              "Your consent where the law requires it (for example, if you are a sole trader). Otherwise, legitimate interests. You can opt out at any time.",
            ],
            [
              "Protect the website and the waitlist from spam, abuse and fraud",
              "Legitimate interests: keeping our systems and data secure",
            ],
            [
              "Show the total number of companies on the waitlist",
              "Legitimate interests (only a count is shown, never your details)",
            ],
            ["Keep records, and respond to regulators and law enforcement", "Legal obligation"],
            ["Establish, exercise or defend legal claims", "Legitimate interests"],
          ]}
        />
        <p>
          Where we rely on legitimate interests, we have balanced them against your rights. You can object at any time
          (see <a href="#rights">Your rights</a>). We do not make decisions about you using only automated means, and we
          do not use your data for profiling or advertising.
        </p>
      </>
    ),
  },
  {
    id: "share",
    title: "Who we share it with",
    body: (
      <>
        <p>We never sell your personal data. We share it only with:</p>
        <ul>
          <li>
            <strong>Service providers who process it for us</strong>, under contracts that require them to keep it
            secure and use it only on our instructions: website and application hosting (Vercel), database hosting
            (Neon), and the customer relationship management system our team uses.
          </li>
          <li>
            <strong>Our team’s notification channel.</strong> When someone joins the waitlist, our team is alerted
            through a private Telegram channel. The alert contains the details you submitted.
          </li>
          <li>
            <strong>Other Gleec group companies</strong> that provide technical support to us under written agreements,
            and only as far as they need to.
          </li>
          <li>
            <strong>Professional advisers</strong>, such as lawyers, auditors and insurers.
          </li>
          <li>
            <strong>Regulators, law enforcement and courts</strong>, when the law requires or allows it.
          </li>
          <li>
            <strong>A buyer or successor</strong> of our business, if it is sold or restructured, who must keep to this
            policy.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "transfers",
    title: "International transfers",
    body: (
      <p>
        We store waitlist data in the United Kingdom. Some of our service providers, or their support teams, are based
        outside the UK. When personal data is transferred outside the UK, we make sure it is protected as UK law
        requires, by relying on UK adequacy regulations (for example, for US companies certified under the UK Extension
        to the EU–US Data Privacy Framework) or on the UK International Data Transfer Agreement or Addendum. You can ask
        us for details.
      </p>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <LegalTable
        head={["Data", "How long"]}
        rows={[
          [
            "Waitlist and correspondence",
            "Up to 24 months after our last contact with you, or until you ask us to delete it, whichever is sooner. If your business becomes a customer, the customer privacy notice applies instead.",
          ],
          ["Security data (coded IP address, browser type)", "Kept with your registration and deleted with it"],
          ["Hosting provider delivery logs", "Short periods set by the provider, normally no more than 30 days"],
          ["Records of opt-outs", "As long as needed to respect your choice"],
        ]}
      />
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>You have the right to:</p>
        <ul>
          <li>access the personal data we hold about you, and get a copy of it;</li>
          <li>have inaccurate data corrected, and incomplete data completed;</li>
          <li>have your data deleted, or its use restricted, in certain circumstances;</li>
          <li>object to our use of your data based on legitimate interests;</li>
          <li>object to direct marketing at any time, in which case we will stop;</li>
          <li>receive the data you gave us in a portable format, where the law provides for it;</li>
          <li>withdraw your consent at any time, where we rely on it.</li>
        </ul>
        <p>
          To use any of these rights, <WriteToUs subject="Data protection request" />. We may need to confirm your
          identity first. We will respond within one month, or tell you within that month if we need up to two more
          months because your request is complex. You can stop product emails at any time using the link in each email.
        </p>
      </>
    ),
  },
  {
    id: "complain",
    title: "How to complain",
    body: (
      <>
        <p>
          You have the right to complain to us about how we use your personal data. To do so,{" "}
          <WriteToUs subject="Data protection complaint" />. We will acknowledge your complaint within 30 days,
          investigate it without undue delay, keep you updated, and tell you the outcome.
        </p>
        <p>
          You also have the right to complain to the Information Commissioner’s Office (ICO), the UK data protection
          regulator:{" "}
          <a href="https://ico.org.uk/make-a-complaint/data-protection-complaints/">ico.org.uk/make-a-complaint</a>,
          telephone 0303 123 1113. The ICO usually asks you to raise your concern with us first.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect your data",
    body: (
      <p>
        We protect personal data with encryption in transit and at rest, access limited to people who need it, and
        security controls on our systems and providers. We never store your IP address itself, only a one-way code
        derived from it. No system is perfectly secure, but we act quickly on any incident and will tell you and the ICO
        when the law requires.
      </p>
    ),
  },
  {
    id: "other",
    title: "Children, cookies and changes",
    body: (
      <>
        <p>Our website and services are for businesses and are not intended for anyone under 18.</p>
        <p>
          The website does not use cookies or similar technologies; see our <a href="/cookies/">Cookie policy</a>.
        </p>
        <p>
          We may update this policy. The date at the top shows when it last changed, and we will tell you about
          important changes before they apply.
        </p>
      </>
    ),
  },
];

export default function Privacy() {
  return <LegalSections summary={SUMMARY} sections={SECTIONS} />;
}
