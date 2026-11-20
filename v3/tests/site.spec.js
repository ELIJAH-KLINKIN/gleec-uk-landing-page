// End-to-end checks for v2: renders cleanly in light and dark, every link has
// a destination, every control works (mouse + keyboard), nothing moves on its
// own, and the waitlist form handles each API outcome. The lead API is always
// mocked — tests never create real leads.
import { test, expect } from "@playwright/test";

const LEADS_API = "https://leads-api.test/api/leads";

let consoleErrors = [];
test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    const text = m.text();
    if (/Failed to load resource|ERR_FAILED|net::/.test(text)) return; // requests aborted on purpose
    if (m.type() === "error" || (m.type() === "warning" && /hydrat/i.test(text))) consoleErrors.push(text);
  });
});
test.afterEach(async () => {
  expect(consoleErrors, "console errors").toEqual([]);
});

const isMobile = (testInfo) => testInfo.project.name === "mobile";

test("prerendered HTML and metadata", async ({ page, request }) => {
  const html = await (await request.get("./")).text();
  expect(html).toContain("for companies that don’t fit the default box.");
  expect(html).toContain('id="waitlist"');
  await page.goto("./");
  await expect(page).toHaveTitle(/^Gleec Pay — /);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https:\/\/.+og-image\.png$/);
  // The shared-link preview travels without the page, so it carries the FCA qualifier itself.
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    /subject to FCA authorisation/,
  );
  // One brand everywhere: "Gleec Pay" (2026-10-01), never "GLEEC" or the old "Gleec Business".
  expect(html).not.toContain("GLEEC");
  expect(await page.content()).not.toContain("GLEEC");
  expect(await page.content()).not.toContain("Gleec Business");
  await expect(page.locator(".nav-brand")).toHaveText("Gleec Pay");
  await expect(page.locator(".nav-brand img")).toHaveAttribute("src", /logo-g.*\.svg/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
  await expect(page.locator("h1")).toHaveCount(1);
});

test("follows the system appearance (light and dark)", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("./");
  const light = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.emulateMedia({ colorScheme: "dark" });
  const dark = await page.evaluate(() => [
    getComputedStyle(document.body).backgroundColor,
    getComputedStyle(document.body).color,
  ]);
  expect(light).toBe("rgb(255, 255, 255)");
  expect(dark[0]).toBe("rgb(0, 0, 0)");
  expect(dark[1]).toBe("rgb(245, 245, 247)");
});

test("every in-page link resolves; no dead links", async ({ page, request }) => {
  await page.goto("./");
  const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
  expect(hrefs.length).toBeGreaterThan(20);
  for (const href of hrefs) {
    expect(href, "dead link").not.toBe("#");
    expect(href, "link to a page that does not exist").not.toMatch(/\.html/);
    if (href.startsWith("#")) await expect(page.locator(href), `target for ${href}`).toHaveCount(1);
    if (/^\/[a-z]/.test(href)) expect((await request.get(href)).status(), `page ${href}`).toBe(200);
  }
});

// ---------------- Navigation ----------------
// Waits until scrolling has stopped: the same position three samples in a row.
const settle = async (page) => {
  let last = -1;
  let same = 0;
  for (let i = 0; i < 60; i++) {
    const y = await page.evaluate(() => Math.round(window.scrollY));
    same = y === last ? same + 1 : 0;
    if (same >= 2) return y;
    last = y;
    await page.waitForTimeout(100);
  }
  return last;
};

test("logo returns to the very top from anywhere, in one click", async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await settle(page);
  await page.locator(".nav-brand").click();
  expect(await settle(page)).toBe(0);
  await expect(page).not.toHaveURL(/#/);
});

test("section anchors match the menu labels; old links still land", async ({ page }) => {
  await page.goto("./");
  const links = await page
    .locator(".nav-links a")
    .evaluateAll((as) => as.map((a) => [a.textContent.trim(), a.getAttribute("href")]));
  expect(links).toHaveLength(6);
  for (const [label, href] of links) {
    expect(href).toBe(`#${label.toLowerCase()}`);
    await expect(page.locator(href)).toHaveCount(1);
  }
  for (const [old, now] of [
    ["highlights", "product"],
    ["plans", "pricing"],
    ["currencies", "accounts"],
    ["finance", "payments"],
  ]) {
    await page.goto(`./#${old}`);
    await expect(page).toHaveURL(new RegExp(`#${now}$`));
    await expect(page.locator(`#${now}`)).toBeInViewport();
  }
  await page.goto("./#top");
  await expect(page).not.toHaveURL(/#/);
});

test("menu links land each section with its heading below the bar", async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), "links live in the phone menu");
  await page.goto("./");
  for (const label of ["Product", "Accounts", "Payments", "Cards", "Pricing", "FAQ"]) {
    const link = page.locator(".nav-links a", { hasText: label });
    const href = await link.getAttribute("href");
    const measure = () =>
      page.evaluate((sel) => {
        const h = document.querySelector(sel).querySelector("h2");
        return {
          headTop: h.getBoundingClientRect().top,
          navBottom: document.querySelector(".nav").getBoundingClientRect().bottom,
          vh: window.innerHeight,
        };
      }, href);
    await link.click();
    // Wait for the glide to arrive (on a busy machine it can start late, and
    // "not moving yet" looks the same as "settled"), then check where it rests.
    await expect
      .poll(
        async () => {
          const m = await measure();
          return m.headTop > m.navBottom && m.headTop < m.vh / 2;
        },
        { message: `${label} heading arrives under the bar`, timeout: 8000 },
      )
      .toBe(true);
    await settle(page);
    const { headTop, navBottom, vh } = await measure();
    expect(headTop, `${label} heading below the bar`).toBeGreaterThan(navBottom);
    expect(headTop, `${label} heading in the top half`).toBeLessThan(vh / 2);
  }
});

test("scroll spy: a purple underline follows the section being read", async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), "underline is on the desktop bar");
  await page.goto("./");
  const bar = page.locator(".nav-indicator");
  await expect(page.locator('.nav-links a[aria-current="location"]')).toHaveCount(0);
  await expect(bar).not.toHaveClass(/is-visible/);
  for (const label of ["Accounts", "Cards", "FAQ"]) {
    const link = page.locator(".nav-links a", { hasText: label });
    await link.click();
    await settle(page);
    await expect(link).toHaveAttribute("aria-current", "location");
    await expect(page.locator('.nav-links a[aria-current="location"]')).toHaveCount(1);
    await expect(bar).toHaveClass(/is-visible/);
    await expect
      .poll(
        async () => {
          const [l, b] = await Promise.all([link.boundingBox(), bar.boundingBox()]);
          return b.x >= l.x && b.x + b.width <= l.x + l.width + 1 && b.y > l.y + l.height / 2;
        },
        { message: `underline sits under ${label}` },
      )
      .toBe(true);
  }
  // Back at the top, nothing is underlined.
  await page.locator(".nav-brand").click();
  await settle(page);
  await expect(page.locator('.nav-links a[aria-current="location"]')).toHaveCount(0);
});

test("opening a #section link jumps straight there (no long glide)", async ({ page }) => {
  await page.goto("./#faq");
  await page.waitForLoadState("load");
  await expect
    .poll(() => page.evaluate(() => Math.round(document.querySelector("#faq").getBoundingClientRect().top)), {
      timeout: 1000,
    })
    .toBeLessThan(120);
});

test("phone menu marks the current section", async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo), "phone menu only");
  await page.goto("./#cards");
  await settle(page);
  // A real tap: Playwright's click() first "scrolls the sticky button into view",
  // which moves the page underneath (a tool artefact, not something users see).
  const box = await page.getByRole("button", { name: "Menu" }).boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('#nav-menu a[aria-current="location"]')).toHaveText("Cards");
});

