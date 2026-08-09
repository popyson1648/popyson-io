import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createPostScaffold } from "./contentScaffold.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const postsDir = process.env.NEW_POSTS_DIR
  ? resolve(process.env.NEW_POSTS_DIR)
  : resolve(ROOT, "src/content/posts");

const created = createPostScaffold(postsDir, { dateOverride: process.env.NEW_POST_DATE });
console.log(created.id);
console.log(created.dir);
