import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  backupAsset,
  exportDatabase,
  pollExport,
  startExport,
  storeExport,
  type BackupEnvironment,
} from "../src/backup";

function environment(bucket: R2Bucket = {} as R2Bucket): BackupEnvironment {
  return {
    ACCOUNT_ID: "account",
    BACKUP_BUCKET: bucket,
    CONTENT_ASSETS: {} as R2Bucket,
    CONTENT_DB: {} as D1Database,
    D1_REST_API_TOKEN: "token",
    DATABASE_ID: "database",
  };
}

function response(body: unknown): Response {
  return Response.json({ result: body, success: true });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("asset backup", () => {
  it("checks the primary asset before writing an immutable backup", async () => {
    const body = new TextEncoder().encode("image bytes");
    const sha256 = createHash("sha256").update(body).digest("hex");
    const objectKey = `sha256/${sha256.slice(0, 2)}/${sha256}`;
    const backupPut = vi.fn(async (key: string, value: ArrayBuffer) => ({
      key,
      size: value.byteLength,
    }));
    const env = environment({
      head: vi.fn(async () => null),
      put: backupPut,
    } as unknown as R2Bucket);
    env.CONTENT_ASSETS = {
      get: vi.fn(async () => ({
        arrayBuffer: async () => body.buffer,
        httpMetadata: { contentType: "image/png" },
        size: body.byteLength,
      })) as unknown as R2Bucket["get"],
    } as R2Bucket;

    await expect(
      backupAsset(env, {
        checksum_sha256: sha256,
        object_key: objectKey,
        size_bytes: body.byteLength,
      }),
    ).resolves.toEqual({ bytes: body.byteLength, key: `assets/${objectKey}`, sha256 });

    const options = backupPut.mock.calls[0][2] as R2PutOptions;
    expect(options.onlyIf).toEqual({ etagDoesNotMatch: "*" });
    expect(options.customMetadata).toEqual({ sha256 });
  });

  it("verifies a seeded backup that has no checksum metadata", async () => {
    const body = new TextEncoder().encode("seeded image");
    const sha256 = createHash("sha256").update(body).digest("hex");
    const env = environment({
      head: vi.fn(async () => ({ size: body.byteLength }) as R2Object),
      get: vi.fn(async () => ({ arrayBuffer: async () => body.buffer }) as R2ObjectBody),
    } as unknown as R2Bucket);

    await expect(
      backupAsset(env, {
        checksum_sha256: sha256,
        object_key: `sha256/${sha256.slice(0, 2)}/${sha256}`,
        size_bytes: body.byteLength,
      }),
    ).resolves.toMatchObject({ bytes: body.byteLength, sha256 });
  });
});

describe("D1 export API", () => {
  it("starts a polling export without exposing the token in its result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ at_bookmark: "bookmark" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(startExport(environment())).resolves.toBe("bookmark");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ output_format: "polling" });
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer token");
  });

  it("polls with the output format the export API requires", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        status: "complete",
        success: true,
        result: { filename: "backup.sql", signed_url: "https://example.invalid/backup.sql" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(pollExport(environment(), "bookmark")).resolves.toEqual({
      signedUrl: "https://example.invalid/backup.sql",
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      output_format: "polling",
      current_bookmark: "bookmark",
    });
  });

  it("reports a still-running export as pending rather than failed", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(response({ status: "active", success: true, at_bookmark: "bookmark" })),
    );

    await expect(pollExport(environment(), "bookmark")).resolves.toBeNull();
  });

  it("rejects a poll that arrived after the export session closed", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response({ success: false, error: "Not currently exporting anything." }),
        ),
    );

    await expect(pollExport(environment(), "bookmark")).rejects.toThrow(
      "D1 export session ended before it was collected",
    );
  });

  it("keeps polling one export until its download location appears", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ at_bookmark: "bookmark" }))
      .mockResolvedValueOnce(response({ status: "active", success: true }))
      .mockResolvedValueOnce(response({ status: "active", success: true }))
      .mockResolvedValue(
        response({
          status: "complete",
          success: true,
          result: { filename: "backup.sql", signed_url: "https://example.invalid/backup.sql" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const sleep = vi.fn(async () => {});

    await expect(exportDatabase(environment(), { intervalMs: 5, sleep })).resolves.toEqual({
      bookmark: "bookmark",
      location: { signedUrl: "https://example.invalid/backup.sql" },
    });

    // One start followed by polls that all carry the same bookmark.
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(sleep).toHaveBeenCalledTimes(2);
    for (const call of fetchMock.mock.calls.slice(1)) {
      expect(JSON.parse(String((call[1] as RequestInit).body))).toEqual({
        output_format: "polling",
        current_bookmark: "bookmark",
      });
    }
  });

  it("gives up on an export that never finishes", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(response({ at_bookmark: "bookmark" }))
        .mockResolvedValue(response({ status: "active", success: true })),
    );

    await expect(
      exportDatabase(environment(), { intervalMs: 0, timeoutMs: 0, sleep: async () => {} }),
    ).rejects.toThrow("D1 export did not finish in time");
  });

  it("accepts only HTTPS download locations", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          status: "complete",
          success: true,
          result: { filename: "backup.sql", signed_url: "http://invalid/" },
        }),
      ),
    );

    await expect(pollExport(environment(), "bookmark")).rejects.toThrow(
      "D1 export URL must use HTTPS",
    );
  });

  it("sanitizes control-plane network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("request exposed https://api.invalid/?token=secret")),
    );

    await expect(startExport(environment())).rejects.toThrow("D1 export API request failed");
  });
});