// ---------------- Talk to a human ----------------
const TALK_API = "https://leads-api.test/api/talk";
const TALK_ID = "3f1c2b1e-7a1d-4a55-9d0b-6a8c1e2f4b77";
const TALK_DAYS = [
  { date: "2026-09-29", slots: ["2026-09-29T09:00:00.000Z", "2026-09-29T09:30:00.000Z"] },
  { date: "2026-09-30", slots: ["2026-09-30T13:00:00.000Z"] },
  // A full week of days, so the scrolling day row is wider than a phone screen.
  ...["2026-10-01", "2026-10-02", "2026-10-05", "2026-10-06"].map((date) => ({
    date,
    slots: [`${date}T09:00:00.000Z`],
  })),
];

async function mockTalk(page, { available = true, bookStatus = 200 } = {}) {
  const calls = { request: null, book: [], slots: 0 };
  await page.route(TALK_API, (route) => {
    calls.request = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { ok: true, id: TALK_ID, token: "t".repeat(43), booking: true } });
  });
  await page.route(`${TALK_API}?*`, (route) => {
    calls.slots += 1;
    return route.fulfill({
      json: available
        ? { ok: true, available: true, timeZone: "Europe/London", durationMinutes: 20, days: TALK_DAYS }
        : { ok: true, available: false, days: [] },
    });
  });
  await page.route(`${TALK_API}/book`, (route) => {
    const body = route.request().postDataJSON();
    calls.book.push(body);
    if (bookStatus !== 200 && calls.book.length === 1)
      return route.fulfill({ status: bookStatus, json: { ok: false, error: "slot_taken" } });
    const end = new Date(Date.parse(body.start) + 20 * 60000).toISOString();
    return route.fulfill({
      json: {
        ok: true,
        booking: { start: body.start, end, meetUrl: "https://meet.google.com/abc-defg-hij", hostName: "Andrey" },
      },
    });
  });
  return calls;
}

test.describe("talk to a human", () => {
  test.use({ timezoneId: "Europe/London" });

  test("email → about you → pick a time → booked with a Meet link", async ({ page }) => {
    const calls = await mockTalk(page);
    await page.goto("./#talk");
    const section = page.locator("#talk");
    const current = () => section.locator('.tk-step[aria-current="step"]');
    await expect(current()).toContainText("Your email");

    await section.getByRole("textbox", { name: "Work email" }).fill("ada@example.co.uk");
    await section.getByRole("button", { name: "Talk to a Human" }).click();
    await expect(current()).toContainText("About you");
    await expect(section.getByRole("heading", { name: "Who are we meeting?" })).toBeFocused();

    // Names are required; the rest is optional.
    await section.getByRole("button", { name: "Book a Call" }).click();
    await expect(section.getByText("Enter your first name.")).toBeVisible();
    await section.getByLabel("First name").fill("Ada");
    await section.getByLabel("Last name").fill("Lovelace");
    await section.getByLabel("Company website (optional)").fill("analytical.example");
    await page.waitForTimeout(2600); // time trap on the API side is mocked, but keep it realistic
    await section.getByRole("button", { name: "Book a Call" }).click();

    await expect(current()).toContainText("Pick a time");
    expect(calls.request).toMatchObject({
      email: "ada@example.co.uk",
      firstName: "Ada",
      lastName: "Lovelace",
      companyWebsite: "analytical.example",
    });
    await expect(section.getByText("Times are in your time zone (Europe/London).")).toBeVisible();
    await expect(section.locator(".tk-day")).toHaveCount(6);
    // The page clips sideways overflow, so check the card's own right edge.
    const card = await section.locator(".tk-card").boundingBox();
    const width = page.viewportSize().width;
    expect(card.x + card.width, "time picker fits the screen").toBeLessThanOrEqual(width);
    await section.locator(".tk-time", { hasText: "10:30" }).click();
    await section.getByRole("button", { name: /^Book Tue 10:30$/ }).click();

    expect(calls.book[0]).toEqual({ id: TALK_ID, token: "t".repeat(43), start: "2026-09-29T09:30:00.000Z" });
    await expect(section.getByRole("heading", { name: "You’re booked." })).toBeVisible();
    await expect(section.locator(".tk-when")).toHaveText("Tuesday 29 September, 10:30–10:50");
    await expect(section.getByText("You’ll be talking to Andrey.")).toBeVisible();
    await expect(section.getByRole("link", { name: "Join the call" })).toHaveAttribute(
      "href",
      "https://meet.google.com/abc-defg-hij",
    );
    await expect(section.locator('.tk-step[data-state="done"]')).toHaveCount(3);
  });

  test("a time taken a moment ago: message, fresh list, pick again", async ({ page }) => {
    const calls = await mockTalk(page, { bookStatus: 409 });
    await page.goto("./#talk");
    const section = page.locator("#talk");
    await section.getByRole("textbox", { name: "Work email" }).fill("grace@example.com");
    await section.getByRole("button", { name: "Talk to a Human" }).click();
    await section.getByLabel("First name").fill("Grace");
    await section.getByLabel("Last name").fill("Hopper");
    await section.getByRole("button", { name: "Book a Call" }).click();
    await section.locator(".tk-time", { hasText: "10:00" }).click();
    await section.getByRole("button", { name: /^Book / }).click();
    await expect(section.getByText("That time was just taken. Please pick another.")).toBeVisible();
    expect(calls.slots).toBe(2);
    await section.locator(".tk-day", { hasText: "30 Sep" }).click();
    await section.locator(".tk-time", { hasText: "14:00" }).click();
    await section.getByRole("button", { name: /^Book Wed 14:00$/ }).click();
    await expect(section.getByRole("heading", { name: "You’re booked." })).toBeVisible();
  });

  test("no free times: we keep the details and email to arrange", async ({ page }) => {
    await mockTalk(page, { available: false });
    await page.goto("./#talk");
    const section = page.locator("#talk");
    await section.getByRole("textbox", { name: "Work email" }).fill("ada@example.co.uk");
    await section.getByRole("button", { name: "Talk to a Human" }).click();
    await section.getByLabel("First name").fill("Ada");
    await section.getByLabel("Last name").fill("Lovelace");
    await section.getByRole("button", { name: "Book a Call" }).click();
    await expect(section.getByRole("heading", { name: "We’ll email you to arrange a time." })).toBeVisible();
  });
});

test("'Speak to Us', 'Contact Us' and 'Request Pricing' lead to Talk to a human", async ({ page }) => {
  await page.goto("./");
  for (const name of ["Speak to Us", "Contact Us", "Request Pricing"]) {
    await expect(page.getByRole("link", { name }).first()).toHaveAttribute("href", "#talk");
  }
});

// ---------------- Legal and regulatory pages ----------------
const LEGAL = [
  ["/regulatory/", "Regulatory information", "not currently authorised by the FCA"],
  ["/safeguarding/", "How your money will be protected", "not covered by the FSCS"],
  ["/privacy/", "Privacy policy", "ico.org.uk/make-a-complaint"],
  ["/cookies/", "Cookie policy", "strictly necessary cookie"],
  ["/terms/", "Website terms of use", "laws of England and Wales"],
  ["/complaints/", "Complaints", "financial-ombudsman.org.uk"],
  ["/contact/", "Contact us", "14776628"],
  ["/accessibility/", "Accessibility statement", "WCAG"],
];

test("footer: LinkedIn slot is a placeholder until the page URL is set", async ({ page }) => {
  await page.goto("./#legal");
  const social = page.locator(".footer-social", { hasText: "LinkedIn" });
  // The logo alone: the word is only for screen readers.
  await expect(social.locator("svg")).toBeVisible();
  await expect(social.locator(".visually-hidden")).toHaveText("LinkedIn");
  // No URL yet: shown as "Soon", never as a dead link.
  await expect(page.locator("footer a.footer-social", { hasText: "LinkedIn" })).toHaveCount(0);
  await expect(social.locator(".soon")).toHaveText("Soon");
});

