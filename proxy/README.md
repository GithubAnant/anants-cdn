# CDN proxy wrappers (no Cloudflare Worker)

Pretty URLs for `cdn.anants.studio` without Workers. Both options proxy to jsDelivr → this GitHub repo.

```
Browser → your host → cdn.jsdelivr.net/gh/GithubAnant/anants-cdn@<version>/<path>
```

## Option 1 — Vercel (recommended)

Deploy the `vercel/` folder as its own Vercel project:

```bash
cd proxy/vercel
npx vercel --prod
```

Then add custom domain `cdn.anants.studio` in the Vercel dashboard.

**URL pattern:**

```
https://cdn.anants.studio/v1.0.0/media/images/logo.png
```

No runtime code — `vercel.json` rewrites handle everything.

## Option 2 — Node on a VPS

For the server at `216.198.79.1` or any Node host:

```bash
cd proxy/node
node server.mjs
# or: PORT=80 node server.mjs
```

Put nginx/caddy in front for TLS:

```nginx
server {
  listen 443 ssl;
  server_name cdn.anants.studio;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
  }
}
```

## Option 3 — Skip the proxy

Use jsDelivr directly (zero hosting):

```
https://cdn.jsdelivr.net/gh/GithubAnant/anants-cdn@v1.0.0/media/images/logo.png
```

## Cloudflare Worker

Still available in `workers/` if you prefer Workers later. Not required.
