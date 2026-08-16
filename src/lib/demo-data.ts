import type { DiagnoseRequest, DiagnosisResult, Framework } from "./types";

/**
 * Canned example matching the "btn-debug -> getByRole" walkthrough from the product spec.
 * Lets the app be fully demoed without a Gemini API key configured yet.
 */
export const DEMO_REQUEST: DiagnoseRequest = {
  framework: "playwright-ts",
  testCode: `test("opens the debug info panel", async ({ page }) => {
  await page.goto("/dashboard");
  await page.locator("button.btn-debug").click();
  await expect(page.locator(".debug-panel")).toBeVisible();
});`,
  ciLog: `1) dashboard.spec.ts:12:38 › opens the debug info panel

  TimeoutError: locator.click: Timeout 30000ms exceeded.
  =========================== logs ===========================
  waiting for locator('button.btn-debug')
  locator resolved to <button class="btn-debug relative z-10">…</button>
  attempting click action
    2 × waiting for element to be stable
    2 × element is visible, enabled and stable
    2 × scrolling into view if needed
    2 × done scrolling
    2 × <div class="header-overlay absolute inset-0 z-20"></div> intercepts pointer events
  ==============================================================

      at dashboard.spec.ts:12:38`,
  domSnippet: `<header class="dashboard-header">
  <div class="header-overlay absolute inset-0 z-20"></div>
  <button class="btn-debug relative z-10" aria-label="Opens Debug Info">
    <svg class="icon" aria-hidden="true">...</svg>
  </button>
</header>`,
};

export const DEMO_RESULT: DiagnosisResult = {
  framework: "playwright-ts",
  failureType: "locator_breakage",
  confidence: 92,
  risk: "low",
  rootCause:
    "The test targets button.btn-debug by CSS class, but a decorative header-overlay div (z-20) sits on top of the button (z-10) and intercepts pointer events, so Playwright times out on the click. The button already exposes a stable accessible name that isn't affected by the overlay or future CSS changes.",
  evidence: [
    "Selector locator('button.btn-debug') depends on a brittle CSS class",
    "CI log shows: <div class=\"header-overlay absolute inset-0 z-20\"></div> intercepts pointer events",
    "TimeoutError after 30000ms on the click action, not on locating the element — the element resolves fine, only the click is blocked",
    "DOM snippet shows the button carries aria-label=\"Opens Debug Info\", a stable accessible name unaffected by the overlay",
  ],
  fix: {
    before: `await page.locator("button.btn-debug").click();`,
    after: `await page.getByRole("button", { name: "Opens Debug Info" }).click();`,
    explanation:
      "getByRole targets the button by its accessible name instead of an implementation-detail CSS class, and Playwright's actionability checks will correctly wait out transient overlays rather than failing once fixed on the app side — but more importantly this locator survives future class/z-index churn entirely.",
  },
};

/** Selenium/Java equivalent example — a positional XPath broken by a UI reorder. */
export const DEMO_REQUEST_SELENIUM: DiagnoseRequest = {
  framework: "selenium-java",
  testCode: `@Test
public void opensDebugInfoPanel() {
  driver.get("https://app.example.com/dashboard");
  WebElement debugButton = driver.findElement(By.xpath("//div[@class='header']/button[3]"));
  debugButton.click();
  WebElement panel = driver.findElement(By.className("debug-panel"));
  Assert.assertTrue(panel.isDisplayed());
}`,
  ciLog: `org.openqa.selenium.NoSuchElementException: no such element: Unable to locate element:
{"method":"xpath","selector":"//div[@class='header']/button[3]"}
  (Session info: chrome=124.0.6367.91)
Build info: version: '4.19.1', revision: 'a72a655060'
System info: os.name: 'Linux', os.arch: 'amd64'
Driver info: org.openqa.selenium.chrome.ChromeDriver

	at DashboardTests.opensDebugInfoPanel(DashboardTests.java:42)`,
  domSnippet: `<div class="header redesigned-v2">
  <button id="nav-search">...</button>
  <button id="nav-notifications">...</button>
  <button id="debug-info-btn" data-testid="debug-info-trigger">Debug Info</button>
</div>`,
};

