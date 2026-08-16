/**
 * Synthetic Jenkins/Playwright console log: 10 failures that should cluster
 * into ~4 distinct root causes (5 + 3 + 1 + 1) for the "Load Demo Log" button
 * in Bulk mode — proof that clustering collapses noisy real-world failure
 * counts into the handful of patterns actually causing them.
 */
export const DEMO_BULK_LOG = `Running 500 tests using 8 workers

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
