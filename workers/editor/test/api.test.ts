import { env, applyD1Migrations, type D1Migration } from "cloudflare:test";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, afterEach, describe, expect, it, vi } from "vitest";
import backend from "../../content-api/src/index";
import type { RuntimeEnv } from "../../content-api/src/env";
import { createEditorHandler, type EditorEnvironment } from "../src/index";

const origin = "https://editor.example.com";
const issuer = "https://example.cloudflareaccess.com";
const upstream = "https://content.example.com";
let handler: ReturnType<typeof createEditorHandler>;
let assertion: string;
const bindings: EditorEnvironment = {
  ASSETS: { fetch: async () => new Response("shell") },
  EDITOR_ORIGIN: origin,
  ACCESS_TEAM_DOMAIN: issuer,
  ACCESS_AUD: "editor",
  EDITOR_EMAIL: "owner@example.com",
  CONTENT_API_URL: upstream,
  CF_ACCESS_CLIENT_ID: "test-author-id",
  CF_ACCESS_CLIENT_SECRET: "test-author-secret",
  CONTENT_GITHUB_TOKEN: "test-dispatch-token",
  CONTENT_GITHUB_REPOSITORY: "example/site",
};
const backendEnv = {
  ...env,
  AUTH_MODE: "test",
  MAX_JSON_BYTES: "1048576",
  MAX_ASSET_BYTES: "10485760",
} as unknown as RuntimeEnv;

beforeAll(async () => {
  await applyD1Migrations(
    backendEnv.CONTENT_DB,
    (env as unknown as { TEST_MIGRATIONS: D1Migration[] }).TEST_MIGRATIONS,
  );
  const keys = await generateKeyPair("RS256");
  handler = createEditorHandler(createLocalJWKSet({ keys: [await exportJWK(keys.publicKey)] }));
  assertion = await new SignJWT({ email: bindings.EDITOR_EMAIL })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(issuer)
    .setAudience("editor")
    .setSubject("owner")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(keys.privateKey);
});
afterEach(() => vi.unstubAllGlobals());

function callBackend(request: Request, bindings: RuntimeEnv) {
  return backend.fetch(request as Parameters<typeof backend.fetch>[0], bindings);
}
function upstreams() {
  const dispatched: unknown[] = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    expect(request.headers.has("cookie")).toBe(false);
    expect(request.headers.has("cf-access-jwt-assertion")).toBe(false);
    expect(init?.redirect).toBe("manual");
    if (new URL(request.url).origin === upstream) {
      expect(request.headers.get("CF-Access-Client-Secret")).toBe(bindings.CF_ACCESS_CLIENT_SECRET);
      request.headers.set("x-test-role", "author");
      return callBackend(request, backendEnv);
    }
    expect(request.url).toBe(
      "https://api.github.com/repos/example/site/actions/workflows/content-publish.yml/dispatches",
    );
    expect(request.headers.get("authorization")).toBe(`Bearer ${bindings.CONTENT_GITHUB_TOKEN}`);
    dispatched.push(await request.json());
    return new Response(null, { status: 204 });
  });
  return dispatched;
}

