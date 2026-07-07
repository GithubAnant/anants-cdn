# CDN Admin

Geist-styled dashboard ([vercel.com/design.md](https://vercel.com/design.md)) to upload media and publish CDN versions without using git manually.

## Setup

1. Create a GitHub fine-grained PAT with **Contents: Read and write** on `GithubAnant/anants-cdn`.
2. Copy env:

```bash
cd admin
cp .env.example .env.local
```

3. Set `ADMIN_PASSWORD` and `GITHUB_TOKEN` in `.env.local`.
4. Run locally:

```bash
npm install
npm run dev
```

Open http://localhost:3000 — admin lives at `/potato` (poke the potato 5× on `/` for the secret link).

## Deploy to Vercel

1. New Vercel project → root directory `admin`
2. Env vars (same as `.env.example`):
   - `ADMIN_PASSWORD`
   - `GITHUB_TOKEN`
   - `GITHUB_OWNER=GithubAnant`
   - `GITHUB_REPO=anants-cdn`
   - `CDN_BASE_URL=https://cdn.anants.studio`
3. Add custom domain `cdn-admin.anants.studio` (or subdomain you prefer)

## Workflow

1. **Upload Asset** — picks folder, optional manifest alias
2. **Publish Version** — bumps `manifest.json` + creates git tag (`v1.0.1`)
3. **Copy URL** — pinned CDN link for apps

Assets go live on `https://cdn.anants.studio/<tag>/<path>` after ~1–2 min.
