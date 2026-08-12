import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import { sanitizedLogRoute } from "../src/index";

const authorHeaders = { "content-type": "application/json", "x-test-role": "author" };
const ciHeaders = { "content-type": "application/json", "x-test-role": "ci" };
const codeSha = "a".repeat(40);

interface ContentValue {
  id: string;
  itemId: string;
  kind: string;
  visibility: "public" | "private";
  deletedAt: string | null;
  currentRevisionId: string;
  publishedRevisionId: string | null;
  revision: { id: string; sourceJa: string; sourceEn: string };
}

interface JobValue {
  job: {
    id: string;
    revisionId: string;
    state: string;
    attempts: number;
    releaseId: string | null;
    candidateRevisionId: string | null;
  };
}

interface CandidateValue extends JobValue {
  release: { id: string; state: string; baseReleaseId: string | null };
}

async function clearDatabase() {
  await env.CONTENT_DB.batch([
    env.CONTENT_DB.prepare("DELETE FROM release_items"),
    env.CONTENT_DB.prepare("UPDATE publish_jobs SET release_id = NULL"),
    env.CONTENT_DB.prepare("UPDATE releases SET base_release_id = NULL"),
    env.CONTENT_DB.prepare("DELETE FROM releases"),
    env.CONTENT_DB.prepare("DELETE FROM publish_jobs"),
    env.CONTENT_DB.prepare("DELETE FROM revision_assets"),
    env.CONTENT_DB.prepare("DELETE FROM assets"),
    env.CONTENT_DB.prepare(
      "UPDATE content_items SET current_revision_id = NULL, published_revision_id = NULL",
    ),
    env.CONTENT_DB.prepare(
      "DELETE FROM content_revisions WHERE id NOT IN (SELECT parent_revision_id FROM content_revisions WHERE parent_revision_id IS NOT NULL)",
    ),
    env.CONTENT_DB.prepare(
      "DELETE FROM content_revisions WHERE id NOT IN (SELECT parent_revision_id FROM content_revisions WHERE parent_revision_id IS NOT NULL)",
    ),
    env.CONTENT_DB.prepare(
      "DELETE FROM content_revisions WHERE id NOT IN (SELECT parent_revision_id FROM content_revisions WHERE parent_revision_id IS NOT NULL)",
    ),
    env.CONTENT_DB.prepare("DELETE FROM content_revisions"),
    env.CONTENT_DB.prepare("DELETE FROM content_items"),
  ]);
}

