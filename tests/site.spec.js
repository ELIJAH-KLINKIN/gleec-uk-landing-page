// End-to-end checks for the landing page: renders cleanly, every link has a
// destination, every control works, and the waitlist form handles each API
// outcome. The lead API is always mocked — tests never create real leads.
import { test, expect } from "@playwright/test";

const LEADS_API = "https://leads-api.test/api/leads";

// Collect console errors / page errors (incl. React hydration mismatches).
// Tests aborting a request on purpose log a network error; those are allowed.
let consoleErrors = [];
test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    const text = m.text();
    if (/Failed to load resource|ERR_FAILED|net::/.test(text)) return;
    if (m.type() === "error" || (m.type() === "warning" && /hydrat/i.test(text))) consoleErrors.push(text);
  });
});

test.afterEach(async () => {
  expect(consoleErrors, "console errors").toEqual([]);
});

const isMobile = (testInfo) => testInfo.project.name === "mobile";

test("renders prerendered HTML with correct metadata", async ({ page, request }) => {
  // The raw HTML (before any JS) already contains the page content.
  const html = await (await request.get("./")).text();
  expect(html).toContain("Business accounts for companies that");
  expect(html).toContain('id="waitlist"');

  await page.goto("./");
  await expect(page).toHaveTitle(/GLEEC Business/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https:\/\/.+og-image\.png$/);
  await expect(page.locator("h1")).toHaveCount(1);
});

test("every in-page link points at an element that exists, and nothing is a dead '#'", async ({ page }) => {
  await page.goto("./");
  const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
  expect(hrefs.length).toBeGreaterThan(20);
  for (const href of hrefs) {
    expect(href, "dead link").not.toBe("#");
    expect(href, "link to a page that does not exist").not.toMatch(/\.html/);
    if (href.startsWith("#")) {
      await expect(page.locator(href), `target for ${href}`).toHaveCount(1);
    }
  }
});

test("all images load", async ({ page }) => {
  await page.goto("./");
  // Scroll through so lazy images load.
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 800) await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForLoadState("networkidle");
  const broken = await page.$$eval("img", (imgs) =>
    imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src),
  );
  expect(broken).toEqual([]);
});

test("no horizontal overflow", async ({ page }) => {
  await page.goto("./");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("skip link is hidden until focused", async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), "keyboard-only");
  await page.goto("./");
  const skip = page.locator(".gl-skip");
  expect((await skip.boundingBox()).y).toBeLessThan(0);
  await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
  await expect.poll(async () => (await skip.boundingBox()).y).toBeGreaterThanOrEqual(0);
});

test("nav links scroll to their sections", async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo), "desktop nav");
  await page.goto("./");
  for (const [label, id] of [
    ["Product", "product"],
    ["Payments", "payments"],
    ["Pricing", "plans"],
    ["FAQ", "faq"],
  ]) {
    await page.locator(".gl-nav-links").getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
});

test("mobile menu opens, navigates and closes", async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo), "mobile nav");
  await page.goto("./");
  const toggle = page.getByRole("button", { name: "Open menu" });
  await expect(page.locator(".gl-nav-links")).toBeHidden();
  await toggle.click();
  const menu = page.locator("#gl-nav-menu");
  await expect(menu).toBeVisible();
  await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
  await menu.getByRole("link", { name: "Cards" }).click();
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/#cards$/);
  await expect(page.locator("#cards")).toBeInViewport();
  // Escape closes it too.
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});

test("hero CTAs go to the waitlist form and the plans", async ({ page }) => {
  await page.goto("./");
  const hero = page.locator(".gl-home-hero");
  await hero.getByRole("link", { name: /Join waitlist/ }).click();
  await expect(page.locator("#waitlist form")).toBeInViewport();
  await page.goto("./");
  await hero.getByRole("link", { name: "View pricing" }).click();
  await expect(page.locator("#plans")).toBeInViewport();
});

