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
  await expect(page).toHaveTitle(/GLEEC Business/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https:\/\/.+og-image\.png$/);
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

// ---------------- Legal and regulatory pages ----------------
const LEGAL = [
  ["/regulatory/", "Regulatory information", "not currently authorised by the FCA"],
  ["/safeguarding/", "How your money will be protected", "not covered by the FSCS"],
  ["/privacy/", "Privacy policy", "ico.org.uk/make-a-complaint"],
  ["/cookies/", "Cookie policy", "does not use cookies"],
  ["/terms/", "Website terms of use", "laws of England and Wales"],
  ["/complaints/", "Complaints", "financial-ombudsman.org.uk"],
  ["/contact/", "Contact us", "14776628"],
  ["/accessibility/", "Accessibility statement", "WCAG"],
];

test("footer links open every legal page", async ({ page }) => {
  await page.goto("./");
  for (const [path] of LEGAL) {
    await expect(page.locator(`footer a[href="${path}"]`), `footer link to ${path}`).toHaveCount(1);
  }
  await expect(page.locator("footer .soon"), "no 'coming soon' placeholders in the footer").toHaveCount(0);
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
  await page.getByRole("textbox", { name: "Work email" }).fill("someone@example.com");
  expect(await context.cookies(), "cookies").toEqual([]);
  const stored = await page.evaluate(() => localStorage.length + sessionStorage.length);
  expect(stored, "local/session storage entries").toBe(0);
});

for (const [path, title, text] of LEGAL) {
  test(`legal page ${path}: prerendered, titled, linked back home`, async ({ page, request }, testInfo) => {
    const html = await (await request.get(path)).text();
    expect(html, "own <title>").toContain(`<title>${title} — GLEEC Business</title>`);
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
    ["Product", "highlights"],
    ["Payments", "payments"],
    ["Pricing", "plans"],
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

test("hero has a single action: Join the Waitlist", async ({ page }) => {
  await page.goto("./");
  const hero = page.locator(".hero-top");
  await expect(hero.getByRole("link")).toHaveCount(1);
  await hero.getByRole("link", { name: "Join the Waitlist" }).click();
  await expect(page.locator("#waitlist form")).toBeInViewport();
});

test("headline reads as one sentence and its first line follows the demo tab", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Business accounts, corporate cards and global payments for companies that don’t fit the default box.",
  );
  const phrase = page.locator('.rot-phrase[data-state="in"]');
  await expect(phrase).toHaveText("Business\u00a0accounts");
  await page.locator(".demo").getByRole("tab", { name: "Cards" }).click();
  await expect(phrase).toHaveText("Corporate\u00a0cards");
  await page.locator(".demo").getByRole("tab", { name: "Payments" }).click();
  await expect(phrase).toHaveText("Global\u00a0payments");
  await expect(page.locator(".rot-phrase")).toHaveCount(3);
});

test("highlights gallery: dots and paddles move it; it never moves on its own", async ({ page }, testInfo) => {
  await page.goto("./#highlights");
  const gallery = page.locator(".hl");
  const current = gallery.locator(".hl-dot[aria-current='true']");
  await expect(current).toHaveAttribute("aria-label", /highlight 1:/);

  await page.waitForTimeout(3000);
  await expect(current, "gallery advanced by itself").toHaveAttribute("aria-label", /highlight 1:/);

  await gallery.getByRole("button", { name: /Go to highlight 4/ }).click();
  await expect(current).toHaveAttribute("aria-label", /highlight 4:/);
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
    await gallery.getByRole("button", { name: /Go to highlight 1/ }).click();
    await expect(gallery.getByRole("button", { name: "Previous highlight" })).toBeDisabled();
  }

  // Scrolling the gallery directly (swipe / trackpad) updates the page control.
  await gallery.locator(".hl-scroller").evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: "instant" }));
  await expect(current).toHaveAttribute("aria-label", /highlight 7:/);
});