test("footer links open every legal page", async ({ page }) => {
  await page.goto("./");
  for (const [path] of LEGAL) {
    await expect(page.locator(`footer a[href="${path}"]`), `footer link to ${path}`).toHaveCount(1);
  }
  await expect(page.locator("footer .footer-directory .soon"), "no 'coming soon' pages in the footer").toHaveCount(0);
  await page.locator('footer a[href="/privacy/"]').click();
  await expect(page).toHaveURL(/\/privacy\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy policy");
});

test("the site stores nothing on the device (matches the cookie policy)", async ({ page, context }) => {
  for (const path of ["./", "/privacy/", "/cookies/"]) {
    await page.goto(path);
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(300);
  }
  await page.goto("./#waitlist");
  await page.locator("#waitlist").getByRole("textbox", { name: "Work email" }).fill("someone@example.com");
  await page.locator("#talk").getByRole("textbox", { name: "Work email" }).fill("someone@example.com");
  expect(await context.cookies(), "cookies").toEqual([]);
  const stored = await page.evaluate(() => localStorage.length + sessionStorage.length);
  expect(stored, "local/session storage entries").toBe(0);
});

for (const [path, title, text] of LEGAL) {
  test(`legal page ${path}: prerendered, titled, linked back home`, async ({ page, request }, testInfo) => {
    const html = await (await request.get(path)).text();
    expect(html, "own <title>").toContain(`<title>${title} — Gleec Pay</title>`);
    expect(html, "own canonical URL").toMatch(new RegExp(`rel="canonical" href="[^"]*${path}"`));
    expect(html, "prerendered body").toContain(text);

    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator("main")).toContainText(text);
    // Section links in the nav and footer lead back to the landing page.
    await expect(page.locator(".nav-cta")).toHaveAttribute("href", "/#waitlist");
    await expect(page.locator('footer a[href="/#faq"]')).toHaveCount(1);
    // Company details and status are on every page.
    await expect(page.locator("#legal")).toContainText("company number 14776628");
    // "On this page" links point at real sections.
    for (const href of await page.$$eval(".legal-toc a", (as) => as.map((a) => a.getAttribute("href")))) {
      await expect(page.locator(href), `section ${href}`).toHaveCount(1);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${testInfo.project.name}`).toBeLessThanOrEqual(0);
  });
}

test("all images load and nothing overflows horizontally", async ({ page }) => {
  await page.goto("./");
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 800) await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForLoadState("networkidle");
  const broken = await page.$$eval("img", (imgs) =>
    imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src),
  );
  expect(broken).toEqual([]);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("every button and link is at least 44px tall (touch target)", async ({ page }) => {
  await page.goto("./");
  const small = await page.$$eval("main button, main a.btn, main a.link-chevron, .nav-toggle", (els) =>
    els
      .filter((el) => el.offsetParent !== null)
      .map((el) => [
        el.textContent.trim() || el.getAttribute("aria-label"),
        Math.round(el.getBoundingClientRect().height),
      ])
      .filter(([, h]) => h < 44),
  );
  expect(small).toEqual([]);
});

test("skip link appears on first Tab", async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), "keyboard-only");
  await page.goto("./");
  const skip = page.locator(".skip-link");
  expect((await skip.boundingBox()).y).toBeLessThan(0);
  await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
  await expect.poll(async () => (await skip.boundingBox()).y).toBeGreaterThanOrEqual(0);
});

test("navigation bar links scroll to their sections", async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), "desktop navigation");
  await page.goto("./");
  for (const [label, id] of [
    ["Product", "product"],
    ["Payments", "payments"],
    ["Pricing", "pricing"],
    ["FAQ", "faq"],
  ]) {
    await page.locator(".nav-links").getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
});

test("mobile menu opens, navigates, locks scroll and closes", async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo), "mobile navigation");
  await page.goto("./");
  await expect(page.locator(".nav-links")).toBeHidden();
  await page.getByRole("button", { name: "Menu" }).click();
  const menu = page.locator("#nav-menu");
  await expect(menu).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/menu-open/);
  await menu.getByRole("link", { name: "Cards" }).click();
  await expect(menu).toBeHidden();
  await expect(page.locator("html")).not.toHaveClass(/menu-open/);
  await expect(page.locator("#cards")).toBeInViewport();
  await page.getByRole("button", { name: "Menu" }).click();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});

test("hero: the email pill joins the waitlist and carries on at the details step", async ({ page }) => {
  let body;
  await page.route(LEADS_API, async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 201, contentType: "application/json", body: '{"ok":true,"id":"L1","token":"T1"}' });
  });
  await page.goto("./");
  const hero = page.locator(".hero-top");
  await expect(hero.getByRole("link", { name: "Talk to a Human" })).toHaveCount(0);
  await expect(hero.getByRole("link", { name: /See the demo/ })).toHaveAttribute("href", "https://demo.test/");
  // Nothing under the field: the footer's Privacy policy link is enough.
  await expect(hero.locator(".hero-join a[href='/privacy/']")).toHaveCount(0);
  // The pill fits the screen (the page clips sideways overflow, so measure it).
  const pill = await hero.locator(".wl-pill").boundingBox();
  expect(pill.x + pill.width).toBeLessThanOrEqual(page.viewportSize().width);
  await hero.getByRole("textbox", { name: "Work email" }).fill("ada@example.co.uk");
  await hero.getByRole("button", { name: "Join the Waitlist" }).click();
  const details = page.locator("#waitlist").getByRole("heading", { name: "Need a tailored setup?" });
  await expect(details).toBeVisible();
  await expect(details).toBeInViewport();
  expect(body).toMatchObject({ email: "ada@example.co.uk", consent: true, updates: false });
});

test("hero: a bad email is explained and nothing is sent", async ({ page }) => {
  let called = false;
  await page.route(LEADS_API, (route) => {
    called = true;
    return route.abort();
  });
  await page.goto("./");
  const hero = page.locator(".hero-top");
  await hero.getByRole("textbox", { name: "Work email" }).fill("not-an-email");
  await hero.getByRole("button", { name: "Join the Waitlist" }).click();
  await expect(hero.getByText("Enter an email address like name@company.com.")).toBeVisible();
  expect(called).toBe(false);
});

test("headline reads as one sentence and its first line follows the demo tab", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Global business accounts, corporate cards and cross-border payments for companies that don’t fit the default box.",
  );
  const phrase = page.locator('.rot-phrase[data-state="in"]');
  await expect(phrase).toHaveText("Global\u00a0accounts");
  await page.locator(".demo").getByRole("tab", { name: "Cards" }).click();
  await expect(phrase).toHaveText("Corporate\u00a0cards");
  await page.locator(".demo").getByRole("tab", { name: "Payments" }).click();
  await expect(phrase).toHaveText("Cross-border\u00a0payments");
  await expect(page.locator(".rot-phrase")).toHaveCount(3);
});

test("product story: Global Account, Confirmation of Payee, SWIFT fee choice", async ({ page }) => {
  await page.goto("./");
  const product = page.locator("#product");
  await expect(product.getByRole("heading", { name: "One IBAN, 24 currencies" })).toHaveCount(1);
  await expect(product.getByRole("heading", { name: "Confirmation of Payee" })).toHaveCount(1);
  await expect(product.locator(".hl-tile", { hasText: "SWIFT" }).first()).toContainText("OUR");
  // Tile 3 is a payment sent, not one received.
  const uk = product.locator(".art-uk");
  await expect(uk).toContainText("Sent");
  await expect(uk).toContainText("to Hartwell & Frome LLP");
  await expect(uk).not.toContainText("Received");
});

test("one section per job: Accounts is receiving, Payments is sending", async ({ page }) => {
  await page.goto("./");
  // The merged-away sections are gone.
  for (const id of ["currencies", "finance"]) await expect(page.locator(`#${id}`)).toHaveCount(0);
  await expect(page.getByText("More than just account details.")).toHaveCount(0);
  const sections = await page.locator("main > section").evaluateAll((els) => els.map((e) => e.id));
  expect(sections.indexOf("payments")).toBe(sections.indexOf("accounts") + 1);

  // Accounts: the details, the currencies still to come, and no "subject to…" list.
  const accounts = page.locator("#accounts");
  await expect(accounts.locator("#xp-panel")).toHaveCount(1);
  await expect(accounts.locator(".xp-stat")).toContainText("24");
  await expect(accounts.locator(".xp-chips li")).toHaveCount(11);
  await expect(accounts).not.toContainText(/subject to|Transfer methods/i);

  // Payments: the send flow, how long each method takes (no fees), the tools.
  const payments = page.locator("#payments");
  await expect(payments.getByRole("heading", { level: 2 })).toHaveText("Pay suppliers and staff. See when it lands.");
  await expect(payments.locator(".pay-timings dt")).toHaveText([
    "Faster Payments",
    "CHAPS",
    "SEPA Instant",
    "SEPA",
    "SWIFT",
  ]);
  await expect(payments.locator(".pay-timings")).toContainText("Usually within seconds, 24/7");
  await expect(payments).not.toContainText(/£\d|fee/i);
  await expect(payments.locator(".pay-tools li")).toHaveCount(4);
  await expect(payments).toContainText("camt.053");
  await expect(payments).toContainText("60+ payout markets");
});

test("payments: the send-flow recording plays on screen, in the visitor's colour scheme", async ({ page }) => {
  for (const scheme of ["dark", "light"]) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("./");
    const screen = page.locator("#payments .pay-screen");
    await expect(screen).toHaveAttribute("role", "img");
    await expect(screen.locator("video")).toHaveCount(0); // off screen: just its first frame
    await screen.scrollIntoViewIfNeeded();
    const video = screen.locator("video");
    await expect(video.locator("source")).toHaveAttribute("src", new RegExp(`payments-${scheme}.*\\.mp4`));
    await expect(video).toHaveAttribute("poster", new RegExp(`payments-${scheme}-poster`));
    await expect.poll(() => video.evaluate((v) => v.muted && !v.paused)).toBe(true);
  }
});

test("payments: under Reduce Motion the recording is a still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./#payments");
  const screen = page.locator("#payments .pay-screen");
  await expect(screen.locator("img")).toBeVisible();
  await page.waitForTimeout(800);
  await expect(screen.locator("video")).toHaveCount(0);
});

