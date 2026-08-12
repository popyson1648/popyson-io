export class EditorApiError extends Error {
  constructor(message, { status = 0, code = "request_failed" } = {}) {
    super(message);
    this.name = "EditorApiError";
    this.status = status;
    this.code = code;
  }
}

export function createEditorApi() {
  async function request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      // A non-JSON response is still reported with its HTTP status below.
    }
    if (!response.ok) {
      throw new EditorApiError(payload.error?.message || `Request failed (${response.status})`, {
        status: response.status,
        code: payload.error?.code,
      });
    }
    return payload;
  }

  return {
    list: () => request("/api/editor/content"),
    read: (kind, id) => request(`/api/editor/content/${kind}/${encodeURIComponent(id)}`),
    create: (kind, body = {}) =>
      request(`/api/editor/content/${kind}`, { method: "POST", body: JSON.stringify(body) }),
    save: (content, { checkpoint = false } = {}) =>
      request(`/api/editor/content/${content.kind}/${encodeURIComponent(content.id)}`, {
        method: "PUT",
        body: JSON.stringify({
          files: content.files,
          currentRevisionId: content.currentRevisionId,
          revisionMetadata: content.revisionMetadata,
          visibility: content.visibility,
          deletedAt: content.deletedAt,
          checkpoint,
        }),
      }),
    updateState: (content, value) =>
      request(`/api/editor/content/${content.kind}/${encodeURIComponent(content.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ ...value, currentRevisionId: content.currentRevisionId }),
      }),
    history: (kind, id) => request(`/api/editor/content/${kind}/${encodeURIComponent(id)}/history`),
    restoreHistory: (kind, id, historyId, currentRevisionId) =>
      request(
        `/api/editor/content/${kind}/${encodeURIComponent(id)}/history/${encodeURIComponent(historyId)}`,
        { method: "POST", body: JSON.stringify({ currentRevisionId }) },
      ),
    preview: (markdown, locale) =>
      request("/api/editor/preview", {
        method: "POST",
        body: JSON.stringify({ markdown, locale }),
      }),
    upload: (kind, id, file, currentRevisionId) =>
      new Promise((resolve, reject) => {
        const extension = file.name.split(".").pop()?.toLowerCase();
        const inferredType = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          gif: "image/gif",
          webp: "image/webp",
          avif: "image/avif",
          heic: "image/heic",
          heif: "image/heif",
          tif: "image/tiff",
          tiff: "image/tiff",
        }[extension];
        const reader = new FileReader();
        reader.onerror = () => reject(new EditorApiError("画像を読み込めませんでした"));
        reader.onload = async () => {
          try {
            const data = String(reader.result || "").split(",")[1] || "";
            resolve(
              await request(`/api/editor/content/${kind}/${encodeURIComponent(id)}/assets`, {
                method: "POST",
                body: JSON.stringify({
                  name: file.name,
                  type: file.type || inferredType,
                  data,
                  currentRevisionId,
                }),
              }),
            );
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsDataURL(file);
      }),
    publish: (kind, id) =>
      request(`/api/editor/content/${kind}/${encodeURIComponent(id)}/publish`, {
        method: "POST",
      }),
    publishPreflight: (kind, id) =>
      request(`/api/editor/content/${kind}/${encodeURIComponent(id)}/publish`),
    publishJob: (jobId) => request(`/api/editor/publish/${encodeURIComponent(jobId)}`),
  };
}
