const MAX_DIFF_CHARS = 30_000;

export interface PrReference {
  owner: string;
  repo: string;
  number: number;
}

export interface PrDiff {
  title: string;
  filesChanged: number;
  diff: string;
  truncated: boolean;
}

export class GitHubNotConfiguredError extends Error {
  constructor() {
    super("GITHUB_TOKEN is not set on the server.");
    this.name = "GitHubNotConfiguredError";
  }
}

export class GitHubNotFoundError extends Error {
  constructor(ref: PrReference) {
    super(`Couldn't find PR #${ref.number} on ${ref.owner}/${ref.repo} — check the reference and that the token can read this repo.`);
    this.name = "GitHubNotFoundError";
  }
}

export class GitHubRateLimitError extends Error {
  constructor() {
    super("GitHub API rate limit hit. Wait a bit and try again.");
    this.name = "GitHubRateLimitError";
  }
}

/** Accepts a full PR URL or the "owner/repo#123" shorthand. */
export function parsePrReference(input: string): PrReference | null {
  const trimmed = input.trim();

  const urlMatch = trimmed.match(/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2], number: Number(urlMatch[3]) };
  }

  const shorthandMatch = trimmed.match(/^([^/\s]+)\/([^/\s#]+)#(\d+)$/);
  if (shorthandMatch) {
    return { owner: shorthandMatch[1], repo: shorthandMatch[2], number: Number(shorthandMatch[3]) };
  }

  return null;
}

function authHeaders(token: string, accept: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function fetchPrDiff(ref: PrReference): Promise<PrDiff> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new GitHubNotConfiguredError();
  }

  const url = `https://api.github.com/repos/${ref.owner}/${ref.repo}/pulls/${ref.number}`;

  const metaRes = await fetch(url, { headers: authHeaders(token, "application/vnd.github+json") });
  if (metaRes.status === 404) throw new GitHubNotFoundError(ref);
  if (metaRes.status === 403) throw new GitHubRateLimitError();
  if (!metaRes.ok) throw new Error(`GitHub API error fetching PR metadata: ${metaRes.status}`);
  const meta = await metaRes.json();

  const diffRes = await fetch(url, { headers: authHeaders(token, "application/vnd.github.v3.diff") });
  if (diffRes.status === 404) throw new GitHubNotFoundError(ref);
  if (diffRes.status === 403) throw new GitHubRateLimitError();
  if (!diffRes.ok) throw new Error(`GitHub API error fetching PR diff: ${diffRes.status}`);
  const fullDiff = await diffRes.text();

  const truncated = fullDiff.length > MAX_DIFF_CHARS;
  const diff = truncated
    ? `${fullDiff.slice(0, MAX_DIFF_CHARS)}\n\n… diff truncated at ${MAX_DIFF_CHARS.toLocaleString()} characters …`
    : fullDiff;

  return {
    title: typeof meta.title === "string" ? meta.title : `PR #${ref.number}`,
    filesChanged: typeof meta.changed_files === "number" ? meta.changed_files : 0,
    diff,
    truncated,
  };
}
