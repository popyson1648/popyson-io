import { authorize } from "./auth";
import type { RuntimeEnv } from "./env";
import { errorResponse, HttpError, json, readJson } from "./http";
import {
  activeReleaseSnapshot,
  createCandidateRelease,
  createPublishJob,
  failPublication,
  finalizePublication,
  markJobRunning,
  markReleaseDeploying,
  pendingReleases,
  publicationJobSnapshot,
  readPublishJob,
  reconcileRelease,
  releaseSnapshot,
  type CandidateInput,
} from "./publication";
import {
  attachAsset,
  createContent,
  detachAsset,
  getAsset,
  listContent,
  listRevisions,
  putAsset,
  readContent,
  readRevision,
  restoreRevision,
  saveRevision,
  updateState,
  type RevisionInput,
  type Visibility,
} from "./repository";

interface CreateBody extends RevisionInput {
  kind: string;
  id: string;
  visibility?: Visibility;
}

function positiveLimit(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function decoded(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new HttpError(400, "invalid_path", "Path parameter is invalid");
  }
}

export function sanitizedLogRoute(pathname: string): string {
  return pathname
    .replace(/^(\/v1\/author\/content\/(?:post|work|about))\/[^/]+/, "$1/:content")
    .replace(/(\/revisions)\/[^/]+/, "$1/:revision")
    .replace(/^(\/v1\/author\/publish)\/[^/]+/, "$1/:job")
    .replace(/^(\/v1\/ci\/jobs)\/[^/]+/, "$1/:job")
    .replace(/^(\/v1\/ci\/releases)\/(?!active(?:\/|$)|pending(?:\/|$))[^/]+/, "$1/:release")
    .replace(/^(\/v1\/(?:author|ci)\/assets)\/[^/]+/, "$1/:asset");
}

