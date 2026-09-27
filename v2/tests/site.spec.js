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
  expect(html).toContain("Business accounts for companies that");
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

test("every in-page link resolves; no dead links", async ({ page }) => {
  await page.goto("./");
  const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
  expect(hrefs.length).toBeGreaterThan(20);
  for (const href of hrefs) {
    expect(href, "dead link").not.toBe("#");
    expect(href, "link to a page that does not exist").not.toMatch(/\.html/);
    if (href.startsWith("#")) await expect(page.locator(href), `target for ${href}`).toHaveCount(1);
  }
});

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

test("hero actions go to the form and the plans", async ({ page }) => {
  await page.goto("./");
  await page.locator(".hero").getByRole("link", { name: "Join the Waitlist" }).click();
  await expect(page.locator("#waitlist form")).toBeInViewport();
  await page.goto("./");
  await page
    .locator(".hero")
    .getByRole("link", { name: /View Plans/ })
    .click();
  await expect(page.locator("#plans")).toBeInViewport();
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
  await expect(items).toHaveCount(9);
  await expect(items.first()).toHaveAttribute("open", "");
  await items.nth(3).locator("summary").click();
  await expect(items.nth(3)).toHaveAttribute("open", "");
  await expect(items.nth(3)).toContainText("fiat-only");
  await expect(items.first()).toHaveAttribute("open", "");
  await items.nth(3).locator("summary").click();
  await expect(items.nth(3)).not.toHaveAttribute("open");
});

test("segment and plan links pre-select the business type", async ({ page }) => {
  await page.goto("./");
  await page
    .locator(".seg-card")
    .nth(1)
    .getByRole("link", { name: /See If It Fits/ })
    .click();
  await expect(page.locator("#waitlist select[name=businessType]")).toHaveValue("international");
  await page
    .locator(".plan-bespoke")
    .getByRole("link", { name: /Speak to Us/ })
    .click();
  await expect(page.locator("#waitlist select[name=businessType]")).toHaveValue("group");
});

// ---------------- Waitlist form ----------------

async function fillRequired(form) {
  await form.getByLabel("Full name").fill("Ada Lovelace");
  await form.getByLabel("Work email").fill("ada@example.co.uk");
  await form.getByLabel("Company name").fill("Analytical Engines Ltd");
  await form.getByLabel("Country of incorporation").fill("United Kingdom");
  await form.getByRole("checkbox", { name: /I agree/ }).check();
}

test("form: submit is unavailable until required fields are filled; errors appear on leaving a field", async ({
  page,
}) => {
  await page.goto("./#waitlist");
  const form = page.locator("#waitlist form");
  const submit = form.getByRole("button", { name: "Join the Waitlist" });
  await expect(submit).toBeDisabled();
  await expect(form.getByText(/Fill in your name, work email/)).toBeVisible();

  await form.getByLabel("Work email").fill("not-an-email");
  await form.getByLabel("Work email").blur();
  await expect(form.getByText("Enter an email address like name@company.com.")).toBeVisible();
  await expect(form.getByLabel("Work email")).toHaveAttribute("aria-invalid", "true");

  await fillRequired(form);
  await form.getByLabel("Work email").fill("not-an-email");
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(form.getByLabel("Work email")).toBeFocused();
});

test("form: valid submission posts the lead and shows the success state", async ({ page }) => {
  let body;
  await page.route(LEADS_API, async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 201, contentType: "application/json", body: '{"ok":true,"id":"t"}' });
  });
  await page.goto("./?utm_source=linkedin#waitlist");
  const form = page.locator("#waitlist form");
  await page.waitForTimeout(2600); // the API's bot time-trap rejects instant submissions
  await fillRequired(form);
  await form.getByLabel("Phone").fill("+44 20 7946 0000");
  await form.getByLabel("Business type").selectOption("international");
  await form.getByLabel("Expected monthly volume").selectOption("250k_1m");
  await form.getByRole("button", { name: "EUR" }).click();
  await form.getByRole("button", { name: "USD" }).click();
  await expect(form.getByRole("button", { name: "EUR" })).toHaveAttribute("aria-pressed", "true");
  await form.getByLabel("Message").fill("Receivables in EUR, payouts in USD.");
  await form.getByRole("button", { name: "Join the Waitlist" }).click();
  await expect(page.getByRole("heading", { name: "You’re on the list, Ada" })).toBeVisible();
  expect(body).toMatchObject({
    fullName: "Ada Lovelace",
    email: "ada@example.co.uk",
    company: "Analytical Engines Ltd",
    country: "United Kingdom",
    phone: "+44 20 7946 0000",
    businessType: "international",
    currencies: ["EUR", "USD"],
    monthlyVolume: "250k_1m",
    message: "Receivables in EUR, payouts in USD.",
    consent: true,
    website: "",
    source: { utm_source: "linkedin" },
  });
  await page.getByRole("button", { name: "Register Another Company" }).click();
  await expect(form.getByLabel("Full name")).toHaveValue("");
});

test("form: server errors are shown next to the field or above the button", async ({ page }) => {
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
  const submit = form.getByRole("button", { name: "Join the Waitlist" });
  await fillRequired(form);
  await submit.click();
  await expect(form.getByText("Use a company email address.")).toBeVisible();
  await expect(form.getByLabel("Work email")).toBeFocused();
  mode = "429";
  await submit.click();
  await expect(form.getByRole("alert")).toContainText("Too many attempts");
  mode = "network";
  await submit.click();
  await expect(form.getByRole("alert")).toContainText("Unable to reach the server");
  await expect(form.getByLabel("Company name")).toHaveValue("Analytical Engines Ltd");
});
