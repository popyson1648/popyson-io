import { describe, expect, test } from "vitest";

import { commitMessage, contentIdsFromStatus, KINDS } from "../scripts/publish_content.mjs";

const post = (state, title, id = "20260728-e2c1267f") => ({ id, state, title });

describe("contentIdsFromStatus", () => {
  test.each([
    ["unstaged edit", " M src/content/posts/20260728-e2c1267f/index.ja.md"],
    ["staged edit", "M  src/content/posts/20260728-e2c1267f/index.ja.md"],
    ["untracked file", "?? src/content/posts/20260728-e2c1267f/index.ja.md"],
    ["deletion", " D src/content/posts/20260728-e2c1267f/index.ja.md"],
    ["staged add", "A  src/content/posts/20260728-e2c1267f/index.ja.md"],
  ])("finds the post id in a %s", (_name, line) => {
    expect(contentIdsFromStatus(`${line}\n`, KINDS.post.idPattern)).toEqual(["20260728-e2c1267f"]);
  });

  test("reads the destination of a rename", () => {
    const line =
      "R  src/content/posts/20260101-aaaaaaaa/index.ja.md -> src/content/posts/20260728-e2c1267f/index.ja.md";

    expect(contentIdsFromStatus(`${line}\n`, KINDS.post.idPattern)).toEqual(["20260728-e2c1267f"]);
  });

  test("collapses a post's files into one id and sorts across posts", () => {
    const output = [
      " M src/content/posts/20260728-e2c1267f/index.ja.md",
      " M src/content/posts/20260728-e2c1267f/index.en.md",
      "?? src/content/posts/20260101-aaaaaaaa/index.ja.md",
      "",
    ].join("\n");

    expect(contentIdsFromStatus(output, KINDS.post.idPattern)).toEqual([
      "20260101-aaaaaaaa",
      "20260728-e2c1267f",
    ]);
  });

  test.each([
    ["blank output", ""],
    ["a path outside posts", " M src/app.css"],
    ["a directory that is not a post id", "?? src/content/posts/drafts/index.ja.md"],
    ["a work, when matching posts", " M src/content/works/linewatch/index.ja.md"],
  ])("returns nothing for %s", (_name, output) => {
    expect(contentIdsFromStatus(output, KINDS.post.idPattern)).toEqual([]);
  });

  test("finds a post id in the time-of-day form", () => {
    const output = " M src/content/posts/20260729-165412/index.ja.md\n";

    expect(contentIdsFromStatus(output, KINDS.post.idPattern)).toEqual(["20260729-165412"]);
  });

  test("reads a work slug with the work pattern", () => {
    const output = " M src/content/works/linewatch/index.ja.md\n";

    expect(contentIdsFromStatus(output, KINDS.work.idPattern)).toEqual(["linewatch"]);
  });

  test.each([
    ["a post", "?? src/content/posts/20260728-e2c1267f/index.ja.md"],
    ["an uppercase slug", "?? src/content/works/LineWatch/index.ja.md"],
  ])("returns nothing for %s when matching works", (_name, output) => {
    expect(contentIdsFromStatus(output, KINDS.work.idPattern)).toEqual([]);
  });
});

describe("commitMessage for works", () => {
  const work = (state, title, id = "linewatch") => ({ id, state, title });

  test.each([
    ["added", 'chore(content): add work "LineWatch"'],
    ["updated", 'chore(content): update work "LineWatch"'],
    ["removed", 'chore(content): remove work "LineWatch"'],
  ])("names the work for a single %s work", (state, expected) => {
    expect(commitMessage([work(state, "LineWatch")], "work")).toBe(expected);
  });

  test("pluralizes the noun it was given", () => {
    const message = commitMessage(
      [work("added", "LineWatch"), work("added", "kataparse", "kataparse")],
      "work",
    );

    expect(message.split("\n")[0]).toBe("chore(content): add 2 works");
  });
});

describe("commitMessage", () => {
  test.each([
    ["added", 'chore(content): add post "償却計算量"'],
    ["updated", 'chore(content): update post "償却計算量"'],
    ["removed", 'chore(content): remove post "償却計算量"'],
  ])("names the post for a single %s post", (state, expected) => {
    expect(commitMessage([post(state, "償却計算量")])).toBe(expected);
  });

  test("counts posts and lists them in the body when several change", () => {
    const message = commitMessage([
      post("added", "償却計算量", "20260728-e2c1267f"),
      post("added", "二分探索", "20260728-aaaaaaaa"),
      post("removed", "旧記事", "20260101-bbbbbbbb"),
    ]);

    expect(message).toBe(
      [
        'chore(content): add 2 posts, remove post "旧記事"',
        "",
        "- add: 償却計算量 (20260728-e2c1267f)",
        "- add: 二分探索 (20260728-aaaaaaaa)",
        "- remove: 旧記事 (20260101-bbbbbbbb)",
      ].join("\n"),
    );
  });

  test("orders the clauses as add, update, remove", () => {
    const message = commitMessage([
      post("removed", "削除", "20260101-bbbbbbbb"),
      post("updated", "編集", "20260102-cccccccc"),
      post("added", "追加", "20260103-dddddddd"),
    ]);

    expect(message.split("\n")[0]).toBe(
      'chore(content): add post "追加", update post "編集", remove post "削除"',
    );
  });

  test("keeps a single long title in the body once the subject drops it", () => {
    const title = "あ".repeat(60);

    const message = commitMessage([post("added", title)]);

    expect(message).toBe(
      ["chore(content): add 1 post", "", `- add: ${title} (20260728-e2c1267f)`].join("\n"),
    );
  });

  test("falls back to counts when the titles overflow the subject line", () => {
    const message = commitMessage([
      post("added", "とても長い日本語のタイトルをつけた記事", "20260728-e2c1267f"),
      post("updated", "こちらもかなり長いタイトルを持つ記事", "20260728-aaaaaaaa"),
    ]);
    const [subject] = message.split("\n");

    expect(subject).toBe("chore(content): add 1 post, update 1 post");
    expect(subject.length).toBeLessThanOrEqual(72);
  });
});
