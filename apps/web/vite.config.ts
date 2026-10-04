import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev server networking (set by ./fpctl):
 * - `/v1` is proxied to the API (FP_API_PROXY, default http://127.0.0.1:8787). With VITE_API_URL="/" the browser
 *   calls the API on the page's own origin, so it works from another device and needs no CORS.
 * - FP_WEB_ALLOWED_HOSTS: extra host names (comma separated) for Vite's host check, e.g. the Tailscale MagicDNS name.
 * - FP_WEB_REMOTE=tailscale: the server listens on all interfaces (fpctl passes --host), but only loopback and
 *   Tailscale addresses (100.64.0.0/10, fd7a:115c:a1e0::/48) are served; anyone else on the LAN gets 403, because the
 *   dev login has no password.
 */
const apiTarget = process.env.FP_API_PROXY || "http://127.0.0.1:8787";
const extraHosts = (process.env.FP_WEB_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

export function isTailnetOrLoopback(address: string | undefined): boolean {
  if (!address) return false;
  const a = address.toLowerCase().replace(/^::ffff:/, "");
  if (a === "127.0.0.1" || a === "::1" || a.startsWith("127.")) return true;
  if (a.startsWith("fd7a:115c:a1e0:")) return true;
  const m = /^100\.(\d+)\.\d+\.\d+$/.exec(a);
  return m !== null && Number(m[1]) >= 64 && Number(m[1]) <= 127;
}

function tailnetOnly(): Plugin {
  return {
    name: "fp-tailnet-only",
    configureServer(server) {
      if (process.env.FP_WEB_REMOTE !== "tailscale") return;
      // Registered before Vite's own middlewares, so it also guards the /v1 proxy.
      server.middlewares.use((req, res, next) => {
        if (isTailnetOrLoopback(req.socket.remoteAddress)) return next();
        res.statusCode = 403;
        res.end("Forbidden: only this machine and Tailscale devices may connect.\n");
      });
      server.httpServer?.on("upgrade", (req, socket) => {
        if (!isTailnetOrLoopback(req.socket.remoteAddress)) socket.destroy();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailnetOnly()],
  server: {
    port: 5173,
    proxy: { "/v1": { target: apiTarget, changeOrigin: true } },
    ...(extraHosts.length > 0 ? { allowedHosts: extraHosts } : {}),
  },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
    setupFiles: ["./test/setup.ts"],
    testTimeout: 15_000,
  },
});
