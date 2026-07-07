# anants-cdn

Public media CDN for [anants.studio](https://anants.studio) projects.  
Source of truth: this GitHub repo. Delivery: [jsDelivr](https://www.jsdelivr.com/).

## Quick URLs

Replace `v1.0.0` with your latest tag:

```
https://cdn.jsdelivr.net/gh/GithubAnant/anants-cdn@v1.0.0/<path>
```

## Layout

| Path | Purpose |
|------|---------|
| `media/images/` | Shared images, OG cards, icons |
| `media/video/` | Short clips (< 100 MB) |
| `media/audio/` | Audio assets |
| `media/fonts/` | Self-hosted fonts |
| `projects/<name>/` | Per-project asset bundles |

## Workflow

1. Add files under `media/` or `projects/`.
2. Commit and push to `main`.
3. Tag a release: `git tag v1.0.1 && git push origin v1.0.1`
4. Reference the tagged URL in apps.

## Admin dashboard

Password-protected UI to upload files and publish versions — no manual git.

See [`admin/README.md`](./admin/README.md). Deploy `admin/` to Vercel (e.g. `cdn-admin.anants.studio`).

## Custom domain (optional)

Skip Cloudflare Workers — use the Vercel or Node proxy in [`proxy/`](./proxy/):

```
https://cdn.anants.studio/v1.0.0/media/images/logo.png
```

Or use jsDelivr directly (no hosting needed).

## Docs

- [Architecture options](./docs/ARCHITECTURE.md) — jsDelivr vs proxy vs R2
- [Setup checklist](./docs/SETUP.md) — GitHub, DNS, first deploy
- [Proxy wrappers](./proxy/README.md) — Vercel or Node, no Workers

## License

Media files: all rights reserved unless otherwise noted in file or folder.