async function call(path: string, method = "GET", body?: unknown) {
  return handler.fetch(
    new Request(origin + path, {
      method,
      headers: {
        "cf-access-jwt-assertion": assertion,
        origin,
        "content-type": "application/json",
        cookie: "CF_Authorization=browser-cookie",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    bindings,
  );
}

// JSON is deliberately inspected as the API's browser payload rather than
// asserted against internal implementation objects.
async function json(response: Response, status = 200): Promise<any> {
  const value = await response.json();
  expect(response.status, JSON.stringify(value)).toBe(status);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  return value;
}

describe("hosted editor with real local D1/R2", () => {
  it("creates, autosaves, detects conflicts, restores revisions, and updates state", async () => {
    upstreams();
    const created = await json(
      await call("/api/editor/content/work", "POST", { slug: "sample" }),
      201,
    );
    expect(created.status).toBe("private");
    const path = "/api/editor/content/work/sample";
    created.files.ja.meta.title = "新しい作品";
    created.files.ja.body = "## 本文";
    const saved = await json(await call(path, "PUT", created));
    expect(saved.currentRevisionId).not.toBe(created.currentRevisionId);
    expect((await json(await call(path, "PUT", created), 409)).error.code).toBeTruthy();
    expect((await json(await call(path))).files.ja.body).toBe("## 本文");
    const listed = await json(await call("/api/editor/content"));
    expect(listed.items.some((item: { id: string }) => item.id === "sample")).toBe(true);
    const history = await json(await call(`${path}/history`));
    expect(history.entries.length).toBeGreaterThanOrEqual(2);
    const restored = await json(
      await call(`${path}/history/${created.currentRevisionId}`, "POST", {
        currentRevisionId: saved.currentRevisionId,
      }),
    );
    expect(restored.files.ja.meta.title).toBe("");
    const deleted = await json(
      await call(path, "PATCH", { deleted: true, currentRevisionId: restored.currentRevisionId }),
    );
    expect(deleted.deletedAt).toBeTruthy();
    const recovered = await json(
      await call(path, "PATCH", {
        deleted: false,
        visibility: "public",
        currentRevisionId: deleted.currentRevisionId,
      }),
    );
    expect(recovered.deletedAt).toBeNull();
    expect(recovered.visibility).toBe("public");
  });

  it("uploads, attaches, and serves private images from R2", async () => {
    upstreams();
    const created = await json(
      await call("/api/editor/content/work", "POST", { slug: "images" }),
      201,
    );
    const image =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=";
    const uploaded = await json(
      await call("/api/editor/content/work/images/assets", "POST", {
        name: "photo.png",
        type: "image/png",
        data: image,
        currentRevisionId: created.currentRevisionId,
      }),
      201,
    );
    expect(uploaded.currentRevisionId).not.toBe(created.currentRevisionId);
    const bytes = await call(uploaded.url);
    expect(bytes.status).toBe(200);
    expect(bytes.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await bytes.arrayBuffer()).toString("base64")).toBe(image);
    const head = await call(uploaded.url, "HEAD");
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect((await call("/content-assets/works/images/missing.png")).status).toBe(404);
    expect((await call(uploaded.url, "POST", {})).status).toBe(405);
  });

  it("preserves translation settings and publication idempotency with dispatch and progress", async () => {
    const dispatches = upstreams();
    const created = await json(await call("/api/editor/content/post", "POST", {}), 201);
    const path = `/api/editor/content/post/${created.id}`;
    const changed = await json(
      await call(path, "PATCH", {
        translationEnabled: false,
        currentRevisionId: created.currentRevisionId,
      }),
    );
    expect(changed.translationEnabled).toBe(false);
    expect((await json(await call(`${path}/publish`))).valid).toBe(true);
    const first = await json(await call(`${path}/publish`, "POST", {}), 202);
    const second = await json(await call(`${path}/publish`, "POST", {}), 202);
    expect(second.id).toBe(first.id);
    expect(dispatches).toHaveLength(2);
    expect(dispatches[0]).toEqual({ ref: "main", inputs: { job_id: first.id } });
    expect((await json(await call(`/api/editor/publish/${first.id}`))).status).toBe("running");
    const preflight = await json(await call("/api/editor/publication"));
    expect(preflight.intentChecksum).toBeTruthy();
  });

  it("dispatches a batch publication and rejects a stale intent", async () => {
    const dispatches = upstreams();
    await json(await call("/api/editor/content/work", "POST", { slug: "batch" }), 201);
    const preflight = await json(await call("/api/editor/publication"));
    const result = await json(
      await call("/api/editor/publication", "POST", { intentChecksum: preflight.intentChecksum }),
      202,
    );
    expect(result.id).toBeTruthy();
    expect(dispatches).toHaveLength(1);
    await json(
      await call("/api/editor/publication", "POST", { intentChecksum: "0".repeat(64) }),
      409,
    );
  });

  it("rejects invalid public drafts and supports thumbnail regeneration", async () => {
    upstreams();
    const created = await json(await call("/api/editor/content/post", "POST", {}), 201);
    const path = `/api/editor/content/post/${created.id}`;
    const changed = await json(
      await call(path, "PATCH", {
        visibility: "public",
        currentRevisionId: created.currentRevisionId,
      }),
    );
    expect((await json(await call(`${path}/publish`))).valid).toBe(false);
    await json(await call(`${path}/publish`, "POST", {}), 422);
    const regenerated = await json(await call(`${path}/thumbnail`, "DELETE", {}));
    expect(regenerated.currentRevisionId).not.toBe(changed.currentRevisionId);
    expect(regenerated.files.ja.meta.thumbnail.mode).toBe("auto");
  });

  it("edits the fixed About item without a filesystem snapshot", async () => {
    upstreams();
    const files = {
      ja: { meta: { person: { name: "著者" }, newsItems: [] }, body: "" },
      en: { meta: { person: { name: "Author" }, newsItems: [] }, body: "" },
    };
    const seed = await callBackend(
      new Request(upstream + "/v1/author/content", {
        method: "POST",
        headers: { "x-test-role": "author", "content-type": "application/json" },
        body: JSON.stringify({
          kind: "about",
          id: "about",
          visibility: "private",
          sourceJa: JSON.stringify({ about: '[person]\nname="著者"', news: "" }),
          sourceEn: JSON.stringify({ about: '[person]\nname="Author"', news: "" }),
          documents: { files },
        }),
      }),
      backendEnv,
    );
    expect(seed.status).toBe(201);
    const about = await json(await call("/api/editor/content/about/about"));
    about.files.ja.meta.newsItems = [
      { date: "2026-11-01", title: "更新", description: "本文", href: "" },
    ];
    const saved = await json(await call("/api/editor/content/about/about", "PUT", about));
    expect(saved.files.ja.meta.newsItems[0].title).toBe("更新");
  });

  it("renders Markdown, code, and safe links in the actual Worker runtime", async () => {
    upstreams();
    const preview = await json(
      await call("/api/editor/preview", "POST", {
        locale: "ja",
        markdown:
          "## 見出し\n\n```javascript\nconst value = 1;\n```\n\n[bad](javascript:alert(1))\n\n<script>alert(1)</script>",
      }),
    );
    expect(preview.html).toContain("見出し");
    expect(preview.html).toContain("shiki");
    expect(preview.html).toContain("コードをコピー");
    expect(preview.html).not.toContain("<script>");
    expect(preview.html).not.toContain('href="javascript:');
    const fallback = await json(
      await call("/api/editor/preview", "POST", { markdown: "```unlisted-language\n<safe>\n```" }),
    );
    expect(fallback.html).toContain("&#x3C;safe>");
  });

  it("rejects malformed JSON and oversized requests without calling upstream", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    for (const [body, length, status] of [
      ["{", "1", 400],
      ["{}", "16000000", 413],
    ] as const) {
      const response = await handler.fetch(
        new Request(origin + "/api/editor/preview", {
          method: "POST",
          headers: { origin, "cf-access-jwt-assertion": assertion, "content-length": length },
          body,
        }),
        bindings,
      );
      expect(response.status).toBe(status);
    }
    const oversized = await handler.fetch(
      new Request(origin + "/api/editor/preview", {
        method: "POST",
        headers: { origin, "cf-access-jwt-assertion": assertion },
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(16 * 1024 * 1024));
            controller.close();
          },
        }),
      }),
      bindings,
    );
    expect(oversized.status).toBe(413);
    expect(
      (await call("/api/editor/preview", "POST", { markdown: "a".repeat(262145) })).status,
    ).toBe(413);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not leak upstream error details or credentials", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json(
        { error: { message: "private-secret", code: "upstream_error" } },
        { status: 500 },
      ),
    );
    const response = await call("/api/editor/content");
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private-secret");
  });
});
