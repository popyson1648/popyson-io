import { describe, expect, test } from "vitest";
import { hostedEditorConfig } from "../scripts/prepareHostedEditorConfig.mjs";
const env = {
  EDITOR_ORIGIN: "https://editor.example.com",
  ACCESS_TEAM_DOMAIN: "https://example.cloudflareaccess.com",
  ACCESS_AUD: "audience",
  EDITOR_EMAIL: "owner@example.com",
  CONTENT_API_URL: "https://content.example.com",
  CONTENT_GITHUB_REPOSITORY: "example/site",
};
describe("hosted deployment configuration", () => {
  test("protects every asset route and excludes secrets from generated config", () => {
    const config = hostedEditorConfig({ ...env, CONTENT_GITHUB_TOKEN: "test-secret" });
    expect(config.assets.run_worker_first).toBe(true);
    expect(config.workers_dev).toBe(false);
    expect(config.preview_urls).toBe(false);
    expect(config.routes).toEqual([{ pattern: "editor.example.com", custom_domain: true }]);
    expect(JSON.stringify(config)).not.toContain("test-secret");
  });
  test.each(Object.keys(env))("requires %s", (name) => {
    expect(() => hostedEditorConfig({ ...env, [name]: "" })).toThrow();
  });
  test.each([
    "http://editor.example.com",
    "https://editor.example.com/path",
    "https://user:password@editor.example.com",
  ])("rejects unsafe origin %s", (origin) => {
    expect(() => hostedEditorConfig({ ...env, EDITOR_ORIGIN: origin })).toThrow();
  });
});
