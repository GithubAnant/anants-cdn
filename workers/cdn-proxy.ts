/**
 * cdn.anants.studio — website at / + versioned assets at /vX.Y.Z/<path>
 *
 * Website traffic proxies to SITE_ORIGIN (Vercel admin app).
 * Asset traffic proxies to jsDelivr → public GitHub repo.
 */
const GITHUB_USER = "GithubAnant";
const GITHUB_REPO = "anants-cdn";

/** Matches /v1.0.0/... asset paths only */
const CDN_PATH = /^\/v\d+\.\d+\.\d+(?:\/|$)/;

interface Env {
  /** Vercel deployment origin, e.g. https://anants-cdn-admin.vercel.app */
  SITE_ORIGIN?: string;
}

function isCdnAssetPath(pathname: string): boolean {
  return CDN_PATH.test(pathname);
}

async function proxyToSite(request: Request, origin: string): Promise<Response> {
  const requestUrl = new URL(request.url);
  const originUrl = new URL(origin);
  const upstreamUrl = new URL(requestUrl.pathname + requestUrl.search, originUrl);

  const headers = new Headers(request.headers);
  headers.set("Host", originUrl.host);
  headers.set("X-Forwarded-Host", requestUrl.host);
  headers.set("X-Forwarded-Proto", "https");

  return fetch(upstreamUrl.toString(), {
    method: request.method,
    headers,
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
    redirect: "manual",
  });
}

async function fetchFromJsDelivr(
  version: string,
  filePath: string,
  accept: string | null,
): Promise<Response> {
  const upstream = `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${version}/${filePath}`;

  const response = await fetch(upstream, {
    headers: {
      Accept: accept ?? "*/*",
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
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!isCdnAssetPath(url.pathname)) {
      const origin = env.SITE_ORIGIN?.replace(/\/$/, "");
      if (!origin) {
        return new Response(
          "anants-cdn site is not configured yet. Set SITE_ORIGIN on the worker.\n\nAssets: https://cdn.anants.studio/v1.0.0/<path>",
          { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
        );
      }
      return proxyToSite(request, origin);
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const [version, ...rest] = parts;
    const filePath = rest.join("/");

    if (!filePath) {
      return new Response("Missing file path", { status: 400 });
    }

    return fetchFromJsDelivr(version, filePath, request.headers.get("Accept"));
  },
} satisfies ExportedHandler<Env>;
