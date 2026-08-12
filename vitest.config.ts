import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    /**
     * Integration test files share one PostgreSQL database and truncate it
     * between tests, so running files in parallel lets one file wipe another's
     * fixtures mid-run. The whole suite takes under a second, so serialising
     * files is cheaper than isolating schemas per worker.
     */
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      /**
       * `server-only` throws on import outside a React Server Component
       * environment. It is a build-time guard, not runtime behaviour we want to
       * exercise, so it is stubbed out for tests.
       */
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
    },
  },
});