describe("backup storage", () => {
  it("sanitizes signed download network failures", async () => {
    const bucket = { head: vi.fn(async () => null) } as unknown as R2Bucket;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("request exposed https://storage.invalid/?sig=secret")),
    );

    const failure = await storeExport(
      environment(bucket),
      { signedUrl: "https://storage.invalid/?sig=secret" },
      "bookmark",
      new Date("2026-08-12T18:17:00Z"),
      "workflow_1",
    ).catch((error: Error) => error);

    // The reason survives so a blocked host can be told apart from a transport
    // failure, but the signed URL must not appear anywhere in it.
    expect(failure.message).toContain("D1 export download failed");
    expect(failure.message).toContain("request exposed");
    expect(failure.message).not.toContain("storage.invalid");
    expect(failure.message).not.toContain("sig=secret");
  });

  it("refuses a redirected download instead of following it", async () => {
    const bucket = { head: vi.fn(async () => null) } as unknown as R2Bucket;
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 302, headers: { location: "https://elsewhere.invalid/" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      storeExport(
        environment(bucket),
        { signedUrl: "https://storage.invalid/backup" },
        "bookmark",
        new Date("2026-08-12T18:17:00Z"),
        "workflow_1",
      ),
    ).rejects.toThrow("D1 export download returned 302");

    expect((fetchMock.mock.calls[0][1] as RequestInit).redirect).toBe("manual");
  });

  it("refuses a dump that exceeds the size limit", async () => {
    const bucket = { head: vi.fn(async () => null) } as unknown as R2Bucket;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("dump", {
          headers: { "content-length": String(64 * 1024 * 1024 + 1) },
        }),
      ),
    );

    await expect(
      storeExport(
        environment(bucket),
        { signedUrl: "https://storage.invalid/backup" },
        "bookmark",
        new Date("2026-08-12T18:17:00Z"),
        "workflow_1",
      ),
    ).rejects.toThrow("D1 export exceeded the size limit");
  });

  it("refuses an empty dump", async () => {
    const bucket = { head: vi.fn(async () => null) } as unknown as R2Bucket;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("")));

    await expect(
      storeExport(
        environment(bucket),
        { signedUrl: "https://storage.invalid/backup" },
        "bookmark",
        new Date("2026-08-12T18:17:00Z"),
        "workflow_1",
      ),
    ).rejects.toThrow("D1 export was empty");
  });

  it("stores the dump and writes a SHA-256 manifest", async () => {
    const objects = new Map<string, Uint8Array>();
    const metadata = new Map<string, R2PutOptions>();
    const bucket = {
      head: vi.fn(async (key: string) =>
        objects.has(key) ? ({ key, size: objects.get(key)?.byteLength ?? 0 } as R2Object) : null,
      ),
      get: vi.fn(async () => null),
      put: vi.fn(async (key: string, value: ReadableStream | string, options: R2PutOptions) => {
        const bytes =
          typeof value === "string"
            ? new TextEncoder().encode(value)
            : new Uint8Array(await new Response(value).arrayBuffer());
        objects.set(key, bytes);
        metadata.set(key, options);
        return { key } as R2Object;
      }),
    } as unknown as R2Bucket;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("CREATE TABLE sample(id);")));

    const record = await storeExport(
      environment(bucket),
      { signedUrl: "https://storage.invalid/backup" },
      "bookmark",
      new Date("2026-08-12T18:17:00Z"),
      "workflow_1",
    );

    expect(record.key).toBe("d1/2026/08/12/workflow_1.sql");
    expect(record.sha256).toBe(
      createHash("sha256").update("CREATE TABLE sample(id);").digest("hex"),
    );
    expect(objects.has(`${record.key}.json`)).toBe(true);
    expect(metadata.get(record.key)?.onlyIf).toEqual({ etagDoesNotMatch: "*" });
    expect(metadata.get(record.key)?.customMetadata).toEqual({ bookmark: "bookmark" });
  });

  it("returns a matching completed backup without downloading it again", async () => {
    const key = "d1/2026/08/12/workflow_1.sql";
    const record = { bookmark: "bookmark", bytes: 12, key, sha256: "a".repeat(64) };
    const bucket = {
      head: vi.fn(async () => ({ key, size: 12 }) as R2Object),
      get: vi.fn(async () => ({ json: async () => record }) as R2ObjectBody),
    } as unknown as R2Bucket;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      storeExport(
        environment(bucket),
        { signedUrl: "https://storage.invalid/backup" },
        "bookmark",
        new Date("2026-08-12T18:17:00Z"),
        "workflow_1",
      ),
    ).resolves.toEqual(record);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
