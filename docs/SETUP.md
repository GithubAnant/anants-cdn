# Setup checklist

## 1. Create the GitHub repo

`gh` auth was invalid in the environment that scaffolded this repo. Run locally:

```bash
cd /Users/anantsinghal/Desktop/MusicBrain/anants-cdn
git init -b main
git add .
git commit -m "Initial anants-cdn media repo scaffold"
gh auth login   # if needed
gh repo create GithubAnant/anants-cdn --public --source=. --remote=origin --push
```

Repo **must be public** for jsDelivr.

## 2. Add your first asset

```bash
cp ~/path/to/logo.png media/images/logo.png
git add media/images/logo.png
git commit -m "Add logo"
git tag v1.0.0
git push origin main --tags
```

## 3. Test jsDelivr (wait ~1–2 min after first push)

```
https://cdn.jsdelivr.net/gh/GithubAnant/anants-cdn@v1.0.0/media/images/logo.png
```

Or unpinned (dev only):

```
https://cdn.jsdelivr.net/gh/GithubAnant/anants-cdn@main/media/images/logo.png
```

## 4. Use in portfolio / apps

```html
<img
  src="https://cdn.jsdelivr.net/gh/GithubAnant/anants-cdn@v1.0.0/media/images/logo.png"
  alt="Anant logo"
  width="512"
  height="512"
/>
```

```ts
const CDN = "https://cdn.jsdelivr.net/gh/GithubAnant/anants-cdn@v1.0.0";
export const assets = {
  logo: `${CDN}/media/images/logo.png`,
};
```

## 5. Optional — cdn.anants.studio

No Cloudflare Worker required. Use a proxy wrapper from [`proxy/`](../proxy/README.md):

**Vercel (easiest):**

```bash
cd proxy/vercel
npx vercel --prod
```

Add `cdn.anants.studio` as custom domain in Vercel.

**VPS / existing server:**

```bash
cd proxy/node
node server.mjs
```

Point DNS `cdn.anants.studio` at that host (nginx/caddy for TLS in front).

URLs:

```
https://cdn.anants.studio/v1.0.0/media/images/logo.png
```

## 6. Purging / updates

- jsDelivr caches aggressively. Bump the tag (`v1.0.1`) or use a commit SHA for instant cache busting.
- Do not rely on overwriting files at the same tag — tags should be immutable.
