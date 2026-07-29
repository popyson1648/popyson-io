import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const WORKS_DIR = process.env.NEW_WORKS_DIR
  ? resolve(process.env.NEW_WORKS_DIR)
  : join(ROOT, "src/content/works");
// The slug becomes the URL segment, so it stays lowercase and hyphenated.
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

// Drafting aid only: the comment block describes the fields for whoever writes
// the work next.
// year, stack, thumbnail and hero are read from the Japanese file, so only that
// one carries them. Writing them into the English file too would offer edits
// that never reach the page.
const TEMPLATE_TEXT = {
  ja: {
    fields: [
      "title      作品名。必須、空文字不可",
      "tagline    一覧カードと詳細ページの見出し下に出る一行説明",
      "summary    一覧カードに出る説明文",
      "year       公開年。必須",
      "stack      使用技術。一覧と詳細にチップで並ぶ",
      "thumbnail  一覧カードの画像。public/ からのパス。空ならプレースホルダ",
      "hero       詳細ページの大きな画像。public/ からのパス。空ならプレースホルダ",
    ],
  },
  en: {
    fields: [
      "title      Work name. Required, must not be empty",
      "tagline    One line shown on the index card and under the detail heading",
      "summary    Description shown on the index card",
      "",
      "year, stack, thumbnail and hero are taken from index.ja.md.",
    ],
  },
};

// Only defaults, matching new_post.mjs: the author fills in every value.
function markdownTemplate(locale, slug, year) {
  const text = TEMPLATE_TEXT[locale];
  const fields = text.fields.map((field) => (field ? `# ${field}` : "#")).join("\n");
  const shared = locale === "ja" ? `year = ${year}\nstack = []\nthumbnail = ""\nhero = ""\n` : "";
  return `+++
${fields}

title = ""
tagline = ""
summary = ""
${shared}+++

`;
}

function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npm run new:work -- <slug>");
    process.exitCode = 1;
    return;
  }
  if (!SLUG_RE.test(slug)) {
    console.error(`Invalid slug: ${slug}. Use lowercase letters, digits and hyphens.`);
    process.exitCode = 1;
    return;
  }

  const dir = join(WORKS_DIR, slug);
  if (existsSync(dir)) {
    console.error(`Already exists: ${dir}`);
    process.exitCode = 1;
    return;
  }

  const year = new Date().getFullYear();
  mkdirSync(join(dir, "assets"), { recursive: true });
  writeFileSync(join(dir, "index.ja.md"), markdownTemplate("ja", slug, year));
  writeFileSync(join(dir, "index.en.md"), markdownTemplate("en", slug, year));
  console.log(slug);
  console.log(dir);
}

main();
