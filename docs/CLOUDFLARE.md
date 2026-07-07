# Cloudflare Worker — cdn.anants.studio

No credit card. Free tier. DDoS handled at Cloudflare edge. Bytes from jsDelivr cache.

## 1. Add domain to Cloudflare

`anants.studio` DNS is currently on Name.com. The Worker custom domain needs the zone in Cloudflare.

1. Sign up at https://dash.cloudflare.com/sign-up (email only)
2. **Add a site** → `anants.studio` → Free plan
3. Cloudflare shows two nameservers (e.g. `ada.ns.cloudflare.com`)
4. At **Name.com** → DNS → change nameservers to Cloudflare's pair
5. Wait for zone to become **Active** (usually minutes, up to 24h)

Existing records (Vercel for `www`, etc.) must be recreated in Cloudflare DNS. Copy from Name.com before switching NS.

Typical portfolio setup:

| Type | Name | Content |
|------|------|---------|
| CNAME | `www` | `cname.vercel-dns.com` (or your Vercel target) |
| A or CNAME | `@` | Vercel apex record from Vercel dashboard |

## 2. Enable custom domain and deploy

Uncomment the `[[routes]]` block in `workers/wrangler.toml`, then:

```bash
cd workers
npx wrangler login   # local only — credentials stay in ~/.wrangler, never commit
npx wrangler deploy
```

Deploy creates `cdn.anants.studio` DNS + TLS once the zone is Active.

Until then, the Worker runs on your `*.workers.dev` URL from the deploy output.

## 3. Test

```bash
curl -I https://cdn.anants.studio/v1.0.0/media/images/placeholder.svg
```

Expected: `200`, `cache-control: public, max-age=31536000, immutable`

## 4. Production URLs

```
https://cdn.anants.studio/v1.0.0/media/images/logo.png
```

Pin version tags in apps. Bump tag when assets change.

## Troubleshooting

- **Zone not found** — `anants.studio` not active in Cloudflare yet
- **DNS not resolving** — NS switch still propagating; flush local DNS cache
- **404** — asset missing or tag not pushed to GitHub
- **100k req/day limit** — free tier; cached media rarely hits this for portfolio use