const finishHighlight = (page) =>
  page.locator(".hl-dot-progress").evaluate((el) => el.getAnimations().forEach((a) => a.finish()));

test("highlights gallery: dots and paddles move it, and stop it playing", async ({ page }, testInfo) => {
  await page.goto("./#product");
  const gallery = page.locator(".hl");
  const current = gallery.locator(".hl-dot[aria-current='true']");
  await expect(current).toHaveAttribute("aria-label", /highlight 1:/);

  await gallery.getByRole("button", { name: /Go to highlight 4:/ }).click();
  await expect(current).toHaveAttribute("aria-label", /highlight 4:/);
  // Picking a tile stops it playing; Play is offered instead.
  await expect(gallery.locator(".hl-dot-progress")).toHaveCount(0);
  await expect(gallery.getByRole("button", { name: "Play highlights" })).toBeVisible();
  // The chosen tile now sits at the gallery's leading edge.
  await expect
    .poll(() =>
      gallery.evaluate((g) => {
        const scroller = g.querySelector(".hl-scroller");
        const tile = g.querySelectorAll(".hl-tile")[3];
        return Math.abs(
          tile.getBoundingClientRect().left -
            (scroller.getBoundingClientRect().left + tile.parentElement.firstElementChild.offsetLeft),
        );
      }),
    )
    .toBeLessThan(4);

  if (!isMobile(testInfo)) {
    await gallery.getByRole("button", { name: "Next highlight" }).click();
    await expect(current).toHaveAttribute("aria-label", /highlight 5:/);
    await gallery.getByRole("button", { name: "Previous highlight" }).click();
    await expect(current).toHaveAttribute("aria-label", /highlight 4:/);
    await gallery.getByRole("button", { name: /Go to highlight 1:/ }).click();
    await expect(gallery.getByRole("button", { name: "Previous highlight" })).toBeDisabled();
    // Let the glide back finish: jumping mid-glide races the scroll snap.
    await expect.poll(() => gallery.locator(".hl-scroller").evaluate((el) => el.scrollLeft)).toBe(0);
  }

  // Scrolling the gallery directly (swipe / trackpad) updates the page control.
  const last = await gallery.locator(".hl-tile").count();
  await gallery.locator(".hl-scroller").evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: "instant" }));
  await expect(current).toHaveAttribute("aria-label", new RegExp(`highlight ${last}:`));
});

test("highlights gallery: plays on its own, with a fill in the current dot; Pause stops it", async ({ page }) => {
  await page.goto("./#product");
  await page.mouse.move(1, 1);
  const gallery = page.locator(".hl");
  const current = gallery.locator(".hl-dot[aria-current='true']");
  const fill = gallery.locator(".hl-dot.is-current .hl-dot-progress");
  await expect.poll(() => fill.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("running");
  // About 7 s a tile, longer for more words.
  const secs = parseFloat(await fill.evaluate((el) => getComputedStyle(el).animationDuration));
  expect(secs).toBeGreaterThanOrEqual(7);
  expect(secs).toBeLessThanOrEqual(11);
  await finishHighlight(page);
  await expect(current).toHaveAttribute("aria-label", /highlight 2:/);

  // Pause sits between the paddles and stops it; Play starts it again.
  const pause = gallery.getByRole("button", { name: "Pause highlights" });
  await expect(pause).toBeVisible();
  await pause.click();
  await expect(gallery.locator(".hl-dot-progress")).toHaveCount(0);
  await page.waitForTimeout(500);
  await expect(current).toHaveAttribute("aria-label", /highlight 2:/);
  await gallery.getByRole("button", { name: "Play highlights" }).click();
  await expect(gallery.locator(".hl-dot-progress")).toHaveCount(1);
  await expect(gallery.getByRole("button", { name: "Pause highlights" })).toBeVisible();
});

test("product gallery: the account tile plays the new-account flow, and holds when paused", async ({ page }) => {
  test.setTimeout(40_000);
  await page.goto("./#product");
  const gallery = page.locator(".hl");
  // Bring tile 2 to the front (this takes over the gallery; it doesn't pause the art).
  await gallery.getByRole("button", { name: /Go to highlight 2:/ }).click();
  await page.mouse.move(1, 1);
  const art = page.locator(".art-newacct");
  await expect(art.locator(".art-counter")).toHaveText("24/30", { timeout: 8000 });
  await expect(art).toHaveClass(/is-dialog/, { timeout: 8000 });
  await expect(art.getByText("London Office Kensington created")).toBeVisible();
  await expect(art).toHaveClass(/is-details/, { timeout: 8000 });
  await expect(art.locator(".art-acct-details")).toContainText("12345678");
  // Pause holds the drawing where it is.
  await gallery.getByRole("button", { name: "Play highlights" }).click();
  await gallery.getByRole("button", { name: "Pause highlights" }).click();
  const before = await art.evaluate((el) => el.className + el.querySelector(".art-counter").textContent);
  await page.waitForTimeout(4500);
  expect(await art.evaluate((el) => el.className + el.querySelector(".art-counter").textContent)).toBe(before);
});

test("product gallery: SEPA is tile 4, and the payee tile (5) plays the name check through to Send", async ({
  page,
}) => {
  test.setTimeout(40_000);
  await page.goto("./#product");
  const titles = page.locator(".hl-tile h3");
  await expect(titles.nth(3)).toHaveText("SEPA & SEPA Instant");
  await expect(titles.nth(4)).toHaveText("Confirmation of Payee");
  await page
    .locator(".hl")
    .getByRole("button", { name: /Go to highlight 5:/ })
    .click();
  await page.mouse.move(1, 1);
  const art = page.locator(".art-cop");
  await expect(art.locator(".art-bank")).toHaveClass(/is-on/, { timeout: 8000 });
  await expect(art).toHaveClass(/is-sheet/, { timeout: 10000 });
  await expect(art.getByText("Name is a close match")).toBeVisible();
  await expect(art.locator(".art-switch")).toHaveClass(/is-on/, { timeout: 12000 });
  await expect(art).toHaveClass(/is-sent/, { timeout: 8000 });
  await expect(art.getByText("€3,300 sent")).toBeVisible();
});

test("product gallery: the payee tile is a still of the name check under Reduce Motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./#product");
  const art = page.locator(".art-cop");
  await expect(art).toHaveClass(/is-sheet/);
  await expect(art.locator(".art-pointer")).toHaveCount(0);
});

