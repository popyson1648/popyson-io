import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createEditorHandler, type EditorEnvironment } from "../src/index";

let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let handler: ReturnType<typeof createEditorHandler>;
const issuer = "https://example.cloudflareaccess.com";
const origin = "https://editor.example.com";
const email = "owner@example.com";

beforeAll(async () => {
  keys = await generateKeyPair("RS256");
  handler = createEditorHandler(createLocalJWKSet({ keys: [await exportJWK(keys.publicKey)] }));
});

async function token(overrides: Record<string, unknown> = {}, key = keys.privateKey) {
  return new SignJWT({
    iss: issuer,
    aud: "editor-audience",
    sub: "owner-id",
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300,
    ...overrides,
  })
    .setProtectedHeader({ alg: "RS256" })
    .sign(key);
}

function environment(): EditorEnvironment {
  return {
    EDITOR_ORIGIN: origin,
    ACCESS_TEAM_DOMAIN: issuer,
    ACCESS_AUD: "editor-audience",
    EDITOR_EMAIL: email,
    ASSETS: { fetch: vi.fn(async () => new Response("editor shell")) },
  };
}

function request(path: string, assertion?: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (assertion) headers.set("cf-access-jwt-assertion", assertion);
  return new Request(`${origin}${path}`, { ...init, headers });
}

describe("hosted editor access boundary", () => {
  it.each(["/", "/editor", "/assets/app.js", "/editor-preview", "/api/editor/content"])(
    "protects %s before reading assets",
    async (path) => {
      const env = environment();
      const response = await handler.fetch(request(path), env);
      expect(response.status).toBe(401);
      expect(env.ASSETS.fetch).not.toHaveBeenCalled();
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    },
  );

  it.each([
    { exp: 1 },
    { exp: undefined },
    { iss: "https://other.cloudflareaccess.com" },
    { aud: "another-application" },
    { nbf: Math.floor(Date.now() / 1000) + 3600 },
    { email: undefined },
  ])("rejects invalid claims %j", async (claims) => {
    const env = environment();
    expect((await handler.fetch(request("/editor", await token(claims)), env)).status).toBe(401);
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it("rejects a forged signature", async () => {
    const other = await generateKeyPair("RS256");
    const response = await handler.fetch(
      request("/editor", await token({}, other.privateKey)),
      environment(),
    );
    expect(response.status).toBe(401);
  });

  it("rejects another authenticated user and ignores unsigned identity headers", async () => {
    const response = await handler.fetch(
      request("/editor", await token({ email: "other@example.com" }), {
        headers: { "cf-access-authenticated-user-email": email },
      }),
      environment(),
    );
    expect(response.status).toBe(403);
  });

  it.each(["EDITOR_ORIGIN", "ACCESS_TEAM_DOMAIN", "ACCESS_AUD", "EDITOR_EMAIL"] as const)(
    "fails closed without %s",
    async (name) => {
      const env = environment();
      env[name] = "";
      expect((await handler.fetch(request("/editor", await token()), env)).status).toBe(503);
      expect(env.ASSETS.fetch).not.toHaveBeenCalled();
    },
  );

  it("rejects an alternate hostname even with a valid token", async () => {
    const response = await handler.fetch(
      new Request("https://unprotected.workers.dev/editor", {
        headers: { "cf-access-jwt-assertion": await token() },
      }),
      environment(),
    );
    expect(response.status).toBe(403);
  });

  it.each(["/editor", "/editor-preview"])("serves %s only after authentication", async (path) => {
    const env = environment();
    const assertion = await token();
    const response = await handler.fetch(
      request(path, assertion, { headers: { cookie: "CF_Authorization=private" } }),
      env,
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("editor shell");
    const forwarded = vi.mocked(env.ASSETS.fetch).mock.calls[0][0];
    expect(new URL(forwarded.url).pathname).toBe(`${path}.html`);
    expect(forwarded.headers.has("cookie")).toBe(false);
    expect(forwarded.headers.has("cf-access-jwt-assertion")).toBe(false);
  });

  it.each([undefined, "https://attacker.example"])("rejects mutation origin %s", async (value) => {
    const headers = value ? { origin: value } : undefined;
    const response = await handler.fetch(
      request("/api/editor/content", await token(), { method: "POST", headers }),
      environment(),
    );
    expect(response.status).toBe(403);
  });

  it("rejects a cross-site fetch with an otherwise matching Origin", async () => {
    const response = await handler.fetch(
      request("/api/editor/content", await token(), {
        method: "POST",
        headers: { origin, "sec-fetch-site": "cross-site" },
      }),
      environment(),
    );
    expect(response.status).toBe(403);
  });

  it("keeps unconfigured APIs out of the static asset fallback", async () => {
    const env = environment();
    const response = await handler.fetch(
      request("/api/editor/content", await token(), { method: "POST", headers: { origin } }),
      env,
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { code: "editor_api_not_configured", message: "Editor API is not configured" },
    });
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });
});
