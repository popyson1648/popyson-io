import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseMarkdownFrontmatter } from "./frontmatter.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const POSTS_PREFIX = "src/content/posts/";
const POST_PATH_RE = /^src\/content\/posts\/(\d{8}-[a-f0-9]{8})\//;
// Keep the subject inside the usual git limit; the body carries the full list.
const SUBJECT_LIMIT = 72;

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

// Post ids with any staged, unstaged, or untracked change under their directory.
function changedPostIds() {
  const output = tryGit(["status", "--porcelain", "-uall", "--", POSTS_PREFIX]);
  const ids = new Set();
  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    // "XY path", and "XY old -> new" once a file has been renamed.
    const path = line.slice(3).split(" -> ").at(-1).replace(/^"|"$/g, "");
    const match = POST_PATH_RE.exec(path);
    if (match) ids.add(match[1]);
  }
  return [...ids].sort();
}

// A post is added when git tracks nothing under it yet, and removed once its
// files are gone from the working tree. Anything else is an edit.
function classify(id) {
  const tracked = tryGit(["ls-files", "--", `${POSTS_PREFIX}${id}`]);
  if (!tracked) return "added";
  if (!existsSync(join(ROOT, POSTS_PREFIX, id, "index.ja.md"))) return "removed";
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

function postTitle(id, state) {
  const relative = `${POSTS_PREFIX}${id}/index.ja.md`;
  if (state === "removed") {
    const source = tryGit(["show", `HEAD:${relative}`]);
    return titleFromSource(source, relative) || id;
  }
  const file = join(ROOT, relative);
  if (!existsSync(file)) return id;
  return titleFromSource(readFileSync(file, "utf8"), relative) || id;
}

function subjectClause(verb, posts) {
  if (posts.length === 1) return `${verb} post "${posts[0].title}"`;
  return `${verb} ${posts.length} posts`;
}

export function commitMessage(posts) {
  const groups = [
    ["add", posts.filter((post) => post.state === "added")],
    ["update", posts.filter((post) => post.state === "updated")],
    ["remove", posts.filter((post) => post.state === "removed")],
  ].filter(([, group]) => group.length > 0);

  const clauses = groups.map(([verb, group]) => subjectClause(verb, group));
  let subject = `chore(content): ${clauses.join(", ")}`;
  if (subject.length > SUBJECT_LIMIT) {
    // Fall back to counts only; the body still names every post.
    subject = `chore(content): ${groups
      .map(([verb, group]) => `${verb} ${group.length} post${group.length === 1 ? "" : "s"}`)
      .join(", ")}`;
  }

  const verbs = { added: "add", updated: "update", removed: "remove" };
  const body = posts.map((post) => `- ${verbs[post.state]}: ${post.title} (${post.id})`).join("\n");
  return posts.length === 1 ? subject : `${subject}\n\n${body}`;
}

function pushArgs() {
  if (tryGit(["rev-parse", "--abbrev-ref", "@{u}"])) return ["push"];
  return ["push", "-u", "origin", git(["rev-parse", "--abbrev-ref", "HEAD"])];
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const ids = changedPostIds();
  if (ids.length === 0) {
    console.log("No post changes under src/content/posts/.");
    return;
  }

  const posts = ids.map((id) => {
    const state = classify(id);
    return { id, state, title: postTitle(id, state) };
  });
  const message = commitMessage(posts);

  if (dryRun) {
    console.log(message);
    return;
  }

  git(["add", "--all", "--", POSTS_PREFIX]);
  // `git add` on a reverted edit can leave nothing staged.
  if (!tryGit(["diff", "--cached", "--name-only", "--", POSTS_PREFIX])) {
    console.log("Nothing staged after add; working tree matches HEAD.");
    return;
  }

  execFileSync("git", ["commit", "-m", message], { cwd: ROOT, stdio: "inherit" });
  execFileSync("git", pushArgs(), { cwd: ROOT, stdio: "inherit" });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
