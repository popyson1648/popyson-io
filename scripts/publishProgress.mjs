/**
 * Publication progress, as the author sees it.
 *
 * A publication job row only ever says queued, running, succeeded or failed,
 * and "running" covers the several minutes .github/workflows/content-publish.yml
 * spends generating metadata, translating, verifying and deploying. The stages
 * below name that work, and the workflow's own step names are what moves
 * between them, so the editor can say what is happening rather than only that
 * something is.
 */

/** The stages an author is shown, in the order the workflow reaches them. */
export const PUBLISH_STAGES = [
  { key: "queued", label: "公開の受付" },
  { key: "prepare", label: "準備" },
  { key: "translate", label: "英訳と付加情報の生成" },
  { key: "candidate", label: "候補リリースの作成" },
  { key: "verify", label: "検証" },
  { key: "deploy", label: "サイトへの反映" },
];

// Share of the whole publication each stage takes, by observed duration rather
// than by step count: translation and verification dominate, and a bar that
// weighted every step alike would sit still through both. The numbers only have
// to sum to 100 — the percentage is an estimate and is labelled as one.
const STAGE_WEIGHTS = {
  queued: 2,
  prepare: 15,
  translate: 45,
  candidate: 8,
  verify: 20,
  deploy: 10,
};

// Every named step in content-publish.yml, in workflow order. A step that is
// skipped by its `if:` still reports as completed, so the fractions below stay
// meaningful for About and Works, which skip the post-only metadata steps.
const NAMED_STEPS = [
  ["Install dependencies", "prepare", "依存パッケージのインストール"],
  ["Initialize isolated content root", "prepare", "作業領域の初期化"],
  ["Mark publication job running", "prepare", "公開ジョブの開始を記録"],
  ["Reconcile an interrupted Pages deployment", "prepare", "中断したデプロイの整合"],
  ["Download pinned publication snapshot", "prepare", "公開する内容の取得"],
  ["Record pre-generation checksums", "prepare", "生成前チェックサムの記録"],
  ["Generate post metadata", "translate", "タグ・要約・サムネイルの生成"],
  ["Validate metadata output boundary", "translate", "生成範囲の確認"],
  ["Record pre-translation checksums", "translate", "翻訳前チェックサムの記録"],
  ["Translate finalized Japanese source", "translate", "日本語から英語への翻訳"],
  ["Validate translation output boundary", "translate", "翻訳範囲の確認"],
  ["Create immutable candidate release", "candidate", "候補リリースの作成"],
  ["Download exact candidate release", "candidate", "候補リリースの取得"],
  ["Refresh reading list (best-effort)", "candidate", "読書リストの更新"],
  ["Verify candidate release", "verify", "候補リリースの検証"],
  ["Mark candidate deploying", "deploy", "デプロイ開始の記録"],
  ["Deploy exact candidate to Cloudflare Pages", "deploy", "Cloudflare Pages への配信"],
  ["Finalize active release", "deploy", "公開リリースの確定"],
  ["Record sanitized failure", "deploy", "失敗の記録"],
];

// Steps GitHub adds around the workflow's own. They carry no publication
// meaning, so they only keep the stage from resetting while they run.
/** @type {Array<[RegExp, string, string]>} */
const GENERATED_STEPS = [
  [/^Set up job$/, "prepare", "実行環境の準備"],
  [/^Run actions\/checkout/, "prepare", "リポジトリの取得"],
  [/^Run actions\/setup-python/, "prepare", "Python の準備"],
  [/^Run actions\/setup-node/, "prepare", "Node.js の準備"],
  [/^Run /, "prepare", "実行環境の準備"],
  [/^Post /, "deploy", "後片付け"],
  [/^Complete job$/, "deploy", "実行の終了"],
];

const STEPS_BY_NAME = new Map(NAMED_STEPS.map(([name, stage, label]) => [name, { stage, label }]));

function stageStepCount(stageKey) {
  return NAMED_STEPS.filter(([, stage]) => stage === stageKey).length;
}

/**
 * The stage and Japanese label for one workflow step, or null when the step is
 * unknown — a workflow edit must leave the display readable, not blank it.
 *
 * @param {string} name
 * @returns {{ stage: string, label: string } | null}
 */
