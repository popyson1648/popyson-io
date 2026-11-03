import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
const here = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: `${here}wrangler.jsonc` },
      miniflare: {
        d1Databases: ["CONTENT_DB"],
        r2Buckets: ["CONTENT_ASSETS", "CONTENT_BACKUPS"],
        bindings: { TEST_MIGRATIONS: await readD1Migrations(`${here}../content-api/migrations`) },
      },
    }),
  ],
  test: { include: ["test/**/*.test.ts"], testTimeout: 20000 },
}));
