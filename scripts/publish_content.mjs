import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseMarkdownFrontmatter } from "./frontmatter.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
// Keep the subject inside the usual git limit; the body carries the full list.
const SUBJECT_LIMIT = 72;

// Posts are addressed by a date-and-hash id, works by a slug. Everything else
// about publishing them is the same, so the kind only carries what differs.
export const KINDS = {
  post: {
    noun: "post",
    prefix: "src/content/posts/",
    idPattern: /^src\/content\/posts\/(\d{8}-[a-f0-9]{8})\//,
  },
  work: {
    noun: "work",
    prefix: "src/content/works/",
    idPattern: /^src\/content\/works\/([a-z0-9][a-z0-9-]*)\//,
  },
};

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function tryGit(args) {
  try {
    return git(args);
  } catch {
    return "";
  }
}

// Unlike git(), keeps the output verbatim. `git status --porcelain` carries the
// index status in column 1 and the worktree status in column 2, so an unstaged
// edit begins with a space; trimming would shift every such line left by one
// and the path would never match.
function gitVerbatim(args) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });
  } catch {
    return "";
  }
}

export function contentIdsFromStatus(output, idPattern) {
  const ids = new Set();
  for (const line of String(output).split("\n")) {
    // "XY path", and "XY old -> new" once a file has been renamed.
    if (line.length < 4) continue;
    const path = line.slice(3).split(" -> ").at(-1).replace(/^"|"$/g, "");
    const match = idPattern.exec(path);
    if (match) ids.add(match[1]);
  }
  return [...ids].sort();
}

// Ids with any staged, unstaged, or untracked change under their directory.
function changedIds(kind) {
  const output = gitVerbatim(["status", "--porcelain", "-uall", "--", kind.prefix]);
  return contentIdsFromStatus(output, kind.idPattern);
}

// An entry is added when the last commit knew nothing about it, and removed
// once its files are gone from the working tree. Anything else is an edit. This
// reads HEAD rather than the index, so staging beforehand (or `git rm`) does
// not change how it is described.
function classify(id, kind) {
  const inHead = tryGit(["ls-tree", "-r", "--name-only", "HEAD", "--", `${kind.prefix}${id}`]);
  if (!inHead) return "added";
  if (!existsSync(join(ROOT, kind.prefix, id, "index.ja.md"))) return "removed";
  return "updated";
}

function titleFromSource(source, filePath) {
  try {
    // Front matter of a new post still holds unresolved metadata, so read it
    // without schema validation.
    return parseMarkdownFrontmatter(source, filePath, { validate: false }).meta.title || "";
  } catch {
    return "";
  }
}

function entryTitle(id, state, kind) {
  const relative = `${kind.prefix}${id}/index.ja.md`;
  if (state === "removed") {
    const source = tryGit(["show", `HEAD:${relative}`]);
    return titleFromSource(source, relative) || id;
  }
  const file = join(ROOT, relative);
  if (!existsSync(file)) return id;
  return titleFromSource(readFileSync(file, "utf8"), relative) || id;
}

function plural(noun, count) {
  return count === 1 ? noun : `${noun}s`;
}

function subjectClause(verb, entries, noun) {
  if (entries.length === 1) return `${verb} ${noun} "${entries[0].title}"`;
  return `${verb} ${entries.length} ${plural(noun, entries.length)}`;
}

export function commitMessage(entries, noun = "post") {
  const groups = [
    ["add", entries.filter((entry) => entry.state === "added")],
    ["update", entries.filter((entry) => entry.state === "updated")],
    ["remove", entries.filter((entry) => entry.state === "removed")],
  ].filter(([, group]) => group.length > 0);

  const clauses = groups.map(([verb, group]) => subjectClause(verb, group, noun));
  let subject = `chore(content): ${clauses.join(", ")}`;
  let droppedTitles = false;
  if (subject.length > SUBJECT_LIMIT) {
    droppedTitles = true;
    subject = `chore(content): ${groups
      .map(([verb, group]) => `${verb} ${group.length} ${plural(noun, group.length)}`)
      .join(", ")}`;
  }

  const verbs = { added: "add", updated: "update", removed: "remove" };
  const body = entries
    .map((entry) => `- ${verbs[entry.state]}: ${entry.title} (${entry.id})`)
    .join("\n");
  // The body carries the titles the subject could not: every title once there
  // are several entries, and the one title a long subject had to drop.
  const needsBody = entries.length > 1 || droppedTitles;
  return needsBody ? `${subject}\n\n${body}` : subject;
}

// Always name the remote and the destination ref, so `push.default` and any
// `remote.<name>.push` refspec cannot widen what gets sent.
function pushArgs() {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const remote = tryGit(["config", `branch.${branch}.remote`]);
  const upstreamRef = tryGit(["config", `branch.${branch}.merge`]);
  if (remote && upstreamRef) return ["push", remote, `HEAD:${upstreamRef}`];
  return ["push", "-u", "origin", `HEAD:refs/heads/${branch}`];
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const kindName = args.find((arg) => !arg.startsWith("--")) || "post";
  const kind = KINDS[kindName];
  if (!kind) {
    console.error(`Unknown content kind: ${kindName}. Expected one of ${Object.keys(KINDS)}.`);
    process.exitCode = 1;
    return;
  }

  const ids = changedIds(kind);
  if (ids.length === 0) {
    console.log(`No ${kind.noun} changes under ${kind.prefix}.`);
    return;
  }

  const entries = ids.map((id) => {
    const state = classify(id, kind);
    return { id, state, title: entryTitle(id, state, kind) };
  });
  const message = commitMessage(entries, kind.noun);

  if (dryRun) {
    console.log(message);
    return;
  }

  git(["add", "--all", "--", kind.prefix]);
  const staged = tryGit(["diff", "--cached", "--name-only"]).split("\n").filter(Boolean);
  if (staged.length === 0) {
    console.log("Nothing staged after add; working tree matches HEAD.");
    return;
  }
  // `git commit` records the whole index, so anything staged earlier would ride
  // along in a commit that claims to be about this content kind.
  const outside = staged.filter((path) => !path.startsWith(kind.prefix));
  if (outside.length > 0) {
    console.error(`Staged changes outside ${kind.prefix}:`);
    for (const path of outside) console.error(`  ${path}`);
    console.error("Unstage them (git restore --staged <path>) and run again.");
    process.exitCode = 1;
    return;
  }

  execFileSync("git", ["commit", "-m", message], { cwd: ROOT, stdio: "inherit" });
  execFileSync("git", pushArgs(), { cwd: ROOT, stdio: "inherit" });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
