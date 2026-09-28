// Cookies.jsx — cookie policy. The site sets no cookies and loads nothing from
// third parties, so there is no consent banner; this page says so plainly.
import { COMPANY } from "../content.js";
import { Address, LegalSections, WriteToUs } from "./parts.jsx";

const SECTIONS = [
  {
    id: "none",
    title: "We don’t use cookies",
    body: (
      <>
        <p>
          This website does not use cookies or similar technologies, such as local storage, tracking pixels, web beacons
          or device fingerprinting. That is why you do not see a cookie banner.
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