test("product gallery: the account tile is a still picture under Reduce Motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./#product");
  const art = page.locator(".art-newacct");
  await expect(art.locator(".art-counter")).toHaveText("24/30");
  await expect(art.locator(".art-created")).toHaveCount(1);
  await expect(art.locator(".art-pointer")).toHaveCount(0);
  await page.waitForTimeout(3000);
  await expect(art).not.toHaveClass(/is-dialog|is-details/);
});

test("highlights gallery: holds while the pointer is over the tiles", async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), "hover");
  await page.goto("./#product");
  await page.locator(".hl-tile").first().hover();
  await expect
    .poll(() => page.locator(".hl-dot-progress").evaluate((el) => getComputedStyle(el).animationPlayState))
    .toBe("paused");
});

test("highlights gallery: never plays under Reduce Motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./#product");
  await expect(page.locator(".hl-dot-progress")).toHaveCount(0);
  await expect(page.locator(".hl").getByRole("button", { name: /Pause highlights|Play highlights/ })).toHaveCount(0);
});

test("cards: the physical card goes chip and PIN into the reader, then the notification; Pause holds it", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("./#cards");
  await page.locator("#cards").getByRole("tab", { name: "Physical" }).click();
  const stage = page.locator(".cr-stage");
  await expect(page.locator(".cr-amount")).toHaveText("S$248.60");
  // In from the bottom, chip first, then the PIN on the screen (the card stays in).
  await expect(page.locator(".cr-pin-title")).toHaveText("Enter PIN", { timeout: 8000 });
  await expect(stage).toHaveClass(/mode-insert/);
  await expect(page.locator(".cr-dots .is-on")).toHaveCount(4, { timeout: 4000 });
  await expect(page.locator(".cr-screen.is-approved")).toContainText("Approved", { timeout: 4000 });
  await expect(page.locator(".cr-sub")).toHaveText("Remove card", { timeout: 4000 });
  await expect(page.locator(".cr-notice")).toHaveClass(/is-on/, { timeout: 4000 });
  await expect(page.locator(".cr-notice")).toContainText("Telok Ayer Kitchen · −S$248.60");
  // Then the hotel deposit.
  await expect(page.locator(".cr-amount")).toHaveText("£300.00", { timeout: 10000 });
  // Pause holds the scene where it is; Play goes on.
  await page.getByRole("button", { name: "Pause the card demo" }).click();
  const before = await stage.getAttribute("class");
  await page.waitForTimeout(3000);
  expect(await stage.getAttribute("class")).toBe(before);
  await page.getByRole("button", { name: "Play the card demo" }).click();
  await expect(page.getByRole("button", { name: "Pause the card demo" })).toBeVisible();
});

test("cards: under Reduce Motion the physical card is a still, approved", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./#cards");
  await page.locator("#cards").getByRole("tab", { name: "Physical" }).click();
  await expect(page.locator(".cr-screen.is-approved")).toContainText("Approved");
  await expect(page.locator(".cr-notice")).toHaveClass(/is-on/);
  await expect(page.getByRole("button", { name: /the card demo/ })).toHaveCount(0);
  await page.waitForTimeout(2500);
  await expect(page.locator(".cr-notice")).toContainText("Telok Ayer Kitchen");
});

test("cards: segmented control switches card (click + arrow keys)", async ({ page }, testInfo) => {
  await page.goto("./#cards");
  const tabs = page.locator("#cards").getByRole("tab");
  const caption = page.locator("#cards-panel h3");
  await expect(caption).toHaveText(/Virtual cards/);
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(caption).toHaveText(/Physical cards/);
  // The physical card is the Gleec Pay card at a card reader (drawn, not a render).
  await expect(page.locator(".cr-card")).toContainText("Gleec Pay");
  await expect(page.locator(".cr-reader")).toHaveCount(1);
  if (!isMobile(testInfo)) {
    await tabs.nth(1).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.nth(0)).toBeFocused();
    await expect(caption).toHaveText(/Virtual cards/);
  }
  // It doesn't switch by itself.
  const before = await caption.textContent();
  await page.waitForTimeout(2000);
  await expect(caption).toHaveText(before);
});

test("explorer: account details read like a payer's bank asks for them", async ({ page }, testInfo) => {
  await page.goto("./#accounts");
  const section = page.locator("#accounts");
  const heading = section.locator("#xp-panel h3");
  const details = section.locator("#xp-panel dl");
  const markets = section.getByRole("tablist", { name: "Markets" }).getByRole("tab");
  const views = section.getByRole("tablist", { name: "Paying from" }).getByRole("tab");
  const labels = () => details.locator("dt").allTextContents();

  // UK: separate Local (sort code) and International (IBAN) details, same bank.
  await expect(heading).toHaveText("Global Account · GBP");
  await expect(views).toHaveText(["Local", "International"]);
  expect(await labels()).toEqual([
    "Recipient’s name",
    "Sort code",
    "Account number",
    "Recipient’s address",
    "Account provider",
    "Provider address",
  ]);
  await expect(details).toContainText("Gleec Pay Ltd");
  // The partner banks stay unnamed until they agree in writing (NDAs).
  await expect(section).not.toContainText(/ClearBank|Banking Circle|CLRB|BCIR/);
  await views.filter({ hasText: "International" }).click();
  await expect(views.filter({ hasText: "International" })).toHaveAttribute("aria-selected", "true");
  expect(await labels()).toEqual([
    "Recipient’s name",
    "IBAN",
    "SWIFT/BIC",
    "Recipient’s address",
    "Account provider",
    "Provider address",
  ]);
  await expect(details).toContainText("XXXXGB2L");

  // Everything but GBP: one European IBAN (SEPA and SWIFT), no switch.
  for (const [market, title, info] of [
    ["Eurozone", "Global Account · EUR", /SEPA and SEPA Instant/],
    ["United States", "Global Account · USD", /via SWIFT/],
    ["Global", "Global Account · Other currencies", /via SWIFT/],
  ]) {
    await markets.filter({ hasText: market }).click();
    await expect(heading).toHaveText(title);
    await expect(section.locator(".xp-panel-head .footnote")).toHaveText(info);
    await expect(section.getByRole("tablist", { name: "Paying from" })).toHaveCount(0);
    await expect(details).toContainText("XX00 XXXX 0000 1234 5678");
    await expect(details).toContainText("XXXXXXXX");
    await expect(details).toContainText("Gleec Pay Ltd");
  }
  // The identifier breakdown box is gone.
  await expect(section.locator(".xp-explain")).toHaveCount(0);

  // Back to the UK: the last view chosen there is remembered only while it exists.
  await markets.filter({ hasText: "United Kingdom" }).click();
  await expect(views.first()).toHaveAttribute("aria-selected", "true");

  if (!isMobile(testInfo)) {
    await markets.filter({ hasText: "United States" }).focus();
    await page.keyboard.press("ArrowDown");
    await expect(markets.filter({ hasText: "Global" })).toBeFocused();
    await expect(heading).toHaveText("Global Account · Other currencies");
    await markets.filter({ hasText: "United Kingdom" }).click();
    await views.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(views.nth(1)).toBeFocused();
    await expect(details).toContainText("XXXXGB2L");
  }
});

