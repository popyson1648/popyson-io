import { editorApi, type EditorApiEnvironment } from "./api";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export interface EditorEnvironment extends EditorApiEnvironment {
  ASSETS: { fetch(request: Request): Promise<Response> };
  EDITOR_ORIGIN: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  EDITOR_EMAIL: string;
}

const SAFE_METHODS = new Set(["GET", "HEAD"]);

function problem(status: number, code: string): Response {
  return Response.json({ error: { code } }, { status });
}

function privateResponse(response: Response): Response {
  const result = new Response(response.body, response);
  result.headers.set("Cache-Control", "private, no-store");
  result.headers.set("X-Content-Type-Options", "nosniff");
  result.headers.set("Referrer-Policy", "same-origin");
  result.headers.set("Content-Security-Policy", "frame-ancestors 'self'");
  return result;
}

function configuration(env: EditorEnvironment) {
  try {
    const origin = new URL(env.EDITOR_ORIGIN);
    const issuer = new URL(env.ACCESS_TEAM_DOMAIN);
    if (
      origin.protocol !== "https:" ||
      origin.origin !== env.EDITOR_ORIGIN ||
      issuer.protocol !== "https:" ||
      issuer.origin !== env.ACCESS_TEAM_DOMAIN ||
      !issuer.hostname.endsWith(".cloudflareaccess.com") ||
      !env.ACCESS_AUD?.trim() ||
      !env.EDITOR_EMAIL?.trim()
    ) {
      return null;
    }
    return { origin: origin.origin, issuer: issuer.origin };
  } catch {
    return null;
  }
}

// The injectable key resolver lets tests use real signed JWTs without calling
// Cloudflare. The deployed entry point always uses Cloudflare's remote JWKS.
export function createEditorHandler(resolveKey?: JWTVerifyGetKey) {
  let cachedIssuer = "";
  let cachedKeys: JWTVerifyGetKey | undefined;

  async function handle(request: Request, env: EditorEnvironment): Promise<Response> {
    const config = configuration(env);
    if (!config) return problem(503, "editor_not_configured");
    const url = new URL(request.url);
    if (url.origin !== config.origin) return problem(403, "untrusted_origin");
    const assertion = request.headers.get("cf-access-jwt-assertion");
    if (!assertion) return problem(401, "access_assertion_required");

    try {
      if (!resolveKey && cachedIssuer !== config.issuer) {
        cachedKeys = createRemoteJWKSet(new URL(`${config.issuer}/cdn-cgi/access/certs`));
        cachedIssuer = config.issuer;
      }
      const { payload } = await jwtVerify(assertion, resolveKey || cachedKeys!, {
        issuer: config.issuer,
        audience: env.ACCESS_AUD,
        algorithms: ["RS256"],
        requiredClaims: ["exp", "iat", "sub", "email"],
      });
      if (payload.email !== env.EDITOR_EMAIL) return problem(403, "identity_not_allowed");
    } catch {
      return problem(401, "invalid_access_assertion");
    }

    if (
      !SAFE_METHODS.has(request.method) &&
      (request.headers.get("origin") !== config.origin ||
        (request.headers.has("sec-fetch-site") &&
          request.headers.get("sec-fetch-site") !== "same-origin"))
    ) {
      return problem(403, "cross_origin_request");
    }

    if (
      url.pathname === "/api" ||
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/content-assets/")
    ) {
      return editorApi(request, env);
    }
    if (!SAFE_METHODS.has(request.method)) return problem(405, "method_not_allowed");
    if (["/", "/editor", "/editor/"].includes(url.pathname)) url.pathname = "/editor.html";
    if (["/editor-preview", "/editor-preview/"].includes(url.pathname)) {
      url.pathname = "/editor-preview.html";
    }
    // Identity cookies and assertions are not needed by the static binding.
    const headers = new Headers(request.headers);
    headers.delete("cookie");
    headers.delete("authorization");
    headers.delete("cf-access-jwt-assertion");
    return env.ASSETS.fetch(new Request(url, { method: request.method, headers }));
  }

  return {
    async fetch(request: Request, env: EditorEnvironment): Promise<Response> {
      try {
        return privateResponse(await handle(request, env));
      } catch {
        return privateResponse(problem(500, "editor_unavailable"));
      }
    },
  };
}

export default createEditorHandler();
