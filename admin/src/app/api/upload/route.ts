import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { parseManifest } from "@/lib/cdn";
import {
  getGitHubConfig,
  getRepoFile,
  putRepoFile,
  sanitizeFileName,
  sanitizeRepoPath,
} from "@/lib/github";

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const github = getGitHubConfig();
  if (!github) {
    return NextResponse.json({ error: "GitHub is not configured" }, { status: 500 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const folder = String(form.get("folder") ?? "");
  const projectName = sanitizeFileName(String(form.get("projectName") ?? ""));
  const alias = sanitizeFileName(String(form.get("alias") ?? ""));

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file selected. Choose a file to upload." }, { status: 400 });
  }

  let destFolder = folder;
  if (folder === "projects") {
    if (!projectName) {
      return NextResponse.json({ error: "Project name required for project uploads." }, { status: 400 });
    }
    destFolder = `projects/${projectName}`;
  }

  const safeName = sanitizeFileName(file.name);
  const repoPath = sanitizeRepoPath(`${destFolder}/${safeName}`);
  if (!repoPath) {
    return NextResponse.json({ error: "Invalid path. Use media/ or projects/ only." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > 50 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File exceeds 50 MB. Use Git LFS or a GitHub Release for larger files." },
      { status: 400 },
    );
  }

  await putRepoFile(github, repoPath, `Add ${repoPath}`, buffer.toString("base64"));

  if (alias) {
    const manifestFile = await getRepoFile(github, "manifest.json");
    if (manifestFile?.content) {
      const jsonText = Buffer.from(manifestFile.content.replace(/\n/g, ""), "base64").toString("utf8");
      const manifest = parseManifest(JSON.parse(jsonText));
      manifest.assets[alias] = { path: repoPath };
      const updated = `${JSON.stringify(manifest, null, 2)}\n`;
      await putRepoFile(
        github,
        "manifest.json",
        `Register manifest alias ${alias}`,
        Buffer.from(updated, "utf8").toString("base64"),
      );
    }
  }

  return NextResponse.json({ ok: true, path: repoPath });
}
