import type { Framework } from "./types";

interface DemoFlakyRun {
  testName: string;
  runHistoryText: string;
  testCode: string;
  failureLog: string;
}

/**
 * One "Load Demo History" example per framework for Flaky Test mode — each a genuinely
 * different scenario, mirroring the per-framework DEMOS map in demo-data.ts, not just a
 * syntax reskin of the same story. The run-history text format is framework-agnostic
 * (run-history.ts's parser just matches PASS/FAIL tokens per line), so no parsing risk
 * there; testCode/failureLog are shown as-is, never parsed.
 */
export const DEMO_FLAKY_RUNS: Record<Framework, DemoFlakyRun> = {
  "playwright-ts": {
    testName: "adds item to cart and updates the mini-cart badge",
    runHistoryText: `Run #201 → PASS
Run #202 → PASS
Run #203 → FAIL
Run #204 → PASS
Run #205 → PASS
Run #206 → FAIL
Run #207 → PASS
Run #208 → PASS
Run #209 → PASS
Run #210 → FAIL`,
    testCode: `test("adds item to cart and updates the mini-cart badge", async ({ page }) => {
  await page.goto("/products/wireless-mouse");
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByTestId("cart-badge")).toHaveText("1");
});`,
    failureLog: `Error: expect(locator).toHaveText(expected) failed

Locator:  getByTestId('cart-badge')
Expected string: "1"
Received string: "3"
Timeout:  5000ms

Call log:
  - expect.toHaveText with timeout 5000ms
  - waiting for getByTestId('cart-badge')
  - locator resolved to <span data-testid="cart-badge">3</span>

    at tests/cart/add-to-cart.spec.ts:14:42`,
  },

  "playwright-js": {
    testName: "displays search results after typing",
    runHistoryText: `Run #101 → PASS
Run #102 → FAIL
Run #103 → PASS
Run #104 → PASS
Run #105 → FAIL
Run #106 → PASS
Run #107 → FAIL
Run #108 → PASS
Run #109 → PASS
Run #110 → FAIL`,
    testCode: `test("displays search results after typing", async ({ page }) => {
  await page.goto("/search");
  await page.getByPlaceholder("Search products").fill("wireless mouse");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByTestId("results-list")).toContainText("Wireless Mouse");
});`,
    failureLog: `Error: expect(locator).toContainText(expected) failed

Locator:  getByTestId('results-list')
Expected string: "Wireless Mouse"
Received: ""
Timeout:  5000ms

Call log:
  - expect.toContainText with timeout 5000ms
  - waiting for getByTestId('results-list')
  - locator resolved to <ul data-testid="results-list" class="results-list results-list--loading"></ul>

    at tests/search/search-results.spec.js:9:44`,
  },

  "selenium-java": {
    testName: "logsInSuccessfullyAndRedirectsToDashboard",
    runHistoryText: `Run #301 → PASS
Run #302 → PASS
Run #303 → PASS
Run #304 → FAIL
Run #305 → PASS
Run #306 → FAIL
Run #307 → PASS
Run #308 → PASS
Run #309 → FAIL
Run #310 → PASS`,
    testCode: `@Test
public void logsInSuccessfullyAndRedirectsToDashboard() {
  driver.get("https://app.example.com/login");
  driver.findElement(By.id("email")).sendKeys("qa@example.com");
  driver.findElement(By.id("password")).sendKeys("Test1234!");
  driver.findElement(By.id("login-submit")).click();
  WebElement heading = driver.findElement(By.cssSelector("h1.dashboard-heading"));
  Assert.assertEquals(heading.getText(), "Dashboard");
}`,
    failureLog: `org.openqa.selenium.StaleElementReferenceException: stale element reference: element is not attached to the page document
  (Session info: chrome=124.0.6367.91)
Build info: version: '4.19.1', revision: 'a72a655060'
	at LoginTest.logsInSuccessfullyAndRedirectsToDashboard(LoginTest.java:18)`,
  },
};
