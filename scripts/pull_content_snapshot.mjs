/* Materialize a content snapshot for local work.
 *
 * Articles, works, and About live in D1/R2, so `npm run dev`, `npm run build`,
 * and scripts/verify.py all need a tree to read. The publication and deploy
 * workflows download a release; a person runs this instead.
 *
 * It reads the author view at its current revisions, so a saved edit shows up
 * before it is published. Private drafts stay out by default: they are
 * unfinished by definition — a draft with an empty English title is normal —
 * and pulling them in would fail verification for no useful reason. Ask for
 * them with --include-private when the point is to preview one.
 *
 * `--published` reads each item at the revision it was last published at
 * instead, and leaves out anything never published. That is the state the site
 * actually serves, and unlike a current revision it is known to load: nothing
 * reaches it without passing the publication checks.
 *
 *   npm run content:pull                      # writes .tmp/content-snapshot
 *   npm run content:pull -- --include-private # drafts too
 *   npm run content:pull -- --published       # the state the site serves
 *   npm run content:pull -- --root /elsewhere
 */
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ContentCloudClient } from "./contentCloudClient.mjs";
import { materializeSnapshot } from "./contentSnapshotClient.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_ROOT = resolve(ROOT, ".tmp/content-snapshot");

function parseArgs(argv) {
  const args = { root: DEFAULT_ROOT, includePrivate: false, published: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      const value = argv[index + 1];
      if (!value) throw new Error("--root needs a path");
      args.root = resolve(value);
      index += 1;
    } else if (arg === "--include-private") {
      args.includePrivate = true;
    } else if (arg === "--published") {
      args.published = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

// materializeSnapshot downloads each asset through the client it is given, so
// the author client only has to expose the same method name the CI client uses.
export class AuthorSnapshotClient extends ContentCloudClient {
  async downloadAsset(assetId) {
    const response = await this.getAsset(assetId);
    return response.arrayBuffer();
  }
}

/**
 * Write a snapshot of the author's content under `root`.
 *
 * @param {{
 *   root?: string,
 *   includePrivate?: boolean,
 *   published?: boolean,
 *   client?: InstanceType<typeof AuthorSnapshotClient>,
 * }} [options]
 */
export async function pullContentSnapshot({
  root = DEFAULT_ROOT,
  includePrivate = false,
  published = false,
  client = new AuthorSnapshotClient(),
} = {}) {
  const { items } = await client.list();
  const wanted = items
    .filter((item) => !item.deletedAt && (includePrivate || item.visibility === "public"))
    // Never published means there is no published revision to read.
    .filter((item) => !published || item.publishedRevisionId);

  const entries = [];
  for (const item of wanted) {
    const content = published
      ? await client.readRevision(item.kind, item.id, item.publishedRevisionId)
      : await client.read(item.kind, item.id);
    entries.push({
      item: { kind: item.kind, id: item.id },
      revision: content.revision,
      assets: content.assets || [],
    });
  }

  // A snapshot root must describe exactly one state, so start from an empty
  // tree rather than layering this pull over whatever a previous one left.
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  const { itemCount, assetCount } = await materializeSnapshot({ items: entries }, root, { client });
  const privateCount = wanted.filter((item) => item.visibility !== "public").length;
  return { root, itemCount, assetCount, privateCount };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { root, itemCount, assetCount, privateCount } = await pullContentSnapshot(args);
  process.stdout.write(
    `Wrote ${itemCount} items (${privateCount} private) and ${assetCount} assets.\n\n` +
      `export CONTENT_SNAPSHOT_ROOT=${root}\n`,
  );
}

// Only the CLI entry runs the pull; importers get the function.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
