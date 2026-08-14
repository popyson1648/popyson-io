import { afterEach, describe, expect, test, vi } from "vitest";

import {
  cloudAssetUrl,
  cloudListItem,
  fromCloudContent,
  newCloudContent,
  safeCloudAssetName,
  toCloudRevision,
  validateCloudContent,
} from "../scripts/contentCloudEditorModel.mjs";
import { ContentCloudClient } from "../scripts/contentCloudClient.mjs";
import { githubWorkflowConfig, GitHubWorkflowClient } from "../scripts/githubWorkflowClient.mjs";
import { validateEditorEnvironment } from "../scripts/editorServer.mjs";

afterEach(() => vi.unstubAllGlobals());

function cloudValue(overrides = {}) {
  return {
    id: "20260812-120000",
    itemId: "item-id",
    kind: "post",
    visibility: "private",
    deletedAt: null,
    currentRevisionId: "revision-1",
    publishedRevisionId: null,
    createdAt: "2026-08-12T03:00:00.000Z",
    updatedAt: "2026-08-12T03:00:00.000Z",
    assets: [],
    revision: {
      id: "revision-1",
      sourceJa: "",
      sourceEn: "",
      metadata: {},
      documents: {
        files: {
          ja: { meta: { title: "非公開の記事", tags: ["D1"] }, body: "本文" },
          en: { meta: { title: "Private post", tags: ["D1"] }, body: "Body" },
        },
      },
    },
    ...overrides,
  };
}

describe("cloud-backed editor model", () => {
  test("carries the current revision through editor save payloads", () => {
    const content = fromCloudContent(cloudValue());
    const saved = toCloudRevision(content);

    expect(content.files.ja.revision).toBe("revision-1");
    expect(saved.expectedRevisionId).toBe("revision-1");
    expect(saved.documents.files.ja).toMatchObject({
      meta: { title: "非公開の記事", tags: ["D1"] },
      body: "本文",
    });
    expect(saved.sourceJa).toContain('title = "非公開の記事"');
  });

  test("maps visibility and soft deletion into list states", () => {
    expect(cloudListItem(cloudValue()).status).toBe("private");
    expect(cloudListItem(cloudValue({ visibility: "public" })).status).toBe("public");
    expect(cloudListItem(cloudValue({ deletedAt: "2026-08-12T04:00:00Z" })).status).toBe("deleted");
  });

  test("creates private source pairs without touching the repository", () => {
    const created = newCloudContent("work", "cloud-work");
    expect(created).toMatchObject({ kind: "work", id: "cloud-work", visibility: "private" });
    expect(created.sourceJa).toContain('title = ""');
    expect(created.documents.files.en.body).toBe("");
  });

  // The publish button reads this. About in Japanese with the English News
  // headlines still empty is not an incomplete draft: it is the input the
  // publication translation expects, and blocking it there leaves nothing that
  // can ever fill them in.
  test("clears About for publication once the Japanese is written", () => {
    const aboutFiles = (enTitle) => ({
      ja: {
        meta: {
          person: { name: "名前" },
          newsConfig: { file: "news.ja.toml", count: 5 },
          newsItems: [{ date: "2026-08-09", title: "登壇しました", description: "" }],
        },
        body: "",
      },
      en: {
        meta: {
          person: { name: "Name" },
          newsConfig: { file: "news.en.toml", count: 5 },
          newsItems: [{ date: "2026-08-09", title: enTitle, description: "" }],
        },
        body: "",
      },
    });
    const about = (files) => ({ kind: "about", id: "about", visibility: "public", files });

    expect(validateCloudContent(about(aboutFiles("")))).toEqual({ valid: true, issues: [] });
    expect(validateCloudContent(about(aboutFiles("Gave a talk")))).toEqual({
      valid: true,
      issues: [],
    });

    const undated = aboutFiles("");
    undated.en.meta.newsItems[0].date = "";
    expect(validateCloudContent(about(undated))).toMatchObject({
      valid: false,
      issues: [{ locale: "en", message: expect.stringContaining("date must use YYYY-MM-DD") }],
    });
  });

  test("uses collision-free logical asset paths", () => {
    expect(safeCloudAssetName("My Photo.PNG", ["assets/my-photo.png"])).toBe("my-photo-2.png");
    expect(cloudAssetUrl("post", "20260812-120000", "my-photo-2.png")).toBe(
      "/content-assets/posts/20260812-120000/my-photo-2.png",
    );
  });
});

describe("server-only authenticated clients", () => {
  test("sends optimistic state updates through the Worker client", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new ContentCloudClient({
      baseUrl: "https://content.invalid",
      clientId: "access-id",
      clientSecret: "access-secret",
    });

    await client.updateState("post", "20260812-120000", {
      visibility: "public",
      expectedRevisionId: "revision-1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://content.invalid/v1/author/content/post/20260812-120000",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ visibility: "public", expectedRevisionId: "revision-1" }),
      }),
    );
  });

  test("pins a revision when creating and polling a publication job", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ job: { id: "job-1", state: "queued" } }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new ContentCloudClient({
      baseUrl: "https://content.invalid",
      clientId: "access-id",
      clientSecret: "access-secret",
    });

    await client.createPublication("post", "20260812-120000", {
      revisionId: "revision-1",
      idempotencyKey: "idempotency-1",
    });
    await client.publication("job-1");

    expect(fetchMock.mock.calls[0]).toEqual([
      "https://content.invalid/v1/author/content/post/20260812-120000/publish",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          revisionId: "revision-1",
          idempotencyKey: "idempotency-1",
        }),
      }),
    ]);
    expect(fetchMock.mock.calls[1][0]).toBe("https://content.invalid/v1/author/publish/job-1");
  });

  test("dispatches only the opaque publication job id to GitHub", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ workflow_run_id: 42, html_url: "https://github.invalid/run/42" }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new GitHubWorkflowClient({
      token: "github-secret",
      repository: "owner/repository",
      ref: "main",
      workflow: "content-publish.yml",
    });

    await expect(client.dispatchPublication("opaque-job-id")).resolves.toEqual({
      workflowRunId: 42,
      runUrl: "https://github.invalid/run/42",
    });
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ ref: "main", inputs: { job_id: "opaque-job-id" } });
    expect(options.body).not.toContain("title");
    expect(options.body).not.toContain("source");
  });

  test("fails startup before listening when required credentials are absent", () => {
    expect(() => validateEditorEnvironment({})).toThrow("CONTENT_API_URL is required");
    expect(() =>
      validateEditorEnvironment({
        CONTENT_API_URL: "https://content.invalid",
        CF_ACCESS_CLIENT_ID: "id",
        CF_ACCESS_CLIENT_SECRET: "secret",
      }),
    ).toThrow("CONTENT_GITHUB_TOKEN is required");
    expect(
      validateEditorEnvironment({
        CONTENT_API_URL: "https://content.invalid",
        CF_ACCESS_CLIENT_ID: "id",
        CF_ACCESS_CLIENT_SECRET: "secret",
        CONTENT_GITHUB_TOKEN: "token",
        CONTENT_GITHUB_REPOSITORY: "owner/repository",
      }),
    ).toBe(true);
  });

  test("requires an explicit GitHub repository but keeps workflow defaults local", () => {
    expect(
      githubWorkflowConfig({
        CONTENT_GITHUB_TOKEN: "token",
        CONTENT_GITHUB_REPOSITORY: "owner/repository",
      }),
    ).toMatchObject({ ref: "main", workflow: "content-publish.yml" });
  });
});