test("cards: segmented control switches card (click + arrow keys)", async ({ page }, testInfo) => {
  await page.goto("./#cards");
  const tabs = page.locator("#cards").getByRole("tab");
  const caption = page.locator("#cards-panel h3");
  await expect(caption).toHaveText(/Virtual cards/);
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(caption).toHaveText(/Physical cards/);
  await expect(page.locator(".cards-scene.is-current img.front")).toHaveAttribute("src", /card-physical/);
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

test("explorer: every market and method shows matching details", async ({ page }, testInfo) => {
  await page.goto("./#payments");
  const section = page.locator("#payments");
  const heading = section.locator("#xp-panel h3");
  const markets = section.getByRole("tablist", { name: "Markets" }).getByRole("tab");
  const methods = section.getByRole("tablist", { name: "Transfer method" }).getByRole("tab");
  const expected = [
    ["United Kingdom", "GBP account · United Kingdom", ["GBP Local", "SWIFT"]],
    ["Eurozone", "EUR account · Eurozone", ["EUR Local", "SEPA", "SEPA Instant", "SWIFT"]],
    ["United States", "USD account · United States", ["ACH", "Fedwire", "SWIFT"]],
    ["Global", "Multi-currency account · Global", ["SWIFT"]],
  ];
  for (const [market, title, labels] of expected) {
    await markets.filter({ hasText: market }).click();
    await expect(markets.filter({ hasText: market })).toHaveAttribute("aria-selected", "true");
    await expect(heading).toHaveText(title);
    await expect(methods).toHaveText(labels);
    await expect(methods.and(page.locator('[aria-selected="true"]'))).toHaveCount(1);
    for (let i = 0; i < labels.length; i++) {
      await methods.nth(i).click();
      await expect(methods.nth(i)).toHaveAttribute("aria-selected", "true");
      await expect(heading).toHaveText(title);
    }
  }
  // An unsupported method falls back to the market's first one.
  await markets.filter({ hasText: "Eurozone" }).click();
  await methods.filter({ hasText: "SEPA Instant" }).click();
  await markets.filter({ hasText: "United States" }).click();
  await expect(methods.filter({ hasText: "ACH" })).toHaveAttribute("aria-selected", "true");
  await expect(section.locator(".xp-explain .xp-group-title")).toHaveText("Routing & account");

  if (!isMobile(testInfo)) {
    await markets.filter({ hasText: "United States" }).focus();
    await page.keyboard.press("ArrowDown");
    await expect(markets.filter({ hasText: "Global" })).toBeFocused();
    await expect(heading).toHaveText("Multi-currency account · Global");
    await markets.filter({ hasText: "United Kingdom" }).click();
    await methods.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(methods.nth(1)).toBeFocused();
    await expect(section.locator(".xp-explain .xp-group-title")).toHaveText("SWIFT / BIC");
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

test("waitlist: pill field, live count and planned launch", async ({ page }) => {
  await page.route(STATS_API, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"companies":1284}' }),
  );
  await page.goto("./#waitlist");
  const form = page.locator("#waitlist form");
  await expect(form.getByRole("textbox", { name: "Work email" })).toBeVisible();
  await expect(form.getByRole("button", { name: "Join" })).toBeDisabled();
  await expect(form.getByText("1,284 companies on the list")).toBeVisible();
  await expect(form.getByText("Planned launch: Q2 2027")).toBeVisible();
});

test("waitlist: count is hidden when unavailable", async ({ page }) => {
  await page.route(STATS_API, (route) => route.fulfill({ status: 503, body: "{}" }));
  await page.goto("./#waitlist");
  await expect(page.locator("#waitlist").getByText("Planned launch: Q2 2027")).toBeVisible();
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

  const send = section.getByRole("button", { name: "Send Details" });
  await expect(send).toBeDisabled();
  await section.getByLabel("Full name").fill("Ada Lovelace");
  await section.getByLabel("Company name").fill("Analytical Engines Ltd");
  await section.getByLabel("Business type").selectOption("international");
  await section.getByRole("button", { name: "EUR" }).click();
  await expect(section.getByRole("button", { name: "EUR" })).toHaveAttribute("aria-pressed", "true");
  await send.click();
  await expect(section.getByRole("heading", { name: "Thanks — we’ll be in touch." })).toBeVisible();
  expect(detailsBody).toMatchObject({
    id: "L1",
    token: "T1",
    fullName: "Ada Lovelace",
    company: "Analytical Engines Ltd",
    businessType: "international",
    currencies: ["EUR"],
  });
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

test("waitlist: segment links pre-select the business type for the details step", async ({ page }) => {
  await page.route(LEADS_API, (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: '{"ok":true,"id":"L1","token":"T1"}' }),
  );
  await page.goto("./");
  await page
    .locator(".seg-card")
    .nth(1)
    .getByRole("link", { name: /See If It Fits/ })
    .click();
  const section = page.locator("#waitlist");
  await section.getByRole("textbox", { name: "Work email" }).fill("ada@example.co.uk");
  await section.getByRole("button", { name: "Join" }).click();
  await expect(section.getByLabel("Business type")).toHaveValue("international");
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

test("demo: advances on its own, with a running progress fill in the current pill", async ({ page }) => {
  await page.goto("./");
  await page.locator(".demo").scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  const fill = page.locator(".demo-tab.is-selected .demo-tab-progress");
  await expect.poll(() => fill.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("running");
  expect(await fill.evaluate((el) => getComputedStyle(el).animationDuration)).toBe("7s");
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
  const r = await page.evaluate(() => {
    const win = document.querySelector(".demo-window").getBoundingClientRect();
    const img = document.querySelector(".demo-screen.is-active img");
    return { visible: innerHeight - win.top, src: img.currentSrc };
  });
  // At least ~200px of the app window shows without scrolling.
  expect(r.visible).toBeGreaterThan(200);
  if (isMobile(testInfo)) expect(r.src).toMatch(/-mobile-/);
  else expect(r.src).not.toMatch(/-mobile-/);
});
