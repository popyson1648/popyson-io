import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const POSTS_DIR = process.env.NEW_POSTS_DIR
  ? resolve(process.env.NEW_POSTS_DIR)
  : join(ROOT, "src/content/posts");

function todayStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function newPostId() {
  const date = process.env.NEW_POST_DATE || todayStamp();
  for (let i = 0; i < 256; i += 1) {
    const id = `${date}-${randomBytes(4).toString("hex")}`;
    if (!existsSync(join(POSTS_DIR, id))) return id;
  }
  throw new Error("Could not generate a collision-free post ID");
}

function markdownTemplate(locale) {
  const title = locale === "ja" ? "新しい記事" : "New Post";
  const summary = locale === "ja" ? "記事の概要を書く。" : "Write a short summary.";
  return `+++
title = "${title}"
date = "${new Date().toISOString().slice(0, 10)}"
reading = 1
tags = []
kana = ""
summary = "${summary}"
+++

## ${locale === "ja" ? "見出し" : "Heading"}

${locale === "ja" ? "本文を書く。" : "Write the body."}
`;
}

function main() {
  mkdirSync(POSTS_DIR, { recursive: true });
  const id = newPostId();
  const dir = join(POSTS_DIR, id);
  mkdirSync(join(dir, "assets"), { recursive: true });
  writeFileSync(join(dir, "index.ja.md"), markdownTemplate("ja"));
  writeFileSync(join(dir, "index.en.md"), markdownTemplate("en"));
  console.log(id);
  console.log(dir);
}

main();