async function route(request: Request, env: RuntimeEnv, url: URL): Promise<Response> {
  const maximumJsonBytes = positiveLimit(env.MAX_JSON_BYTES, 1024 * 1024);
  const maximumAssetBytes = positiveLimit(env.MAX_ASSET_BYTES, 10 * 1024 * 1024);

  if (request.method === "GET" && url.pathname === "/health") {
    return json({ ok: true });
  }

  if (request.method === "GET" && url.pathname === "/v1/author/content") {
    return json({ items: await listContent(env) });
  }
  if (request.method === "POST" && url.pathname === "/v1/author/content") {
    const body = await readJson<CreateBody>(request, maximumJsonBytes);
    return json(
      await createContent(env, body.kind, body.id, body.visibility || "private", body),
      201,
    );
  }

  const revision =
    /^\/v1\/author\/content\/(post|work|about)\/([^/]+)\/revisions\/([0-9a-f-]{36})$/.exec(
      url.pathname,
    );
  if (revision && request.method === "GET") {
    return json(await readRevision(env, revision[1], decoded(revision[2]), revision[3]));
  }

  const revisions = /^\/v1\/author\/content\/(post|work|about)\/([^/]+)\/revisions$/.exec(
    url.pathname,
  );
  if (revisions && request.method === "GET") {
    return json(await listRevisions(env, revisions[1], decoded(revisions[2])));
  }

  const restore = /^\/v1\/author\/content\/(post|work|about)\/([^/]+)\/restore$/.exec(url.pathname);
  if (restore && request.method === "POST") {
    const body = await readJson<{ revisionId?: string; expectedRevisionId?: string | null }>(
      request,
      maximumJsonBytes,
    );
    return json(await restoreRevision(env, restore[1], decoded(restore[2]), body));
  }

  const publish = /^\/v1\/author\/content\/(post|work|about)\/([^/]+)\/publish$/.exec(url.pathname);
  if (publish && request.method === "POST") {
    const body = await readJson<{ revisionId?: string; idempotencyKey?: string }>(
      request,
      maximumJsonBytes,
    );
    return json(await createPublishJob(env, publish[1], decoded(publish[2]), body), 201);
  }

  const contentAssets = /^\/v1\/author\/content\/(post|work|about)\/([^/]+)\/assets$/.exec(
    url.pathname,
  );
  if (contentAssets && request.method === "POST") {
    const body = await readJson<{
      assetId?: string;
      logicalPath?: string;
      role?: string;
      expectedRevisionId?: string | null;
    }>(request, maximumJsonBytes);
    return json(await attachAsset(env, contentAssets[1], decoded(contentAssets[2]), body), 201);
  }
  if (contentAssets && request.method === "DELETE") {
    return json(
      await detachAsset(
        env,
        contentAssets[1],
        decoded(contentAssets[2]),
        url.searchParams.get("logicalPath") || "",
        url.searchParams.get("expectedRevisionId"),
      ),
    );
  }

  const content = /^\/v1\/author\/content\/(post|work|about)\/([^/]+)$/.exec(url.pathname);
  if (content) {
    const kind = content[1];
    const id = decoded(content[2]);
    if (request.method === "GET") return json(await readContent(env, kind, id));
    if (request.method === "PUT") {
      const body = await readJson<RevisionInput>(request, maximumJsonBytes);
      return json(await saveRevision(env, kind, id, body));
    }
    if (request.method === "PATCH") {
      const body = await readJson<{
        visibility?: Visibility;
        deleted?: boolean;
        expectedRevisionId?: string | null;
      }>(request, maximumJsonBytes);
      return json(await updateState(env, kind, id, body));
    }
  }

  const authorJob = /^\/v1\/author\/publish\/([0-9a-f-]{36})$/.exec(url.pathname);
  if (authorJob && request.method === "GET") {
    return json(await readPublishJob(env, authorJob[1]));
  }

  const asset = /^\/v1\/(author|ci)\/assets\/([a-f0-9]{64})$/.exec(url.pathname);
  if (asset) {
    if (request.method === "PUT") {
      return json(await putAsset(env, request, asset[2], maximumAssetBytes), 201);
    }
    if (request.method === "GET") return getAsset(env, asset[2]);
  }

  const ciJob =
    /^\/v1\/ci\/jobs\/([0-9a-f-]{36})\/(running|snapshot|candidate|deploying|finalize|fail)$/.exec(
      url.pathname,
    );
  if (ciJob) {
    const [, jobId, action] = ciJob;
    if (action === "snapshot" && request.method === "GET") {
      return json(await publicationJobSnapshot(env, jobId));
    }
    if (request.method === "POST") {
      if (action === "running") {
        return json(
          await markJobRunning(
            env,
            jobId,
            await readJson<{ githubRunId?: string | number }>(request, maximumJsonBytes),
          ),
        );
      }
      if (action === "candidate") {
        return json(
          await createCandidateRelease(
            env,
            jobId,
            await readJson<CandidateInput>(request, maximumJsonBytes),
          ),
          201,
        );
      }
      if (action === "deploying") {
        return json(
          await markReleaseDeploying(
            env,
            jobId,
            await readJson<{ releaseId?: string }>(request, maximumJsonBytes),
          ),
        );
      }
      if (action === "finalize") {
        return json(
          await finalizePublication(
            env,
            jobId,
            await readJson<{ releaseId?: string; pagesDeploymentId?: string }>(
              request,
              maximumJsonBytes,
            ),
          ),
        );
      }
      if (action === "fail") {
        return json(
          await failPublication(
            env,
            jobId,
            await readJson<{ sanitizedError?: string }>(request, maximumJsonBytes),
          ),
        );
      }
    }
  }

  if (request.method === "GET" && url.pathname === "/v1/ci/releases/active/snapshot") {
    return json(await activeReleaseSnapshot(env));
  }
  if (request.method === "GET" && url.pathname === "/v1/ci/releases/pending") {
    return json(await pendingReleases(env));
  }
  if (request.method === "POST" && url.pathname === "/v1/ci/releases/reconcile") {
    return json(
      await reconcileRelease(
        env,
        await readJson<{ releaseId?: string; pagesDeploymentId?: string }>(
          request,
          maximumJsonBytes,
        ),
      ),
    );
  }
  const ciRelease = /^\/v1\/ci\/releases\/([0-9a-f-]{36})\/snapshot$/.exec(url.pathname);
  if (ciRelease && request.method === "GET") {
    return json(await releaseSnapshot(env, ciRelease[1]));
  }

  throw new HttpError(404, "not_found", "Route was not found");
}

export default {
  async fetch(request, env): Promise<Response> {
    const requestId = request.headers.get("cf-ray") || crypto.randomUUID();
    const url = new URL(request.url);
    try {
      await authorize(request, env, url.pathname);
      const response = await route(request, env, url);
      console.log(
        JSON.stringify({
          event: "request_complete",
          requestId,
          method: request.method,
          route: sanitizedLogRoute(url.pathname),
          status: response.status,
        }),
      );
      return response;
    } catch (error) {
      return errorResponse(error, requestId);
    }
  },
} satisfies ExportedHandler<RuntimeEnv>;
