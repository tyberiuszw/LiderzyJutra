/**
 * Unified Process Server (server.ts)
 *
 * Pairs Next.js 15 App Router HTTP request handler with Socket.io server
 * on a single native Node.js HTTP server port.
 *
 * Eliminates cross-origin CORS issues and enables turnkey deployment on
 * Docker, Render, Fly.io, Railway, VPS, or local environments.
 */

import { createServer } from "node:http";
import { parse } from "node:url";
import fs from "node:fs";
import path from "node:path";
import next from "next";
import { initSocketServer } from "./src/server/socket-server";

// Fallback environment variables for cloud deployments
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres.zdcmmrtxsbilegurlhbd:Cn4Ad%40W8Ey5Ymvm@aws-0-eu-west-2.pooler.supabase.com:5432/postgres";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "liderzy-jutra-production-secret-jwt-key-32-chars-min";
}

const hasBuildId = fs.existsSync(path.join(process.cwd(), ".next", "BUILD_ID"));
const dev = process.env.NODE_ENV !== "production" && !hasBuildId;
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

console.log(`> [TeamBonding] Starting unified server on port ${port} (mode: ${dev ? "development" : "production"}, hasBuildId: ${hasBuildId})...`);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let isNextReady = false;

// Create the native HTTP server immediately
const httpServer = createServer((req, res) => {
  // Let Socket.io handle /socket.io requests via its attached listener
  if (req.url?.startsWith("/socket.io")) {
    return;
  }

  // If Next.js is still preparing, answer healthcheck pings immediately so Railway doesn't return 502
  if (!isNextReady) {
    if (req.url === "/" || req.url === "/health" || req.url === "/healthz") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="3"><title>Uruchamianie Liderzy Jutra...</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0b0f19;color:#06b6d4;text-align:center;"><div><h1>🚀 Trwa uruchamianie serwera Liderzy Jutra...</h1><p style="color:#94a3b8;">Przygotowywanie gier i bazy danych (odświeżam za 3 sekundy)...</p></div></body></html>`);
      return;
    }
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Serwer się inicjalizuje...");
    return;
  }

  const parsedUrl = parse(req.url!, true);
  handle(req, res, parsedUrl);
});

// Attach Socket.io to the HTTP server
initSocketServer(httpServer);

// Listen immediately on 0.0.0.0:${port} so cloud healthchecks pass instantly
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`> [TeamBonding Liderzy Jutra] Unified server listening immediately on http://0.0.0.0:${port}`);
});

// Prepare Next.js in background
app
  .prepare()
  .then(() => {
    isNextReady = true;
    console.log(`> [TeamBonding Liderzy Jutra] Next.js ready! App is fully operational on http://0.0.0.0:${port}`);
  })
  .catch((err) => {
    console.error("Failed to prepare Next.js:", err);
    process.exit(1);
  });
