import { isIP } from "node:net";
import { Readable } from "node:stream";
import { renderArticleHtml } from "./articleHtml.mjs";
import { ContentCloudClient } from "./contentCloudClient.mjs";
import { GitHubWorkflowClient } from "./githubWorkflowClient.mjs";
import { handleEditorApi, editorApiError } from "./editorApiCore.mjs";
export { batchPublicationIdempotencyKey } from "./editorApiCore.mjs";
function sendJson(response, status, value) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(value));
}
async function sendResponse(response, result) {
  response.statusCode = result.status;
  result.headers.forEach((value, name) => response.setHeader(name, value));
  response.end(Buffer.from(await result.arrayBuffer()));
}
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isLoopbackAddress(address) {
  const value = String(address || "")
    .split("%")[0]
    .toLowerCase();
  if (value === "::1") return true;
  if (value.startsWith("::ffff:")) return isLoopbackAddress(value.slice(7));
  return isIP(value) === 4 && value.split(".")[0] === "127";
}

export function isLoopbackHost(hostHeader) {
  try {
    const hostname = new URL(`http://${String(hostHeader || "").trim()}`).hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, "");
    return hostname === "localhost" || isLoopbackAddress(hostname);
  } catch {
    return false;
  }
}

function requestHostname(hostHeader) {
  try {
    return new URL(`http://${String(hostHeader || "").trim()}`).hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, "");
  } catch {
    return "";
  }
}

export function isTrustedTailscaleHost(hostHeader, trustedHost) {
  return Boolean(trustedHost) && requestHostname(hostHeader) === String(trustedHost).toLowerCase();
}

function isSameOriginRequest(request) {
  if (SAFE_METHODS.has(String(request.method || "GET").toUpperCase())) return true;
  const host = String(request.headers.host || "").toLowerCase();
  const fetchSite = String(request.headers["sec-fetch-site"] || "").toLowerCase();
  if (fetchSite && fetchSite !== "same-origin") return false;
  try {
    const origin = new URL(String(request.headers.origin || ""));
    return ["http:", "https:"].includes(origin.protocol) && origin.host.toLowerCase() === host;
  } catch {
    return false;
  }
}

export function editorRequestAccess(request, { trustedHost = "", tailscaleLogin = "" } = {}) {
  if (!isLoopbackAddress(request.socket?.remoteAddress) || !isSameOriginRequest(request)) {
    return { authorized: false, mode: "denied" };
  }
  if (isLoopbackHost(request.headers.host)) return { authorized: true, mode: "loopback" };

  const loginHeader = request.headers["tailscale-user-login"];
  const login = Array.isArray(loginHeader) ? loginHeader[0] : loginHeader;
  if (
    isTrustedTailscaleHost(request.headers.host, trustedHost) &&
    tailscaleLogin &&
    login === tailscaleLogin
  ) {
    return { authorized: true, mode: "tailscale" };
  }
  return { authorized: false, mode: "denied" };
}

/**
 * @param {{
 *   enabled?: boolean,
 *   trustedHost?: string,
 *   tailscaleLogin?: string,
 *   cloudClient?: ContentCloudClient,
 *   workflowClient?: GitHubWorkflowClient,
 * }} [options]
 */
export function editorApiPlugin({
  enabled = false,
  trustedHost = "",
  tailscaleLogin = "",
  cloudClient,
  workflowClient,
} = {}) {
  const configureMiddleware = (server) => {
    if (!enabled) return;
    const services = {
      cloud: cloudClient || new ContentCloudClient(),
      workflows: workflowClient || new GitHubWorkflowClient(),
    };
    server.middlewares.use(async (request, response, next) => {
      const url = new URL(request.url || "/", "http://editor.local");
      if (request.method === "GET" && ["/editor", "/editor/"].includes(url.pathname)) {
        request.url = `/editor.html${url.search}`;
        next();
        return;
      }
      if (
        request.method === "GET" &&
        ["/editor-preview", "/editor-preview/"].includes(url.pathname)
      ) {
        request.url = `/editor-preview.html${url.search}`;
        next();
        return;
      }
      if (!url.pathname.startsWith("/api/editor/")) return next();
      if (!editorRequestAccess(request, { trustedHost, tailscaleLogin }).authorized) {
        sendJson(response, 401, {
          error: {
            code: "unauthorized",
            message:
              "この接続は許可されていません。npm run editor が表示したTailscale Serve URLを、許可されたTailscaleアカウントで開いてください。",
          },
        });
        return;
      }
      try {
        const headers = new Headers();
        for (const [name, value] of Object.entries(request.headers)) {
          if (value !== undefined)
            headers.set(name, Array.isArray(value) ? value.join(", ") : String(value));
        }
        const init = { method: request.method, headers };
        if (!["GET", "HEAD"].includes(request.method))
          Object.assign(init, { body: Readable.toWeb(request), duplex: "half" });
        await sendResponse(
          response,
          await handleEditorApi(new Request(url, init), { ...services, renderArticleHtml }),
        );
      } catch (error) {
        await sendResponse(response, editorApiError(error));
      }
    });
  };

  return {
    name: "content-editor-api",
    configureServer: configureMiddleware,
    configurePreviewServer: configureMiddleware,
  };
}
