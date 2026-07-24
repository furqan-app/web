import { defineConfig } from "vitest/config";
import path from "node:path";

// Minimal unit-test config: pure-function tests only (colocated *.test.ts,
// explicit `vitest` imports — no globals). The `@/` alias mirrors tsconfig.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    include: ["app/**/*.test.ts", "lib/**/*.test.ts"],
  },
});
