import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

const authorHeaders = { "content-type": "application/json", "x-test-role": "author" };

async function clearDatabase() {
  await env.CONTENT_DB.batch([
    env.CONTENT_DB.prepare("DELETE FROM release_items"),
    env.CONTENT_DB.prepare("DELETE FROM releases"),
    env.CONTENT_DB.prepare("DELETE FROM publish_jobs"),
    env.CONTENT_DB.prepare("DELETE FROM revision_assets"),
    env.CONTENT_DB.prepare("DELETE FROM assets"),
    env.CONTENT_DB.prepare("DELETE FROM content_revisions WHERE parent_revision_id IS NOT NULL"),
    env.CONTENT_DB.prepare("DELETE FROM content_revisions"),
    env.CONTENT_DB.prepare("DELETE FROM content_items"),
  ]);
}

async function create(id = "sample-work") {
  return SELF.fetch("https://content.test/v1/author/content", {
    method: "POST",
    headers: authorHeaders,
    body: JSON.stringify({
      kind: "work",
      id,
      visibility: "private",
      sourceJa: "Japanese",
      sourceEn: "English",
      documents: { files: { ja: { body: "Japanese" }, en: { body: "English" } } },
    }),
  });
}

describe("content API", () => {
  beforeEach(clearDatabase);

  it("requires the route-specific identity", async () => {
    const response = await SELF.fetch("https://content.test/v1/author/content");
    expect(response.status).toBe(403);
  });

  it("creates, lists, and reads immutable content", async () => {
    const created = await create();
    expect(created.status).toBe(201);
    const value = await created.json<Record<string, unknown>>();
    expect(value).toMatchObject({ id: "sample-work", kind: "work", visibility: "private" });

    const listed = await SELF.fetch("https://content.test/v1/author/content", {
      headers: { "x-test-role": "author" },
    });
    expect(await listed.json()).toMatchObject({ items: [{ id: "sample-work" }] });
  });

  it("rejects a stale revision and retains both revisions", async () => {
    const created = await (await create()).json<{ currentRevisionId: string }>();
    const saved = await SELF.fetch("https://content.test/v1/author/content/work/sample-work", {
      method: "PUT",
      headers: authorHeaders,
      body: JSON.stringify({
        expectedRevisionId: created.currentRevisionId,
        sourceJa: "Second",
        sourceEn: "Second EN",
        documents: {},
      }),
    });
    expect(saved.status).toBe(200);

    const conflict = await SELF.fetch("https://content.test/v1/author/content/work/sample-work", {
      method: "PUT",
      headers: authorHeaders,
      body: JSON.stringify({
        expectedRevisionId: created.currentRevisionId,
        sourceJa: "Stale",
        sourceEn: "Stale EN",
        documents: {},
      }),
    });
    expect(conflict.status).toBe(409);
    const count = await env.CONTENT_DB.prepare(
      "SELECT COUNT(*) AS count FROM content_revisions",
    ).first<{ count: number }>();
    expect(count?.count).toBe(2);
  });

  it("soft-deletes and restores content", async () => {
    await create();
    const deleted = await SELF.fetch("https://content.test/v1/author/content/work/sample-work", {
      method: "PATCH",
      headers: authorHeaders,
      body: JSON.stringify({ deleted: true }),
    });
    expect(await deleted.json()).toMatchObject({ deletedAt: expect.any(String) });

    const restored = await SELF.fetch("https://content.test/v1/author/content/work/sample-work", {
      method: "PATCH",
      headers: authorHeaders,
      body: JSON.stringify({ deleted: false, visibility: "public" }),
    });
    expect(await restored.json()).toMatchObject({ deletedAt: null, visibility: "public" });
  });

  it("stores a checksummed private asset", async () => {
    const bytes = new TextEncoder().encode("not-a-real-image-but-an-image-payload");
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const checksum = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const uploaded = await SELF.fetch(`https://content.test/v1/author/assets/${checksum}`, {
      method: "PUT",
      headers: {
        "content-length": String(bytes.byteLength),
        "content-type": "image/png",
        "x-test-role": "author",
      },
      body: bytes,
    });
    expect(uploaded.status).toBe(201);
    const downloaded = await SELF.fetch(`https://content.test/v1/author/assets/${checksum}`, {
      headers: { "x-test-role": "author" },
    });
    expect(new Uint8Array(await downloaded.arrayBuffer())).toEqual(bytes);
  });
});
