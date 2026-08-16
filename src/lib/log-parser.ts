import type { CiProvider, Framework, ParsedFailure } from "./types";

export const MAX_LOG_CHARS = 2_000_000;

/**
 * A real downloaded GitHub Actions or Jenkins (Timestamper) log prefixes every single line
 * with a timestamp, which breaks the `^`-anchored PLAYWRIGHT_HEADER/exception-anchor regexes
 * below — the good Playwright/Selenium output is in there, it's just wrapped in CI noise.
 */
export function detectCiProvider(log: string): CiProvider {
  if (/##\[(group|endgroup|error|warning|section)\]/.test(log) || /::(error|warning|group|endgroup)::/.test(log)) {
    return "github-actions";
  }
  if (/\[Pipeline\]\s*[{}]/.test(log) || /Finished:\s*(SUCCESS|FAILURE|UNSTABLE|ABORTED)/.test(log)) {
    return "jenkins";
  }
  return "unknown";
}

function stripCiNoise(log: string): string {
  const provider = detectCiProvider(log);
  if (provider === "github-actions") {
    return log
      .replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s?/gm, "")
      .split("\n")
      .filter((line) => !/^##\[(group|endgroup)\]/.test(line))
      .join("\n");
  }
  if (provider === "jenkins") {
    return log.replace(/^\[\d{4}-\d{2}-\d{2}T[\d:.]+Z\]\s?/gm, "");
  }
  return log;
}

/** Matches Playwright's list-reporter failure header, e.g. `  1) tests/dashboard.spec.ts:12:38 › opens the debug info panel` */
const PLAYWRIGHT_HEADER = /^\s*(\d+)\)\s+(\S+):(\d+):(\d+)\s+›\s+(.+?)\s*=*\s*$/gm;

function parsePlaywright(log: string): ParsedFailure[] {
  const matches = [...log.matchAll(PLAYWRIGHT_HEADER)];
  const failures: ParsedFailure[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const [, num, file, line, col, testName] = match;
    const start = match.index! + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : log.length;
    const snippet = log.slice(start, end).trim();

    failures.push({
      id: `pw-${num}`,
      testName: testName.trim(),
      location: `${file}:${line}:${col}`,
      errorSnippet: snippet.slice(0, 4000),
    });
  }

  return failures;
}

/** Anchors: JVM/Selenium exceptions or explicit FAIL markers, common across JUnit/TestNG/custom loggers. */
const JAVA_EXCEPTION_ANCHOR = /^(.*?\b(?:org\.openqa\.selenium\.\w*Exception|(?:java|javax)\.\w+(?:\.\w+)*Exception|AssertionError)\b.*)$/m;
const FAIL_MARKER_ANCHOR = /^(.*\b(?:FAILED|FAIL:)\b.*)$/m;
/** Best-effort test identifier near a failure: `ClassName.methodName` or a `file:line` reference. */
const TEST_IDENTIFIER = /\b([A-Z][A-Za-z0-9_]*\.[a-zA-Z][A-Za-z0-9_]*)\b|\b([\w./-]+\.java:\d+)\b/;

function parseSelenium(log: string): ParsedFailure[] {
  const lines = log.split("\n");
  const failures: ParsedFailure[] = [];
  let cursor = 0;
  let count = 0;

  while (cursor < lines.length) {
    let anchorIdx = -1;
    for (let i = cursor; i < lines.length; i++) {
      if (JAVA_EXCEPTION_ANCHOR.test(lines[i]) || FAIL_MARKER_ANCHOR.test(lines[i])) {
        anchorIdx = i;
        break;
      }
    }
    if (anchorIdx === -1) break;

    // Snippet: a few lines of context before the anchor through the next blank line or next anchor.
    const windowStart = Math.max(cursor, anchorIdx - 3);
    let windowEnd = anchorIdx + 1;
    while (
      windowEnd < lines.length &&
      lines[windowEnd].trim() !== "" &&
      !JAVA_EXCEPTION_ANCHOR.test(lines[windowEnd]) &&
      windowEnd - anchorIdx < 25
    ) {
      windowEnd++;
    }

    const snippetLines = lines.slice(windowStart, windowEnd);
    const snippet = snippetLines.join("\n").trim();
    const idMatch = snippet.match(TEST_IDENTIFIER);
    count++;

    failures.push({
      id: `sel-${count}`,
      testName: idMatch ? (idMatch[1] || idMatch[2]) : `Unnamed failure #${count}`,
      errorSnippet: snippet.slice(0, 4000),
    });

    cursor = windowEnd + 1;
  }

  return failures;
}

/** Generic fallback for logs that don't match either framework's shape: chunk on blank lines, keep chunks that look like failures. */
function parseGeneric(log: string): ParsedFailure[] {
  const chunks = log.split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean);
  const failures: ParsedFailure[] = [];
  let count = 0;

  for (const chunk of chunks) {
    if (!/error|exception|fail/i.test(chunk)) continue;
    count++;
    const idMatch = chunk.match(TEST_IDENTIFIER);
    failures.push({
      id: `generic-${count}`,
      testName: idMatch ? (idMatch[1] || idMatch[2]) : `Unnamed failure #${count}`,
      errorSnippet: chunk.slice(0, 4000),
    });
  }

  return failures;
}

export function parseFailures(log: string, framework: Framework): ParsedFailure[] {
  const cleaned = stripCiNoise(log);
  // Playwright's list-reporter output is identical whether the test file is TS or JS.
  const primary = framework === "selenium-java" ? parseSelenium(cleaned) : parsePlaywright(cleaned);
  if (primary.length > 0) return primary;
  return parseGeneric(cleaned);
}