test("feature carousel: prev / next / dots / play-pause / autoplay", async ({ page }) => {
  await page.goto("./");
  const carousel = page.locator(".gl-fc-carousel");
  await carousel.scrollIntoViewIfNeeded();
  const active = carousel.locator(".gl-fc-card.is-active .gl-fc-title");
  await expect(active).toHaveText("GBP, EUR & USD business accounts");

  await carousel.getByRole("button", { name: "Next slide" }).click();
  await expect(active).toHaveText("Named virtual IBANs");
  await carousel.getByRole("button", { name: "Previous slide" }).click();
  await expect(active).toHaveText("GBP, EUR & USD business accounts");
  await carousel.getByRole("button", { name: /Go to slide 5/ }).click();
  await expect(active).toHaveText("SWIFT & USD connectivity");
  await expect(carousel.getByRole("button", { name: /Go to slide 5/ })).toHaveAttribute("aria-current", "true");
  // Wraps around.
  await carousel.getByRole("button", { name: /Go to slide 7/ }).click();
  await carousel.getByRole("button", { name: "Next slide" }).click();
  await expect(active).toHaveText("GBP, EUR & USD business accounts");

  // Clicking the (partly visible) next card selects it — once the track has
  // finished sliding, click near its left edge.
  const nextCard = carousel.locator("#gl-fc-slide-1");
  await expect(nextCard).toBeInViewport();
  await page.waitForTimeout(900);
  await nextCard.click({ position: { x: 12, y: 200 } });
  await expect(active).toHaveText("Named virtual IBANs");

  // The countdown runs while the carousel is on screen and the pointer is elsewhere...
  await page.mouse.move(2, 2);
  const fill = carousel.locator(".gl-fc-dot-fill");
  await expect.poll(() => fill.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("running");
  // ...and speeds through to the next slide when it finishes.
  await fill.evaluate((el) => el.getAnimations().forEach((a) => a.finish()));
  await expect(active).toHaveText("Faster Payments, CHAPS & BACS");

  // Pause stops it; play resumes it.
  const pause = carousel.getByRole("button", { name: "Pause automatic slide show" });
  await pause.click();
  await expect(carousel.getByRole("button", { name: "Start automatic slide show" })).toBeVisible();
  await page.mouse.move(2, 2);
  await expect.poll(() => fill.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("paused");
  await carousel.getByRole("button", { name: "Start automatic slide show" }).click();
  await page.mouse.move(2, 2);
  await expect.poll(() => fill.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("running");
});

test("carousels start paused when the OS asks for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  const carousel = page.locator(".gl-fc-carousel");
  await carousel.scrollIntoViewIfNeeded();
  await expect(carousel.getByRole("button", { name: "Start automatic slide show" })).toBeVisible();
  await expect
    .poll(() => carousel.locator(".gl-fc-dot-fill").evaluate((el) => getComputedStyle(el).animationPlayState))
    .toBe("paused");
});

test("company cards: tabs switch card type (click + arrow keys)", async ({ page }, testInfo) => {
  await page.goto("./#cards");
  const tabs = page.locator("#cards").getByRole("tab");
  const caption = page.locator("#gl-hc-panel h3");
  await expect(caption).toHaveText(/Virtual cards/);
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(caption).toHaveText(/Physical cards/);
  await expect(page.locator(".gl-hc-scene.is-on img").first()).toHaveAttribute("src", /card-physical/);
  if (!isMobile(testInfo)) {
    await tabs.nth(1).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(0)).toBeFocused();
    await expect(caption).toHaveText(/Virtual cards/);
  }
});

test("global accounts explorer: every market and method shows matching details", async ({ page }, testInfo) => {
  await page.goto("./#payments");
  const section = page.locator("#payments");
  const heading = section.locator(".gl-gae-card-h");
  const markets = section.getByRole("tablist", { name: "Markets" }).getByRole("tab");
  const methods = section.getByRole("tablist", { name: "Transfer method" }).getByRole("tab");

  const expected = [
    ["United Kingdom", "GBP Account · United Kingdom", ["GBP Local", "SWIFT"]],
    ["Eurozone", "EUR Account · Eurozone", ["EUR Local", "SEPA", "SEPA Instant", "SWIFT"]],
    ["United States", "USD Account · United States", ["ACH", "Fedwire", "SWIFT"]],
    ["Global", "Multi Account · Global", ["SWIFT"]],
  ];
  for (const [market, title, methodLabels] of expected) {
    await markets.filter({ hasText: market }).click();
    await expect(markets.filter({ hasText: market })).toHaveAttribute("aria-selected", "true");
    await expect(heading).toHaveText(title);
    await expect(methods).toHaveText(methodLabels);
    // Exactly one method is selected (the previous one if this market supports it).
    await expect(methods.and(page.locator('[aria-selected="true"]'))).toHaveCount(1);
    for (let i = 0; i < methodLabels.length; i++) {
      await methods.nth(i).click();
      await expect(methods.nth(i)).toHaveAttribute("aria-selected", "true");
      await expect(heading).toHaveText(title);
      await expect(section.locator(".gl-gae-explain")).toBeVisible();
    }
  }
  // Changing market resets an unsupported method (SEPA Instant → US has none).
  await markets.filter({ hasText: "Eurozone" }).click();
  await methods.filter({ hasText: "SEPA Instant" }).click();
  await markets.filter({ hasText: "United States" }).click();
  await expect(methods.filter({ hasText: "ACH" })).toHaveAttribute("aria-selected", "true");
  await expect(section.locator(".gl-gae-explain-eye")).toHaveText("Routing & Account");

  if (!isMobile(testInfo)) {
    // Keyboard: arrows move between markets.
    await markets.filter({ hasText: "United States" }).focus();
    await page.keyboard.press("ArrowDown");
    await expect(markets.filter({ hasText: "Global" })).toBeFocused();
    await expect(heading).toHaveText("Multi Account · Global");
  }
});

test("FAQ items expand and collapse", async ({ page }) => {
  await page.goto("./#faq");
  const questions = page.locator("#faq .gl-px-faq-q");
  await expect(questions).toHaveCount(9);
  await expect(questions.first()).toHaveAttribute("aria-expanded", "true");
  await questions.nth(3).click();
  await expect(questions.nth(3)).toHaveAttribute("aria-expanded", "true");
  await expect(questions.first()).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#faq .gl-px-faq-a")).toContainText("fiat-only");
  await questions.nth(3).click();
  await expect(questions.nth(3)).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#faq .gl-px-faq-a")).toHaveCount(0);
});

test("segment CTAs pre-select the business type in the form", async ({ page }) => {
  await page.goto("./");
  await page
    .locator(".gl-seg.is-featured")
    .getByRole("link", { name: /See if it fits/ })
    .click();
  await expect(page.locator("#waitlist select[name=businessType]")).toHaveValue("international");
  await page
    .locator(".gl-plan-callout")
    .getByRole("link", { name: /Speak to us/ })
    .click();
  await expect(page.locator("#waitlist select[name=businessType]")).toHaveValue("group");
});

// ---------------- Waitlist form ----------------

async function fillValid(form) {
  await form.getByLabel("Full name").fill("Ada Lovelace");
  await form.getByLabel("Work email").fill("ada@example.co.uk");
  await form.getByLabel("Company name").fill("Analytical Engines Ltd");
  await form.getByLabel("Country of incorporation").fill("United Kingdom");
  await form.getByLabel("Phone").fill("+44 20 7946 0000");
  await form.getByLabel("Business type").selectOption("international");
  await form.getByText("EUR", { exact: true }).click();
  await form.getByText("USD", { exact: true }).click();
  await form.getByLabel("Expected monthly volume").selectOption("250k_1m");
  await form.getByLabel("Anything we should know?").fill("Receivables in EUR, payouts in USD.");
  await form.getByRole("checkbox", { name: /I agree/ }).check();
}

test("form: empty submit shows errors and focuses the first invalid field", async ({ page }) => {
  let called = false;
  await page.route(LEADS_API, (route) => {
    called = true;
    return route.abort();
  });
  await page.goto("./#waitlist");
  const form = page.locator("#waitlist form");
  await form.getByRole("button", { name: /Join waitlist/ }).click();
  await expect(form.getByLabel("Full name")).toBeFocused();
  await expect(form.getByLabel("Full name")).toHaveAttribute("aria-invalid", "true");
  await expect(form.getByText("Please enter your work email.")).toBeVisible();
  await expect(form.getByText("Please confirm we may contact you.")).toBeVisible();
  await form.getByLabel("Work email").fill("not-an-email");
  await form.getByLabel("Work email").blur();
  await expect(form.getByText("Please enter a valid email address.")).toBeVisible();
  expect(called).toBe(false);
});

test("form: valid submission posts the lead and shows the success state", async ({ page }) => {
  let body;
  await page.route(LEADS_API, async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, id: "test-id" }),
    });
  });
  await page.goto("./?utm_source=linkedin&utm_campaign=launch#waitlist");
  const form = page.locator("#waitlist form");
  await page.waitForTimeout(2600); // the API's bot time-trap rejects instant submissions
  await fillValid(form);
  await form.getByRole("button", { name: /Join waitlist/ }).click();
  await expect(page.getByRole("heading", { name: "You're on the list, Ada" })).toBeVisible();

  expect(body).toMatchObject({
    fullName: "Ada Lovelace",
    email: "ada@example.co.uk",
    company: "Analytical Engines Ltd",
    country: "United Kingdom",
    phone: "+44 20 7946 0000",
    businessType: "international",
    currencies: ["EUR", "USD"],
    monthlyVolume: "250k_1m",
    consent: true,
    website: "",
    source: { utm_source: "linkedin", utm_campaign: "launch" },
  });
  expect(body.startedAt).toBeGreaterThan(0);

  // Can register another company afterwards.
  await page.getByRole("button", { name: "Register another company" }).click();
  await expect(form.getByLabel("Full name")).toHaveValue("");
});

