import { describe, expect, test } from "vitest";

import { contentAssetsPlugin } from "../scripts/contentAssetsPlugin.mjs";
import {
  editorRequestAccess,
  isLoopbackAddress,
  isLoopbackHost,
  isTrustedTailscaleHost,
} from "../scripts/editorApiPlugin.mjs";
import {
  EDITOR_SNAPSHOT_ROOT,
  editorServerOptions,
  ensureEditorSnapshot,
  editorStartupMessages,
  parseTailscaleIdentity,
  tailscaleServeArguments,
  tailscaleServeOffArguments,
  viteEditorPreviewOptions,
  viteEditorServerOptions,
} from "../scripts/editorServer.mjs";
import { isEditorServerProcess } from "../scripts/stopEditorServer.mjs";
import { tailscaleOperatorArguments } from "../scripts/setupEditorTailscale.mjs";

function request({
  address = "127.0.0.1",
  host = "localhost:4173",
  method = "GET",
  origin,
  fetchSite,
  tailscaleLogin,
} = {}) {
  return {
    method,
    socket: { remoteAddress: address },
    headers: {
      host,
      ...(origin ? { origin } : {}),
      ...(fetchSite ? { "sec-fetch-site": fetchSite } : {}),
      ...(tailscaleLogin ? { "tailscale-user-login": tailscaleLogin } : {}),
    },
  };
}

const accessOptions = {
  trustedHost: "editor-node.tailnet.example.invalid",
  tailscaleLogin: "author@example.invalid",
};

function assetResponse() {
  return {
    headers: {},
    statusCode: 0,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(body) {
      this.body = body;
    },
  };
}

function contentAssetMiddleware(options) {
  let middleware;
  contentAssetsPlugin(options).configureServer({
    middlewares: { use: (candidate) => (middleware = candidate) },
  });
  return middleware;
}

describe("editor Tailscale Serve authorization", () => {
  test.each(["127.0.0.1", "127.12.34.56", "::1", "::ffff:127.0.0.1"])(
    "accepts loopback address %s",
    (address) => expect(isLoopbackAddress(address)).toBe(true),
  );

  test.each(["192.168.1.2", "192.0.2.60", "::ffff:192.168.1.2", "not-an-ip"])(
    "rejects non-loopback address %s",
    (address) => expect(isLoopbackAddress(address)).toBe(false),
  );

  test.each(["localhost:4173", "127.0.0.1:4173", "[::1]:4173"])(
    "accepts loopback host %s",
    (host) => expect(isLoopbackHost(host)).toBe(true),
  );

  test("recognizes only the configured Tailscale DNS host", () => {
    expect(
      isTrustedTailscaleHost(
        "editor-node.tailnet.example.invalid:4173",
        "editor-node.tailnet.example.invalid",
      ),
    ).toBe(true);
    expect(
      isTrustedTailscaleHost("other-node.tailnet.example.invalid:4173", accessOptions.trustedHost),
    ).toBe(false);
  });

  test("allows local recovery reads", () => {
    expect(editorRequestAccess(request(), accessOptions)).toEqual({
      authorized: true,
      mode: "loopback",
    });
  });

  test("allows same-origin local recovery mutations", () => {
    const access = editorRequestAccess(
      request({
        method: "POST",
        origin: "http://localhost:4173",
        fetchSite: "same-origin",
      }),
      accessOptions,
    );
    expect(access.authorized).toBe(true);
    expect(access.mode).toBe("loopback");
  });

  test("allows the matching Tailscale user through the Serve proxy", () => {
    const access = editorRequestAccess(
      request({
        host: "editor-node.tailnet.example.invalid:4173",
        tailscaleLogin: "author@example.invalid",
      }),
      accessOptions,
    );
    expect(access).toEqual({ authorized: true, mode: "tailscale" });
  });

  test("allows same-origin HTTPS mutations through Serve", () => {
    const access = editorRequestAccess(
      request({
        host: "editor-node.tailnet.example.invalid:4173",
        method: "POST",
        origin: "https://editor-node.tailnet.example.invalid:4173",
        fetchSite: "same-origin",
        tailscaleLogin: "author@example.invalid",
      }),
      accessOptions,
    );
    expect(access).toEqual({ authorized: true, mode: "tailscale" });
  });

  test.each([
    [
      "a non-loopback peer",
      {
        address: "192.0.2.60",
        host: "editor-node.tailnet.example.invalid:4173",
        tailscaleLogin: "author@example.invalid",
      },
    ],
    [
      "a different Tailscale host",
      {
        host: "other-node.tailnet.example.invalid:4173",
        tailscaleLogin: "author@example.invalid",
      },
    ],
    ["a missing Tailscale identity", { host: "editor-node.tailnet.example.invalid:4173" }],
    [
      "a different Tailscale user",
      {
        host: "editor-node.tailnet.example.invalid:4173",
        tailscaleLogin: "other@example.com",
      },
    ],
    ["a missing mutation origin", { method: "POST" }],
    [
      "a cross-origin mutation",
      {
        method: "POST",
        origin: "https://attacker.example",
        fetchSite: "cross-site",
      },
    ],
  ])("denies access from %s", (_name, values) => {
    expect(editorRequestAccess(request(values), accessOptions).authorized).toBe(false);
  });

  test("protects draft content assets with the same editor authorization", () => {
    const serveAsset = contentAssetMiddleware({
      preferDrafts: true,
      ...accessOptions,
    });
    const response = assetResponse();
    serveAsset(
      {
        ...request({ address: "192.0.2.60" }),
        url: "/content-assets/posts/private-draft/photo.png",
      },
      response,
      () => {},
    );
    expect(response.statusCode).toBe(401);
    expect(response.body).toBe("Unauthorized");
    expect(response.headers["Cache-Control"]).toBe("no-store");
  });
});

