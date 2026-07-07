# CDN architecture options for cdn.anants.studio

## The short answer

| Goal | Repo visibility | Custom domain | Complexity |
|------|-----------------|---------------|------------|
| **A. jsDelivr only** | **Public** (required) | No — use `cdn.jsdelivr.net` | Lowest |
| **B. jsDelivr + pretty domain** | **Public** | Yes — Cloudflare Worker proxy | Medium |
| **C. Cloudflare Pages** | Public (for git deploy) | Yes — native | Low–medium |
| **D. Cloudflare R2** | Private source OK | Yes — native | Medium |
| **E. jsDelivr custom endpoint** | Public | Yes — email jsDelivr | Low ops, approval needed |

**jsDelivr cannot serve private GitHub repos.** If the files must stay private, do not use jsDelivr as the origin.

---

## Option A — GitHub + jsDelivr (recommended starting point)

```
You push media → public GitHub repo → jsDelivr mirrors → global edge cache
```

**URL pattern:**

```
https://cdn.jsdelivr.net/gh/GithubAnant/anants-cdn@<version>/<path>
```

**Version pinning (always do this in production):**

| Pin type | Example | When to use |
|----------|---------|-------------|
| Git tag | `@v1.2.0` | Releases — best default |
| Commit SHA | `@abc1234` | Immutable, audit-friendly |
| Branch | `@main` | Dev only — can change under you |

**Example:**

```
https://cdn.jsdelivr.net/gh/GithubAnant/anants-cdn@v1.0.0/media/images/logo.png
```

**Pros:** Free, zero infra, great cache, permanent S3 backup on jsDelivr side.  
**Cons:** Public repo, no native `cdn.anants.studio`, 100 MB GitHub file limit (use releases or Git LFS for bigger files).

---

## Option B — jsDelivr behind cdn.anants.studio (Cloudflare Worker)

Use when you want your own domain but still want jsDelivr as the cache layer.

```
Browser → cdn.anants.studio → Cloudflare Worker (rewrite path) → cdn.jsdelivr.net → GitHub
```

**Worker sketch:**

```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    // https://cdn.anants.studio/v1.0.0/media/images/logo.png
    //   → https://cdn.jsdelivr.net/gh/GithubAnant/anants-cdn@v1.0.0/media/images/logo.png
    const [, version, ...rest] = url.pathname.split("/").filter(Boolean);
    const upstream = `https://cdn.jsdelivr.net/gh/GithubAnant/anants-cdn@${version}/${rest.join("/")}`;
    return fetch(upstream, {
      headers: { Accept: request.headers.get("Accept") ?? "*/*" },
      cf: { cacheTtl: 31536000, cacheEverything: true },
    });
  },
};
```

**DNS:** Add `cdn.anants.studio` as a Worker custom domain in Cloudflare (domain should be on Cloudflare or use partial CNAME setup).

**Pros:** Branded URLs, version in path, still free jsDelivr origin.  
**Cons:** Repo must stay public; Worker is extra moving part.

---

## Option C — Cloudflare Pages (git → deploy → CDN)

```
public GitHub repo → Cloudflare Pages build → cdn.anants.studio
```

**Pros:** Real custom domain, preview deploys, no Worker code.  
**Cons:** Not jsDelivr; repo still public for standard git integration; rebuild on every push.

Good when assets are mostly static site files (images, fonts, small media) and you want the simplest branded CDN without a proxy.

---

## Option D — Cloudflare R2 (private-friendly)

```
private or public GitHub → GitHub Action sync → R2 bucket → cdn.anants.studio
```

**Pros:** Private source repo, S3-compatible, cheap egress via Cloudflare, full control.  
**Cons:** Not jsDelivr; you own sync + bucket policy.

Best when media should not be in a public GitHub repo but you still want git as the source of truth.

---

## Option E — jsDelivr custom OSS endpoint

jsDelivr offers [custom endpoints](https://www.jsdelivr.com/oss-cdn) for open-source projects with unusual needs. Email `d@jsdelivr.com` if you want them to host `cdn.anants.studio` directly.

**Pros:** No proxy, full jsDelivr network.  
**Cons:** Approval process; still public OSS.

---

## Recommended layout for this repo

```
anants-cdn/
├── media/           # shared assets (logos, og images, icons)
│   ├── images/
│   ├── video/
│   ├── audio/
│   └── fonts/
├── projects/        # per-project bundles
│   └── portfolio/
│       └── hero.webp
└── manifest.json    # optional stable aliases for apps
```

**Naming rules:**

- lowercase, hyphen-separated: `githate-og.png`
- include dimensions in name when useful: `logo-512.png`
- prefer webp/avif for photos; keep png/svg for logos
- tag releases (`v1.0.0`) when you change production assets

---

## File size strategy

| Size | Approach |
|------|----------|
| < 50 MB | Commit directly to repo |
| 50–100 MB | Git LFS in repo |
| > 100 MB | GitHub Releases (attach binary) + jsDelivr release URL |
| Very large video | R2 or dedicated video host; link from manifest |

**jsDelivr release URL:**

```
https://cdn.jsdelivr.net/gh/GithubAnant/anants-cdn@v1.0.0/curt-final.mp4
```

(Attach large files to the GitHub release tagged `v1.0.0`.)

---

## Security notes

- Public repo = anyone can hotlink. That is usually fine for portfolio media.
- Do not commit secrets, `.env`, signed URLs, or private keys.
- Pin versions in production HTML/apps — never bare `@main` in shipped sites.
- If you need access control, use R2 + signed URLs (Option D), not jsDelivr.

---

## Suggested rollout

1. **Now:** Public `anants-cdn` repo + jsDelivr URLs with git tags.
2. **Next:** Point `cdn.anants.studio` at a Cloudflare Worker (Option B) for clean URLs.
3. **Later:** Move large/private assets to R2 if hotlinking or repo size becomes a problem.
