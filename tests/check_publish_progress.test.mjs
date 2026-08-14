import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";

import { GitHubWorkflowClient } from "../scripts/githubWorkflowClient.mjs";
import { PUBLISH_STAGES, publishProgress, stageForStepName } from "../scripts/publishProgress.mjs";

const WORKFLOW = readFileSync(join(process.cwd(), ".github/workflows/content-publish.yml"), "utf8");

function workflowStepNames() {
  return [...WORKFLOW.matchAll(/^ {6}- name: (.+)$/gm)].map(([, name]) => name.trim());
}

function stepsUpTo(name, { pending = true } = {}) {
  const names = ["Set up job", "Run actions/checkout@v7", ...workflowStepNames()];
  const end = names.indexOf(name);
  return names.slice(0, end + 1).map((stepName, index) => ({
    name: stepName,
    status: index === end && pending ? "in_progress" : "completed",
    conclusion: index === end && pending ? null : "success",
  }));
}

describe("publication stages", () => {
  // The workflow's step names are the only signal for which stage a run is in,
  // so a renamed or added step has to be mapped here or the display silently
  // stops moving.
  test("maps every step the publication workflow declares", () => {
    const names = workflowStepNames();
    expect(names.length).toBeGreaterThan(10);
    for (const name of names) {
      expect(stageForStepName(name), `unmapped workflow step: ${name}`).toBeTruthy();
    }
  });

  test("maps the steps GitHub adds around the workflow's own", () => {
    expect(stageForStepName("Set up job")?.stage).toBe("prepare");
    expect(stageForStepName("Run actions/setup-node@v7")?.stage).toBe("prepare");
    // Appended whatever the outcome, so they name no stage but keep a label.
    expect(stageForStepName("Post Run actions/setup-node@v7")).toEqual({
      stage: null,
      label: "後片付け",
    });
    expect(stageForStepName("Complete job")?.stage).toBeNull();
    expect(stageForStepName("")).toBeNull();
  });
});

