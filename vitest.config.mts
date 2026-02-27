import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    onConsoleLog(log) {
      if (log.startsWith("Convex functions should not directly call")) {
        return false;
      }
    },
    coverage: {
      provider: "v8",
      include: ["src/component/**", "src/core/**"],
      exclude: [
        "src/**/_generated/**",
        "src/core/pendingCheckout.ts",
        "src/core/index.ts",
        "src/core/types.ts",
        "**/*.d.ts",
      ],
    },
  },
});
