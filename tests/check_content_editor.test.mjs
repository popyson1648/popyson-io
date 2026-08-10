import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";
import sharp from "sharp";

import { nextPostId, createPostScaffold, createWorkScaffold } from "../scripts/contentScaffold.mjs";
import { parseMarkdownFrontmatter } from "../scripts/frontmatter.mjs";
import {
  createEditorContent,
  discardEditorDraft,
  EDITOR_KINDS,
  listEditorHistory,
  promoteEditorDraft,
  readEditorContent,
  removeEditorDraft,
  restoreEditorHistory,
  resolveContentAsset,
  saveContentAsset,
  saveEditorContent,
  serializeEditorAbout,
  serializeEditorMarkdown,
  sourceRevision,
  validateEditorDraft,
} from "../scripts/contentEditorModel.mjs";

const tempDirs = [];

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), "popyson-editor-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("content editor scaffolds", () => {
  test("creates a locale pair and prescribed assets directory for a post", () => {
    const postsDir = tempDir();
    const now = new Date(2026, 7, 4, 12, 34, 56);
    const created = createPostScaffold(postsDir, { now });

    expect(created.id).toBe("20260804-123456");
    expect(readFileSync(join(created.dir, "index.ja.md"), "utf8")).toContain('date = "auto"');
    expect(readFileSync(join(created.dir, "index.en.md"), "utf8")).toContain('title = ""');
    expect(statSync(join(created.dir, "assets")).isDirectory()).toBe(true);
  });

  test("advances a colliding post id by one second", () => {
    const postsDir = tempDir();
    const now = new Date(2026, 7, 4, 12, 34, 56);
    createPostScaffold(postsDir, { now });
    expect(nextPostId(postsDir, { now })).toBe("20260804-123457");
  });

  test("creates work shared metadata only in Japanese", () => {
    const worksDir = tempDir();
    const created = createWorkScaffold(worksDir, "my-work", { year: 2026 });
    const ja = readFileSync(join(created.dir, "index.ja.md"), "utf8");
    const en = readFileSync(join(created.dir, "index.en.md"), "utf8");

    expect(ja).toContain("year = 2026");
    expect(en).not.toContain("year = 2026");
  });

  test("rejects unsafe work slugs", () => {
    expect(() => createWorkScaffold(tempDir(), "../escape")).toThrow(/Invalid slug/);
  });
});

describe("content editor serialization", () => {
  test("serializes the About profile and News as separate TOML files", () => {
    const source = serializeEditorAbout("ja", {
      person: { name: "編集者", bio: ["紹介"], activities: [] },
      newsConfig: { count: 3 },
      newsItems: [{ date: "2026-08-10", title: "更新", description: "" }],
    });

    expect(source.about).toContain('name = "編集者"');
    expect(source.about).toContain('file = "news.ja.toml"');
    expect(source.news).toContain('date = "2026-08-10"');
  });

  test("round-trips valid post metadata and Markdown", () => {
    const source = serializeEditorMarkdown(
      "post",
      "ja",
      {
        title: "編集テスト",
        date: "auto",
        tags: ["React"],
        kana: "へんしゅう",
        sumup: { mode: "text", text: "概要" },
        thumbnail: { mode: "none" },
      },
      "## 本文\n\nテストです。",
    );
    const parsed = parseMarkdownFrontmatter(source, "post.md");

    expect(parsed.meta.title).toBe("編集テスト");
    expect(parsed.body).toBe("## 本文\n\nテストです。");
    expect(sourceRevision(source)).toHaveLength(64);
  });

  test("removes Japanese-source-only work fields from English", () => {
    const source = serializeEditorMarkdown(
      "work",
      "en",
      {
        title: "Work",
        tagline: "Tagline",
        summary: "Summary",
        year: 2026,
        stack: ["React"],
        thumbnail: "/content-assets/works/work/thumb.png",
        hero: "/content-assets/works/work/hero.png",
      },
      "Body",
    );
    const parsed = parseMarkdownFrontmatter(source, "work.md", { validate: false });

    expect(parsed.meta).toEqual({ title: "Work", tagline: "Tagline", summary: "Summary" });
  });

  test("rejects invalid metadata before writing", () => {
    expect(() => serializeEditorMarkdown("post", "ja", { title: "" }, "Body")).toThrow(
      /title: must be a non-empty string/,
    );
  });
});

