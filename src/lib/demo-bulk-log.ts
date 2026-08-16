import type { Framework } from "./types";

/**
 * Synthetic Jenkins/Playwright console log: 10 failures that should cluster
 * into ~4 distinct root causes (5 + 3 + 1 + 1) for the "Load Demo Log" button
 * in Bulk mode — proof that clustering collapses noisy real-world failure
 * counts into the handful of patterns actually causing them.
 *
 * Playwright's list-reporter output is identical whether the test file is
 * TS or JS, so this one log covers both playwright-ts and playwright-js —
 * see log-parser.ts's parseFailures, which only branches on Selenium vs not.
 */
export const DEMO_BULK_LOG_PLAYWRIGHT = `Running 500 tests using 8 workers

  1) tests/checkout/checkout-flow.spec.ts:45:10 › checkout flow › opens the debug info panel ===============================

    TimeoutError: locator.click: Timeout 30000ms exceeded.
    =========================== logs ===========================
    waiting for locator('button.btn-debug')
    locator resolved to <button class="btn-debug relative z-10">…</button>
    attempting click action
      2 × <div class="header-overlay absolute inset-0 z-20"></div> intercepts pointer events
    ==============================================================

        at tests/checkout/checkout-flow.spec.ts:45:10

  2) tests/dashboard/widgets.spec.ts:88:14 › dashboard widgets › opens the debug info panel ===============================

    TimeoutError: locator.click: Timeout 30000ms exceeded.
    =========================== logs ===========================
    waiting for locator('button.btn-debug')
    locator resolved to <button class="btn-debug relative z-10">…</button>
    attempting click action
      3 × <div class="header-overlay absolute inset-0 z-20"></div> intercepts pointer events
    ==============================================================

        at tests/dashboard/widgets.spec.ts:88:14

  3) tests/settings/account.spec.ts:22:6 › account settings › opens the debug info panel ===============================

    TimeoutError: locator.click: Timeout 30000ms exceeded.
    =========================== logs ===========================
    waiting for locator('button.btn-debug')
    locator resolved to <button class="btn-debug relative z-10">…</button>
    attempting click action
      2 × <div class="header-overlay absolute inset-0 z-20"></div> intercepts pointer events
    ==============================================================

        at tests/settings/account.spec.ts:22:6

  4) tests/reports/export.spec.ts:61:9 › reports › opens the debug info panel ===============================

    TimeoutError: locator.click: Timeout 30000ms exceeded.
    =========================== logs ===========================
    waiting for locator('button.btn-debug')
    locator resolved to <button class="btn-debug relative z-10">…</button>
    attempting click action
      4 × <div class="header-overlay absolute inset-0 z-20"></div> intercepts pointer events
    ==============================================================

        at tests/reports/export.spec.ts:61:9

  5) tests/billing/invoices.spec.ts:33:12 › billing › opens the debug info panel ===============================

    TimeoutError: locator.click: Timeout 30000ms exceeded.
    =========================== logs ===========================
    waiting for locator('button.btn-debug')
    locator resolved to <button class="btn-debug relative z-10">…</button>
    attempting click action
      2 × <div class="header-overlay absolute inset-0 z-20"></div> intercepts pointer events
    ==============================================================

        at tests/billing/invoices.spec.ts:33:12

  6) tests/checkout/save-card.spec.ts:71:8 › checkout › saves payment details ===============================

    TimeoutError: locator.click: Timeout 30000ms exceeded.
    =========================== logs ===========================
    waiting for locator('.save-button')
    locator resolved to <button class="save-button">Save</button>
    attempting click action
      2 × <div class="modal-backdrop fixed inset-0 z-40"></div> intercepts pointer events
    ==============================================================

        at tests/checkout/save-card.spec.ts:71:8

  7) tests/profile/edit.spec.ts:19:5 › profile › saves changes ===============================

    TimeoutError: locator.click: Timeout 30000ms exceeded.
    =========================== logs ===========================
    waiting for locator('.save-button')
    locator resolved to <button class="save-button">Save</button>
    attempting click action
      3 × <div class="modal-backdrop fixed inset-0 z-40"></div> intercepts pointer events
    ==============================================================

        at tests/profile/edit.spec.ts:19:5

  8) tests/team/invite.spec.ts:54:11 › team management › saves invite settings ===============================

    TimeoutError: locator.click: Timeout 30000ms exceeded.
    =========================== logs ===========================
    waiting for locator('.save-button')
    locator resolved to <button class="save-button">Save</button>
    attempting click action
      2 × <div class="modal-backdrop fixed inset-0 z-40"></div> intercepts pointer events
    ==============================================================

        at tests/team/invite.spec.ts:54:11

  9) tests/orders/confirm.spec.ts:40:7 › order confirmation › shows confirmed status ===============================

    Error: expect(received).toBe(expected)

    Expected: "Order Confirmed"
    Received: "Order Pending"

        at tests/orders/confirm.spec.ts:40:7

  10) tests/inventory/status.spec.ts:15:3 › inventory › loads current stock levels ===============================

    Error: apiRequestContext.get: connect ECONNREFUSED 10.0.4.12:8443
    Call log:
      - → GET https://internal-api.staging.example.com/api/inventory/status

        at tests/inventory/status.spec.ts:15:3

  150 failed
  350 passed (14.2m)`;

