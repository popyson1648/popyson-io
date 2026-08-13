import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";

import { parse as parseToml } from "smol-toml";

import { ContentCloudClient } from "./contentCloudClient.mjs";
import { parseMarkdownFrontmatter } from "./frontmatter.mjs";

const CONTENT_KINDS = new Set(["post", "work", "about"]);
const SHA256_RE = /^[a-f0-9]{64}$/;

function checksum(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireAbsoluteRoot(root) {
  if (!isAbsolute(root)) throw new Error("Snapshot root must be an absolute path");
  const value = resolve(root);
  mkdirSync(value, { recursive: true });
  return value;
}

function safeRelativePath(value, label) {
  const normalized = String(value || "").replaceAll("\\", "/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`${label} is not a safe relative path`);
  }
  return normalized;
}

function safeDestination(root, relativePath) {
  const destination = resolve(root, safeRelativePath(relativePath, "Snapshot path"));
  if (!destination.startsWith(`${root}${sep}`)) {
    throw new Error("Snapshot path escapes the isolated root");
  }
  return destination;
}

function itemDirectory(root, item) {
  if (!CONTENT_KINDS.has(item?.kind)) throw new Error("Snapshot item kind is invalid");
  const id = String(item.id || item.slug || "");
  const valid =
    (item.kind === "post" && /^\d{8}-(?:\d{6}|[a-f0-9]{8})$/.test(id)) ||
    (item.kind === "work" && /^[a-z0-9][a-z0-9-]*$/.test(id)) ||
    (item.kind === "about" && id === "about");
  if (!valid) throw new Error("Snapshot item id is invalid");
  const segment = item.kind === "post" ? "posts" : item.kind === "work" ? "works" : "about";
  return {
    id,
    directory:
      item.kind === "about"
        ? join(root, "src/content/about")
        : join(root, `src/content/${segment}`, id),
  };
}

function writeSourceFiles(root, entry) {
  const { item, revision } = entry;
  if (!revision || typeof revision.sourceJa !== "string" || typeof revision.sourceEn !== "string") {
    throw new Error("Snapshot revision sources are missing");
  }
  const target = itemDirectory(root, item);
  mkdirSync(target.directory, { recursive: true });
  if (item.kind === "about") {
    for (const [locale, source] of [
      ["ja", revision.sourceJa],
      ["en", revision.sourceEn],
    ]) {
      let bundle;
      try {
        bundle = JSON.parse(source);
      } catch {
        throw new Error(`About ${locale} source is not a serialized TOML bundle`);
      }
      if (typeof bundle?.about !== "string" || typeof bundle?.news !== "string") {
        throw new Error(`About ${locale} source bundle is incomplete`);
      }
      writeFileSync(join(target.directory, `about.${locale}.toml`), bundle.about);
      writeFileSync(join(target.directory, `news.${locale}.toml`), bundle.news);
    }
  } else {
    writeFileSync(join(target.directory, "index.ja.md"), revision.sourceJa);
    writeFileSync(join(target.directory, "index.en.md"), revision.sourceEn);
  }
  return target;
}

function assetDestination(root, entry, asset) {
  const logicalPath = safeRelativePath(asset.logicalPath, "Asset logicalPath");
  if (logicalPath.startsWith("thumbnails/") || logicalPath.startsWith("content-assets/")) {
    return safeDestination(root, `public/${logicalPath}`);
  }
  const { directory } = itemDirectory(root, entry.item);
  const name = logicalPath.startsWith("assets/")
    ? logicalPath.slice("assets/".length)
    : logicalPath;
  if (name !== basename(name)) throw new Error("Item asset path must contain only one filename");
  return safeDestination(directory, `assets/${name}`);
}

function snapshotEntries(snapshot) {
  if (Array.isArray(snapshot?.items)) {
    return snapshot.items.map((entry) => ({
      item: entry.item || entry,
      revision: entry.revision,
      assets: entry.assets || [],
    }));
  }
  if (snapshot?.item && snapshot?.revision) {
    return [{ item: snapshot.item, revision: snapshot.revision, assets: snapshot.assets || [] }];
  }
  throw new Error("Content API returned an unsupported snapshot shape");
}

export async function publicationInputSnapshot(jobSnapshot, client = new ContentCiClient()) {
  const releaseId = String(jobSnapshot.job?.releaseId || "");
  if (!releaseId) {
    return { snapshot: jobSnapshot, resumed: false, codeSha: "" };
  }
  if (jobSnapshot.candidate?.revision) {
    const releaseSnapshot = await client.releaseSnapshot(releaseId);
    return {
      snapshot: {
        job: jobSnapshot.job,
        item: jobSnapshot.item,
        revision: jobSnapshot.candidate.revision,
        assets: jobSnapshot.candidate.assets || [],
      },
      resumed: true,
      codeSha: String(releaseSnapshot.release?.codeSha || ""),
    };
  }
  // Compatibility for a public candidate returned by an older Worker that did
  // not yet include `candidate` on the job snapshot. Private/deleted candidates
  // cannot use this fallback because they are intentionally absent from the
  // release manifest; current Workers always return the exact candidate above.
  const releaseSnapshot = await client.releaseSnapshot(releaseId);
  const itemId = String(jobSnapshot.job?.itemId || "");
  const entry = snapshotEntries(releaseSnapshot).find(
    (candidate) => String(candidate.item?.itemId || "") === itemId,
  );
  if (!entry) throw new Error("Candidate release does not contain the publication item");
  return {
    snapshot: { job: jobSnapshot.job, ...entry },
    resumed: true,
    codeSha: String(releaseSnapshot.release?.codeSha || ""),
  };
}

export class ContentCiClient extends ContentCloudClient {
  running(jobId, githubRunId) {
    return this.request(`/v1/ci/jobs/${encodeURIComponent(jobId)}/running`, {
      method: "POST",
      json: { githubRunId },
    });
  }

  jobSnapshot(jobId) {
    return this.request(`/v1/ci/jobs/${encodeURIComponent(jobId)}/snapshot`);
  }

  activeReleaseSnapshot() {
    return this.request("/v1/ci/releases/active/snapshot");
  }

  releaseSnapshot(releaseId) {
    return this.request(`/v1/ci/releases/${encodeURIComponent(releaseId)}/snapshot`);
  }

  candidate(jobId, value) {
    return this.request(`/v1/ci/jobs/${encodeURIComponent(jobId)}/candidate`, {
      method: "POST",
      json: value,
    });
  }

  deploying(jobId, releaseId) {
    return this.request(`/v1/ci/jobs/${encodeURIComponent(jobId)}/deploying`, {
      method: "POST",
      json: { releaseId },
    });
  }

  finalize(jobId, releaseId, pagesDeploymentId) {
    return this.request(`/v1/ci/jobs/${encodeURIComponent(jobId)}/finalize`, {
      method: "POST",
      json: { releaseId, pagesDeploymentId },
    });
  }

  fail(jobId, sanitizedError) {
    return this.request(`/v1/ci/jobs/${encodeURIComponent(jobId)}/fail`, {
      method: "POST",
      json: { sanitizedError },
    });
  }

  pendingReleases() {
    return this.request("/v1/ci/releases/pending");
  }

  reconcile(releaseId, pagesDeploymentId) {
    return this.request("/v1/ci/releases/reconcile", {
      method: "POST",
      json: { releaseId, pagesDeploymentId },
    });
  }

  async downloadAsset(assetId) {
    if (!SHA256_RE.test(assetId)) throw new Error("Asset id is not a SHA-256 checksum");
    return this.requestBytes(`/v1/ci/assets/${assetId}`);
  }

  uploadAsset(assetId, bytes, mediaType) {
    if (!SHA256_RE.test(assetId)) throw new Error("Asset id is not a SHA-256 checksum");
    return this.request(`/v1/ci/assets/${assetId}`, {
      method: "PUT",
      body: bytes,
      headers: {
        "content-length": String(bytes.byteLength),
        "content-type": mediaType || "application/octet-stream",
      },
    });
  }
}

/**
 * Write a snapshot's sources and assets under `root`.
 *
 * Only asset download is asked of the client, so the author-side client can
 * serve local pulls just as the CI client serves the workflows.
 *
 * @param {unknown} snapshot
 * @param {string} root
 * @param {{ client?: { downloadAsset(assetId: string): Promise<ArrayBufferLike> } }} [options]
 */
export async function materializeSnapshot(snapshot, root, { client = new ContentCiClient() } = {}) {
  const snapshotRoot = requireAbsoluteRoot(root);
  const entries = snapshotEntries(snapshot);
  const destinations = new Set();
  let assetCount = 0;
  for (const entry of entries) {
    writeSourceFiles(snapshotRoot, entry);
    for (const asset of entry.assets) {
      const assetId = String(asset.id || asset.assetId || asset.checksumSha256 || "");
      const expectedSize = Number(asset.sizeBytes);
      if (!SHA256_RE.test(assetId) || !Number.isSafeInteger(expectedSize) || expectedSize < 1) {
        throw new Error("Snapshot asset descriptor is invalid");
      }
      const destination = assetDestination(snapshotRoot, entry, asset);
      if (destinations.has(destination))
        throw new Error("Snapshot contains a duplicate asset path");
      destinations.add(destination);
      const bytes = Buffer.from(await client.downloadAsset(assetId));
      if (bytes.byteLength !== expectedSize || checksum(bytes) !== assetId) {
        throw new Error("Downloaded asset failed size or checksum verification");
      }
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, bytes, { flag: "wx" });
      assetCount += 1;
    }
  }
  return { itemCount: entries.length, assetCount };
}

