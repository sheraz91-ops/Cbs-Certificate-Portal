/**
 * lib/github.ts
 *
 * Thin wrapper around the GitHub Contents API. Every "save" the admin panel
 * does is really just: read a file's current SHA, then PUT new content back
 * with that SHA — which GitHub records as a normal commit. No database,
 * no server storage: the repo IS the database, same as the rest of this
 * project already assumes.
 *
 * Required env vars (set these once in Vercel → Settings → Environment Variables):
 *   GITHUB_TOKEN   - a fine-grained PAT with "Contents: Read and write" on this repo only
 *   GITHUB_OWNER   - your GitHub username or org, e.g. "sheeraz"
 *   GITHUB_REPO    - the repo name, e.g. "certificate-app"
 *   GITHUB_BRANCH  - defaults to "main" if unset
 *   ADMIN_PASSWORD - the password that gates /admin
 *
 * NOTE: never put the token in NEXT_PUBLIC_* — it must stay server-only,
 * which is why every function here is called from API routes, never from
 * client components directly.
 */

const GITHUB_API = "https://api.github.com";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function repoConfig() {
  return {
    owner: requireEnv("GITHUB_OWNER"),
    repo: requireEnv("GITHUB_REPO"),
    branch: process.env.GITHUB_BRANCH || "main",
    token: requireEnv("GITHUB_TOKEN"),
  };
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/**
 * Fetch a file's current content + sha. Returns null if the file doesn't
 * exist yet (so callers can decide whether to create vs. update).
 */
export async function getFile(
  path: string
): Promise<{ content: string; sha: string } | null> {
  const { owner, repo, branch, token } = repoConfig();
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const res = await fetch(url, { headers: authHeaders(token) });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub getFile failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  // GitHub returns base64 content for files under ~1MB via this endpoint.
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { content, sha: data.sha };
}

/**
 * Create or update a text file (JSON/TS/etc). Pass the file's current sha
 * if you have it (from getFile) to update; omit it to create a new file.
 */
export async function putTextFile(
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<void> {
  const { owner, repo, branch, token } = repoConfig();
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;

  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content, "utf-8").toString("base64"),
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`GitHub putTextFile failed (${res.status}): ${await res.text()}`);
  }
}

/**
 * Upload a binary file (e.g. a certificate template PNG). base64Data should
 * be the raw base64 payload WITHOUT the "data:image/png;base64," prefix —
 * strip that on the client before sending, or the helper below does it.
 */
export async function putBinaryFile(
  path: string,
  base64Data: string,
  message: string
): Promise<void> {
  const { owner, repo, branch, token } = repoConfig();
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;

  // Check if it already exists so we send the sha and it's treated as an
  // update rather than erroring on a duplicate create.
  const existing = await getFile(path).catch(() => null);

  const body: Record<string, unknown> = {
    message,
    content: base64Data.replace(/^data:.*;base64,/, ""),
    branch,
  };
  if (existing?.sha) body.sha = existing.sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`GitHub putBinaryFile failed (${res.status}): ${await res.text()}`);
  }
}

/** Simple constant-time-ish password check for the admin gate. */
export function checkAdminPassword(candidate: string): boolean {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) throw new Error("Missing required env var: ADMIN_PASSWORD");
  return candidate === real;
}