export const DEMO_RESULT_SELENIUM: DiagnosisResult = {
  framework: "selenium-java",
  failureType: "locator_breakage",
  confidence: 90,
  risk: "low",
  rootCause:
    "The test locates the button by its position among header siblings (button[3]), but a recent header redesign (class redesigned-v2) added a notifications button before it, shifting the debug button out of the 3rd slot entirely — the XPath now matches nothing, hence NoSuchElementException rather than a click failure.",
  evidence: [
    "Selector By.xpath(\"//div[@class='header']/button[3]\") depends on sibling position",
    "CI log shows: NoSuchElementException — the xpath resolves to zero elements, not a stale one",
    "header class includes redesigned-v2, indicating the header markup changed recently",
    "DOM snippet shows the button carries a stable id=\"debug-info-btn\" and data-testid=\"debug-info-trigger\"",
  ],
  fix: {
    before: `WebElement debugButton = driver.findElement(By.xpath("//div[@class='header']/button[3]"));
debugButton.click();`,
    after: `WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
WebElement debugButton = wait.until(
    ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='debug-info-trigger']"))
);
debugButton.click();`,
    explanation:
      "Swapping the positional XPath for the stable data-testid selector removes the dependency on sibling order entirely, and wrapping it in an explicit WebDriverWait avoids a race if the button renders slightly after the rest of the header.",
  },
};

/** Playwright/JavaScript example — a fixed sleep racing a slower-than-assumed UI recalculation. */
export const DEMO_REQUEST_JS: DiagnoseRequest = {
  framework: "playwright-js",
  testCode: `test("submits the checkout form", async ({ page }) => {
  await page.goto("/checkout");
  await page.getByLabel("Promo code").fill("SAVE10");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Place Order" }).click();
  await expect(page.getByText("Order placed")).toBeVisible();
});`,
  ciLog: `1) tests/checkout/apply-promo.spec.js:9:5 › submits the checkout form ===============================

  Error: expect(locator).toBeVisible() failed

  Locator:  getByText('Order placed')
  Expected: visible
  Received: <element(s) not found>
  Timeout:  5000ms

  Call log:
    - expect.toBeVisible with timeout 5000ms
    - waiting for getByText('Order placed')

  Console:
    - "Applying promo code..." (console.log)
    - "Promo applied: SAVE10 (-10%)" (console.log, +860ms after click)
    - "Place Order clicked" (console.log)
    - "Error: total not yet recalculated" (console.error)

      at tests/checkout/apply-promo.spec.js:9:5`,
};

export const DEMO_RESULT_JS: DiagnosisResult = {
  framework: "playwright-js",
  failureType: "timing_race_condition",
  confidence: 88,
  risk: "low",
  rootCause:
    "The test sleeps a fixed 500ms after clicking Apply, but the console log shows the promo recalculation ('Promo applied: SAVE10 (-10%)') doesn't actually finish until 860ms after the click. Place Order fires while the total is still recalculating, and the app silently blocks the order ('total not yet recalculated' is only a console.error, never surfaced to the UI) — so the order confirmation never renders and the assertion times out.",
  evidence: [
    "await page.waitForTimeout(500) is a fixed sleep, not a condition wait",
    "Console log shows 'Promo applied: SAVE10 (-10%)' at +860ms — after the 500ms wait already elapsed",
    "Console shows 'Error: total not yet recalculated' immediately after Place Order is clicked",
    "expect(getByText('Order placed')).toBeVisible() timed out at 5000ms — the order was blocked, not just slow to render",
  ],
  fix: {
    before: `await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Place Order" }).click();`,
    after: `await expect(page.getByText("-10%")).toBeVisible();
  await page.getByRole("button", { name: "Place Order" }).click();`,
    explanation:
      "Waiting for the actual discount text to render — a real UI state — instead of a fixed timeout guarantees the promo recalculation has finished before placing the order, regardless of how long that recalculation takes on any given run.",
  },
};

export const DEMOS: Record<Framework, { request: DiagnoseRequest; result: DiagnosisResult }> = {
  "playwright-ts": { request: DEMO_REQUEST, result: DEMO_RESULT },
  "playwright-js": { request: DEMO_REQUEST_JS, result: DEMO_RESULT_JS },
  "selenium-java": { request: DEMO_REQUEST_SELENIUM, result: DEMO_RESULT_SELENIUM },
};
