#!/usr/bin/env node
/**
 * Serve frontend/build (SPA) on PORT and proxy /api/* to Laravel (default 8000).
 * Usage: node scripts/dev-spa-proxy.mjs
 */
import { createServer, request as httpRequest } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../frontend/build");
const API = process.env.API_TARGET ?? "http://127.0.0.1:8000";
const port = Number(process.env.PORT ?? 5173);

function sendFile(res, filePath) {
  const ext = extname(filePath);
  const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2", ".map": "application/json" };
  res.setHeader("Content-Type", types[ext] ?? "application/octet-stream");
  createReadStream(filePath).pipe(res);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname.startsWith("/api")) {
    const target = new URL(pathname + url.search, API);
    const headers = { ...req.headers, host: target.host };
    delete headers["connection"];
    const proxyReq = httpRequest(
      { hostname: target.hostname, port: target.port || 80, path: target.pathname + target.search, method: req.method, headers },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on("error", () => {
      res.statusCode = 502;
      res.end("Bad gateway (is Laravel running on 8000?)");
    });
    req.pipe(proxyReq);
    return;
  }

  let file = join(root, pathname === "/" ? "index.html" : pathname);
  if (!existsSync(file) || !statSync(file).isFile()) {
    file = join(root, "index.html");
  }
  if (!existsSync(file)) {
    res.statusCode = 404;
    res.end("Missing frontend/build (run from repo root).");
    return;
  }
  sendFile(res, file);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`SPA: http://127.0.0.1:${port}/  (API proxy → ${API})`);
});
