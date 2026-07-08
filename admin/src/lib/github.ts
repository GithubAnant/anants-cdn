import "server-only";

export type GitHubConfig = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
};

export function getGitHubConfig(): GitHubConfig | null {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";
  if (!token || !owner || !repo) return null;
  return { token, owner, repo, branch };
}

function encodeRepoPath(filePath: string): string {
  return filePath.split("/").map(encodeURIComponent).join("/");
}

type GitHubFileResponse = {
  sha: string;
  content?: string;
};

async function githubFetch(config: GitHubConfig, path: string, init?: RequestInit) {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeRepoPath(path)}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  return response;
}

export async function getRepoFile(config: GitHubConfig, repoPath: string, ref?: string): Promise<GitHubFileResponse | null> {
  const branch = ref ?? config.branch;
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeRepoPath(repoPath)}?ref=${encodeURIComponent(branch)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GitHub read failed: ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<GitHubFileResponse>;
}

export async function putRepoFile(
  config: GitHubConfig,
  repoPath: string,
  message: string,
  contentBase64: string,
): Promise<void> {
  const existing = await getRepoFile(config, repoPath);
  const response = await githubFetch(config, repoPath, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: contentBase64,
      branch: config.branch,
      sha: existing?.sha,
    }),
  });
  if (!response.ok) {
    throw new Error(`GitHub write failed: ${response.status} ${await response.text()}`);
  }
}

export async function getLatestCommitSha(config: GitHubConfig): Promise<string> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/commits/${encodeURIComponent(config.branch)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`GitHub commit lookup failed: ${response.status}`);
  }
  const data = (await response.json()) as { sha: string };
  return data.sha;
}

export async function createTag(config: GitHubConfig, tag: string, sha: string): Promise<void> {
  const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/git/refs`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: `refs/tags/${tag}`, sha }),
  });
  if (response.status === 422) {
    throw new Error(`Tag ${tag} already exists. Pick a new version.`);
  }
  if (!response.ok) {
    throw new Error(`Tag create failed: ${response.status} ${await response.text()}`);
  }
}

export async function listRepoPaths(
  config: GitHubConfig,
  prefixes: string[],
  ref?: string,
): Promise<string[]> {
  const commitSha = ref ? ref : await getLatestCommitSha(config);
  const commitUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/git/commits/${commitSha}`;
  const commitRes = await fetch(commitUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!commitRes.ok) {
    throw new Error(`GitHub commit tree lookup failed: ${commitRes.status}`);
  }
  const commit = (await commitRes.json()) as { tree: { sha: string } };

  const treeUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees/${commit.tree.sha}?recursive=1`;
  const treeRes = await fetch(treeUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!treeRes.ok) {
    throw new Error(`GitHub tree listing failed: ${treeRes.status}`);
  }
  const tree = (await treeRes.json()) as { tree: Array<{ type: string; path: string }> };

  return tree.tree
    .filter((item) => item.type === "blob")
    .map((item) => item.path)
    .filter((path) => prefixes.some((prefix) => path.startsWith(prefix)))
    .sort();
}

export async function listTags(config: GitHubConfig): Promise<string[]> {
  const response = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/tags?per_page=100`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    },
  );
  if (!response.ok) return [];
  const data = (await response.json()) as Array<{ name: string }>;
  return data.map((t) => t.name).filter((n) => /^v\d+\.\d+\.\d+$/.test(n));
}

const ALLOWED_PREFIXES = ["media/", "assets/"];

export function sanitizeRepoPath(input: string): string | null {
  const normalized = input.replace(/^\/+/, "").replace(/\\/g, "/");
  if (!normalized || normalized.includes("..")) return null;
  if (!ALLOWED_PREFIXES.some((p) => normalized.startsWith(p))) return null;
  return normalized;
}

export function sanitizeFileName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}
