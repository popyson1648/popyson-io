function required(name, env) {
  const value = String(env[name] || "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function githubWorkflowConfig(env = process.env) {
  return {
    token: required("CONTENT_GITHUB_TOKEN", env),
    repository: required("CONTENT_GITHUB_REPOSITORY", env),
    ref: String(env.CONTENT_GITHUB_REF || "main").trim() || "main",
    workflow: String(env.CONTENT_GITHUB_WORKFLOW || "content-publish.yml").trim(),
  };
}

export class GitHubWorkflowError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "GitHubWorkflowError";
    this.status = status;
    this.code = "workflow_dispatch_failed";
  }
}

// The editor polls a running publication every couple of seconds, and every
// poll would otherwise be a GitHub API call. One reading per this many
// milliseconds is finer than the workflow's steps change.
const RUN_CACHE_MS = 3000;

export class GitHubWorkflowClient {
  constructor(config = githubWorkflowConfig(), { now = () => Date.now() } = {}) {
    this.config = config;
    this.now = now;
    this.runCache = new Map();
  }

  async dispatchPublication(jobId) {
    const { token, repository, ref, workflow } = this.config;
    const response = await fetch(
      `https://api.github.com/repos/${repository}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`,
      {
        method: "POST",
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-github-api-version": "2026-03-10",
          "user-agent": "popyson-content-editor",
        },
        body: JSON.stringify({ ref, inputs: { job_id: jobId } }),
      },
    );
    if (!response.ok) {
      throw new GitHubWorkflowError(
        `Unable to dispatch the publication workflow (${response.status})`,
        response.status,
      );
    }
    if (response.status === 204) return { workflowRunId: null, runUrl: null };
    const value = await response.json();
    return {
      workflowRunId: value.workflow_run_id || null,
      runUrl: value.html_url || null,
    };
  }

  /**
   * The steps of a publication run, for progress display only.
   *
   * Progress is decoration around a job the database already tracks, so this
   * never throws: an unreadable run leaves the editor showing what the job row
   * alone can say.
   *
   * `fresh` skips the cache. A publication that has just finished is read once
   * more without it: the step the author is shown is the last thing they see,
   * and a cached reading is up to RUN_CACHE_MS behind — enough to name a step
   * that had already passed when the run failed, sending them to the wrong
   * place to look.
   *
   * @param {string | number} runId
   * @param {{ fresh?: boolean }} [options]
   * @returns {Promise<{
   *   runUrl: string | null,
   *   status: string,
   *   conclusion: string | null,
   *   startedAt: string | null,
   *   steps: Array<{ name: string, status: string, conclusion: string | null }>,
   * } | null>}
   */
  async runProgress(runId, { fresh = false } = {}) {
    const id = String(runId || "");
    if (!/^\d{1,20}$/.test(id)) return null;
    const cached = this.runCache.get(id);
    if (!fresh && cached && this.now() - cached.at < RUN_CACHE_MS) return cached.value;
    const value = await this.#fetchRunProgress(id).catch(() => null);
    this.runCache.set(id, { at: this.now(), value });
    return value;
  }

  async #fetchRunProgress(id) {
    const { token, repository } = this.config;
    // The run itself carries no step list; its single job does, and that job's
    // page is also the most useful thing to link an author to.
    const response = await fetch(
      `https://api.github.com/repos/${repository}/actions/runs/${id}/jobs?per_page=1`,
      {
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
          "x-github-api-version": "2026-03-10",
          "user-agent": "popyson-content-editor",
        },
      },
    );
    if (!response.ok) return null;
    const value = await response.json();
    const job = value?.jobs?.[0];
    if (!job) return null;
    return {
      runUrl: job.html_url || null,
      status: String(job.status || ""),
      conclusion: job.conclusion || null,
      startedAt: job.started_at || null,
      steps: (Array.isArray(job.steps) ? job.steps : []).map((step) => ({
        name: String(step.name || ""),
        status: String(step.status || ""),
        conclusion: step.conclusion || null,
      })),
    };
  }
}
