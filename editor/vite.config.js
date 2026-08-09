import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { contentAssetsPlugin } from "../scripts/contentAssetsPlugin.mjs";
import { editorApiPlugin } from "../scripts/editorApiPlugin.mjs";
import { themeCssPlugin } from "../vite.config.js";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

export default defineConfig({
  root: ROOT,
  base: "/",
  publicDir: false,
  plugins: [
    react(),
    contentAssetsPlugin({ preferDrafts: true, emitAssets: false }),
    editorApiPlugin({
      enabled: process.env.CONTENT_EDITOR_ENABLED === "1",
      trustedHost: process.env.CONTENT_EDITOR_TRUSTED_HOST,
      tailscaleLogin: process.env.CONTENT_EDITOR_TAILSCALE_LOGIN,
    }),
    themeCssPlugin(),
  ],
  build: {
    outDir: resolve(ROOT, "editor/dist"),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        editor: resolve(ROOT, "editor.html"),
        "editor-preview": resolve(ROOT, "editor-preview.html"),
      },
    },
  },
});