test("FAQ rows open and close; several can be open", async ({ page }) => {
  await page.goto("./#faq");
  const items = page.locator("#faq details");
  await expect(items).toHaveCount(10);
  await expect(items.nth(4)).toContainText("separate legal entities");
  await expect(items.first()).toHaveAttribute("open", "");
  await items.nth(3).locator("summary").click();
  await expect(items.nth(3)).toHaveAttribute("open", "");
  await expect(items.nth(3)).toContainText("fiat-only");
  await expect(items.first()).toHaveAttribute("open", "");
  await items.nth(3).locator("summary").click();
  await expect(items.nth(3)).not.toHaveAttribute("open");
});

test("footer carries the company's legal details", async ({ page }) => {
  await page.goto("./#legal");
  const legal = page.locator("#legal");
  await expect(legal).toContainText("company number 14776628");
  await expect(legal).toContainText("Registered office: Tower 42, 25 Old Broad Street, London EC2N 1HN");
  await expect(legal).not.toContainText("[insert");
});

// ---------------- Waitlist form ----------------
const STATS_API = "https://leads-api.test/api/stats";
const DETAILS_API = `${LEADS_API}/details`;

test("waitlist: pill field, live count and target launch", async ({ page }) => {
  await page.route(STATS_API, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"companies":1284}' }),
  );
  await page.goto("./#waitlist");
  const form = page.locator("#waitlist form");
  await expect(form.getByRole("textbox", { name: "Work email" })).toBeVisible();
  await expect(form.getByRole("button", { name: "Join" })).toBeDisabled();
  await expect(form.getByText("1,284 companies on the list")).toBeVisible();
  await expect(form.getByText("Target launch 2027, subject to FCA authorisation")).toBeVisible();
});

test("waitlist: product updates are a separate, unticked opt-in, with no paragraph under the form", async ({
  page,
}) => {
  const bodies = [];
  await page.route(LEADS_API, async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, contentType: "application/json", body: '{"ok":true,"id":"L1"}' });
  });
  await page.goto("./#waitlist");
  const form = page.locator("#waitlist form");
  const updates = form.getByRole("checkbox", { name: "Send me product updates" });
  await expect(updates).not.toBeChecked();
  // The footer's Privacy policy link covers it; nothing under the form.
  await expect(form.getByRole("link", { name: "Privacy policy" })).toHaveCount(0);
  await expect(form).not.toContainText("only to contact you");
  await expect(page.locator("footer").getByRole("link", { name: "Privacy policy" })).toHaveAttribute(
    "href",
    "/privacy/",
  );
  await expect(form).not.toContainText("By joining, you agree");

  await form.getByRole("textbox", { name: "Work email" }).fill("ada@example.co.uk");
  await form.getByRole("button", { name: "Join" }).click();
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0]).toMatchObject({ consent: true, updates: false });

  await page.reload();
  await page.locator("#waitlist form").getByRole("checkbox", { name: "Send me product updates" }).check();
  await page.locator("#waitlist form").getByRole("textbox", { name: "Work email" }).fill("ada@example.co.uk");
  await page.locator("#waitlist form").getByRole("button", { name: "Join" }).click();
  await expect.poll(() => bodies.length).toBe(2);
  expect(bodies[1]).toMatchObject({ updates: true });
});

test("company email is in the footer and on the contact page", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator(".footer").getByRole("link", { name: "hello@gleecpay.co.uk" })).toHaveAttribute(
    "href",
    "mailto:hello@gleecpay.co.uk",
  );
  await page.goto("/contact/");
  await expect(page.locator("main").getByRole("link", { name: "hello@gleecpay.co.uk" }).first()).toBeVisible();
});

test("waitlist: count is hidden when unavailable", async ({ page }) => {
  await page.route(STATS_API, (route) => route.fulfill({ status: 503, body: "{}" }));
  await page.goto("./#waitlist");
  await expect(page.locator("#waitlist").getByText("Target launch 2027, subject to FCA authorisation")).toBeVisible();
  await expect(page.locator("#waitlist").getByText(/on the list/)).toHaveCount(0);
});

test("waitlist: invalid email shows how to fix it", async ({ page }) => {
  let called = false;
  await page.route(LEADS_API, (route) => {
    called = true;
    return route.abort();
  });
  await page.goto("./#waitlist");
  const form = page.locator("#waitlist form");
  await form.getByRole("textbox", { name: "Work email" }).fill("not-an-email");
  await form.getByRole("button", { name: "Join" }).click();
  await expect(form.getByText("Enter an email address like name@company.com.")).toBeVisible();
  await expect(form.getByRole("textbox", { name: "Work email" })).toBeFocused();
  expect(called).toBe(false);
});

test("waitlist: join with email, then add details", async ({ page }) => {
  let joinBody;
  let detailsBody;
  await page.route(LEADS_API, async (route) => {
    joinBody = route.request().postDataJSON();
    await route.fulfill({ status: 201, contentType: "application/json", body: '{"ok":true,"id":"L1","token":"T1"}' });
  });
  await page.route(DETAILS_API, async (route) => {
    detailsBody = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  });
  await page.goto("./?utm_source=linkedin#waitlist");
  const section = page.locator("#waitlist");
  await page.waitForTimeout(2600); // the API's bot time-trap rejects instant submissions
  await section.getByRole("textbox", { name: "Work email" }).fill("ada@example.co.uk");
  await section.getByRole("button", { name: "Join" }).click();

  await expect(section.getByText("You’re on the list.")).toBeVisible();
  await expect(section.getByRole("heading", { name: "Need a tailored setup?" })).toBeVisible();
  expect(joinBody).toMatchObject({
    email: "ada@example.co.uk",
    consent: true,
    website: "",
    source: { utm_source: "linkedin" },
  });
  expect(joinBody.startedAt).toBeGreaterThan(0);

  // Only first and last name are required; no section sub-headers, no old fields.
  await expect(section.locator("legend")).toHaveCount(0);
  for (const gone of ["Phone", "Business type", "Expected monthly volume", "Currencies you need", "Message"])
    await expect(section.getByText(gone, { exact: true })).toHaveCount(0);
  const send = section.getByRole("button", { name: "Send Details" });
  await send.click();
  await expect(section.getByText("Enter your first name.")).toBeVisible();
  await expect(section.getByLabel("First name")).toBeFocused();
  expect(detailsBody).toBeUndefined();

  await section.getByLabel("First name").fill("Ada");
  await section.getByLabel("Last name").fill("Lovelace");
  const country = section.getByRole("button", { name: /Country of incorporation/ });
  await expect(country).toContainText("Choose…");
  await country.click();
  const list = section.getByRole("listbox");
  await expect(list.getByRole("option")).toHaveCount(37);
  await expect(list.getByRole("option").nth(4)).toHaveText("Jersey");
  await expect(list.getByRole("option").first()).toHaveText("United Kingdom");
  await expect(list.getByRole("option").last()).toHaveText("Other");
  await list.getByRole("option", { name: "Germany" }).click();
  await expect(list).toHaveCount(0);
  await expect(country).toHaveAccessibleName("Country of incorporation (optional) Germany");
  await expect(country.locator("svg.flag")).toHaveCount(1);
  await section.getByLabel("Company name").fill("Analytical Engines Ltd");
  await section.getByLabel("Company website").fill("analytical.example");
  await section.getByLabel("Anything else we should know?").fill("Multi-currency payouts.");
  await send.click();
  await expect(section.getByRole("heading", { name: "Thanks — we’ll be in touch." })).toBeVisible();
  expect(detailsBody).toEqual({
    id: "L1",
    token: "T1",
    firstName: "Ada",
    lastName: "Lovelace",
    country: "Germany",
    company: "Analytical Engines Ltd",
    companyWebsite: "analytical.example",
    message: "Multi-currency payouts.",
  });
});

