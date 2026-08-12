export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export async function readJson<T>(request: Request, maximumBytes: number): Promise<T> {
  const length = Number(request.headers.get("content-length") || "0");
  if (length > maximumBytes) {
    throw new HttpError(413, "body_too_large", "Request body is too large");
  }
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > maximumBytes) {
    throw new HttpError(413, "body_too_large", "Request body is too large");
  }
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new HttpError(400, "invalid_json", "Request body must be a JSON object");
    }
    return value as T;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "invalid_json", "Request body must be valid JSON");
  }
}

export function errorResponse(error: unknown, requestId: string): Response {
  if (error instanceof HttpError) {
    return json({ error: { code: error.code, message: error.message }, requestId }, error.status);
  }
  console.error(JSON.stringify({ event: "request_failed", requestId, code: "internal_error" }));
  return json(
    { error: { code: "internal_error", message: "Unexpected server error" }, requestId },
    500,
  );
}
