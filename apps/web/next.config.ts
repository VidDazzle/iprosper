import path from "node:path";
import { config as loadDotenv } from "dotenv";
import type { NextConfig } from "next";

// Monorepo convention: one .env at the repo root, not per-app. Next.js
// only auto-loads .env files from its own app directory by default, so
// this loads the root one explicitly. In Docker Compose deployment env
// vars are injected directly into the container's process.env and this
// becomes a no-op (dotenv never overrides an already-set variable).
loadDotenv({ path: path.resolve(__dirname, "../../.env") });

const config: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // Safety net: Playwright (used by @apex/pipeline's scrape stage) has
  // dynamic/optional requires (bidi, electron, the trace-viewer UI)
  // that break static webpack bundling. It should never actually run
  // in this app's own server code, but keep it external in case
  // anything transitively pulls it in.
  serverExternalPackages: ["playwright", "playwright-core"],
  // Workspace packages (@apex/*) are consumed as raw TS source using
  // NodeNext-style ".js" import specifiers (resolved by tsc/tsx at the
  // package level). Webpack doesn't know that convention by default —
  // this alias tells it a ".js" specifier may actually resolve to a
  // ".ts"/".tsx" file.
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return webpackConfig;
  },
};

export default config;
