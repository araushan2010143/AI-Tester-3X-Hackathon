# 🩺 TraceFix AI: Intelligent CI/CD Test Failure & Flaky Test Doctor

> **TraceFix AI** is an AI-powered diagnostic console for QA automation engineers — paste a failed test, a whole Jenkins/GitHub Actions log, or a test's run history, and get a grounded root cause, a confidence score, and a production-ready fix, in seconds.

**From CI failure to production-ready fix in seconds.**

---

## 🎯 Problem Statement

QA automation engineers spend up to **50% of their development and testing cycles** debugging flaky tests, deciphering massive CI/CD error logs, and fixing brittle locators broken by UI updates. A single noisy CI run can produce dozens of failing tests that all trace back to one or two real root causes — manually triaging that, one failure at a time, drains team productivity and slows down every release.

## 💡 Solution

TraceFix AI is a workspace with four real modes, all sharing one diagnosis engine and one local history:

| Mode | What you paste | What it does |
|---|---|---|
| **Investigate** | One failed test's code + its CI log | Diagnoses a single failure, grounded in real evidence |
| **CI Failures** | A whole Jenkins/GitHub Actions console log | Clusters every failure by root cause *before* calling AI — 500 failing tests might be 4 real bugs |
| **Flaky Tests** | Run history (or a CI log with retries) | Computes the actual failure rate/pattern locally, then explains it |
| **Overview** | — | Aggregates everything you've diagnosed on this device: health score, flakiness score, failure trends, drill-down |

The core discipline throughout: **compute what can be computed locally, and only ask the AI to explain it** — clustering, failure rate, retry-attempt detection, shared-test-data collisions, and every dashboard score are deterministic code, not AI guesses. The AI's job is narrower and more reliable: classify the failure, cite real evidence, and write the fix.

---

## ✨ Features

**Diagnosis**
- 12-category failure taxonomy (locator breakage, timing/race condition, assertion failure, network/API failure, environment, configuration, authentication, test data, dependency, browser, flaky, application bug) + a `risk` field, enforced by a JSON schema — every diagnosis is structurally guaranteed to have a category, confidence, evidence, and a fix
- Multi-modal evidence: test code, CI log, DOM snippet, browser console log, network log, environment/version info, a screenshot (real vision call), and a GitHub PR diff — all optional, all shown back to you in a "Signals Analyzed" checklist so you know exactly what the AI actually had
- Before/after code fix with a plain-English explanation and one-click copy — deliberately no "Apply Patch"; the AI never touches your code directly
- "You've seen this before" — new diagnoses are checked against your own past history for shared keywords
- **Automatic AI provider failover**: Gemini is primary; if it's overloaded, rate-limited, or returns a malformed response, the request automatically retries against OpenAI, then Groq, before giving up — a demo shouldn't die because one provider is having a bad day. Whichever provider actually answered is shown in the UI ("via Gemini" / "via OpenAI" / "via Groq"), not hidden

**CI Failures (bulk triage)**
- Local parsing + fingerprint-based clustering (error type + normalized message, stack-frame noise stripped) before anything reaches the AI — one diagnosis per cluster, not per failing test
- Auto-detects GitHub Actions vs. Jenkins log formatting and strips CI noise (timestamps, `##[group]` markers) before parsing
- Flags shared test data / parallel-execution collisions — the same concrete ID/email/UUID showing up in 2+ different tests' failures
- A promoted "Primary Root Cause" hero card plus a compact cluster list, all persisted with a real, monotonically-increasing "Build #N"

**Flaky Tests**
- Paste manual run history (`Run #101 → PASS`) or a raw CI log — retry/attempt blocks are auto-detected
- Failure rate, longest fail streak, and pattern (alternating / clustered / scattered / always-failing) are computed locally; the AI explains what the computed pattern means
- A Jenkins-style numbered Build History list alongside a pass/fail dot timeline

**Overview (Dashboard)**
- Test Health Score (risk-weighted average across every diagnosis) and Flakiness Score (average failure rate), both with honest status pills — no fabricated trend arrows, since there's no time-series baseline to compute them from
- Clickable Failure Categories table that filters Recent Activity
- Click any Recent Activity row to jump back to its full diagnosis

**Everything else**
- Three frameworks with genuinely distinct demo content each: Playwright (TypeScript), Playwright (JavaScript), Selenium (Java)
- Read-only GitHub PR correlation — pull the diff of the PR that triggered a failure in as grounding evidence
- Full history for all three modes, persisted client-side, survives reload
- Permanent sidebar navigation, a designed enterprise navy dark theme with a real light-theme companion, and a toggle to switch between them

---

## 🚫 What's intentionally not built