test("waitlist: the country picker works from the keyboard and closes on Escape or outside", async ({ page }) => {
  await page.route(LEADS_API, (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: '{"ok":true,"id":"L1","token":"T1"}' }),
  );
  await page.goto("./#waitlist");
  const section = page.locator("#waitlist");
  await section.getByRole("textbox", { name: "Work email" }).fill("ada@example.co.uk");
  await section.getByRole("button", { name: "Join" }).click();
  const country = section.getByRole("button", { name: /Country of incorporation/ });
  const list = section.getByRole("listbox");

  await country.focus();
  await page.keyboard.press("ArrowDown");
  await expect(list).toBeFocused();
  await page.keyboard.press("s"); // Slovakia, the first country starting with S
  await page.keyboard.press("ArrowDown"); // Slovenia
  await page.keyboard.press("Enter");
  await expect(list).toHaveCount(0);
  await expect(country).toBeFocused();
  await expect(country).toContainText("Slovenia");

  await page.keyboard.press("Enter");
  await expect(list.getByRole("option", { name: "Slovenia" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await expect(list).toHaveCount(0);
  await expect(country).toContainText("Slovenia");

  await country.click();
  await expect(list).toBeVisible();
  await section.getByRole("heading", { name: "Need a tailored setup?" }).click();
  await expect(list).toHaveCount(0);

  // Every option has its own round flag, and the list stays inside the screen.
  await country.click();
  await expect(list.locator("svg.flag")).toHaveCount(37);
  // Real artwork for every country (only "Other" is the globe).
  await expect(list.locator("svg.flag rect[fill='#5E5CE6']")).toHaveCount(1);
  const box = await list.boundingBox();
  const width = page.viewportSize().width;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
});

test("waitlist: details can be skipped", async ({ page }) => {
  await page.route(LEADS_API, (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: '{"ok":true,"id":"L1","token":"T1"}' }),
  );
  await page.goto("./#waitlist");
  const section = page.locator("#waitlist");
  await section.getByRole("textbox", { name: "Work email" }).fill("ada@example.co.uk");
  await section.getByRole("button", { name: "Join" }).click();
  await section.getByRole("button", { name: "Not Now" }).click();
  await expect(section.getByRole("heading", { name: "You’re on the list." })).toBeVisible();
});

test("waitlist: the segment link the visitor used is sent with the details", async ({ page }) => {
  let detailsBody;
  await page.route(LEADS_API, (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: '{"ok":true,"id":"L1","token":"T1"}' }),
  );
  await page.route(DETAILS_API, async (route) => {
    detailsBody = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  });
  await page.goto("./");
  await page
    .locator(".seg-card")
    .nth(1)
    .getByRole("link", { name: /See If It Fits/ })
    .click();
  const section = page.locator("#waitlist");
  await section.getByRole("textbox", { name: "Work email" }).fill("ada@example.co.uk");
  await section.getByRole("button", { name: "Join" }).click();
  await section.getByLabel("First name").fill("Ada");
  await section.getByLabel("Last name").fill("Lovelace");
  await section.getByRole("button", { name: "Send Details" }).click();
  await expect(section.getByRole("heading", { name: "Thanks — we’ll be in touch." })).toBeVisible();
  expect(detailsBody).toMatchObject({ firstName: "Ada", businessType: "international" });
});

test("waitlist: server problems are explained and the email is kept", async ({ page }) => {
  let mode = "validation";
  await page.route(LEADS_API, (route) => {
    if (mode === "validation")
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "validation", fields: { email: "Use a company email address." } }),
      });
    if (mode === "429")
      return route.fulfill({
        status: 429,
        contentType: "application/json",
        body: '{"ok":false,"error":"rate_limited"}',
      });
    return route.abort("failed");
  });
  await page.goto("./#waitlist");
  const form = page.locator("#waitlist form");
  const email = form.getByRole("textbox", { name: "Work email" });
  await email.fill("ada@example.co.uk");
  await form.getByRole("button", { name: "Join" }).click();
  await expect(form.getByText("Use a company email address.")).toBeVisible();
  mode = "429";
  await form.getByRole("button", { name: "Join" }).click();
  await expect(form.getByRole("alert")).toContainText("Too many attempts");
  mode = "network";
  await form.getByRole("button", { name: "Join" }).click();
  await expect(form.getByRole("alert")).toContainText("Unable to reach the server");
  await expect(email).toHaveValue("ada@example.co.uk");
});

// ---------------- Product demo (hero) ----------------

const demoTab = (page, name) => page.locator(".demo").getByRole("tab", { name });
const finishProgress = (page) =>
  page.locator(".demo-tab-progress").evaluate((el) => el.getAnimations().forEach((a) => a.finish()));

test("demo: tabs switch the demo screen (click + arrow keys)", async ({ page }, testInfo) => {
  await page.goto("./");
  await expect(demoTab(page, "Accounts")).toHaveAttribute("aria-selected", "true");
  await demoTab(page, "Cards").click();
  await expect(demoTab(page, "Cards")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".demo-screen.is-active img")).toHaveAttribute("alt", /cards screen/);
  await expect(page.locator(".demo-caption")).toContainText("company cards");
  if (!isMobile(testInfo)) {
    await demoTab(page, "Cards").focus();
    await page.keyboard.press("ArrowRight");
    await expect(demoTab(page, "Payments")).toBeFocused();
    await expect(demoTab(page, "Payments")).toHaveAttribute("aria-selected", "true");
  }
});

test("demo: advances on its own, with a running progress fill in the current pill", async ({ page }, testInfo) => {
  await page.goto("./");
  await page.locator(".demo").scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  const fill = page.locator(".demo-tab.is-selected .demo-tab-progress");
  await expect.poll(() => fill.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("running");
  // 7 s a tab; where the Accounts recording plays (wider screens), its whole 17 s.
  expect(await fill.evaluate((el) => getComputedStyle(el).animationDuration)).toBe(isMobile(testInfo) ? "7s" : "17.4s");
  await finishProgress(page);
  await expect(demoTab(page, "Cards")).toHaveAttribute("aria-selected", "true");
  await finishProgress(page);
  await expect(demoTab(page, "Payments")).toHaveAttribute("aria-selected", "true");
  await finishProgress(page);
  await expect(demoTab(page, "Accounts")).toHaveAttribute("aria-selected", "true"); // wraps around
});

test("demo: pauses while hovered", async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), "hover");
  await page.goto("./");
  await page.locator(".demo-stage").hover();
  await expect
    .poll(() => page.locator(".demo-tab-progress").evaluate((el) => getComputedStyle(el).animationPlayState))
    .toBe("paused");
});

test("demo: stops for good once the visitor picks a tab", async ({ page }) => {
  await page.goto("./");
  await demoTab(page, "Payments").click();
  await page.mouse.move(1, 1);
  await expect(page.locator(".demo-tab-progress")).toHaveCount(0);
  await page.waitForTimeout(1500);
  await expect(demoTab(page, "Payments")).toHaveAttribute("aria-selected", "true");
});

test("demo: never auto-advances under Reduce Motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.locator(".demo-tab-progress")).toHaveCount(0);
  await expect(demoTab(page, "Accounts")).toHaveAttribute("aria-selected", "true");
});