describe("editor server startup", () => {
  const resolvedUrls = {
    local: ["http://127.0.0.1:4173/"],
    network: [],
  };

  test("uses a stable strict port and loopback-only binding", () => {
    const options = editorServerOptions([], {});
    expect(options).toMatchObject({
      host: "127.0.0.1",
      port: 4173,
      tailscaleHttpsPort: 4173,
      useTailscale: true,
      development: false,
    });
    expect(viteEditorServerOptions(options)).toEqual({
      host: "127.0.0.1",
      port: 4173,
      strictPort: true,
      allowedHosts: [],
    });
  });

  test("uses the same constrained listener for the optimized preview server", () => {
    expect(
      viteEditorPreviewOptions({
        host: "127.0.0.1",
        port: 4173,
        trustedHost: "editor-node.tailnet.example.invalid",
      }),
    ).toEqual({
      host: "127.0.0.1",
      port: 4173,
      strictPort: true,
      allowedHosts: ["editor-node.tailnet.example.invalid"],
    });
  });

  // The editor build reads site content, so without this the editor cannot
  // start at all now that content lives only in D1/R2.
  test("materializes its own snapshot before building", async () => {
    const calls = [];
    const env = {};
    const root = await ensureEditorSnapshot({
      env,
      pull: async (options) => {
        calls.push(options);
        return { root: options.root, itemCount: 3, assetCount: 1, privateCount: 1 };
      },
    });

    expect(root).toBe(EDITOR_SNAPSHOT_ROOT);
    expect(env.CONTENT_SNAPSHOT_ROOT).toBe(EDITOR_SNAPSHOT_ROOT);
    // Published revisions only: the site loader validates everything it reads,
    // so unfinished work in the snapshot fails the editor's own build — and a
    // saved revision is unfinished as readily as a private draft is. Asking for
    // what was published is what keeps a half-written entry from locking the
    // author out of the tool they need to finish it.
    expect(calls).toEqual([{ root: EDITOR_SNAPSHOT_ROOT, includePrivate: false, published: true }]);
  });

  test("keeps a snapshot the caller already chose", async () => {
    const env = { CONTENT_SNAPSHOT_ROOT: "/tmp/chosen-snapshot" };
    const pull = async () => {
      throw new Error("must not pull when a root is already set");
    };

    await expect(ensureEditorSnapshot({ env, pull })).resolves.toBe("/tmp/chosen-snapshot");
  });

  test("development mode is explicit", () => {
    expect(editorServerOptions(["--dev"], {}).development).toBe(true);
  });

  test("allows only the detected Tailscale host through Vite", () => {
    expect(
      viteEditorServerOptions({
        host: "127.0.0.1",
        port: 4173,
        trustedHost: "editor-node.tailnet.example.invalid",
      }),
    ).toEqual({
      host: "127.0.0.1",
      port: 4173,
      strictPort: true,
      allowedHosts: ["editor-node.tailnet.example.invalid"],
    });
  });

  test("prints the stable HTTPS bookmark and local recovery URL without a token", () => {
    const output = editorStartupMessages({
      resolvedUrls,
      publicUrl: "https://editor-node.tailnet.example.invalid:4173/editor",
      tailscaleLogin: "author@example.invalid",
      development: false,
    }).join("\n");
    expect(output).toContain("https://editor-node.tailnet.example.invalid:4173/editor");
    expect(output).toContain("http://127.0.0.1:4173/editor");
    expect(output).toContain("optimized local bundle");
    expect(output).not.toContain("editorToken");
  });

  test("reads the DNS name and login from Tailscale status", () => {
    expect(
      parseTailscaleIdentity({
        BackendState: "Running",
        Self: { DNSName: "editor-node.tailnet.example.invalid.", UserID: 42 },
        User: { 42: { LoginName: "author@example.invalid" } },
      }),
    ).toEqual({
      dnsName: "editor-node.tailnet.example.invalid",
      login: "author@example.invalid",
    });
  });

  test("configures a separate HTTPS listener without changing the existing one", () => {
    expect(tailscaleServeArguments({ httpsPort: 4173, upstreamPort: 4173 })).toEqual([
      "serve",
      "--bg",
      "--yes",
      "--https=4173",
      "http://127.0.0.1:4173",
    ]);
  });

  test("removes only the editor HTTPS listener on shutdown", () => {
    expect(tailscaleServeOffArguments({ httpsPort: 4173 })).toEqual([
      "serve",
      "--bg",
      "--yes",
      "--https=4173",
      "off",
    ]);
  });

  test("the one-time setup grants operator access only to the current username", () => {
    expect(tailscaleOperatorArguments("popyson")).toEqual([
      "tailscale",
      "set",
      "--operator=popyson",
    ]);
    expect(() => tailscaleOperatorArguments("bad user")).toThrow("Unsupported local username");
  });

  test("the stop command only accepts this repository's editor process", () => {
    const root = "/repo/popyson-io";
    expect(isEditorServerProcess("node scripts/editorServer.mjs", root, root)).toBe(true);
    expect(isEditorServerProcess("node scripts/editorServer.mjs", "/repo/other", root)).toBe(false);
    expect(isEditorServerProcess("node unrelatedServer.mjs", root, root)).toBe(false);
  });
});
