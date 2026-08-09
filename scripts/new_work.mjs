import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createWorkScaffold } from "./contentScaffold.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const worksDir = process.env.NEW_WORKS_DIR
  ? resolve(process.env.NEW_WORKS_DIR)
  : resolve(ROOT, "src/content/works");
const slug = process.argv[2];

if (!slug) {
  console.error("Usage: npm run new:work -- <slug>");
  process.exitCode = 1;
} else {
  try {
    const created = createWorkScaffold(worksDir, slug);
    console.log(created.id);
    console.log(created.dir);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
