import { authorize } from "./auth";
import type { RuntimeEnv } from "./env";
import { errorResponse, HttpError, json, readJson } from "./http";
import {
  attachAsset,
  createContent,
  getAsset,
  listContent,
  putAsset,
  readContent,
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

async function route(request: Request, env: RuntimeEnv, url: URL): Promise<Response> {
  if (request.method === "GET" && url.pathname === "/health") {
    return json({ ok: true });
  }

  if (request.method === "GET" && url.pathname === "/v1/author/content") {
    return json({ items: await listContent(env) });
  }
  if (request.method === "POST" && url.pathname === "/v1/author/content") {
    const body = await readJson<CreateBody>(
      request,
      positiveLimit(env.MAX_JSON_BYTES, 1024 * 1024),
    );
    return json(
      await createContent(env, body.kind, body.id, body.visibility || "private", body),
      201,
    );
  }

  const content = /^\/v1\/author\/content\/(post|work|about)\/([^/]+)$/.exec(url.pathname);
  if (content) {
    const kind = content[1];
    const id = decodeURIComponent(content[2]);
    if (request.method === "GET") return json(await readContent(env, kind, id));
    if (request.method === "PUT") {
      const body = await readJson<RevisionInput>(
        request,
        positiveLimit(env.MAX_JSON_BYTES, 1024 * 1024),
      );
      return json(await saveRevision(env, kind, id, body));
    }
    if (request.method === "PATCH") {
      const body = await readJson<{ visibility?: Visibility; deleted?: boolean }>(
        request,
        positiveLimit(env.MAX_JSON_BYTES, 1024 * 1024),
      );
      return json(await updateState(env, kind, id, body));
    }
  }

  const contentAssets = /^\/v1\/author\/content\/(post|work|about)\/([^/]+)\/assets$/.exec(
    url.pathname,
  );
  if (request.method === "POST" && contentAssets) {
    const body = await readJson<{ assetId?: string; logicalPath?: string; role?: string }>(
      request,
      positiveLimit(env.MAX_JSON_BYTES, 1024 * 1024),
    );
    return json(
      await attachAsset(env, contentAssets[1], decodeURIComponent(contentAssets[2]), body),
      201,
    );
  }

  const asset = /^\/v1\/(author|ci)\/assets\/([a-f0-9]{64})$/.exec(url.pathname);
  if (asset) {
    if (request.method === "PUT" && asset[1] === "author") {
      return json(
        await putAsset(
          env,
          request,
          asset[2],
          positiveLimit(env.MAX_ASSET_BYTES, 10 * 1024 * 1024),
        ),
        201,
      );
    }
    if (request.method === "GET") return getAsset(env, asset[2]);
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
          route: url.pathname.replace(/[a-f0-9]{64}/g, ":asset"),
          status: response.status,
        }),
      );
      return response;
    } catch (error) {
      return errorResponse(error, requestId);
    }
  },
} satisfies ExportedHandler<RuntimeEnv>;