function revisionFromRoot(root, snapshot) {
  const [entry] = snapshotEntries(snapshot);
  if (!entry || snapshotEntries(snapshot).length !== 1) {
    throw new Error("A publication candidate must contain exactly one pinned item");
  }
  const target = itemDirectory(root, entry.item);
  const files = {};
  let sourceJa;
  let sourceEn;
  if (entry.item.kind === "about") {
    const bundles = {};
    for (const locale of ["ja", "en"]) {
      const about = readFileSync(join(target.directory, `about.${locale}.toml`), "utf8");
      const news = readFileSync(join(target.directory, `news.${locale}.toml`), "utf8");
      const aboutData = parseToml(about);
      const newsData = parseToml(news);
      files[locale] = {
        meta: {
          person: aboutData.person || {},
          newsConfig: aboutData.news || {},
          newsItems: newsData.news || [],
        },
        body: "",
      };
      bundles[locale] = JSON.stringify({ about, news });
    }
    sourceJa = bundles.ja;
    sourceEn = bundles.en;
  } else {
    sourceJa = readFileSync(join(target.directory, "index.ja.md"), "utf8");
    sourceEn = readFileSync(join(target.directory, "index.en.md"), "utf8");
    for (const [locale, source] of [
      ["ja", sourceJa],
      ["en", sourceEn],
    ]) {
      const parsed = parseMarkdownFrontmatter(source, `${entry.item.kind}/${target.id}/${locale}`, {
        validate: false,
      });
      files[locale] = { meta: parsed.meta, body: parsed.body };
    }
  }
  return {
    entry,
    revision: {
      sourceJa,
      sourceEn,
      documents: { files },
      metadata: entry.revision.metadata || {},
      expectedRevisionId: entry.revision.id,
      createdBy: "github-actions",
    },
  };
}

