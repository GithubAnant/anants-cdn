import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { assetUrl, parseManifest } from "@/lib/cdn";
import { getGitHubConfig, getRepoFile, listRepoPaths, listTags } from "@/lib/github";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const github = getGitHubConfig();
  if (!github) {
    return NextResponse.json({ error: "GitHub is not configured. Add GITHUB_TOKEN to env." }, { status: 500 });
  }

  const file = await getRepoFile(github, "manifest.json");
  if (!file?.content) {
    return NextResponse.json({ error: "manifest.json not found in repo" }, { status: 404 });
  }

  const jsonText = Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8");
  const manifest = parseManifest(JSON.parse(jsonText));
  const tags = await listTags(github);

  const repoPaths = await listRepoPaths(github, ["assets/", "media/"]);
  const aliasByPath = new Map(
    Object.entries(manifest.assets).map(([key, asset]) => [asset.path, key]),
  );
  const seenPaths = new Set<string>();
  const assets: Array<{ key: string; path: string; url: string; alt?: string; width?: number; height?: number }> = [];

  for (const [key, asset] of Object.entries(manifest.assets)) {
    assets.push({ key, ...asset, url: assetUrl(asset.path) });
    seenPaths.add(asset.path);
  }

  for (const path of repoPaths) {
    if (seenPaths.has(path)) continue;
    assets.push({
      key: aliasByPath.get(path) ?? path,
      path,
      url: assetUrl(path),
    });
  }

  assets.sort((a, b) => a.path.localeCompare(b.path));

  return NextResponse.json({
    version: manifest.version,
    baseUrl: manifest.baseUrl,
    cdnBaseUrl: process.env.CDN_BASE_URL ?? "https://cdn.anants.studio",
    assets,
    tags,
  });
}
