import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workflow = (name) => readFileSync(resolve(ROOT, ".github/workflows", name), "utf8");

describe("database content workflows", () => {
  const publication = workflow("content-publish.yml");

  test("dispatches by opaque job id with least GitHub permissions", () => {
    expect(publication).toContain("job_id:");
    expect(publication).not.toMatch(/title:|body:|source_ja:|source_en:/i);
    expect(publication).toMatch(/permissions:\n\s+contents: read/);
    expect(publication).not.toContain("contents: write");
    expect(publication).not.toContain("SECURITY_AUTOMATION_TOKEN");
    expect(publication).toContain("persist-credentials: false");
  });

  test("generates metadata before translation and builds the exact candidate", () => {
    const metadata = publication.indexOf("name: Generate post metadata");
    const translation = publication.indexOf("name: Translate finalized Japanese source");
    const candidate = publication.indexOf("name: Create immutable candidate release");
    const exactRelease = publication.indexOf("name: Download exact candidate release");
    const verification = publication.indexOf("name: Verify candidate release");
    const deployment = publication.indexOf("name: Deploy exact candidate to Cloudflare Pages");
    const finalize = publication.indexOf("name: Finalize active release");
    expect([
      metadata,
      translation,
      candidate,
      exactRelease,
      verification,
      deployment,
      finalize,
    ]).toEqual(
      [
        ...[metadata, translation, candidate, exactRelease, verification, deployment, finalize],
      ].sort((a, b) => a - b),
    );
  });

  test("shares the queued deploy lock and never persists content as an artifact or cache", () => {
    expect(publication).toMatch(/group: cloudflare-deploy\n\s+cancel-in-progress: false/);
    expect(publication).not.toMatch(/actions\/(?:upload-artifact|cache)@/);
    expect(publication).not.toMatch(/::set-output|GITHUB_STEP_SUMMARY/);
    expect(publication).toContain("detailed output was suppressed");
    expect(publication).toContain("output was suppressed because it may contain source text");
    expect(publication).toContain('scripts/verify.py --mode ci > "$RUNNER_TEMP/verification.log"');
    expect(publication).toContain('if [[ "$publish_job_id" == "$JOB_ID" ]]');
    expect(publication).toContain("git diff --quiet HEAD");
    expect(publication).toContain("git ls-files --others --exclude-standard");
    expect(publication).toContain("steps.snapshot.outputs.resumed != 'true'");
    expect(publication).toContain('--code-sha "${{ steps.snapshot.outputs.code_sha }}"');
  });

  test("backup Workflow keeps object locations and export handles out of step output", () => {
    const backup = readFileSync(resolve(ROOT, "workers/content-backup/src/index.ts"), "utf8");
    expect(backup.match(/sensitive: "output"/g)).toHaveLength(5);
    expect(backup).not.toMatch(/console\.(?:log|error|warn)/);
  });

  test.each(["deploy.yml", "reading-refresh.yml"])(
    "%s fetches the active release under the same deployment queue",
    (name) => {
      const source = workflow(name);
      expect(source).toMatch(/group: cloudflare-deploy\n\s+cancel-in-progress: false/);
      expect(source).toContain("name: Download active database release");
      expect(source).toContain("--release-id active");
      expect(source).toContain("CONTENT_CLOUD_CUTOVER == '1'");
      expect(source).toContain("name: Reconcile an interrupted content deployment");
      expect(source.indexOf("name: Reconcile an interrupted content deployment")).toBeLessThan(
        source.indexOf("name: Download active database release"),
      );
      expect(source).toContain("--pages-deployment-id");
      expect(source).not.toMatch(/actions\/(?:upload-artifact|cache)@/);
    },
  );

  test("removes the old workflows that committed generated content", () => {
    expect(existsSync(resolve(ROOT, ".github/workflows/generate-metadata.yml"))).toBe(false);
    expect(existsSync(resolve(ROOT, ".github/workflows/translate-content.yml"))).toBe(false);
  });
});
