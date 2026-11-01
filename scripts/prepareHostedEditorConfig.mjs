import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const WORKER = resolve(ROOT, "workers/editor");

function required(env, name) {
  const value = String(env[name] || "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function httpsOrigin(value, name) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.origin !== value) {
    throw new Error(`${name} must be an exact HTTPS origin without a path`);
  }
  return parsed;
}

export function hostedEditorConfig(env = process.env) {
  const config = JSON.parse(readFileSync(resolve(WORKER, "wrangler.jsonc"), "utf8"));
  env = { ...config.vars, ...env };
  const origin = required(env, "EDITOR_ORIGIN");
  const hostname = httpsOrigin(origin, "EDITOR_ORIGIN").hostname;
  const issuer = required(env, "ACCESS_TEAM_DOMAIN");
  if (!httpsOrigin(issuer, "ACCESS_TEAM_DOMAIN").hostname.endsWith(".cloudflareaccess.com")) {
    throw new Error("ACCESS_TEAM_DOMAIN must be a Cloudflare Access team origin");
  }
  const email = required(env, "EDITOR_EMAIL");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("EDITOR_EMAIL is invalid");
  const contentUrl = required(env, "CONTENT_API_URL");
  httpsOrigin(contentUrl, "CONTENT_API_URL");
  const repository = required(env, "CONTENT_GITHUB_REPOSITORY");
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository))
    throw new Error("CONTENT_GITHUB_REPOSITORY is invalid");
  return {
    ...config,
    main: resolve(WORKER, config.main),
    assets: {
      ...config.assets,
      directory: resolve(WORKER, config.assets.directory),
      run_worker_first: true,
    },
    workers_dev: false,
    preview_urls: false,
    routes: [{ pattern: hostname, custom_domain: true }],
    vars: {
      EDITOR_ORIGIN: origin,
      ACCESS_TEAM_DOMAIN: issuer,
      ACCESS_AUD: required(env, "ACCESS_AUD"),
      EDITOR_EMAIL: email,
      CONTENT_API_URL: contentUrl,
      CONTENT_GITHUB_REPOSITORY: repository,
      CONTENT_GITHUB_REF: String(env.CONTENT_GITHUB_REF || "main"),
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = process.argv[2];
  if (!output) throw new Error("Usage: node scripts/prepareHostedEditorConfig.mjs <output.json>");
  writeFileSync(output, `${JSON.stringify(hostedEditorConfig(), null, 2)}\n`, { mode: 0o600 });
}
