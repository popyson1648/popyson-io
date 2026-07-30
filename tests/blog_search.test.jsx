import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { BlogList } from "../src/blog.jsx";
import { AppCtx } from "../src/components.jsx";

const t = {
  page_blog: { title: "Blog" },
  filters_label: "絞り込み",
  tools: "ツール",
  search: "検索",
  filter_add: "フィルター",
  sort: "並べ替え",
  s_date: "日付",
  s_kana: "五十音順",
  order_asc: "昇順",
  order_desc: "降順",
  f_tag: "タグ",
  f_title: "タイトル",
  f_body: "本文",
  back_tools: "ツールに戻る",
  search_ph: "記事を検索…",
  clear_search: "検索語をクリア",
  search_recent: "最近の記事",
  search_no: "見つかりませんでした",
  results: (count) => `${count}件`,
  in_tag: "タグ",
  in_title: "本文",
  title_contains: "タイトルを含む",
  body_contains: "本文を含む",
  clear: "クリア",
  clear_all: "すべてクリア",
  no_results: "記事がありません",
  min_read: "分",
};

const posts = [
  {
    id: "20260730-a1b2c3d4",
    title: { ja: "設計の記事", en: "Design article" },
    summary: { ja: "設計の概要", en: "Design summary" },
    date: "2026-07-30",
    reading: { ja: 2, en: 2 },
    tags: ["設計"],
    kana: "せっけい",
    thumbnail: "/thumbnails/20260730-a1b2c3d4.png",
  },
  {
    id: "20260729-b1c2d3e4",
    title: { ja: "アルゴリズムの記事", en: "Algorithm article" },
    summary: { ja: "アルゴリズムの概要", en: "Algorithm summary" },
    date: "2026-07-29",
    reading: { ja: 3, en: 3 },
    tags: ["アルゴリズム"],
    kana: "あるごりずむ",
  },
];

function renderBlogList({
  lang = "ja",
  route = { name: "blog", tag: null },
  translations = t,
} = {}) {
  const nav = vi.fn();
  const rendered = render(
    <AppCtx.Provider
      value={{
        t: translations,
        lang,
        nav,
        route,
      }}
    >
      <BlogList />
    </AppCtx.Provider>,
  );
  return { ...rendered, nav };
}

beforeEach(() => {
  window.BlogData = { POSTS: posts, TAGS: ["設計", "アルゴリズム"] };
  window.ArticleBody = {
    get: (id) => ({
      ja: { text: id === posts[0].id ? "設計について" : "アルゴリズムについて" },
      en: { text: "" },
    }),
  };
  window.matchMedia = vi.fn(() => ({ matches: true }));
  Element.prototype.scrollIntoView = vi.fn();
});

describe("Blog search interactions", () => {
  test("does not navigate from input Enter or IME keys, only from a result activation", async () => {
    const user = userEvent.setup();
    const { nav } = renderBlogList();

    await user.click(screen.getByRole("button", { name: "検索" }));
    const input = screen.getByRole("combobox", { name: "検索" });
    const options = screen.getAllByRole("option");

    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(nav).not.toHaveBeenCalled();

    fireEvent.keyDown(input, {
      key: "ArrowDown",
      code: "ArrowDown",
      keyCode: 229,
      isComposing: true,
    });
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "ArrowDown", code: "ArrowDown" });
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(nav).not.toHaveBeenCalled();

    await user.click(options[1]);
    expect(nav).toHaveBeenCalledOnce();
    expect(nav).toHaveBeenCalledWith(`/blog/${posts[1].id}`);
  });

  test("renders a responsive thumbnail and retains the placeholder fallback", async () => {
    const user = userEvent.setup();
    const { container } = renderBlogList();

    await user.click(screen.getByRole("button", { name: "検索" }));

    const thumbnail = container.querySelector(".fbar-results img.sug-thumb");
    expect(thumbnail).toHaveAttribute("src", posts[0].thumbnail);
    expect(thumbnail).toHaveAttribute(
      "srcset",
      [
        "/thumbnails/20260730-a1b2c3d4-192.webp 192w",
        "/thumbnails/20260730-a1b2c3d4-384.webp 384w",
      ].join(", "),
    );
    expect(thumbnail).toHaveAttribute("sizes", "(max-width: 560px) 38px, 44px");
    expect(thumbnail).toHaveAttribute("width", "44");
    expect(thumbnail).toHaveAttribute("height", "44");
    expect(container.querySelector(".fbar-results .ph.sug-thumb")).toBeInTheDocument();
  });

  test("shows local multi-word matches without waiting for Pagefind", async () => {
    const user = userEvent.setup();
    renderBlogList();

    await user.click(screen.getByRole("button", { name: "検索" }));
    await user.type(screen.getByRole("combobox", { name: "検索" }), "設計 アルゴリズム");

    await waitFor(() => {
      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(2);
      expect(options[0]).toHaveTextContent("設計の記事");
      expect(options[1]).toHaveTextContent("アルゴリズムの記事");
    });
  });

  test("shows, searches, and filters with English tags on the English page", async () => {
    const user = userEvent.setup();
    window.BlogData = {
      POSTS: [
        {
          ...posts[0],
          tags: { ja: ["ソフトウェア設計"], en: ["software design"] },
        },
        {
          ...posts[1],
          tags: { ja: ["アルゴリズム"], en: ["algorithm"] },
        },
      ],
      TAGS: {
        ja: ["ソフトウェア設計", "アルゴリズム"],
        en: ["software design", "algorithm"],
      },
    };
    renderBlogList({ lang: "en" });

    expect(screen.getByText("#software design")).toBeInTheDocument();
    expect(screen.getByText("#algorithm")).toBeInTheDocument();
    expect(screen.queryByText("#ソフトウェア設計")).toBeNull();

    await user.click(screen.getByRole("button", { name: "検索" }));
    await user.type(screen.getByRole("combobox", { name: "検索" }), "software design");
    await waitFor(() => {
      expect(screen.getAllByRole("option")).toHaveLength(1);
      expect(screen.getByRole("option")).toHaveTextContent("Design article");
    });

    await user.click(screen.getByRole("button", { name: "ツールに戻る" }));
    await user.click(screen.getByRole("button", { name: "フィルター" }));
    await user.click(screen.getByRole("button", { name: "#algorithm" }));

    expect(screen.getByText("Algorithm article")).toBeInTheDocument();
    expect(screen.queryByText("Design article")).toBeNull();
  });
});
