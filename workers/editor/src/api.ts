import { ContentCloudClient, contentCloudConfig } from "../../../scripts/contentCloudClient.mjs";
import {
  GitHubWorkflowClient,
  githubWorkflowConfig,
} from "../../../scripts/githubWorkflowClient.mjs";
import { handleEditorApi, editorApiError } from "../../../scripts/editorApiCore.mjs";
import { renderArticleHtml } from "./preview";

export interface EditorApiEnvironment {
  CONTENT_API_URL?: string;
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
  CONTENT_GITHUB_TOKEN?: string;
  CONTENT_GITHUB_REPOSITORY?: string;
  CONTENT_GITHUB_REF?: string;
}

export async function editorApi(request: Request, env: EditorApiEnvironment): Promise<Response> {
  let cloud: ContentCloudClient;
  let workflows: GitHubWorkflowClient;
  try {
    const origin = new URL(env.CONTENT_API_URL || "");
    if (origin.protocol !== "https:" || origin.origin !== env.CONTENT_API_URL) throw new Error();
    if (!/^[\w.-]+\/[\w.-]+$/.test(env.CONTENT_GITHUB_REPOSITORY || "")) throw new Error();
    cloud = new ContentCloudClient(contentCloudConfig({ ...env }));
    workflows = new GitHubWorkflowClient(githubWorkflowConfig({ ...env }));
  } catch {
    return Response.json(
      { error: { code: "editor_api_not_configured", message: "Editor API is not configured" } },
      { status: 503 },
    );
  }
  try {
    const pathname = new URL(request.url).pathname;
    if (pathname.startsWith("/content-assets/")) {
      if (!["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 405 });
      const match = /^\/content-assets\/(posts|works|about)\/([^/]+)\/([^/]+)$/.exec(pathname);
      if (!match) return new Response(null, { status: 404 });
      const kind = { posts: "post", works: "work", about: "about" }[match[1]];
      const content = await cloud.read(kind, decodeURIComponent(match[2]));
      const logicalPath = `assets/${decodeURIComponent(match[3])}`;
      const record = content.assets.find(
        (asset: { logicalPath: string }) => asset.logicalPath === logicalPath,
      );
      if (!record) return new Response(null, { status: 404 });
      const value = await cloud.getAsset(record.id);
      const type = value.headers.get("content-type")?.split(";", 1)[0];
      if (!type || !["image/gif", "image/jpeg", "image/png", "image/webp"].includes(type)) {
        await value.body?.cancel();
        return new Response(null, { status: 502 });
      }
      // The author API exposes GET only. Drain HEAD responses without buffering
      // to finish the R2 stream cleanly while returning no body to the browser.
      if (request.method === "HEAD") await value.body?.pipeTo(new WritableStream());
      return new Response(request.method === "HEAD" ? null : value.body, {
        headers: { "Content-Type": type },
      });
    }
    return await handleEditorApi(request, { cloud, workflows, renderArticleHtml });
  } catch (error) {
    return editorApiError(error);
  }
}