export function stageForStepName(name) {
  const value = String(name || "").trim();
  const named = STEPS_BY_NAME.get(value);
  if (named) return { ...named };
  for (const [pattern, stage, label] of GENERATED_STEPS) {
    if (pattern.test(value)) return { stage, label };
  }
  return null;
}

function stageIndexOf(key) {
  return PUBLISH_STAGES.findIndex((stage) => stage.key === key);
}

function percentThrough(stageKey, fraction) {
  const index = Math.max(0, stageIndexOf(stageKey));
  const before = PUBLISH_STAGES.slice(0, index).reduce(
    (total, stage) => total + STAGE_WEIGHTS[stage.key],
    0,
  );
  const clamped = Math.min(Math.max(fraction, 0), 1);
  return Math.round(before + STAGE_WEIGHTS[PUBLISH_STAGES[index].key] * clamped);
}

// Without the workflow's steps the job row still marks three boundaries: it is
// dispatched, it produces a candidate revision, and it produces a release.
function stageFromJob(job) {
  if (job?.releaseId) return "deploy";
  if (job?.candidateRevisionId) return "candidate";
  if (job?.githubRunId) return "prepare";
  return "queued";
}

function stageFromSteps(steps) {
  let current = "prepare";
  let stepLabel = "";
  for (const step of steps) {
    const mapped = stageForStepName(step.name);
    if (mapped) current = mapped.stage;
    if (step.status !== "completed") {
      stepLabel = mapped?.label || String(step.name || "");
      return { stage: current, stepLabel, pending: true };
    }
    stepLabel = mapped?.label || String(step.name || "");
  }
  return { stage: current, stepLabel, pending: false };
}

/**
 * Fold a publication job row and, when it is available, its workflow run into
 * the shape the editor renders.
 *
 * @param {{
 *   job?: Record<string, unknown>,
 *   run?: {
 *     runUrl?: string | null,
 *     status?: string,
 *     conclusion?: string | null,
 *     startedAt?: string | null,
 *     steps?: Array<{ name?: string, status?: string, conclusion?: string | null }>,
 *   } | null,
 * }} input
 */
export function publishProgress({ job = {}, run = null } = {}) {
  const state = String(job.state || "queued");
  const steps = Array.isArray(run?.steps) ? run.steps : [];
  const completedSteps = steps.filter((step) => step.status === "completed").length;
  const done = state === "succeeded";
  let stageKey = stageFromJob(job);
  let stepLabel = "";
  let fraction = 0;

  if (steps.length > 0) {
    const derived = stageFromSteps(steps);
    // The job row is the authority on where the publication got to: it is
    // written by the workflow itself, so it can only be behind the steps, never
    // ahead of them. Taking the later of the two keeps the stage from stepping
    // back when GitHub has not yet reported the step that wrote the row.
    stageKey = stageIndexOf(derived.stage) > stageIndexOf(stageKey) ? derived.stage : stageKey;
    stepLabel = derived.stepLabel;
    const inStage = steps.filter(
      (step) => step.status === "completed" && stageForStepName(step.name)?.stage === stageKey,
    ).length;
    fraction = inStage / Math.max(1, stageStepCount(stageKey));
  } else if (stageKey !== "queued") {
    // Dispatched, but GitHub has not reported a step yet.
    fraction = 0.1;
  }

  if (done) {
    stageKey = PUBLISH_STAGES[PUBLISH_STAGES.length - 1].key;
    fraction = 1;
    stepLabel = "公開が完了しました";
  }

  const stageIndex = Math.max(0, stageIndexOf(stageKey));
  return {
    state,
    // The editor draws the whole sequence, so it is sent the whole sequence:
    // the stage names stay defined next to the workflow they describe.
    stages: PUBLISH_STAGES.map((stage) => stage.label),
    stageKey,
    stageLabel: PUBLISH_STAGES[stageIndex].label,
    stageIndex,
    stageCount: PUBLISH_STAGES.length,
    stepLabel: stepLabel || PUBLISH_STAGES[stageIndex].label,
    completedSteps,
    totalSteps: steps.length,
    percent: percentThrough(stageKey, fraction),
    runUrl: run?.runUrl || null,
    startedAt: run?.startedAt || job.createdAt || null,
  };
}
