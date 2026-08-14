import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { contentAssetsPlugin } from "../scripts/contentAssetsPlugin.mjs";
import { editorApiPlugin } from "../scripts/editorApiPlugin.mjs";
import { siteContentPlugin, themeCssPlugin } from "../vite.config.js";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

export default defineConfig({
  root: ROOT,
  base: "/",
  // The same public/ the site build serves. About stores its avatar as a path
  // into it (`icon = "/avator.jpg"`), so without this the editor's profile
  // image and the preview iframe both render a broken image.
  publicDir: resolve(ROOT, "public"),
  plugins: [
    react(),
    contentAssetsPlugin({
      preferDrafts: true,
      emitAssets: false,
      cloudAssets: process.env.CONTENT_EDITOR_ENABLED === "1",
      trustedHost: process.env.CONTENT_EDITOR_TRUSTED_HOST,
      tailscaleLogin: process.env.CONTENT_EDITOR_TAILSCALE_LOGIN,
    }),
    editorApiPlugin({
      enabled: process.env.CONTENT_EDITOR_ENABLED === "1",
      trustedHost: process.env.CONTENT_EDITOR_TRUSTED_HOST,
      tailscaleLogin: process.env.CONTENT_EDITOR_TAILSCALE_LOGIN,
    }),
    themeCssPlugin(),
    siteContentPlugin(),
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
