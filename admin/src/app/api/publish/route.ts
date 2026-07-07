import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { parseManifest } from "@/lib/cdn";
import { createTag, getGitHubConfig, getLatestCommitSha, getRepoFile, putRepoFile } from "@/lib/github";

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const github = getGitHubConfig();
  if (!github) {
    return NextResponse.json({ error: "GitHub is not configured" }, { status: 500 });
  }

  const body = (await request.json()) as { version?: string };
  const raw = body.version?.trim() ?? "";
  const tagName = raw.startsWith("v") ? raw : raw ? `v${raw}` : "";
  if (!/^v\d+\.\d+\.\d+$/.test(tagName)) {
    return NextResponse.json(
      { error: "Version must look like v1.0.1. Pick a new tag that does not exist yet." },
      { status: 400 },
    );
  }

  const semver = tagName.slice(1);
  const manifestFile = await getRepoFile(github, "manifest.json");
  if (manifestFile?.content) {
    const jsonText = Buffer.from(manifestFile.content.replace(/\n/g, ""), "base64").toString("utf8");
    const manifest = parseManifest(JSON.parse(jsonText));
    manifest.version = semver;
    const updated = `${JSON.stringify(manifest, null, 2)}\n`;
    await putRepoFile(
      github,
      "manifest.json",
      `Release ${tagName}`,
      Buffer.from(updated, "utf8").toString("base64"),
    );
  }

  const sha = await getLatestCommitSha(github);
  await createTag(github, tagName, sha);

  return NextResponse.json({ ok: true, tag: tagName, sha });
}
