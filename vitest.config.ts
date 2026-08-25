import { defineConfig } from "vitest/config";
import path from "node:path";

// Minimal unit-test config: pure-function tests only (colocated *.test.ts,
// explicit `vitest` imports — no globals). The aliases mirror tsconfig.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "@components": path.resolve(__dirname, "app/components"),
      "@contexts": path.resolve(__dirname, "app/contexts"),
      "@hooks": path.resolve(__dirname, "app/hooks"),
      "@utils": path.resolve(__dirname, "app/utils"),
      "@constants": path.resolve(__dirname, "app/constants"),
      "@types": path.resolve(__dirname, "app/types"),
    },
  },
  test: {
    include: ["app/**/*.test.ts", "lib/**/*.test.ts"],
  },
});