describe("private editor drafts", () => {
  test("edits, checkpoints, validates, and promotes the fixed About page", async () => {
    const root = tempDir();
    const publicDir = join(root, "public-about");
    const draftDir = join(root, "draft-about");
    const original = {
      dir: EDITOR_KINDS.about.dir,
      draftDir: EDITOR_KINDS.about.draftDir,
    };
    EDITOR_KINDS.about.dir = publicDir;
    EDITOR_KINDS.about.draftDir = draftDir;
    mkdirSync(publicDir, { recursive: true });
    const about = (locale, name) =>
      `[person]\nname = "${name}"\nicon = ""\nbio = []\nactivities = []\ncareer = []\neducation = []\nlinks = []\n\n[news]\nfile = "news.${locale}.toml"\ncount = 5\n`;
    const news = '[[news]]\ndate = "2026-08-10"\ntitle = "Initial"\ndescription = ""\n';
    writeFileSync(join(publicDir, "about.ja.toml"), about("ja", "公開名"));
    writeFileSync(join(publicDir, "about.en.toml"), about("en", "Public name"));
    writeFileSync(join(publicDir, "news.ja.toml"), news);
    writeFileSync(join(publicDir, "news.en.toml"), news);

    try {
      const opened = readEditorContent("about", "about");
      opened.files.ja.meta.person.name = "下書き名";
      opened.files.en.meta.person.name = "Draft name";
      const first = saveEditorContent("about", "about", opened.files, { checkpoint: true });

      expect(first.status).toBe("published_with_draft");
      expect(readFileSync(join(publicDir, "about.ja.toml"), "utf8")).toContain("公開名");
      expect(readFileSync(join(draftDir, "about.ja.toml"), "utf8")).toContain("下書き名");
      expect(validateEditorDraft("about", "about")).toEqual({ valid: true, issues: [] });

      const png = Buffer.from("89504e470d0a1a0a00000000", "hex");
      const asset = await saveContentAsset("about", "about", {
        name: "Profile.PNG",
        type: "image/png",
        bytes: png,
      });
      expect(asset.url).toBe("/content-assets/about/about/profile.png");
      expect(resolveContentAsset("about", "about", "profile.png", { preferDraft: true })).toBe(
        join(draftDir, "assets", "profile.png"),
      );

      first.files.ja.meta.person.name = "第2版";
      first.files.en.meta.person.name = "Version two";
      saveEditorContent("about", "about", first.files, { checkpoint: true });
      expect(
        listEditorHistory("about", "about").some((entry) => entry.title.ja === "下書き名"),
      ).toBe(true);

      promoteEditorDraft("about", "about");
      expect(readFileSync(join(publicDir, "about.ja.toml"), "utf8")).toContain("第2版");
      expect(existsSync(join(publicDir, "assets", "profile.png"))).toBe(true);
      removeEditorDraft("about", "about");
    } finally {
      EDITOR_KINDS.about.dir = original.dir;
      EDITOR_KINDS.about.draftDir = original.draftDir;
    }
  });

  test("keeps edits and assets out of public content until promotion", async () => {
    const root = tempDir();
    const publicDir = join(root, "public-posts");
    const draftDir = join(root, "draft-posts");
    const original = {
      dir: EDITOR_KINDS.post.dir,
      draftDir: EDITOR_KINDS.post.draftDir,
    };
    EDITOR_KINDS.post.dir = publicDir;
    EDITOR_KINDS.post.draftDir = draftDir;

    try {
      const created = createPostScaffold(publicDir, {
        now: new Date(2026, 7, 4, 12, 34, 56),
      });
      const opened = readEditorContent("post", created.id);
      expect(opened.status).toBe("published");

      opened.files.ja.meta.title = "非公開の変更";
      opened.files.en.meta.title = "Private edit";
      const saved = saveEditorContent("post", created.id, opened.files);
      expect(saved.status).toBe("published_with_draft");
      expect(readFileSync(join(publicDir, created.id, "index.ja.md"), "utf8")).not.toContain(
        "非公開の変更",
      );

      const png = Buffer.from("89504e470d0a1a0a00000000", "hex");
      const asset = await saveContentAsset("post", created.id, {
        name: "Camera Photo.PNG",
        type: "image/png",
        bytes: png,
      });
      expect(asset.url).toBe(`/content-assets/posts/${created.id}/camera-photo.png`);
      expect(
        resolveContentAsset("posts", created.id, "camera-photo.png", { preferDraft: true }),
      ).toBe(join(draftDir, created.id, "assets", "camera-photo.png"));
      expect(existsSync(join(publicDir, created.id, "assets", "camera-photo.png"))).toBe(false);

      promoteEditorDraft("post", created.id);
      expect(readFileSync(join(publicDir, created.id, "index.ja.md"), "utf8")).toContain(
        "非公開の変更",
      );
      expect(existsSync(join(publicDir, created.id, "assets", "camera-photo.png"))).toBe(true);

      removeEditorDraft("post", created.id);
      expect(readEditorContent("post", created.id).status).toBe("published");
    } finally {
      EDITOR_KINDS.post.dir = original.dir;
      EDITOR_KINDS.post.draftDir = original.draftDir;
    }
  });

  test("creates new content only in the draft tree", () => {
    const root = tempDir();
    const publicDir = join(root, "public-works");
    const draftDir = join(root, "draft-works");
    const original = {
      dir: EDITOR_KINDS.work.dir,
      draftDir: EDITOR_KINDS.work.draftDir,
    };
    EDITOR_KINDS.work.dir = publicDir;
    EDITOR_KINDS.work.draftDir = draftDir;

    try {
      const created = createEditorContent("work", { slug: "private-work" });
      expect(created.status).toBe("draft");
      expect(existsSync(join(draftDir, "private-work", "index.ja.md"))).toBe(true);
      expect(existsSync(join(publicDir, "private-work"))).toBe(false);
    } finally {
      EDITOR_KINDS.work.dir = original.dir;
      EDITOR_KINDS.work.draftDir = original.draftDir;
    }
  });

  test("rejects an incomplete draft at the publish boundary", () => {
    const root = tempDir();
    const publicDir = join(root, "public-works");
    const draftDir = join(root, "draft-works");
    const original = {
      dir: EDITOR_KINDS.work.dir,
      draftDir: EDITOR_KINDS.work.draftDir,
    };
    EDITOR_KINDS.work.dir = publicDir;
    EDITOR_KINDS.work.draftDir = draftDir;

    try {
      createEditorContent("work", { slug: "unfinished-work" });
      expect(() => promoteEditorDraft("work", "unfinished-work")).toThrow(
        /title: must be a non-empty string/,
      );
      expect(existsSync(join(draftDir, "unfinished-work"))).toBe(true);
      expect(existsSync(join(publicDir, "unfinished-work"))).toBe(false);
    } finally {
      EDITOR_KINDS.work.dir = original.dir;
      EDITOR_KINDS.work.draftDir = original.draftDir;
    }
  });

  test("keeps rolling checkpoints and restores without losing the current version", () => {
    const root = tempDir();
    const publicDir = join(root, "public-posts");
    const draftDir = join(root, "draft-posts");
    const original = {
      dir: EDITOR_KINDS.post.dir,
      draftDir: EDITOR_KINDS.post.draftDir,
    };
    EDITOR_KINDS.post.dir = publicDir;
    EDITOR_KINDS.post.draftDir = draftDir;

    try {
      const created = createPostScaffold(publicDir, {
        now: new Date(2026, 7, 4, 12, 34, 56),
      });
      const opened = readEditorContent("post", created.id);
      opened.files.ja.meta.title = "第1版";
      opened.files.en.meta.title = "Version one";
      const first = saveEditorContent("post", created.id, opened.files, { checkpoint: true });
      first.files.ja.meta.title = "第2版";
      first.files.en.meta.title = "Version two";
      const second = saveEditorContent("post", created.id, first.files, { checkpoint: true });

      const entries = listEditorHistory("post", created.id);
      const versionOne = entries.find((entry) => entry.title.ja === "第1版");
      expect(versionOne).toBeTruthy();
      const restored = restoreEditorHistory("post", created.id, versionOne.id, {
        ja: second.files.ja.revision,
        en: second.files.en.revision,
      });

      expect(restored.files.ja.meta.title).toBe("第1版");
      expect(
        listEditorHistory("post", created.id).some((entry) => entry.title.ja === "第2版"),
      ).toBe(true);
      expect(discardEditorDraft("post", created.id).status).toBe("published");
    } finally {
      EDITOR_KINDS.post.dir = original.dir;
      EDITOR_KINDS.post.draftDir = original.draftDir;
    }
  });

  test("reports locale readiness before publishing", () => {
    const root = tempDir();
    const original = {
      dir: EDITOR_KINDS.work.dir,
      draftDir: EDITOR_KINDS.work.draftDir,
    };
    EDITOR_KINDS.work.dir = join(root, "public-works");
    EDITOR_KINDS.work.draftDir = join(root, "draft-works");

    try {
      createEditorContent("work", { slug: "readiness" });
      const result = validateEditorDraft("work", "readiness");
      expect(result.valid).toBe(false);
      expect(result.issues.map((issue) => issue.locale)).toEqual(["ja", "en"]);
    } finally {
      EDITOR_KINDS.work.dir = original.dir;
      EDITOR_KINDS.work.draftDir = original.draftDir;
    }
  });

  test("converts album AVIF images to webp in the prescribed assets folder", async () => {
    const root = tempDir();
    const publicDir = join(root, "public-posts");
    const draftDir = join(root, "draft-posts");
    const original = {
      dir: EDITOR_KINDS.post.dir,
      draftDir: EDITOR_KINDS.post.draftDir,
    };
    EDITOR_KINDS.post.dir = publicDir;
    EDITOR_KINDS.post.draftDir = draftDir;

    try {
      const created = createPostScaffold(publicDir, {
        now: new Date(2026, 7, 4, 12, 34, 56),
      });
      const avif = await sharp({
        create: { width: 2, height: 2, channels: 3, background: "#00a888" },
      })
        .avif()
        .toBuffer();
      const asset = await saveContentAsset("post", created.id, {
        name: "album-photo.avif",
        type: "image/avif",
        bytes: avif,
      });
      const output = join(draftDir, created.id, "assets", "album-photo.webp");

      expect(asset.url).toMatch(/\/album-photo\.webp$/);
      expect(readFileSync(output).subarray(8, 12).toString("ascii")).toBe("WEBP");
    } finally {
      EDITOR_KINDS.post.dir = original.dir;
      EDITOR_KINDS.post.draftDir = original.draftDir;
    }
  });
});