const MEDIA_TYPES = new Map([
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

function fileExtension(filePath) {
  const match = /\.[^.]+$/.exec(filePath);
  return match?.[0].toLowerCase() || "";
}

function candidateAssetFiles(root, entry) {
  const files = [];
  const logicalPaths = new Set();
  for (const asset of entry.assets) {
    const logicalPath = safeRelativePath(asset.logicalPath, "Asset logicalPath");
    files.push({
      filePath: assetDestination(root, entry, asset),
      logicalPath,
      role: String(asset.role || "body"),
      mediaType: String(asset.mediaType || "application/octet-stream"),
    });
    logicalPaths.add(logicalPath);
  }
  const visit = (directory, logicalPrefix, role) => {
    if (!existsSync(directory)) return;
    for (const child of readdirSync(directory, { withFileTypes: true })) {
      if (!child.isFile()) continue;
      const mediaType = MEDIA_TYPES.get(fileExtension(child.name));
      if (!mediaType) throw new Error("Candidate contains an unsupported asset type");
      const logicalPath = `${logicalPrefix}${child.name}`;
      if (logicalPaths.has(logicalPath)) continue;
      files.push({
        filePath: join(directory, child.name),
        logicalPath,
        role,
        mediaType,
      });
      logicalPaths.add(logicalPath);
    }
  };
  visit(join(root, "public/thumbnails"), "thumbnails/", "thumbnail");
  return files;
}

export async function createCandidate(
  jobId,
  root,
  codeSha,
  { client = new ContentCiClient() } = {},
) {
  const snapshotRoot = requireAbsoluteRoot(root);
  const snapshot = await client.jobSnapshot(jobId);
  const { entry, revision } = revisionFromRoot(snapshotRoot, snapshot);
  const assets = [];
  for (const asset of candidateAssetFiles(snapshotRoot, entry)) {
    const bytes = readFileSync(asset.filePath);
    const assetId = checksum(bytes);
    await client.uploadAsset(assetId, bytes, asset.mediaType);
    assets.push({ assetId, logicalPath: asset.logicalPath, role: asset.role });
  }
  return client.candidate(jobId, { codeSha, revision, assets });
}

export function sanitizedSnapshotMetadata(snapshot, { resumed = false, codeSha = "" } = {}) {
  const entries = snapshotEntries(snapshot);
  return {
    jobId: String(snapshot.job?.id || ""),
    releaseId: String(snapshot.release?.id || snapshot.job?.releaseId || ""),
    resumed,
    codeSha,
    itemCount: entries.length,
    kind: entries.length === 1 ? String(entries[0].item.kind || "") : "",
    databaseDate: entries.length === 1 ? String(entries[0].item.createdAt || "").slice(0, 10) : "",
  };
}
