import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";

import {
  EditorContentError,
  listContentAssets,
  resolveContentAsset,
} from "./contentEditorModel.mjs";
import { ContentCloudClient } from "./contentCloudClient.mjs";
import { editorRequestAccess } from "./editorApiPlugin.mjs";
import { contentSnapshotRoot } from "./content_loader.mjs";

const CONTENT_TYPES = {
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function assetRequest(pathname) {
  const match = /^\/content-assets\/(posts|works|about)\/([^/]+)\/([^/]+)$/.exec(pathname);
  if (!match) return null;
  return { segment: match[1], id: match[2], name: match[3] };
}

/**
 * @param {{
 *   preferDrafts?: boolean,
 *   emitAssets?: boolean,
 *   trustedHost?: string,
 *   tailscaleLogin?: string,
 *   cloudAssets?: boolean,
 *   cloudClient?: ContentCloudClient,
 * }} [options]
 */
export function contentAssetsPlugin({
  preferDrafts = false,
  emitAssets = true,
  trustedHost = "",
  tailscaleLogin = "",
  cloudAssets = false,
  cloudClient,
} = {}) {
  // Resolved when a hook runs, not while the plugin is constructed: config
  // files are loaded by tools that never build (Vitest reads vite.config.js to
  // share its aliases), and those must not require a content snapshot.
  const snapshotRoot = () => contentSnapshotRoot();
  const configureMiddleware = (server) => {
    const cloud = cloudAssets ? cloudClient || new ContentCloudClient() : null;
    server.middlewares.use(async (request, response, next) => {
      const pathname = new URL(request.url || "/", "http://editor.local").pathname;
      const asset = assetRequest(pathname);
      if (!asset) return next();
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.statusCode = 405;
        response.end("Method not allowed");
        return;
      }
      if (
        preferDrafts &&
        !editorRequestAccess(request, { trustedHost, tailscaleLogin }).authorized
      ) {
        response.statusCode = 401;
        response.setHeader("Cache-Control", "no-store");
        response.end("Unauthorized");
        return;
      }
      try {
        if (cloud) {
          const kind = { posts: "post", works: "work", about: "about" }[asset.segment];
          const content = await cloud.read(kind, decodeURIComponent(asset.id));
          const logicalPath = `assets/${decodeURIComponent(asset.name)}`;
          const record = content.assets.find((candidate) => candidate.logicalPath === logicalPath);
          if (!record) throw new EditorContentError("Asset not found", 404, "not_found");
          const value = await cloud.getAsset(record.id);
          response.statusCode = 200;
          response.setHeader(
            "Content-Type",
            value.headers.get("content-type") || "application/octet-stream",
          );
          response.setHeader("Cache-Control", "no-store");
          response.end(
            request.method === "HEAD" ? undefined : Buffer.from(await value.arrayBuffer()),
          );
          return;
        }
        const filePath = resolveContentAsset(asset.segment, asset.id, asset.name, {
          preferDraft: preferDrafts,
        });
        response.statusCode = 200;
        response.setHeader(
          "Content-Type",
          CONTENT_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream",
        );
        response.setHeader("Cache-Control", "no-store");
        response.end(request.method === "HEAD" ? undefined : readFileSync(filePath));
      } catch (error) {
        response.statusCode = error instanceof EditorContentError ? error.status : 500;
        if (!(error instanceof EditorContentError)) {
          console.error("Unable to serve a content asset", error);
        }
        response.end(error instanceof EditorContentError ? error.message : "Unable to serve asset");
      }
    });
  };

  return {
    name: "content-assets",
    configureServer: configureMiddleware,
    configurePreviewServer: configureMiddleware,
    generateBundle() {
      if (!emitAssets) return;
      for (const asset of listContentAssets({ snapshotRoot: snapshotRoot() })) {
        this.addWatchFile(asset.filePath);
        this.emitFile({
          type: "asset",
          fileName: asset.outputPath,
          source: readFileSync(asset.filePath),
        });
      }
      // Thumbnails and other public files arrive inside the snapshot, so they
      // are emitted from there rather than from the checkout's public/.
      const publicRoot = join(snapshotRoot(), "public");
      if (!existsSync(publicRoot)) return;
      const pending = [publicRoot];
      while (pending.length > 0) {
        const directory = pending.pop();
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const filePath = join(directory, entry.name);
          if (entry.isDirectory()) {
            pending.push(filePath);
            continue;
          }
          if (!entry.isFile()) continue;
          this.addWatchFile(filePath);
          this.emitFile({
            type: "asset",
            fileName: relative(publicRoot, filePath),
            source: readFileSync(filePath),
          });
        }
      }
    },
  };
}
