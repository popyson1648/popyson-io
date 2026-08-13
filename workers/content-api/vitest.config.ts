import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: `${here}wrangler.jsonc` },
      miniflare: {
        bindings: {
          AUTH_MODE: "test",
          MAX_JSON_BYTES: "1048576",
          MAX_ASSET_BYTES: "10485760",
          TEST_MIGRATIONS: await readD1Migrations(`${here}migrations`),
        },
      },
    }),
  ],
  test: {
    setupFiles: ["./test/apply-migrations.ts"],
    // These tests run in a workerd isolate against a local D1, and each one
    // drives the Worker over many round trips. A test normally finishes in
    // roughly 150ms, but on a loaded machine one of them occasionally crosses
    // Vitest's 5s default and fails — a different test each run, since the
    // cause is contention rather than the test. This matches the root config,
    // and is still far short of a genuine hang.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
}));
