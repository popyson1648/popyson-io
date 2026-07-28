import { describe, expect, test } from "vitest";

import { commitMessage, postIdsFromStatus } from "../scripts/publish_post.mjs";

const post = (state, title, id = "20260728-e2c1267f") => ({ id, state, title });

describe("postIdsFromStatus", () => {
  test.each([
    ["unstaged edit", " M src/content/posts/20260728-e2c1267f/index.ja.md"],
    ["staged edit", "M  src/content/posts/20260728-e2c1267f/index.ja.md"],
    ["untracked file", "?? src/content/posts/20260728-e2c1267f/index.ja.md"],
    ["deletion", " D src/content/posts/20260728-e2c1267f/index.ja.md"],
    ["staged add", "A  src/content/posts/20260728-e2c1267f/index.ja.md"],
  ])("finds the post id in a %s", (_name, line) => {
    expect(postIdsFromStatus(`${line}\n`)).toEqual(["20260728-e2c1267f"]);
  });

  test("reads the destination of a rename", () => {
    const line =
      "R  src/content/posts/20260101-aaaaaaaa/index.ja.md -> src/content/posts/20260728-e2c1267f/index.ja.md";

    expect(postIdsFromStatus(`${line}\n`)).toEqual(["20260728-e2c1267f"]);
  });

  test("collapses a post's files into one id and sorts across posts", () => {
    const output = [
      " M src/content/posts/20260728-e2c1267f/index.ja.md",
      " M src/content/posts/20260728-e2c1267f/index.en.md",
      "?? src/content/posts/20260101-aaaaaaaa/index.ja.md",
      "",
    ].join("\n");

    expect(postIdsFromStatus(output)).toEqual(["20260101-aaaaaaaa", "20260728-e2c1267f"]);
  });

  test.each([
    ["blank output", ""],
    ["a path outside posts", " M src/app.css"],
    ["a directory that is not a post id", "?? src/content/posts/drafts/index.ja.md"],
  ])("returns nothing for %s", (_name, output) => {
    expect(postIdsFromStatus(output)).toEqual([]);
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