async function request(
  pathname: string,
  options: { role?: "author" | "ci"; method?: string; body?: unknown } = {},
) {
  const headers = new Headers({ "content-type": "application/json" });
  if (options.role) headers.set("x-test-role", options.role);
  return SELF.fetch(`https://content.test${pathname}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function body<T>(response: Response): Promise<T> {
  return response.json<T>();
}

async function create(
  id = "sample-work",
  visibility: "public" | "private" = "private",
  source = "First",
) {
  return request("/v1/author/content", {
    role: "author",
    method: "POST",
    body: {
      kind: "work",
      id,
      visibility,
      sourceJa: source,
      sourceEn: `${source} EN`,
      documents: { files: { ja: { body: source }, en: { body: `${source} EN` } } },
    },
  });
}

async function createValue(
  id = "sample-work",
  visibility: "public" | "private" = "private",
  source = "First",
): Promise<ContentValue> {
  const response = await create(id, visibility, source);
  expect(response.status).toBe(201);
  return body<ContentValue>(response);
}

async function save(id: string, expectedRevisionId: string, source: string) {
  return request(`/v1/author/content/work/${id}`, {
    role: "author",
    method: "PUT",
    body: {
      expectedRevisionId,
      sourceJa: source,
      sourceEn: `${source} EN`,
      documents: { files: { ja: { body: source }, en: { body: `${source} EN` } } },
    },
  });
}

async function createJob(
  id: string,
  revisionId: string,
  idempotencyKey = `publish:${id}:0001`,
): Promise<JobValue> {
  const response = await request(`/v1/author/content/work/${id}/publish`, {
    role: "author",
    method: "POST",
    body: { revisionId, idempotencyKey },
  });
  expect(response.status).toBe(201);
  return body<JobValue>(response);
}

async function markRunning(jobId: string, runId = "1001"): Promise<JobValue> {
  const response = await request(`/v1/ci/jobs/${jobId}/running`, {
    role: "ci",
    method: "POST",
    body: { githubRunId: runId },
  });
  expect(response.status).toBe(200);
  return body<JobValue>(response);
}

async function candidate(jobId: string, candidateBody: Record<string, unknown> = {}) {
  const response = await request(`/v1/ci/jobs/${jobId}/candidate`, {
    role: "ci",
    method: "POST",
    body: { codeSha, ...candidateBody },
  });
  expect(response.status).toBe(201);
  return body<CandidateValue>(response);
}

async function finalize(jobId: string, releaseId: string, deploymentId = "pages-1") {
  const deploying = await request(`/v1/ci/jobs/${jobId}/deploying`, {
    role: "ci",
    method: "POST",
    body: { releaseId },
  });
  expect(deploying.status).toBe(200);
  const response = await request(`/v1/ci/jobs/${jobId}/finalize`, {
    role: "ci",
    method: "POST",
    body: { releaseId, pagesDeploymentId: deploymentId },
  });
  expect(response.status).toBe(200);
  return body<CandidateValue>(response);
}

async function publishCurrent(id: string, revisionId: string, sequence: number) {
  const created = await createJob(
    id,
    revisionId,
    `publish:${id}:${String(sequence).padStart(4, "0")}`,
  );
  await markRunning(created.job.id, String(1000 + sequence));
  const release = await candidate(created.job.id);
  await finalize(created.job.id, release.release.id, `pages-${sequence}`);
  return { jobId: created.job.id, releaseId: release.release.id };
}

async function uploadPng(role: "author" | "ci" = "author") {
  const bytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5]);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const checksum = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const uploaded = await SELF.fetch(`https://content.test/v1/${role}/assets/${checksum}`, {
    method: "PUT",
    headers: {
      "content-length": String(bytes.byteLength),
      "content-type": "image/png",
      "x-test-role": role,
    },
    body: bytes,
  });
  expect(uploaded.status).toBe(201);
  return { bytes, checksum };
}

