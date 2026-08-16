# 🩺 TraceFix AI: Intelligent CI/CD Test Failure & Flaky Test Doctor

> **TraceFix AI** is an AI-powered diagnostic tool built for QA automation engineers to instantly analyze CI/CD test failures, identify root causes, and generate robust auto-fixes for Playwright and Selenium test suites.

**From CI failure to production-ready fix in seconds.**

---

## 🎯 Problem Statement
QA automation engineers spend up to **50% of their development and testing cycles** debugging flaky tests, deciphering massive CI/CD error logs (GitHub Actions, Jenkins), and fixing brittle locators broken by UI updates. Manually cross-referencing stack traces with DOM changes slows down release pipelines and drains team productivity.

## 💡 Solution
TraceFix AI provides a fast web dashboard where testers paste their broken test code and CI/CD stack trace. The system uses Gemini to:
* **Diagnose the Failure** — classify it as a flaky test, timing/race condition, network failure, environment issue, assertion failure, locator breakage, or a real application bug.
* **Show the Evidence** — concrete clues pulled from the selector, DOM, and error text, not a generic guess.
* **Score the Confidence** — 0–100%, so you know how much to trust the diagnosis.
* **Generate the Fix** — a before/after code diff with an explanation of why the fix works.

---

## 🛠️ Tech Stack
* **Framework:** Next.js 16 (App Router, React 19, TypeScript)
* **Styling/UI:** Tailwind CSS v4 + shadcn/ui, dark-mode-first
* **Code editing:** Monaco Editor (`@monaco-editor/react`)
* **AI Integration:** Google Gemini API (`gemini-flash-latest`), JSON-mode structured output
* **History:** localStorage (no DB needed for the MVP)
* **Deployment target:** Vercel

---

## 🚀 How to Run Locally

### Prerequisites
* Node.js v18+
* A Google Gemini API key — get one free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 1. Clone the repository
```bash
git clone https://github.com/araushan2010143/AI-Tester-3X-Hackathon.git
cd AI-Tester-3X-Hackathon
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure your API key
```bash
cp .env.example .env.local
# then edit .env.local and paste your GEMINI_API_KEY
```

### 4. Run the dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

No API key yet? Click **Load Demo** in the header — it renders a full diagnosis (locator breakage, evidence, confidence score, before/after fix) entirely client-side, no key required.

---

## 📋 How it works
1. Paste the failed test's code and the CI/CD error log/stack trace (a DOM/HTML snippet is optional but improves accuracy).
2. Click **Diagnose & Fix**.
3. `POST /api/diagnose` builds a prompt grounding the model in your actual selector/error/DOM text and calls Gemini with a `responseSchema` so the reply is always valid, structured JSON — no ad-hoc parsing.
4. The dashboard renders the failure type, confidence, root cause, evidence, and a copyable before/after fix. Every run is saved to a local history you can revisit.

## 📁 Project structure
```
src/app/page.tsx              main dashboard
src/app/api/diagnose/route.ts diagnosis API route (calls Gemini)
src/lib/gemini.ts             prompt builder + Gemini client + response schema
src/lib/types.ts              DiagnosisResult / FailureType contracts
src/lib/demo-data.ts          no-API-key demo example
src/lib/history.ts            localStorage history helpers
src/components/               UI: code editor, diagnosis panel, evidence list, before/after diff, history
```
