import { defineConfig } from "@trigger.dev/sdk";
import { ffmpeg } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "proj_qvslxoaacolilkpluggi",
  dirs: ["./trigger"],
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: { maxAttempts: 1, minTimeoutInMs: 1000, maxTimeoutInMs: 1000, factor: 2 },
  },
  build: {
    extensions: [ffmpeg()],
  },
});