- **Jira / GitHub issue auto-creation** — a real Jira integration attempt was blocked entirely by an unresolved account-side Atlassian auth issue, not a code gap; GitHub issue creation is unbuilt but would reuse the already-working GitHub client
- **Live Jenkins / GitHub Actions / GitLab integration** — the app only accepts pasted logs, no webhook or polling connection to a running CI server
- **Automatic PR patch generation** — deliberate, not an oversight; Copy Fix exists, Apply Patch doesn't
- **Server-side/database-backed history** — everything is client-side `localStorage`, so history is per-device and there's no cross-build or team-wide correlation
- **Playwright `trace.zip` analysis** and a trained root-cause knowledge base — both would need infrastructure beyond this app's current scope

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack, React 19, TypeScript)
- **Styling/UI:** Tailwind CSS v4 (CSS-first `@theme`) + shadcn/ui on `@base-ui/react` primitives
- **Code editing:** Monaco Editor (`@monaco-editor/react`), custom theme matched to the app's palette
- **Theming:** `next-themes` — dark (default) and light, both hand-designed to the same brand accent
- **AI:** Google Gemini (primary) with automatic failover to OpenAI, then Groq (`openai` SDK — Groq's API is OpenAI-compatible, one dependency serves both). Structured JSON output (schema-enforced on Gemini/OpenAI, validated at runtime as a backstop on Groq) and multimodal (image) input for screenshots on the two vision-capable providers
- **External integration:** GitHub REST API (read-only PR diff correlation) via a fine-grained PAT
- **History:** `localStorage` (no database — everything ships client-side for the MVP)
- **Deployment target:** Vercel

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js v18+
- A Google Gemini API key — get one free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 1. Clone the repository
```bash
git clone https://github.com/araushan2010143/AI-Tester-3X-Hackathon.git
cd AI-Tester-3X-Hackathon
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure your environment
```bash
cp .env.example .env.local
```
Then edit `.env.local`:
- `GEMINI_API_KEY` — **required** for any real diagnosis (Single Test / CI Failures / Flaky Tests all call an AI provider, Gemini first)
- `GEMINI_MODEL` — optional, defaults to `gemini-flash-latest`
- `GITHUB_TOKEN` — optional, only needed to enable the "GitHub PR" evidence field in Single Test mode. Create a fine-grained token scoped to just the repo(s) you want readable, with **Pull requests: Read-only** — no write access needed.
- `OPENAI_API_KEY` / `OPENAI_MODEL` and `GROQ_API_KEY` / `GROQ_MODEL` — both optional. If set, they're used as automatic fallback when Gemini is unavailable — see [`.env.example`](.env.example) for details. Leave both blank to run Gemini-only, identical to before this existed.

### 4. Run the dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

No API key yet? On the **Investigate** tab, click **Load Demo** — it renders a full diagnosis (locator breakage, evidence, confidence score, before/after fix) entirely client-side, no key required. (The "Load Demo Log"/"Load Demo History" buttons on CI Failures/Flaky Tests fill in realistic example input, but still call the real API when you hit Analyze — a Gemini key is needed to see those results.)

---

## 📋 How it works

1. **Investigate**: paste a failed test's code and its CI log (DOM/console/network/environment/screenshot/PR are optional extras). `POST /api/diagnose` builds a prompt grounded in your actual selector/error/DOM text and calls `diagnoseFailure()`, which renders the result — root cause, evidence, confidence, before/after fix.
2. **CI Failures**: paste a whole console log. It's parsed and fingerprint-clustered locally first (`log-parser.ts` + `failure-clustering.ts`); `POST /api/diagnose-bulk` streams one diagnosis per cluster (bounded concurrency via `lib/concurrency.ts`), not per failing test.
3. **Flaky Tests**: paste run history or a CI log with retries; `run-history.ts`/`retry-parser.ts` compute the real failure rate and pattern locally, and `POST /api/diagnose-flaky` asks the AI to explain *that* computed pattern.
4. Every completed run in every mode is saved to its own local history store and rolls up into **Overview**.
5. All three routes above go through one shared prompt-building layer (`lib/diagnose.ts`), which hands off to `lib/llm-router.ts` — that's the piece that tries Gemini, then OpenAI, then Groq, and returns whichever one actually answered.

## 📁 Project structure
```
src/app/page.tsx                      the whole app shell: sidebar + 4 modes, all client state
src/app/layout.tsx                    theme provider, fonts, toaster
src/app/api/diagnose/route.ts         single-test diagnosis (+ GitHub PR correlation)
src/app/api/diagnose-bulk/route.ts    bulk log: parse -> cluster -> stream diagnoses
src/app/api/diagnose-flaky/route.ts   flaky test: compute stats -> AI explains

src/lib/diagnose.ts                   prompt builders; the 3 public diagnose*() entry points
src/lib/llm-router.ts                 tries Gemini -> OpenAI -> Groq, returns whichever answered
src/lib/gemini-provider.ts / openai-provider.ts / groq-provider.ts   one AI provider adapter each
src/lib/validate-diagnosis.ts         runtime shape-check (the real safety net on Groq's looser JSON mode)
src/lib/types.ts                      DiagnosisResult / FailureType / DashboardStats contracts
src/lib/log-parser.ts                 CI-provider detection, Playwright/Selenium log parsing
src/lib/failure-clustering.ts         error-signature fingerprinting + clustering
src/lib/shared-data-detector.ts       cross-test shared-identifier (parallel execution) detection
src/lib/retry-parser.ts               auto-detects Attempt/Retry blocks in a raw CI log
src/lib/run-history.ts                failure rate / streak / pattern computation for flaky tests
src/lib/dashboard-stats.ts            aggregates all 3 history stores into Overview's stats
src/lib/similar-diagnoses.ts          "you've seen this before" keyword correlation
src/lib/github.ts                     read-only GitHub PR diff fetch
src/lib/concurrency.ts                bounded-parallelism helper for bulk Gemini calls
src/lib/history.ts / bulk-history.ts / flaky-history.ts   per-mode localStorage persistence
src/lib/demo-data.ts / demo-bulk-log.ts / demo-flaky-run.ts   per-framework demo content

src/components/app-sidebar.tsx        permanent left nav + theme toggle
src/components/diagnosis-panel.tsx    shared result view (Single/Bulk/Flaky all render this)
src/components/bulk-results.tsx       CI Failures: primary-root-cause hero + cluster list
src/components/flaky-stats-panel.tsx  Flaky Tests: stat grid + timeline + build history
src/components/dashboard-view.tsx     Overview: KPIs, failure categories, recent activity
src/components/code-editor.tsx        Monaco wrapper with a theme matched to the app palette
src/components/theme-toggle.tsx       dark/light switch
src/components/ui/                    shadcn primitives (Card, Badge, Button, Accordion, …)
```
