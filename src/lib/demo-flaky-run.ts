import type { Framework } from "./types";

/**
 * Synthetic run history for the "Load Demo History" button — a ~40% failure rate
 * with an alternating pattern (real non-determinism), backed by a log showing the
 * actual race condition, for the "Analyze Flakiness" pipeline to reason over live.
 */
export const DEMO_FLAKY_RUN: {
  framework: Framework;
  testName: string;
  runHistoryText: string;
  testCode: string;
  failureLog: string;
} = {
  framework: "playwright-js",
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
};
