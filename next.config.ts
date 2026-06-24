import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname),
  },
  outputFileTracingExcludes: {
    "*": [
      "node_modules/import-in-the-middle/**",
      "node_modules/@opentelemetry/instrumentation/**",
    ],
  },
};

export default nextConfig;