test("demo: visible on first load, with phone-sized screens on phones", async ({ page }, testInfo) => {
  await page.goto("./");
  const visible = await page.evaluate(
    () => innerHeight - document.querySelector(".demo-window").getBoundingClientRect().top,
  );
  // At least ~200px of the app window shows without scrolling.
  expect(visible).toBeGreaterThan(200);
  if (isMobile(testInfo)) {
    // Phones keep the phone-shaped still (no video to download).
    await expect(page.locator(".demo-screen.is-active video")).toHaveCount(0);
    expect(await page.locator(".demo-screen.is-active img").evaluate((img) => img.currentSrc)).toMatch(/-mobile-/);
  } else {
    // Wider screens play the Accounts recording.
    await expect(page.locator(".demo-screen.is-active video")).toHaveCount(1);
  }
});

test("demo: the Accounts recording plays in the visitor's colour scheme", async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), "phones keep the still");
  for (const scheme of ["dark", "light"]) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("./");
    const video = page.locator(".demo-screen.is-active video");
    await expect(video.locator("source")).toHaveAttribute("src", new RegExp(`accounts-${scheme}.*\\.mp4`));
    await expect(video).toHaveAttribute("poster", new RegExp(`accounts-${scheme}-poster`));
    await expect.poll(() => video.evaluate((v) => !v.paused && v.readyState >= 2), { timeout: 8000 }).toBe(true);
  }
});

test("product gallery: every tile has art, hidden from screen readers, inside its tile", async ({ page }) => {
  await page.goto("./#product");
  const tiles = page.locator("#product .hl-tile");
  const n = await tiles.count();
  for (let i = 0; i < n; i++) {
    const art = tiles.nth(i).locator(".hl-art");
    await expect(art).toHaveCount(1);
    // Example data in drawings is decorative: either an img with empty alt or aria-hidden.
    const hidden = await art.evaluate(
      (el) => el.getAttribute("aria-hidden") === "true" || el.querySelector("img")?.alt === "",
    );
    expect(hidden).toBe(true);
  }
  const spill = await tiles.evaluateAll(
    (ts) =>
      ts.filter((t) => {
        const r = t.getBoundingClientRect();
        // Screens that scroll or slide (.art-screen) clip their own content: check the screen, not what waits off it.
        return [...t.querySelectorAll(".art *")].some((e) => {
          if (e.parentElement.closest(".art-screen")) return false;
          const q = e.getBoundingClientRect();
          return q.width && (q.left < r.left - 1 || q.right > r.right + 1 || q.bottom > r.bottom + 1);
        });
      }).length,
  );
  expect(spill).toBe(0);
});

test("cards: the virtual card pays from the phone's wallet; a visitor can take over", async ({ page }, testInfo) => {
  test.setTimeout(60_000); // up to three full payments, each with its real timings
  await page.goto("./#cards");
  const phone = page.locator(".wp");
  const side = page.getByRole("button", { name: /Side button/ });
  const live = page.locator(".wp [aria-live]");
  await expect(phone).toHaveAttribute("data-state", "idle");
  await expect(phone.getByText("Double Click")).toBeVisible();
  // One press takes over from the autoplay (Play is offered instead), and is only a nudge.
  await side.click();
  await expect(page.getByRole("button", { name: "Play the wallet demo" })).toBeVisible();
  await expect(phone).toHaveAttribute("data-state", "idle");
  // The whole area from "Double Click to Pay" to the side button takes the double-click.
  await phone.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await phone.locator(".wp-dcp-hit").dblclick();
  await expect(phone).toHaveAttribute("data-state", "auth");
  await expect(phone).toHaveAttribute("data-state", "pay", { timeout: 3000 });
  await expect(phone.getByText("Hold Near Reader", { exact: true })).toBeVisible();
  // Done: one label (never "Hold Near Reader" and "Done" at once) and the notification.
  await expect(phone).toHaveAttribute("data-state", "done", { timeout: 6000 });
  await expect(phone.locator(".wp-reader-label")).toHaveText("Done");
  await expect(phone.locator(".wp-reader-label")).toHaveCount(1);
  await expect(live).toContainText("Done. OpenAI −$2,400");
  await expect(phone.locator(".wp-banner")).toContainText("Marketing card · ChatGPT ads");
  await expect(phone).toHaveAttribute("data-state", "idle", { timeout: 6000 });

  // The cards at the bottom open the whole stack; pick another card (tap its visible strip).
  await page.getByRole("button", { name: /Show all cards/ }).click();
  await expect(phone).toHaveAttribute("data-state", "stack");
  await expect(page.getByRole("button", { name: /Pay with the .* card ending/ })).toHaveCount(5);
  // The page scrolls smoothly; centre the phone at once so the card holds still for the tap.
  await phone.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await page
    .getByRole("button", { name: "Pay with the Engineering card ending 3094" })
    .click({ position: { x: 60, y: 12 } });
  await expect(phone).toHaveAttribute("data-state", "pay", { timeout: 3000 });
  await expect(phone.locator(".wp-main-card")).toContainText("3094");
  // The card fills the screen's width, with equal margins (Safari once drew it narrow).
  const gaps = await phone.evaluate((el) => {
    const s = el.querySelector(".wp-screen").getBoundingClientRect();
    const c = el.querySelector(".wp-main-card").getBoundingClientRect();
    return [c.left - s.left, s.right - c.right];
  });
  expect(Math.abs(gaps[0] - gaps[1])).toBeLessThan(1.5);
  // Each team card pays its own merchant: Engineering pays xAI.
  await expect(phone).toHaveAttribute("data-state", "done", { timeout: 6000 });
  await expect(live).toContainText("Done. xAI −$300");
  await expect(phone.locator(".wp-banner")).toContainText("Engineering card · SuperGrok");
  await expect(phone).toHaveAttribute("data-state", "idle", { timeout: 6000 });
  if (!isMobile(testInfo)) {
    // Keyboard: one press of Enter on the side button starts it.
    await side.focus();
    await page.keyboard.press("Enter");
    await expect(phone).toHaveAttribute("data-state", "auth");
    await expect(phone).toHaveAttribute("data-state", "done", { timeout: 8000 });
    await expect(live).toContainText("Done. xAI −$300");
  }
});

test("cards: the wallet plays itself, Travel first; Pause freezes it and Play goes on", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("./#cards");
  const phone = page.locator(".wp");
  await phone.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.mouse.move(1, 1);
  // It opens the stack and taps the Travel card, which pays the hotel.
  await expect(phone).toHaveAttribute("data-state", "stack", { timeout: 6000 });
  await expect(phone).toHaveAttribute("data-state", "auth", { timeout: 4000 });
  await expect(phone.locator(".wp-main-card")).toContainText("5520");
  await expect(phone).toHaveAttribute("data-state", "done", { timeout: 8000 });
  await expect(page.locator(".wp [aria-live]")).toContainText("Done. The Ritz-Carlton −£1,240");
  // Pause freezes it where it is.
  await page.getByRole("button", { name: "Pause the wallet demo" }).click();
  await expect(phone).toHaveAttribute("data-paused", "");
  await page.waitForTimeout(4500);
  await expect(phone).toHaveAttribute("data-state", "done");
  // Play goes on, with the pointer still on the button: next is the Engineering card.
  await page.getByRole("button", { name: "Play the wallet demo" }).click();
  await expect(phone).toHaveAttribute("data-state", "stack", { timeout: 8000 });
  await expect(phone).toHaveAttribute("data-state", "auth", { timeout: 4000 });
  await expect(phone.locator(".wp-main-card")).toContainText("3094");
});

test("cards: the wallet never plays itself under Reduce Motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./#cards");
  await page.locator(".wp").evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await expect(page.getByRole("button", { name: /the wallet demo/ })).toHaveCount(0);
  await page.waitForTimeout(3000);
  await expect(page.locator(".wp")).toHaveAttribute("data-state", "idle");
});
