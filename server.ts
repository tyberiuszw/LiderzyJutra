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

app
  .prepare()
  .then(() => {
    const httpServer = createServer((req, res) => {
      // Let Socket.io handle /socket.io requests via its attached listener
      if (req.url?.startsWith("/socket.io")) {
        return;
      }
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    });

    // Attach Socket.io to the exact same HTTP server instance
    initSocketServer(httpServer);

    httpServer.listen(port, "0.0.0.0", () => {
      console.log(`> [TeamBonding Liderzy Jutra] Unified server ready on http://0.0.0.0:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start unified server:", err);
    process.exit(1);
  });