/**
 * Selenium/Java equivalent of the log above — same clustering shape (5 + 3 + 1 + 1 →
 * 4 root causes), authored and verified against the real parseFailures/clusterFailures
 * pipeline (log-parser.ts, failure-clustering.ts) rather than assumed: parseSelenium's
 * heuristic window-scanning stops at the first blank line after its anchor, so each
 * `at Class.method(...)` frame has to sit directly under its exception with no blank
 * line between them, or the test name never makes it into the snippet.
 */
export const DEMO_BULK_LOG_SELENIUM = `org.openqa.selenium.NoSuchElementException: no such element: Unable to locate element:
{"method":"xpath","selector":"//div[@class='header']/button[3]"}
  (Session info: chrome=124.0.6367.91)
Build info: version: '4.19.1', revision: 'a72a655060'
	at CheckoutPageTest.opensDebugInfoPanel(CheckoutPageTest.java:45)

org.openqa.selenium.NoSuchElementException: no such element: Unable to locate element:
{"method":"xpath","selector":"//div[@class='header']/button[3]"}
  (Session info: chrome=125.0.6422.60)
Build info: version: '4.19.1', revision: 'a72a655060'
	at DashboardPageTest.opensDebugInfoPanel(DashboardPageTest.java:88)

org.openqa.selenium.NoSuchElementException: no such element: Unable to locate element:
{"method":"xpath","selector":"//div[@class='header']/button[3]"}
  (Session info: chrome=124.0.6367.91)
Build info: version: '4.19.1', revision: 'a72a655060'
	at SettingsPageTest.opensDebugInfoPanel(SettingsPageTest.java:22)

org.openqa.selenium.NoSuchElementException: no such element: Unable to locate element:
{"method":"xpath","selector":"//div[@class='header']/button[3]"}
  (Session info: chrome=126.0.6478.61)
Build info: version: '4.19.1', revision: 'a72a655060'
	at ReportsPageTest.opensDebugInfoPanel(ReportsPageTest.java:61)

org.openqa.selenium.NoSuchElementException: no such element: Unable to locate element:
{"method":"xpath","selector":"//div[@class='header']/button[3]"}
  (Session info: chrome=124.0.6367.91)
Build info: version: '4.19.1', revision: 'a72a655060'
	at BillingPageTest.opensDebugInfoPanel(BillingPageTest.java:33)

org.openqa.selenium.ElementClickInterceptedException: element click intercepted: Element <button class="save-button">...</button> is not clickable at point (450, 620). Other element would receive the click: <div class="modal-backdrop fixed inset-0 z-40"></div>
  (Session info: chrome=124.0.6367.91)
	at CheckoutPageTest.savesPaymentDetails(CheckoutPageTest.java:71)

org.openqa.selenium.ElementClickInterceptedException: element click intercepted: Element <button class="save-button">...</button> is not clickable at point (450, 620). Other element would receive the click: <div class="modal-backdrop fixed inset-0 z-40"></div>
  (Session info: chrome=125.0.6422.60)
	at ProfilePageTest.savesChanges(ProfilePageTest.java:19)

org.openqa.selenium.ElementClickInterceptedException: element click intercepted: Element <button class="save-button">...</button> is not clickable at point (450, 620). Other element would receive the click: <div class="modal-backdrop fixed inset-0 z-40"></div>
  (Session info: chrome=124.0.6367.91)
	at TeamPageTest.savesInviteSettings(TeamPageTest.java:54)

java.lang.AssertionError: expected [Order Confirmed] but found [Order Pending]
	at OrderConfirmationTest.showsConfirmedStatus(OrderConfirmationTest.java:40)

org.openqa.selenium.WebDriverException: java.net.ConnectException: Connection refused: connect to internal-api.staging.example.com:8443
	at InventoryPageTest.loadsCurrentStockLevels(InventoryPageTest.java:15)

Tests run: 10, Failures: 10, Errors: 0, Skipped: 0
BUILD FAILURE`;

export const DEMO_BULK_LOGS: Record<Framework, string> = {
  "playwright-ts": DEMO_BULK_LOG_PLAYWRIGHT,
  "playwright-js": DEMO_BULK_LOG_PLAYWRIGHT,
  "selenium-java": DEMO_BULK_LOG_SELENIUM,
};
