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

export class GitHubWorkflowClient {
  constructor(config = githubWorkflowConfig()) {
    this.config = config;
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
}
