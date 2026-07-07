/**
 * Tiny jsDelivr proxy for VPS / any Node host.
 *
 *   node server.mjs
 *   PORT=3000 GITHUB_USER=GithubAnant GITHUB_REPO=anants-cdn node server.mjs
 *
 * URL: http://localhost:3000/v1.0.0/media/images/logo.png
 */
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 3000);
const GITHUB_USER = process.env.GITHUB_USER ?? "GithubAnant";
const GITHUB_REPO = process.env.GITHUB_REPO ?? "anants-cdn";

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);

  if (parts.length === 0) {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end("anants-cdn proxy — use /<version>/<path>");
    return;
  }

  const [version, ...rest] = parts;
  const filePath = rest.join("/");

  if (!filePath) {
    res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    res.end("Missing file path");
    return;
  }

  const upstream = `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${version}/${filePath}`;

  try {
    const response = await fetch(upstream, {
      headers: { Accept: req.headers.accept ?? "*/*" },
    });

    const headers = {
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=31536000, immutable",
    };

    const contentType = response.headers.get("content-type");
    if (contentType) headers["content-type"] = contentType;

    const contentLength = response.headers.get("content-length");
    if (contentLength) headers["content-length"] = contentLength;

    res.writeHead(response.status, headers);

    if (response.body) {
      const { Readable } = await import("node:stream");
      Readable.fromWeb(response.body).pipe(res);
    } else {
      res.end();
    }
  } catch {
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end("Upstream error");
  }
});

server.listen(PORT, () => {
  console.log(`anants-cdn proxy on :${PORT}`);
});
