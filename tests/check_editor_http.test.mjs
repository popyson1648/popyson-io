import { createServer } from "node:http";
import { once } from "node:events";
import { describe, expect, test } from "vitest";
import { editorApiPlugin } from "../scripts/editorApiPlugin.mjs";

async function serverFor(cloudClient) {
  let middleware;
  editorApiPlugin({ enabled: true, cloudClient, workflowClient: {} }).configureServer({
    middlewares: {
      use(value) {
        middleware = value;
      },
    },
  });
  const server = createServer((request, response) =>
    middleware(request, response, () => {
      response.statusCode = 404;
      response.end();
    }),
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  };
}

describe("local editor HTTP adapter", () => {
  test("uses shared routes for reads and bounded JSON requests while enforcing origin", async () => {
    const server = await serverFor({ list: async () => ({ items: [] }) });
    try {
      const listed = await fetch(`${server.origin}/api/editor/content`);
      expect(listed.status).toBe(200);
      expect(await listed.json()).toEqual({ items: [] });
      const preview = await fetch(`${server.origin}/api/editor/preview`, {
        method: "POST",
        headers: { origin: server.origin, "content-type": "application/json" },
        body: JSON.stringify({ markdown: "## Local preview", locale: "en" }),
      });
      expect(preview.status).toBe(200);
      expect((await preview.json()).html).toContain("Local preview");
      const invalid = await fetch(`${server.origin}/api/editor/preview`, {
        method: "POST",
        headers: { origin: server.origin },
        body: "{",
      });
      expect(invalid.status).toBe(400);
      const denied = await fetch(`${server.origin}/api/editor/preview`, {
        method: "POST",
        headers: { origin: "https://attacker.example" },
        body: "{}",
      });
      expect(denied.status).toBe(401);
    } finally {
      await server.close();
    }
  });
});
