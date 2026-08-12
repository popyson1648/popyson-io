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
  },
}));
