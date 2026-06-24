import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

// Reuse vite.config.js (aliases, virtual modules, the React/TOML plugins) so the
// test pipeline matches the build. Tests are split into three named projects so
// scripts/verify.py can run them as separate phases:
//   - unit:        pure logic/data, node env, no build needed (pre-commit + CI)
//   - integration: assert against the built dist/, node env (pre-push + CI)
//   - component:   React components, happy-dom env (pre-commit + CI)
// Run one with `vitest run --project <name>`.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: "unit",
            environment: "node",
            include: ["tests/**/*.test.mjs"],
            exclude: ["tests/**/*.integration.test.mjs"],
          },
        },
        {
          extends: true,
          test: {
            name: "integration",
            environment: "node",
            include: ["tests/**/*.integration.test.mjs"],
          },
        },
        {
          extends: true,
          test: {
            name: "component",
            environment: "happy-dom",
            include: ["tests/**/*.test.jsx"],
            setupFiles: ["./tests/setup.component.js"],
          },
        },
      ],
      coverage: {
        provider: "v8",
        reportsDirectory: "./.tmp/coverage",
        reporter: ["text", "html"],
        // Measurement only (no CI threshold gate). Limit to the JS/JSX sources
        // the tests exercise; non-code assets (css/json/toml/md) are skipped so
        // the uncovered-file pass has nothing it cannot transform.
        include: ["src/**/*.{js,jsx}", "scripts/**/*.mjs"],
      },
    },
  }),
);