describe("content API", () => {
  beforeEach(clearDatabase);

  it("separates author and CI identities on every protected route", async () => {
    expect((await request("/v1/author/content")).status).toBe(403);
    expect((await request("/v1/author/content", { role: "ci" })).status).toBe(403);
    expect((await request("/v1/ci/releases/pending", { role: "author" })).status).toBe(403);
    expect((await request("/v1/ci/releases/pending", { role: "ci" })).status).toBe(200);
  });

  it("creates, lists, and reads immutable content", async () => {
    const created = await createValue();
    expect(created).toMatchObject({ id: "sample-work", kind: "work", visibility: "private" });

    const listed = await request("/v1/author/content", { role: "author" });
    expect(await body(listed)).toMatchObject({ items: [{ id: "sample-work" }] });
  });

  it("rejects stale revisions without retaining an orphan revision", async () => {
    const created = await createValue();
    const saved = await save("sample-work", created.currentRevisionId, "Second");
    expect(saved.status).toBe(200);

    const conflict = await save("sample-work", created.currentRevisionId, "Stale");
    expect(conflict.status).toBe(409);
    const count = await env.CONTENT_DB.prepare(
      "SELECT COUNT(*) AS count FROM content_revisions",
    ).first<{ count: number }>();
    expect(count?.count).toBe(2);
  });

  it("soft-deletes, changes visibility without restoring, and restores explicitly", async () => {
    const created = await createValue();
    const deleted = await request("/v1/author/content/work/sample-work", {
      role: "author",
      method: "PATCH",
      body: { deleted: true, expectedRevisionId: created.currentRevisionId },
    });
    expect(await body(deleted)).toMatchObject({ deletedAt: expect.any(String) });

    const visibility = await request("/v1/author/content/work/sample-work", {
      role: "author",
      method: "PATCH",
      body: { visibility: "public", expectedRevisionId: created.currentRevisionId },
    });
    expect(await body(visibility)).toMatchObject({
      deletedAt: expect.any(String),
      visibility: "public",
    });

    const restored = await request("/v1/author/content/work/sample-work", {
      role: "author",
      method: "PATCH",
      body: { deleted: false, expectedRevisionId: created.currentRevisionId },
    });
    expect(await body(restored)).toMatchObject({ deletedAt: null, visibility: "public" });
  });

  it("lists history and restores it as a new immutable revision", async () => {
    const first = await createValue();
    const second = await body<ContentValue>(
      await save("sample-work", first.currentRevisionId, "Second"),
    );
    const history = await request("/v1/author/content/work/sample-work/revisions", {
      role: "author",
    });
    expect((await body<{ revisions: unknown[] }>(history)).revisions).toHaveLength(2);

    const restoredResponse = await request("/v1/author/content/work/sample-work/restore", {
      role: "author",
      method: "POST",
      body: { revisionId: first.currentRevisionId, expectedRevisionId: second.currentRevisionId },
    });
    const restored = await body<ContentValue>(restoredResponse);
    expect(restored.revision.sourceJa).toBe("First");
    expect(restored.currentRevisionId).not.toBe(first.currentRevisionId);
    const count = await env.CONTENT_DB.prepare(
      "SELECT COUNT(*) AS count FROM content_revisions",
    ).first<{ count: number }>();
    expect(count?.count).toBe(3);
  });

  it("streams a signed, checksummed private asset to author and CI routes", async () => {
    const { bytes, checksum } = await uploadPng();
    const downloaded = await SELF.fetch(`https://content.test/v1/ci/assets/${checksum}`, {
      headers: { "x-test-role": "ci" },
    });
    expect(downloaded.headers.get("cache-control")).toBe("private, no-store");
    expect(new Uint8Array(await downloaded.arrayBuffer())).toEqual(bytes);
  });

  it("changes asset associations through new revisions without mutating an active release", async () => {
    const initial = await createValue("sample-work", "public");
    const { checksum } = await uploadPng();
    const attached = await body<ContentValue & { assets: unknown[] }>(
      await request("/v1/author/content/work/sample-work/assets", {
        role: "author",
        method: "POST",
        body: {
          assetId: checksum,
          logicalPath: "content-assets/sample.png",
          role: "body",
          expectedRevisionId: initial.currentRevisionId,
        },
      }),
    );
    expect(attached.currentRevisionId).not.toBe(initial.currentRevisionId);
    expect(attached.assets).toHaveLength(1);
    await publishCurrent("sample-work", attached.currentRevisionId, 1);

    const detached = await body<ContentValue & { assets: unknown[] }>(
      await request(
        `/v1/author/content/work/sample-work/assets?logicalPath=content-assets%2Fsample.png&expectedRevisionId=${attached.currentRevisionId}`,
        { role: "author", method: "DELETE" },
      ),
    );
    expect(detached.currentRevisionId).not.toBe(attached.currentRevisionId);
    expect(detached.assets).toHaveLength(0);

    const active = await body<{ items: Array<{ assets: unknown[] }> }>(
      await request("/v1/ci/releases/active/snapshot", { role: "ci" }),
    );
    expect(active.items[0].assets).toHaveLength(1);
  });

  it("pins publication input and finalizes the candidate idempotently", async () => {
    const initial = await createValue("sample-work", "public");
    const publication = await createJob("sample-work", initial.currentRevisionId);
    const repeatedJob = await createJob("sample-work", initial.currentRevisionId);
    expect(repeatedJob.job.id).toBe(publication.job.id);

    await markRunning(publication.job.id);
    const repeatedRun = await markRunning(publication.job.id);
    expect(repeatedRun.job.attempts).toBe(1);
    const wrongRun = await request(`/v1/ci/jobs/${publication.job.id}/running`, {
      role: "ci",
      method: "POST",
      body: { githubRunId: "9999" },
    });
    expect(wrongRun.status).toBe(409);

    const newer = await body<ContentValue>(
      await save("sample-work", initial.currentRevisionId, "Newer private draft"),
    );
    const snapshot = await body<{ revision: { id: string; sourceJa: string } }>(
      await request(`/v1/ci/jobs/${publication.job.id}/snapshot`, { role: "ci" }),
    );
    expect(snapshot.revision).toMatchObject({ id: initial.currentRevisionId, sourceJa: "First" });

    const generated = {
      sourceJa: "Generated publication",
      sourceEn: "Generated publication EN",
      documents: { files: {} },
      metadata: { generated: true },
      expectedRevisionId: initial.currentRevisionId,
      createdBy: "ci-test",
    };
    const { checksum: generatedAssetId } = await uploadPng("ci");
    const candidatePayload = {
      revision: generated,
      assets: [
        {
          assetId: generatedAssetId,
          logicalPath: "thumbnails/generated.png",
          role: "thumbnail",
        },
      ],
    };
    const release = await candidate(publication.job.id, candidatePayload);
    const repeatedCandidate = await candidate(publication.job.id, candidatePayload);
    expect(repeatedCandidate.release.id).toBe(release.release.id);
    const resumable = await body<{
      revision: { id: string; sourceJa: string };
      candidate?: { revision: { id: string; sourceJa: string }; assets: unknown[] };
    }>(await request(`/v1/ci/jobs/${publication.job.id}/snapshot`, { role: "ci" }));
    expect(resumable.revision).toMatchObject({
      id: initial.currentRevisionId,
      sourceJa: "First",
    });
    expect(resumable.candidate).toMatchObject({
      revision: {
        id: release.job.candidateRevisionId,
        sourceJa: "Generated publication",
      },
      assets: [
        {
          id: generatedAssetId,
          logicalPath: "thumbnails/generated.png",
          role: "thumbnail",
        },
      ],
    });
    const changedCandidate = await request(`/v1/ci/jobs/${publication.job.id}/candidate`, {
      role: "ci",
      method: "POST",
      body: {
        codeSha,
        ...candidatePayload,
        revision: { ...generated, metadata: { generated: "different" } },
      },
    });
    expect(changedCandidate.status).toBe(409);

    const finalized = await finalize(publication.job.id, release.release.id);
    expect(finalized).toMatchObject({ job: { state: "succeeded" }, release: { state: "active" } });
    const repeatedFinalize = await request(`/v1/ci/jobs/${publication.job.id}/finalize`, {
      role: "ci",
      method: "POST",
      body: { releaseId: release.release.id, pagesDeploymentId: "pages-1" },
    });
    expect(repeatedFinalize.status).toBe(200);

    const current = await body<ContentValue>(
      await request("/v1/author/content/work/sample-work", { role: "author" }),
    );
    expect(current.currentRevisionId).toBe(newer.currentRevisionId);
    expect(current.publishedRevisionId).toBe(release.job.candidateRevisionId);

    const active = await body<{
      items: Array<{ revision: { sourceJa: string }; assets: unknown[] }>;
    }>(await request("/v1/ci/releases/active/snapshot", { role: "ci" }));
    expect(active.items).toHaveLength(1);
    expect(active.items[0].revision.sourceJa).toBe("Generated publication");
  });

  it("publishes private and deleted state by removing content from the active release", async () => {
    const initial = await createValue("sample-work", "public");
    await publishCurrent("sample-work", initial.currentRevisionId, 1);

    const hidden = await body<ContentValue>(
      await request("/v1/author/content/work/sample-work", {
        role: "author",
        method: "PATCH",
        body: { visibility: "private", expectedRevisionId: initial.currentRevisionId },
      }),
    );
    const hiddenJob = await createJob(
      "sample-work",
      hidden.currentRevisionId,
      "publish:sample-work:0002",
    );
    await markRunning(hiddenJob.job.id, "1002");
    const hiddenRelease = await candidate(hiddenJob.job.id, {
      revision: {
        sourceJa: "Generated hidden publication",
        sourceEn: "Generated hidden publication EN",
        documents: { files: {} },
        metadata: { generated: true },
        expectedRevisionId: hidden.currentRevisionId,
        createdBy: "ci-test",
      },
    });
    const hiddenReleaseSnapshot = await body<{ items: unknown[] }>(
      await request(`/v1/ci/releases/${hiddenRelease.release.id}/snapshot`, { role: "ci" }),
    );
    expect(hiddenReleaseSnapshot.items).toHaveLength(0);
    const hiddenJobSnapshot = await body<{
      revision: { id: string; sourceJa: string };
      candidate?: { revision: { id: string; sourceJa: string }; assets: unknown[] };
    }>(await request(`/v1/ci/jobs/${hiddenJob.job.id}/snapshot`, { role: "ci" }));
    expect(hiddenJobSnapshot.revision).toMatchObject({
      id: hidden.currentRevisionId,
      sourceJa: "First",
    });
    expect(hiddenJobSnapshot.candidate).toMatchObject({
      revision: {
        id: hiddenRelease.job.candidateRevisionId,
        sourceJa: "Generated hidden publication",
      },
      assets: [],
    });
    await finalize(hiddenJob.job.id, hiddenRelease.release.id, "pages-2");
    const privateSnapshot = await body<{ items: unknown[] }>(
      await request("/v1/ci/releases/active/snapshot", { role: "ci" }),
    );
    expect(privateSnapshot.items).toHaveLength(0);

    const restored = await body<ContentValue>(
      await request("/v1/author/content/work/sample-work", {
        role: "author",
        method: "PATCH",
        body: {
          visibility: "public",
          deleted: false,
          expectedRevisionId: hiddenRelease.job.candidateRevisionId,
        },
      }),
    );
    await publishCurrent("sample-work", restored.currentRevisionId, 3);
    const restoredSnapshot = await body<{ items: unknown[] }>(
      await request("/v1/ci/releases/active/snapshot", { role: "ci" }),
    );
    expect(restoredSnapshot.items).toHaveLength(1);

    const deleted = await body<ContentValue>(
      await request("/v1/author/content/work/sample-work", {
        role: "author",
        method: "PATCH",
        body: { deleted: true, expectedRevisionId: restored.currentRevisionId },
      }),
    );
    await publishCurrent("sample-work", deleted.currentRevisionId, 4);
    const deletedSnapshot = await body<{ items: unknown[] }>(
      await request("/v1/ci/releases/active/snapshot", { role: "ci" }),
    );
    expect(deletedSnapshot.items).toHaveLength(0);
  });

  it("retries failed jobs without duplicating their candidate", async () => {
    const initial = await createValue("sample-work", "public");
    const publication = await createJob("sample-work", initial.currentRevisionId);
    await markRunning(publication.job.id, "2001");
    const release = await candidate(publication.job.id);

    const failed = await request(`/v1/ci/jobs/${publication.job.id}/fail`, {
      role: "ci",
      method: "POST",
      body: { sanitizedError: "deploy failed\nwithout content" },
    });
    expect(await body(failed)).toMatchObject({
      job: { state: "failed", sanitizedError: "deploy failed without content" },
    });
    const retried = await markRunning(publication.job.id, "2002");
    expect(retried.job.attempts).toBe(2);
    const repeated = await candidate(publication.job.id);
    expect(repeated.release.id).toBe(release.release.id);
    await finalize(publication.job.id, release.release.id, "pages-retry");
  });

  it("rebuilds a stale candidate from the newly active release", async () => {
    const first = await createValue("first-work", "public", "First work");
    const second = await createValue("second-work", "public", "Second work");
    await publishCurrent("first-work", first.currentRevisionId, 1);
    const initiallyPublishedSecond = await body<ContentValue>(
      await request("/v1/author/content/work/second-work", { role: "author" }),
    );
    expect(initiallyPublishedSecond.publishedRevisionId).toBe(second.currentRevisionId);

    const firstNew = await body<ContentValue>(
      await save("first-work", first.currentRevisionId, "First v2"),
    );
    const secondNew = await body<ContentValue>(
      await save("second-work", second.currentRevisionId, "Second v2"),
    );
    const firstJob = await createJob(
      "first-work",
      firstNew.currentRevisionId,
      "publish:first:0002",
    );
    const secondJob = await createJob(
      "second-work",
      secondNew.currentRevisionId,
      "publish:second:0002",
    );
    await markRunning(firstJob.job.id, "3001");
    await markRunning(secondJob.job.id, "3002");
    const firstCandidate = await candidate(firstJob.job.id);
    const staleCandidate = await candidate(secondJob.job.id);
    await finalize(firstJob.job.id, firstCandidate.release.id, "pages-first-v2");

    const staleDeploy = await request(`/v1/ci/jobs/${secondJob.job.id}/deploying`, {
      role: "ci",
      method: "POST",
      body: { releaseId: staleCandidate.release.id },
    });
    expect(staleDeploy.status).toBe(409);
    const rebuilt = await candidate(secondJob.job.id);
    expect(rebuilt.release.id).not.toBe(staleCandidate.release.id);
    expect(rebuilt.release.baseReleaseId).toBe(firstCandidate.release.id);
    await finalize(secondJob.job.id, rebuilt.release.id, "pages-second-v2");

    const active = await body<{
      items: Array<{ item: { id: string }; revision: { sourceJa: string } }>;
    }>(await request("/v1/ci/releases/active/snapshot", { role: "ci" }));
    expect(active.items.map(({ item, revision }) => [item.id, revision.sourceJa])).toEqual([
      ["first-work", "First v2"],
      ["second-work", "Second v2"],
    ]);
  });

  it("reconciles an interrupted finalize idempotently from the Pages marker", async () => {
    const initial = await createValue("sample-work", "public");
    const publication = await createJob("sample-work", initial.currentRevisionId);
    await markRunning(publication.job.id, "4001");
    const release = await candidate(publication.job.id);
    const deploying = await request(`/v1/ci/jobs/${publication.job.id}/deploying`, {
      role: "ci",
      method: "POST",
      body: { releaseId: release.release.id },
    });
    expect(deploying.status).toBe(200);

    for (let index = 0; index < 2; index += 1) {
      const reconciled = await request("/v1/ci/releases/reconcile", {
        role: "ci",
        method: "POST",
        body: { releaseId: release.release.id, pagesDeploymentId: "pages-interrupted" },
      });
      expect(await body(reconciled)).toMatchObject({
        job: { state: "succeeded" },
        release: { state: "active" },
      });
    }
  });

  it("redacts private slugs and opaque identifiers from structured route logs", async () => {
    expect(sanitizedLogRoute("/v1/author/content/work/private-secret/revisions")).toBe(
      "/v1/author/content/work/:content/revisions",
    );
    expect(
      sanitizedLogRoute(`/v1/author/content/work/private-secret/revisions/${crypto.randomUUID()}`),
    ).toBe("/v1/author/content/work/:content/revisions/:revision");
    expect(sanitizedLogRoute(`/v1/ci/jobs/${crypto.randomUUID()}/snapshot`)).toBe(
      "/v1/ci/jobs/:job/snapshot",
    );
    expect(sanitizedLogRoute(`/v1/ci/releases/${crypto.randomUUID()}/snapshot`)).toBe(
      "/v1/ci/releases/:release/snapshot",
    );
  });
});
