import { describe, expect, test } from "vitest";

import {
  editorRequestAccess,
  isLoopbackAddress,
  isLoopbackHost,
  isTrustedTailscaleHost,
} from "../scripts/editorApiPlugin.mjs";
import {
  editorServerOptions,
  editorStartupMessages,
  parseTailscaleIdentity,
  tailscaleServeArguments,
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
  trustedHost: "wsl-ubuntu.tail29f20.ts.net",
  tailscaleLogin: "popyson1648@github",
};

describe("editor Tailscale Serve authorization", () => {
  test.each(["127.0.0.1", "127.12.34.56", "::1", "::ffff:127.0.0.1"])(
    "accepts loopback address %s",
    (address) => expect(isLoopbackAddress(address)).toBe(true),
  );

  test.each(["192.168.1.2", "100.91.26.6", "::ffff:192.168.1.2", "not-an-ip"])(
    "rejects non-loopback address %s",
    (address) => expect(isLoopbackAddress(address)).toBe(false),
  );

  test.each(["localhost:4173", "127.0.0.1:4173", "[::1]:4173"])(
    "accepts loopback host %s",
    (host) => expect(isLoopbackHost(host)).toBe(true),
  );

  test("recognizes only the configured Tailscale DNS host", () => {
    expect(
      isTrustedTailscaleHost("wsl-ubuntu.tail29f20.ts.net:4173", "wsl-ubuntu.tail29f20.ts.net"),
    ).toBe(true);
    expect(isTrustedTailscaleHost("other.tail29f20.ts.net:4173", accessOptions.trustedHost)).toBe(
      false,
    );
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
        host: "wsl-ubuntu.tail29f20.ts.net:4173",
        tailscaleLogin: "popyson1648@github",
      }),
      accessOptions,
    );
    expect(access).toEqual({ authorized: true, mode: "tailscale" });
  });

  test("allows same-origin HTTPS mutations through Serve", () => {
    const access = editorRequestAccess(
      request({
        host: "wsl-ubuntu.tail29f20.ts.net:4173",
        method: "POST",
        origin: "https://wsl-ubuntu.tail29f20.ts.net:4173",
        fetchSite: "same-origin",
        tailscaleLogin: "popyson1648@github",
      }),
      accessOptions,
    );
    expect(access).toEqual({ authorized: true, mode: "tailscale" });
  });

  test.each([
    [
      "a non-loopback peer",
      {
        address: "100.91.26.6",
        host: "wsl-ubuntu.tail29f20.ts.net:4173",
        tailscaleLogin: "popyson1648@github",
      },
    ],
    [
      "a different Tailscale host",
      { host: "other.tail29f20.ts.net:4173", tailscaleLogin: "popyson1648@github" },
    ],
    ["a missing Tailscale identity", { host: "wsl-ubuntu.tail29f20.ts.net:4173" }],
    [
      "a different Tailscale user",
      { host: "wsl-ubuntu.tail29f20.ts.net:4173", tailscaleLogin: "other@example.com" },
    ],
    ["a missing mutation origin", { method: "POST" }],
    [
      "a cross-origin mutation",
      { method: "POST", origin: "https://attacker.example", fetchSite: "cross-site" },
    ],
  ])("denies access from %s", (_name, values) => {
    expect(editorRequestAccess(request(values), accessOptions).authorized).toBe(false);
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
        trustedHost: "wsl-ubuntu.tail29f20.ts.net",
      }),
    ).toEqual({
      host: "127.0.0.1",
      port: 4173,
      strictPort: true,
      allowedHosts: ["wsl-ubuntu.tail29f20.ts.net"],
    });
  });

  test("development mode is explicit", () => {
    expect(editorServerOptions(["--dev"], {}).development).toBe(true);
  });

  test("allows only the detected Tailscale host through Vite", () => {
    expect(
      viteEditorServerOptions({
        host: "127.0.0.1",
        port: 4173,
        trustedHost: "wsl-ubuntu.tail29f20.ts.net",
      }),
    ).toEqual({
      host: "127.0.0.1",
      port: 4173,
      strictPort: true,
      allowedHosts: ["wsl-ubuntu.tail29f20.ts.net"],
    });
  });

  test("prints the stable HTTPS bookmark and local recovery URL without a token", () => {
    const output = editorStartupMessages({
      resolvedUrls,
      publicUrl: "https://wsl-ubuntu.tail29f20.ts.net:4173/editor",
      tailscaleLogin: "popyson1648@github",
      development: false,
    }).join("\n");
    expect(output).toContain("https://wsl-ubuntu.tail29f20.ts.net:4173/editor");
    expect(output).toContain("http://127.0.0.1:4173/editor");
    expect(output).toContain("optimized local bundle");
    expect(output).not.toContain("editorToken");
  });

  test("reads the DNS name and login from Tailscale status", () => {
    expect(
      parseTailscaleIdentity({
        BackendState: "Running",
        Self: { DNSName: "wsl-ubuntu.tail29f20.ts.net.", UserID: 42 },
        User: { 42: { LoginName: "popyson1648@github" } },
      }),
    ).toEqual({
      dnsName: "wsl-ubuntu.tail29f20.ts.net",
      login: "popyson1648@github",
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
