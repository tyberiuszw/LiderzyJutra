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
import next from "next";
import { initSocketServer } from "./src/server/socket-server";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || (dev ? "localhost" : "0.0.0.0");
const port = parseInt(process.env.PORT || "3000", 10);

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
