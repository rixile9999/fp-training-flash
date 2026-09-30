import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "shared/*/test/**/*.test.ts",
      "modules/*/test/**/*.test.ts",
      "apps/api/test/**/*.test.ts",
      "apps/mcp/test/**/*.test.ts",
      "apps/cli/test/**/*.test.ts",
      "tools/*/test/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
