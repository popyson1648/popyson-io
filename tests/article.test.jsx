import { act, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { Article, buildTocTree } from "../src/blog.jsx";
import { AppCtx } from "../src/components.jsx";

const t = {
  toc: "目次",
  back_blog: "記事一覧へ",
  back_to_top: "記事の先頭へ戻る",
  related: "関連記事",
  min_read: "分",
  copy_code: "コードをコピー",
  copied_code: "コードをコピーしました",
  tag_to_list: (tag) => `#${tag} の記事一覧を見る`,
};

const post = {
  id: "current",
  title: { ja: "記事", en: "Article" },
  date: "2026-07-29",
  dateLabel: { ja: "2026年7月29日", en: "July 29, 2026" },
  reading: { ja: 2, en: 2 },
  tags: ["test"],
  relatedIds: ["related"],
};

const related = {
  id: "related",
  title: { ja: "関連記事", en: "Related article" },
  date: "2026-07-28",
  dateLabel: { ja: "2026年7月28日", en: "July 28, 2026" },
  tags: ["related"],
  thumbnail: "/thumbnails/related.png",
};

const body = {
  ja: {
    html: [
      '<h2 id="sec-parent">親</h2>',
      '<h3 id="sec-child">子</h3>',
      '<h2 id="sec-sibling">同階層</h2>',
    ].join(""),
  },
  en: { html: "" },
  headings: [
    {
      id: { ja: "parent", en: "parent" },
      text: { ja: "親", en: "Parent" },
      depth: { ja: 2, en: 2 },
    },
    {
      id: { ja: "child", en: "child" },
      text: { ja: "子", en: "Child" },
      depth: { ja: 3, en: 3 },
    },
    {
      id: { ja: "sibling", en: "sibling" },
      text: { ja: "同階層", en: "Sibling" },
      depth: { ja: 2, en: 2 },
    },
  ],
};

function renderArticle() {
  return render(
    <AppCtx.Provider value={{ t, lang: "ja", nav: vi.fn() }}>
      <Article id="current" />
    </AppCtx.Provider>,
  );
}

beforeEach(() => {
  window.BlogData = { POSTS: [post, related] };
  window.ArticleBody = { get: () => body };
  Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 0 });
  window.scrollTo = vi.fn();
  window.matchMedia = vi.fn(() => ({ matches: false }));
});

describe("buildTocTree", () => {
  test("uses the first heading as a root and nests under the nearest shallower heading", () => {
    const tree = buildTocTree([
      { id: "first", text: "First", depth: 3 },
      { id: "deep", text: "Deep", depth: 5 },
      { id: "middle", text: "Middle", depth: 4 },
      { id: "root-two", text: "Root two", depth: 3 },
    ]);

    expect(tree).toHaveLength(2);
    expect(tree[0].id).toBe("first");
    expect(tree[0].children.map((heading) => heading.id)).toEqual(["deep", "middle"]);
    expect(tree[1].id).toBe("root-two");
  });
});

describe("Article", () => {
  test("renders a nested TOC and each related article thumbnail", () => {
    const { container } = renderArticle();

    const parentItem = screen.getByRole("link", { name: "親" }).closest("li");
    expect(within(parentItem).getByRole("link", { name: "子" })).toBeInTheDocument();
    expect(parentItem.querySelector(".toc-list")).toBeInTheDocument();

    const relatedImage = container.querySelector('.rel-card img[src="/thumbnails/related.png"]');
    expect(relatedImage).toBeInTheDocument();
    expect(relatedImage).toHaveAttribute("width", "52");
    expect(relatedImage).toHaveAttribute("height", "52");
  });

  test("shows the article scroll-to-top control after scrolling and activates it", async () => {
    renderArticle();
    expect(screen.queryByRole("button", { name: t.back_to_top })).toBeNull();

    act(() => {
      window.scrollY = 700;
      window.dispatchEvent(new Event("scroll"));
    });

    const button = screen.getByRole("button", { name: t.back_to_top });
    await userEvent.click(button);

    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "smooth" });
  });
});
