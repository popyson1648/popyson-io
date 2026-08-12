import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, test, vi } from "vitest";

import { contentSnapshotRoot, loadSiteContent } from "../scripts/content_loader.mjs";
import {
  materializeSnapshot,
  publicationInputSnapshot,
} from "../scripts/contentSnapshotClient.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const temporaryRoots = [];

function temporaryRoot() {
  const root = mkdtempSync(join(tmpdir(), "popyson-content-snapshot-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("contentSnapshotRoot", () => {
  test("keeps the repository as the deliberate pre-cutover local fallback", () => {
    expect(contentSnapshotRoot({})).toBe(ROOT);
  });

  test("requires an existing absolute explicit root", () => {
    expect(() => contentSnapshotRoot({ CONTENT_SNAPSHOT_ROOT: "relative" })).toThrow(
      /must be an absolute path/,
    );
    expect(() =>
      contentSnapshotRoot({ CONTENT_SNAPSHOT_ROOT: join(tmpdir(), "missing-content-snapshot") }),
    ).toThrow(/does not exist/);
  });

  test("loads managed content from the explicit root instead of the checkout", () => {
    const root = temporaryRoot();
    cpSync(join(ROOT, "src/content"), join(root, "src/content"), { recursive: true });
    const original = join(ROOT, "src/content/posts/20260729-94519dc2");
    const isolated = join(root, "src/content/posts/20990101-000000");
    cpSync(original, isolated, { recursive: true });

    const content = loadSiteContent({ snapshotRoot: root });

    expect(content.POSTS.some((post) => post.id === "20990101-000000")).toBe(true);
    expect(loadSiteContent().POSTS.some((post) => post.id === "20990101-000000")).toBe(false);
  });
});

describe("materializeSnapshot", () => {
  test("writes source and checksum-verified assets into an isolated tree", async () => {
    const root = temporaryRoot();
    const bytes = Buffer.from("asset bytes");
    const id = "84293ed06cb3210e7d549afec3140d0c48494416ad25b7f25196afffaa5eb796";
    const snapshot = {
      job: { id: "job-1" },
      item: { kind: "post", id: "20260812-120000", createdAt: "2026-08-12T12:00:00Z" },
      revision: {
        id: "revision-1",
        sourceJa:
          '+++\ntitle = "日本語"\ndate = 2026-08-12\ntags = []\n[sumup]\nmode = "none"\n[thumbnail]\nmode = "file"\npath = "/thumbnails/x.png"\n+++\n\n本文',
        sourceEn:
          '+++\ntitle = "English"\ndate = 2026-08-12\ntags = []\n[sumup]\nmode = "none"\n[thumbnail]\nmode = "file"\npath = "/thumbnails/x.png"\n+++\n\nBody',
      },
      assets: [
        {
          id,
          mediaType: "image/png",
          sizeBytes: bytes.byteLength,
          logicalPath: "thumbnails/x.png",
          role: "thumbnail",
        },
      ],
    };
    const client = { downloadAsset: async () => bytes };

    await expect(materializeSnapshot(snapshot, root, { client })).resolves.toEqual({
      itemCount: 1,
      assetCount: 1,
    });
    expect(
      readFileSync(join(root, "src/content/posts/20260812-120000/index.ja.md"), "utf8"),
    ).toContain("本文");
    expect(readFileSync(join(root, "public/thumbnails/x.png"))).toEqual(bytes);
  });

  test("rejects traversal and mismatched bytes before writing an asset", async () => {
    const root = temporaryRoot();
    const base = {
      item: { kind: "work", id: "safe-work" },
      revision: { id: "revision-1", sourceJa: "ja", sourceEn: "en" },
    };
    const asset = {
      id: "0".repeat(64),
      mediaType: "image/png",
      sizeBytes: 3,
      logicalPath: "../secret.png",
      role: "body",
    };

    await expect(
      materializeSnapshot({ ...base, assets: [asset] }, root, {
        client: { downloadAsset: async () => Buffer.from("bad") },
      }),
    ).rejects.toThrow(/safe relative path/);
    expect(existsSync(join(root, "secret.png"))).toBe(false);

    writeFileSync(join(root, "sentinel"), "keep");
    await expect(
      materializeSnapshot(
        { ...base, assets: [{ ...asset, logicalPath: "assets/image.png" }] },
        root,
        { client: { downloadAsset: async () => Buffer.from("bad") } },
      ),
    ).rejects.toThrow(/checksum verification/);
  });
});

describe("publicationInputSnapshot", () => {
  test.each([
    { name: "private", targetVisibility: "private", targetDeletedAt: null },
    { name: "deleted", targetVisibility: "public", targetDeletedAt: "2026-08-12T12:00:00Z" },
  ])("resumes an excluded $name candidate from the job snapshot", async (intent) => {
    const candidate = {
      revision: { id: "candidate", sourceJa: "generated ja", sourceEn: "translated en" },
      assets: [],
    };
    const jobSnapshot = {
      job: {
        id: "job-1",
        itemId: "item-target",
        releaseId: "release-1",
        ...intent,
      },
      item: { itemId: "item-target", kind: "post", id: "20260812-120000" },
      revision: { id: "pinned", sourceJa: "pinned ja", sourceEn: "pinned en" },
      assets: [],
      candidate,
    };
    const releaseSnapshot = vi.fn(async () => ({
      release: { id: "release-1", codeSha: "b".repeat(40) },
      items: [],
    }));
    const client = { releaseSnapshot };

    await expect(publicationInputSnapshot(jobSnapshot, client)).resolves.toEqual({
      snapshot: { job: jobSnapshot.job, item: jobSnapshot.item, ...candidate },
      resumed: true,
      codeSha: "b".repeat(40),
    });
    expect(releaseSnapshot).toHaveBeenCalledWith("release-1");
  });

  test("resumes the exact candidate item and code SHA without rerunning generation", async () => {
    const jobSnapshot = {
      job: { id: "job-1", itemId: "item-target", releaseId: "release-1" },
      item: { itemId: "item-target", kind: "post", id: "20260812-120000" },
      revision: { id: "pinned", sourceJa: "pinned ja", sourceEn: "pinned en" },
      assets: [],
    };
    const candidate = {
      item: { itemId: "item-target", kind: "post", id: "20260812-120000" },
      revision: { id: "candidate", sourceJa: "generated ja", sourceEn: "translated en" },
      assets: [],
    };
    const client = {
      releaseSnapshot: async () => ({
        release: { id: "release-1", codeSha: "a".repeat(40) },
        items: [
          {
            item: { itemId: "other", kind: "work", id: "other" },
            revision: { id: "other", sourceJa: "other", sourceEn: "other" },
            assets: [],
          },
          candidate,
        ],
      }),
    };

    await expect(publicationInputSnapshot(jobSnapshot, client)).resolves.toEqual({
      snapshot: { job: jobSnapshot.job, ...candidate },
      resumed: true,
      codeSha: "a".repeat(40),
    });
  });

  test("uses the pinned job snapshot before a candidate exists", async () => {
    const snapshot = {
      job: { id: "job-1", itemId: "item-target", releaseId: null },
      item: { itemId: "item-target", kind: "work", id: "target" },
      revision: { id: "pinned", sourceJa: "ja", sourceEn: "en" },
      assets: [],
    };

    await expect(publicationInputSnapshot(snapshot, {})).resolves.toEqual({
      snapshot,
      resumed: false,
      codeSha: "",
    });
  });
});