test("form: server-side validation errors are shown on the fields", async ({ page }) => {
  await page.route(LEADS_API, (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: "validation",
        fields: { email: "This email domain can't receive mail." },
      }),
    }),
  );
  await page.goto("./#waitlist");
  const form = page.locator("#waitlist form");
  await fillValid(form);
  await form.getByRole("button", { name: /Join waitlist/ }).click();
  await expect(form.getByText("This email domain can't receive mail.")).toBeVisible();
  await expect(form.getByLabel("Work email")).toBeFocused();
  await expect(form.getByRole("alert")).toContainText("Please check the highlighted fields.");
});

test("form: rate limiting and network failures show a clear message and keep the input", async ({ page }) => {
  let mode = "429";
  await page.route(LEADS_API, (route) =>
    mode === "429"
      ? route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, error: "rate_limited" }),
        })
      : route.abort("failed"),
  );
  await page.goto("./#waitlist");
  const form = page.locator("#waitlist form");
  await fillValid(form);
  const submit = form.getByRole("button", { name: /Join waitlist/ });
  await submit.click();
  await expect(form.getByRole("alert")).toContainText("Too many attempts");
  mode = "network";
  await submit.click();
  await expect(form.getByRole("alert")).toContainText("couldn't reach our server");
  await expect(form.getByLabel("Company name")).toHaveValue("Analytical Engines Ltd");
});
