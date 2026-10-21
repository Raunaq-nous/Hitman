import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    environment: "node",
    globalSetup: ["tests/setup/db.global.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    reporters: process.env.VITEST_VERBOSE ? ["default"] : ["dot"],
    coverage: {
      provider: "v8",
      include: ["src/engine/**", "src/rights/**", "src/llm/**"],
      reporter: ["text-summary", "json-summary"],
      thresholds: { "src/engine/**": { branches: 100, functions: 100, lines: 100, statements: 100 } },
    },
  },
});
