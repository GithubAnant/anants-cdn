/**
 * cdn.anants.studio — website at / + clean asset paths at /assets/... and /media/...
 *
 * Website traffic proxies to SITE_ORIGIN (Vercel admin app).
 * Asset traffic proxies to jsDelivr → public GitHub repo (tag pinned via CDN_TAG).
 * Versioned paths (/vX.Y.Z/...) still work for explicit pinning.
 */
const GITHUB_USER = "GithubAnant";
const GITHUB_REPO = "anants-cdn";
const DEFAULT_CDN_TAG = "v1.0.3";

/** Matches /v1.0.0/... for explicit version pinning */
const VERSIONED_CDN_PATH = /^\/v\d+\.\d+\.\d+(?:\/|$)/;

/** Matches /assets/... and /media/... asset paths */
const CDN_ASSET_PREFIX = /^\/(assets|media)(?:\/|$)/;

/** Legacy /projects/portfolio/... → /assets/... */
const LEGACY_PORTFOLIO_PATH = /^\/projects\/portfolio(\/.*)?$/;

interface Env {
  /** Vercel deployment origin, e.g. https://cdn-anants.vercel.app */
  SITE_ORIGIN?: string;
  /** jsDelivr git tag for clean asset URLs, e.g. v1.0.1 */
  CDN_TAG?: string;
}

function isCdnAssetPath(pathname: string): boolean {
  return (
    VERSIONED_CDN_PATH.test(pathname) ||
    CDN_ASSET_PREFIX.test(pathname) ||
    LEGACY_PORTFOLIO_PATH.test(pathname)
  );
}

function normalizeTag(tag: string): string {
  const clean = tag.replace(/^@/, "");
  return clean.startsWith("v") ? clean : `v${clean}`;
}

function legacyPortfolioRedirect(pathname: string): Response | null {
  const match = pathname.match(LEGACY_PORTFOLIO_PATH);
  if (!match) return null;
  const suffix = match[1] ?? "";
  return Response.redirect(`https://cdn.anants.studio/assets${suffix}`, 301);
}

async function proxyToSite(request: Request, origin: string): Promise<Response> {
  const requestUrl = new URL(request.url);
  const originUrl = new URL(origin);
  const upstreamUrl = new URL(requestUrl.pathname + requestUrl.search, originUrl);

  const headers = new Headers(request.headers);
  headers.set("Host", originUrl.host);
  headers.set("X-Forwarded-Host", requestUrl.host);
  headers.set("X-Forwarded-Proto", "https");

  return fetch(upstreamUrl, {
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

    const legacyRedirect = legacyPortfolioRedirect(url.pathname);
    if (legacyRedirect) return legacyRedirect;

    if (!isCdnAssetPath(url.pathname)) {
      const origin = env.SITE_ORIGIN?.replace(/\/$/, "");
      if (!origin) {
        return new Response(
          "anants-cdn site is not configured yet. Set SITE_ORIGIN on the worker.\n\nAssets: https://cdn.anants.studio/assets/anant.png",
          { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
        );
      }
      return proxyToSite(request, origin);
    }

    const parts = url.pathname.split("/").filter(Boolean);

    if (VERSIONED_CDN_PATH.test(url.pathname)) {
      const [version, ...rest] = parts;
      let filePath = rest.join("/");

      // /v1.0.1/projects/portfolio/foo → assets/foo at pinned tag
      if (filePath.startsWith("projects/portfolio/")) {
        filePath = `assets/${filePath.slice("projects/portfolio/".length)}`;
      }

      if (!filePath) {
        return new Response("Missing file path", { status: 400 });
      }

      return fetchFromJsDelivr(version, filePath, request.headers.get("Accept"));
    }

    const filePath = parts.join("/");
    if (!filePath) {
      return new Response("Missing file path", { status: 400 });
    }

    const version = normalizeTag(env.CDN_TAG ?? DEFAULT_CDN_TAG);
    return fetchFromJsDelivr(version, filePath, request.headers.get("Accept"));
  },
} satisfies ExportedHandler<Env>;
