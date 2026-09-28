// Accessibility.jsx — accessibility statement. Lists only measures that are
// actually built into the site, and the known limitations.
import { COMPANY } from "../content.js";
import { Address, LegalSections, WriteToUs } from "./parts.jsx";

const SECTIONS = [
  {
    id: "commitment",
    title: "Our commitment",
    body: (
      <p>
        We want everyone to be able to use the {COMPANY.brand} website. We aim to meet the Web Content Accessibility
        Guidelines (WCAG) 2.2 at level AA, and we design for the accessibility settings built into Apple, Android and
        Windows devices.
      </p>
    ),
  },
  {
    id: "features",
    title: "What we’ve done",
    body: (
      <ul>
        <li>
          Pages use clear headings and landmarks, and a “Skip to Content” link, so screen readers can move around
          easily.
        </li>
        <li>
          Everything works with a keyboard, with a visible focus indicator. The product demo tabs also respond to the
          arrow keys.
        </li>
        <li>Text and controls meet WCAG AA colour contrast, in both light and dark mode.</li>
        <li>
          The site follows your device settings: <strong>Reduce Motion</strong> turns off animations and stops the demo
          advancing by itself, <strong>Reduce Transparency</strong> replaces blurred backgrounds with solid ones, and{" "}
          <strong>Increase Contrast</strong> strengthens colours and borders.
        </li>
        <li>
          Text can be enlarged to 200% without losing content, and pages work on small screens without sideways
          scrolling.
        </li>
        <li>Buttons and links have large touch targets.</li>
        <li>
          Product images have text descriptions, and the rotating headline is read as one complete sentence by screen
          readers.
        </li>
        <li>The website does not use CAPTCHAs, pop-ups or time limits on forms.</li>
      </ul>
    ),
  },
  {
    id: "limitations",
    title: "Known limitations",
    body: (
      <ul>
        <li>
          <strong>Product demo.</strong> The screens at the top of the home page are images. Their descriptions
          summarise each screen but do not describe every detail. The same information is set out in text further down
          the page.
        </li>
        <li>
          <strong>Moving content.</strong> The demo changes screen every seven seconds. It pauses while you hover over
          it or move focus into it, stops for good as soon as you choose a tab, and does not move at all if Reduce
          Motion is on.
        </li>
      </ul>
    ),
  },
  {
    id: "testing",
    title: "How we test",
    body: (
      <p>
        Every change to the website runs through automated tests that check keyboard use, Reduce Motion behaviour and
        layout on desktop and mobile screen sizes. We also check pages by hand with a keyboard and at different text
        sizes. We last reviewed this statement on 28 September 2026.
      </p>
    ),
  },
  {
    id: "help",
    title: "Asking for help or another format",
    body: (
      <>
        <p>
          If something on the website is hard to use, or you need information in a different format, such as large print
          or plain text, please <WriteToUs subject="Accessibility" />:
        </p>
        <Address />
        <p>
          Tell us the page, what you were trying to do and the format you need. We will reply within five working days.
        </p>
        <p>
          If you are not happy with our response, you can contact the{" "}
          <a href="https://www.equalityadvisoryservice.com/">Equality Advisory and Support Service</a> for advice.
        </p>
      </>
    ),
  },
];

export default function Accessibility() {
  return <LegalSections sections={SECTIONS} />;
}
