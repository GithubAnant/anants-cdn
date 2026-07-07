/**
 * Optional Cloudflare Worker: cdn.anants.studio → jsDelivr
 *
 * Deploy: wrangler deploy
 * Custom domain: cdn.anants.studio (Cloudflare dashboard)
 *
 * URL: https://cdn.anants.studio/v1.0.0/media/images/logo.png
 */
const GITHUB_USER = "GithubAnant";
const GITHUB_REPO = "anants-cdn";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length === 0) {
      return new Response("anants-cdn — use /<version>/<path>", { status: 200 });
    }

    const [version, ...rest] = parts;
    const filePath = rest.join("/");

    if (!filePath) {
      return new Response("Missing file path", { status: 400 });
    }

    const upstream = `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${version}/${filePath}`;

    const response = await fetch(upstream, {
      headers: {
        Accept: request.headers.get("Accept") ?? "*/*",
      },
      cf: {
        cacheEverything: true,
        cacheTtl: 31536000,
      },
    });

    if (!response.ok) {
      return new Response("Not found", { status: response.status });
    }

    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  },
};
