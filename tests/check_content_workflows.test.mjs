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

  /**
   * Translation comes first. scripts/generate_metadata.mjs reads both locales
   * of a post and derives tags, a summary and a thumbnail concept from the body
   * it is given; the author writes Japanese only, so with metadata generation
   * ahead of translation it read an English file that was still empty and
   * stopped the publication on `title: must be a non-empty string`. No Blog or
   * Works item could be published without hand-written English.
   */
  test("translates before it generates metadata and builds the exact candidate", () => {
    const translation = publication.indexOf("name: Translate the Japanese source");
    const metadata = publication.indexOf("name: Generate post metadata");
    const candidate = publication.indexOf("name: Create immutable candidate release");
    const exactRelease = publication.indexOf("name: Download exact candidate release");
    const verification = publication.indexOf("name: Verify candidate release");
    const deployment = publication.indexOf("name: Deploy exact candidate to Cloudflare Pages");
    const finalize = publication.indexOf("name: Finalize active release");
    const order = [
      translation,
      metadata,
      candidate,
      exactRelease,
      verification,
      deployment,
      finalize,
    ];
    expect(order).not.toContain(-1);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    // Each boundary check measures the step it follows, so the checksums it
    // compares against have to be taken after the previous step has finished.
    expect(publication.indexOf("name: Record pre-translation checksums")).toBeLessThan(translation);
    expect(publication.indexOf("name: Validate translation output boundary")).toBeLessThan(
      publication.indexOf("name: Record pre-generation checksums"),
    );
    expect(publication.indexOf("name: Record pre-generation checksums")).toBeLessThan(metadata);
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
    const steps = backup.match(/step\.do\(/g) ?? [];
    expect(steps.length).toBeGreaterThan(0);
    // Every step suppresses its output, whatever the step breakdown is, so that
    // signed locations and export handles never reach Workflow output.
    expect(backup.match(/sensitive: "output"/g)).toHaveLength(steps.length);
    expect(backup).not.toMatch(/console\.(?:log|error|warn)/);
  });

  test.each(["deploy.yml", "reading-refresh.yml"])(
    "%s fetches the active release under the same deployment queue",
    (name) => {
      const source = workflow(name);
      expect(source).toMatch(/group: cloudflare-deploy\n\s+cancel-in-progress: false/);
      expect(source).toContain("name: Download active database release");
      expect(source).toContain("--release-id active");
      // Content only comes from D1/R2 now, so the download is unconditional: a
      // switch that could turn it off would let a deploy ship stale content.
      expect(source).not.toContain("CONTENT_CLOUD_CUTOVER");
      expect(source).toContain("name: Reconcile an interrupted content deployment");
      expect(source.indexOf("name: Reconcile an interrupted content deployment")).toBeLessThan(
        source.indexOf("name: Download active database release"),
      );
      expect(source).toContain("--pages-deployment-id");
      expect(source).not.toMatch(/actions\/(?:upload-artifact|cache)@/);
    },
  );

  // Verification builds the site, and the site's content is in D1/R2. Without
  // this step CI would either fail outright or, worse, verify something other
  // than what the site ships.
  test("ci.yml verifies the release the site ships", () => {
    const source = workflow("ci.yml");
    const download = source.indexOf("name: Download active database release");
    expect(download).toBeGreaterThan(-1);
    expect(source).toContain("--release-id active");
    expect(source).toContain("CONTENT_SNAPSHOT_ROOT=$SNAPSHOT_ROOT");
    expect(download).toBeLessThan(source.indexOf("name: Run verification"));
  });

  test("removes the old workflows that committed generated content", () => {
    expect(existsSync(resolve(ROOT, ".github/workflows/generate-metadata.yml"))).toBe(false);
    expect(existsSync(resolve(ROOT, ".github/workflows/translate-content.yml"))).toBe(false);
  });
});
