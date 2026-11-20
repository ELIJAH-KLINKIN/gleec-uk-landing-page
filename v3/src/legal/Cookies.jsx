// Cookies.jsx — cookie policy. The only cookie is the strictly necessary one
// set by the password page (middleware.ts) while the site is internal; nothing
// is loaded from third parties, so there is no consent banner (PECR reg. 6(4)).
import { COMPANY } from "../content.js";
import { Address, LegalSections, WriteToUs } from "./parts.jsx";

const SECTIONS = [
  {
    id: "none",
    title: "No advertising or tracking cookies",
    body: (
      <>
        <p>
          This website does not use cookies or similar technologies for advertising or tracking, such as analytics
          cookies, tracking pixels, web beacons or device fingerprinting. That is why you do not see a cookie banner.
        </p>
        <p>
          While the website is in preview, it is protected by a password. When you enter it, we set one strictly
          necessary cookie, <code>site_access</code>, so you don’t have to enter the password on every page. It holds
          only a coded confirmation that you signed in, not your password or any personal details, and it expires after
          30 days. Because it is strictly necessary for the website to work, the law does not require your consent for
          it. It will be removed when the website launches.
        </p>
        <p>In particular, the website:</p>
        <ul>
          <li>has no analytics, advertising or social media trackers;</li>
          <li>
            serves its fonts, images and code from our own domain, so your browser does not contact third parties when
            you visit;
          </li>
          <li>only sends information to us when you choose to submit the waitlist form.</li>
        </ul>
      </>
    ),
  },
  {
    id: "hosting",
    title: "What our hosting provider sees",
    body: (
      <p>
        Like any website, ours is delivered by servers that receive your IP address and basic browser information when
        you load a page. This is needed to deliver the website securely and is covered by our{" "}
        <a href="/privacy/">Privacy policy</a>. It does not involve storing anything on your device.
      </p>
    ),
  },
  {
    id: "changes",
    title: "If this changes",
    body: (
      <>
        <p>
          If we start using cookies or similar technologies, we will update this page first. We will ask for your
          consent before setting anything that is not strictly necessary, unless the law allows it without consent. For
          example, UK rules allow some analytics used only to improve a website, as long as we tell you and make it easy
          to object. We will always give you a simple way to say no.
        </p>
        <p>
          You can also control cookies in your browser settings, including blocking or deleting them. Your browser’s
          help pages explain how.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Questions",
    body: (
      <>
        <p>
          If you have questions about this policy, <WriteToUs subject="Cookies" />:
        </p>
        <Address />
        <p>
          {COMPANY.name} is responsible for this website. See our <a href="/privacy/">Privacy policy</a> for how we
          handle personal data.
        </p>
      </>
    ),
  },
];

export default function Cookies() {
  return <LegalSections sections={SECTIONS} index={false} />;
}