describe("publication progress", () => {
  test("reports the receiving stage before the workflow reports anything", () => {
    const progress = publishProgress({
      job: { state: "queued", createdAt: "2026-08-14T00:00:00Z" },
    });
    expect(progress.stageKey).toBe("queued");
    expect(progress.stageIndex).toBe(0);
    expect(progress.stages).toHaveLength(PUBLISH_STAGES.length);
    expect(progress.percent).toBe(0);
    expect(progress.startedAt).toBe("2026-08-14T00:00:00Z");
  });

  test("falls back to the job row when the run cannot be read", () => {
    expect(publishProgress({ job: { state: "running", githubRunId: "42" } }).stageKey).toBe(
      "prepare",
    );
    expect(
      publishProgress({ job: { state: "running", githubRunId: "42", candidateRevisionId: "r" } })
        .stageKey,
    ).toBe("candidate");
    expect(
      publishProgress({
        job: { state: "running", githubRunId: "42", candidateRevisionId: "r", releaseId: "x" },
      }).stageKey,
    ).toBe("deploy");
  });

  test("names the running step and advances through the stages", () => {
    const translating = publishProgress({
      job: { state: "running", githubRunId: "42" },
      run: {
        runUrl: "https://github.invalid/job/1",
        steps: stepsUpTo("Translate the Japanese source"),
      },
    });
    expect(translating.stageKey).toBe("translate");
    expect(translating.stepLabel).toBe("日本語から英語への翻訳");
    expect(translating.runUrl).toBe("https://github.invalid/job/1");
    expect(translating.completedSteps).toBeGreaterThan(0);
    expect(translating.totalSteps).toBe(translating.completedSteps + 1);

    const verifying = publishProgress({
      job: { state: "running", githubRunId: "42", candidateRevisionId: "r" },
      run: { steps: stepsUpTo("Verify candidate release") },
    });
    expect(verifying.stageKey).toBe("verify");
    expect(verifying.percent).toBeGreaterThan(translating.percent);
  });

  test("never steps back when the job row is ahead of the reported steps", () => {
    const progress = publishProgress({
      job: { state: "running", githubRunId: "42", releaseId: "release-1" },
      run: { steps: stepsUpTo("Verify candidate release") },
    });
    expect(progress.stageKey).toBe("deploy");
  });

  test("finishes at the last stage once the job succeeds", () => {
    const progress = publishProgress({
      job: { state: "succeeded", githubRunId: "42", releaseId: "release-1" },
      run: { steps: stepsUpTo("Finalize active release", { pending: false }) },
    });
    expect(progress.percent).toBe(100);
    expect(progress.stageIndex).toBe(PUBLISH_STAGES.length - 1);
    expect(progress.stepLabel).toBe("公開が完了しました");
  });

  test("keeps the failing stage visible when the job fails", () => {
    const progress = publishProgress({
      job: { state: "failed", githubRunId: "42" },
      run: { steps: stepsUpTo("Verify candidate release", { pending: false }) },
    });
    expect(progress.state).toBe("failed");
    expect(progress.stageKey).toBe("verify");
  });

  // What a failed run actually reports: the step that broke, then the workflow's
  // own failure recorder still running, then the cleanup GitHub always appends.
  test("names the step that broke, not the ones that ran after it", () => {
    const steps = [
      ...stepsUpTo("Generate post metadata", { pending: false }).slice(0, -1),
      { name: "Generate post metadata", status: "completed", conclusion: "failure" },
      { name: "Record sanitized failure", status: "in_progress", conclusion: null },
      { name: "Post Run actions/setup-node@v7", status: "completed", conclusion: "success" },
      { name: "Complete job", status: "completed", conclusion: "success" },
    ];
    const progress = publishProgress({
      job: { state: "failed", githubRunId: "42" },
      run: { steps },
    });
    expect(progress.stepLabel).toBe("タグ・要約・サムネイルの生成");
    expect(progress.stageKey).toBe("translate");
    expect(progress.stageLabel).toBe("英訳と付加情報の生成");
    // Part way through the stage: the translation before it counts, the cleanup
    // after it does not, so the bar stops short of the stage it never finished.
    const stageStart = publishProgress({
      job: { state: "running", githubRunId: "42" },
      run: { steps: stepsUpTo("Record pre-translation checksums") },
    }).percent;
    const stageEnd = publishProgress({
      job: { state: "running", githubRunId: "42", candidateRevisionId: "r" },
      run: { steps: stepsUpTo("Create immutable candidate release") },
    }).percent;
    expect(progress.percent).toBeGreaterThan(stageStart);
    expect(progress.percent).toBeLessThan(stageEnd);
    expect(progress.totalSteps).toBe(steps.length - 4);
  });
});

describe("workflow run readings", () => {
  function client(fetchMock, now = () => 0) {
    vi.stubGlobal("fetch", fetchMock);
    return new GitHubWorkflowClient(
      {
        token: "github-secret",
        repository: "owner/repository",
        ref: "main",
        workflow: "content-publish.yml",
      },
      { now },
    );
  }

  test("reads the run's single job and caches it across polls", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        jobs: [
          {
            html_url: "https://github.invalid/job/1",
            status: "in_progress",
            conclusion: null,
            started_at: "2026-08-14T00:00:00Z",
            steps: [{ name: "Install dependencies", status: "completed", conclusion: "success" }],
          },
        ],
      }),
    }));
    let clock = 0;
    const workflows = client(fetchMock, () => clock);

    const first = await workflows.runProgress("42");
    expect(first.runUrl).toBe("https://github.invalid/job/1");
    expect(first.steps).toHaveLength(1);
    clock = 1000;
    await workflows.runProgress("42");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    clock = 9000;
    await workflows.runProgress("42");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // A cached reading can name a step the run had already left, which is how a
  // failed publication ends up pointing at the wrong step.
  test("re-reads a finished run instead of answering from the cache", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        jobs: [{ html_url: "https://github.invalid/job/1", status: "completed", steps: [] }],
      }),
    }));
    const workflows = client(fetchMock, () => 0);

    await workflows.runProgress("42");
    await workflows.runProgress("42");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await workflows.runProgress("42", { fresh: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("stays quiet when the run cannot be read", async () => {
    const failing = client(vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));
    await expect(failing.runProgress("42")).resolves.toBeNull();

    const throwing = client(
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    await expect(throwing.runProgress("42")).resolves.toBeNull();

    const unused = vi.fn();
    const invalid = client(unused);
    await expect(invalid.runProgress("")).resolves.toBeNull();
    expect(unused).not.toHaveBeenCalled();
  });
});
