import { createHash } from "node:crypto";

function requiredEnv(name, env = process.env) {
  const value = String(env[name] || "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function contentCloudConfig(env = process.env) {
  return {
    baseUrl: requiredEnv("CONTENT_API_URL", env).replace(/\/$/, ""),
    clientId: requiredEnv("CF_ACCESS_CLIENT_ID", env),
    clientSecret: requiredEnv("CF_ACCESS_CLIENT_SECRET", env),
  };
}

export class ContentCloudError extends Error {
  constructor(message, status = 500, code = "cloud_error") {
    super(message);
    this.name = "ContentCloudError";
    this.status = status;
    this.code = code;
  }
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export class ContentCloudClient {
  constructor(config = contentCloudConfig()) {
    this.baseUrl = config.baseUrl;
    this.accessHeaders = {
      "CF-Access-Client-Id": config.clientId,
      "CF-Access-Client-Secret": config.clientSecret,
    };
  }

  /**
   * @param {string} pathname
   * @param {{
   *   method?: string,
   *   json?: unknown,
   *   body?: BodyInit,
   *   headers?: Record<string, string>,
   * }} [options] `json` is serialized and sets the JSON content type; `body` is sent as-is.
   */
  async request(pathname, { method = "GET", json, body, headers = {} } = {}) {
    const response = await fetch(`${this.baseUrl}${pathname}`, {
      method,
      headers: {
        ...this.accessHeaders,
        ...(json === undefined ? {} : { "content-type": "application/json" }),
        ...headers,
      },
      body: json === undefined ? body : JSON.stringify(json),
    });
    if (response.ok) {
      if (response.status === 204) return null;
      return response.json();
    }
    let error;
    try {
      error = (await response.json()).error;
    } catch {
      error = null;
    }
    throw new ContentCloudError(
      error?.message || `Content API request failed (${response.status})`,
      response.status,
      error?.code || "cloud_error",
    );
  }

  async requestBytes(pathname) {
    const response = await fetch(`${this.baseUrl}${pathname}`, {
      headers: this.accessHeaders,
    });
    if (response.ok) return response.arrayBuffer();
    throw new ContentCloudError(
      `Content API request failed (${response.status})`,
      response.status,
      "cloud_error",
    );
  }

  list() {
    return this.request("/v1/author/content");
  }

  read(kind, id) {
    return this.request(`/v1/author/content/${kind}/${encodeURIComponent(id)}`);
  }

  create(value) {
    return this.request("/v1/author/content", { method: "POST", json: value });
  }

  save(kind, id, value) {
    return this.request(`/v1/author/content/${kind}/${encodeURIComponent(id)}`, {
      method: "PUT",
      json: value,
    });
  }

  updateState(kind, id, value) {
    return this.request(`/v1/author/content/${kind}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      json: value,
    });
  }

  uploadAsset(bytes, mediaType) {
    const id = sha256(bytes);
    return this.request(`/v1/author/assets/${id}`, {
      method: "PUT",
      body: bytes,
      headers: {
        "content-length": String(bytes.byteLength),
        "content-type": mediaType,
      },
    });
  }

  attachAsset(kind, id, value) {
    return this.request(`/v1/author/content/${kind}/${encodeURIComponent(id)}/assets`, {
      method: "POST",
      json: value,
    });
  }

  getAsset(assetId) {
    return this.requestRaw(`/v1/author/assets/${encodeURIComponent(assetId)}`);
  }

  listRevisions(kind, id) {
    return this.request(`/v1/author/content/${kind}/${encodeURIComponent(id)}/revisions`);
  }

  readRevision(kind, id, revisionId) {
    return this.request(
      `/v1/author/content/${kind}/${encodeURIComponent(id)}/revisions/${encodeURIComponent(revisionId)}`,
    );
  }

  restoreRevision(kind, id, value) {
    return this.request(`/v1/author/content/${kind}/${encodeURIComponent(id)}/restore`, {
      method: "POST",
      json: value,
    });
  }

  createPublication(kind, id, value) {
    return this.request(`/v1/author/content/${kind}/${encodeURIComponent(id)}/publish`, {
      method: "POST",
      json: value,
    });
  }

  publication(jobId) {
    return this.request(`/v1/author/publish/${encodeURIComponent(jobId)}`);
  }

  /**
   * @param {string} pathname
   * @param {{method?: string, body?: BodyInit, headers?: Record<string, string>}} [options]
   */
  async requestRaw(pathname, { method = "GET", body, headers = {} } = {}) {
    const response = await fetch(`${this.baseUrl}${pathname}`, {
      method,
      headers: { ...this.accessHeaders, ...headers },
      body,
    });
    if (response.ok) return response;
    let error;
    try {
      error = (await response.json()).error;
    } catch {
      error = null;
    }
    throw new ContentCloudError(
      error?.message || `Content API request failed (${response.status})`,
      response.status,
      error?.code || "cloud_error",
    );
  }
}
