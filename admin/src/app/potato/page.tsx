"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import styles from "./page.module.css";
import { FOLDER_OPTIONS } from "@/lib/cdn";

type AssetRow = {
  key: string;
  path: string;
  url: string;
  alt?: string;
};

type DashboardData = {
  version: string;
  cdnBaseUrl: string;
  assets: AssetRow[];
  tags: string[];
};

function nextVersion(tags: string[]): string {
  const semverTags = tags
    .filter((t) => /^v\d+\.\d+\.\d+$/.test(t))
    .map((t) => t.slice(1).split(".").map(Number));
  if (semverTags.length === 0) return "v1.0.1";
  semverTags.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  const [major, minor, patch] = semverTags[semverTags.length - 1];
  return `v${major}.${minor}.${patch + 1}`;
}

export default function PotatoAdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [folder, setFolder] = useState<string>(FOLDER_OPTIONS[0].value);
  const [projectName, setProjectName] = useState("");
  const [alias, setAlias] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("v1.0.1");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [drag, setDrag] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/assets");
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      setMessage({ type: "error", text: err.error ?? "Could not load assets" });
      setAuthed(true);
      return;
    }
    const json = (await res.json()) as DashboardData;
    setData(json);
    setVersion(nextVersion(json.tags));
    setAuthed(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy("Signing in…");
    setMessage(null);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy("");
    if (!res.ok) {
      setMessage({ type: "error", text: "Wrong password. Try again." });
      return;
    }
    setPassword("");
    await load();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthed(false);
    setData(null);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setMessage({ type: "error", text: "No file selected. Drop a file or click the upload area." });
      return;
    }
    setBusy("Uploading…");
    setMessage(null);
    const form = new FormData();
    form.set("file", file);
    form.set("folder", folder);
    form.set("projectName", projectName);
    form.set("alias", alias);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = (await res.json()) as { error?: string; path?: string };
    setBusy("");
    if (!res.ok) {
      setMessage({ type: "error", text: json.error ?? "Upload failed" });
      return;
    }
    setMessage({ type: "ok", text: `Uploaded ${json.path}` });
    setFile(null);
    setAlias("");
    await load();
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setBusy("Publishing…");
    setMessage(null);
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version }),
    });
    const json = (await res.json()) as { error?: string; tag?: string };
    setBusy("");
    if (!res.ok) {
      setMessage({ type: "error", text: json.error ?? "Publish failed" });
      return;
    }
    setMessage({ type: "ok", text: `Published ${json.tag}. Wait 1–2 min for CDN cache.` });
    await load();
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setMessage({ type: "ok", text: "URL copied" });
  }

  const filteredAssets =
    data?.assets.filter((asset) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        asset.key.toLowerCase().includes(q) ||
        asset.path.toLowerCase().includes(q) ||
        asset.url.toLowerCase().includes(q)
      );
    }) ?? [];

  if (authed === null) {
    return <div className={styles.page} />;
  }

  if (!authed) {
    return (
      <div className={styles.loginWrap}>
        <div className={styles.loginTop}>
          <ThemeToggle />
        </div>
        <div className={`${styles.card} ${styles.loginCard}`}>
          <Link href="/" className={styles.back}>
            ← back to potato
          </Link>
          <h1 className={styles.title}>🥔 Potato Cellar</h1>
          <p className={styles.subtitle}>Sign in to upload media and publish versions.</p>
          {message && <div className={`${styles.toast} ${styles.toastError}`}>{message.text}</div>}
          <form onSubmit={handleLogin}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={!!busy}>
              {busy || "Enter Cellar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <ThemeToggle />
        </div>
        <header className={styles.header}>
          <div>
            <Link href="/" className={styles.back}>
              ← back to potato
            </Link>
            <h1 className={styles.title}>🥔 Potato Cellar</h1>
            <p className={styles.subtitle}>
              Upload to GitHub → publish a tag → live on{" "}
              <a href={data?.cdnBaseUrl ?? "https://cdn.anants.studio"} target="_blank" rel="noreferrer">
                {data?.cdnBaseUrl ?? "cdn.anants.studio"}
              </a>
            </p>
          </div>
          <div className={styles.headerActions}>
            <button className={`${styles.btn} ${styles.btnTertiary}`} type="button" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </header>

        {message && (
          <div className={`${styles.toast} ${message.type === "ok" ? styles.toastOk : styles.toastError}`}>
            {message.text}
          </div>
        )}

        <div className={styles.grid2}>
          <section className={`${styles.card} ${styles.cardStretch}`}>
            <div className={styles.panelHeader}>
              <h2 className={styles.sectionTitle}>Upload Asset</h2>
              <p className={styles.sectionHint}>Files commit directly to the public anants-cdn repo.</p>
            </div>
            <form className={styles.cardForm} onSubmit={handleUpload}>
              <div
                className={`${styles.dropzone} ${drag ? styles.dropzoneActive : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  const dropped = e.dataTransfer.files[0];
                  if (dropped) setFile(dropped);
                }}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <p className={styles.dropzoneTitle}>{file ? file.name : "Drop File Here"}</p>
                <p className={styles.dropzoneHint}>Max 50 MB per file</p>
                <input
                  id="file-input"
                  type="file"
                  hidden
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="folder">
                  Destination
                </label>
                <select
                  id="folder"
                  className={styles.select}
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                >
                  {FOLDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {folder === "projects" && (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="project">
                    Project Name
                  </label>
                  <input
                    id="project"
                    className={styles.input}
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="githate"
                  />
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.label} htmlFor="alias">
                  Manifest Alias (optional)
                </label>
                <input
                  id="alias"
                  className={styles.input}
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="githate-og"
                />
              </div>

              <div className={styles.cardFooter}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={!!busy || !file}>
                  {busy === "Uploading…" ? busy : "Upload Asset"}
                </button>
              </div>
            </form>
          </section>

          <section className={`${styles.card} ${styles.cardStretch}`}>
            <div className={styles.panelHeader}>
              <h2 className={styles.sectionTitle}>Publish Version</h2>
              <p className={styles.sectionHint}>
                Current manifest: <span className={styles.mono}>v{data?.version ?? "—"}</span>
                <br />
                Tags are immutable. Bump patch or minor when assets change.
              </p>
            </div>
            <form className={styles.cardForm} onSubmit={handlePublish}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="version">
                  New Tag
                </label>
                <input
                  id="version"
                  className={`${styles.input} ${styles.mono}`}
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="v1.0.1"
                />
              </div>
              <div className={styles.cardFooter}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={!!busy}>
                  {busy === "Publishing…" ? busy : "Publish Version"}
                </button>
              </div>
            </form>
          </section>
        </div>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Published Assets</h2>
          <div className={styles.assetsToolbar}>
            <p className={styles.sectionHint} style={{ margin: 0 }}>
              URLs use pinned tag <span className={styles.mono}>v{data?.version}</span>
            </p>
            <div className={styles.searchWrap}>
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Search alias, path, or URL…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search published assets"
              />
            </div>
          </div>
          {!data?.assets.length ? (
            <p className={styles.empty}>No manifest aliases yet. Upload with an alias or edit manifest.json.</p>
          ) : filteredAssets.length === 0 ? (
            <p className={styles.empty}>No assets match “{search}”.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Alias</th>
                  <th>Path</th>
                  <th>URL</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => (
                  <tr key={asset.key}>
                    <td className={styles.mono}>{asset.key}</td>
                    <td className={styles.mono}>{asset.path}</td>
                    <td>
                      <a
                        className={styles.urlLink}
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {asset.url}
                      </a>
                    </td>
                    <td>
                      <button
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        type="button"
                        onClick={() => void copyUrl(asset.url)}
                      >
                        Copy URL
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
