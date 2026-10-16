import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { withEve } from "eve/next";

// The template keeps a single .env.local at the repo root, but `next dev
// apps/web` reads .env files from the project directory (apps/web). Load the
// root .env.local explicitly so DATABASE_URL and friends reach the dev server
// and the eve agent runtime. Existing environment variables win.
try {
  const rootEnv = resolve(process.cwd(), ".env.local");
  if (existsSync(rootEnv) && !process.env.DATABASE_URL) {
    process.loadEnvFile(rootEnv);
  }
} catch {
  // ignore when the file is absent or unreadable
}

// The eve agent lives at the repo root (agent/), one level above the Next app.
const eveRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // The /eve/v1/* endpoints are long-lived streams. The model (the free
    // poolside model especially) can take well over Next's 30s default proxy
    // timeout to produce a turn, which makes the dev proxy abort the stream
    // mid-response. Raise the rewrite/proxy timeout to 10 minutes so slow
    // turns still reach the browser.
    proxyTimeout: 600_000,
  },
};

// withEve starts `eve dev` locally and rewrites the same-origin `/eve/v1/*`
// protocol endpoints to it, so plain `pnpm dev` serves the chat agent. In
// Vercel production it emits the service routes used by vercel.ts.
export default withEve(nextConfig, { eveRoot });