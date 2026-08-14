import { useState } from "react";
import { describe, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import AboutEditor, { NEWS_PAGE_SIZE, normalizeNewsItems } from "../src/editor/AboutEditor.jsx";
import { compareNewsDates, newsDateOf } from "../src/editor/newsOrder.js";

function aboutFiles(jaNews, enNews) {
  const person = {
    name: "名前",
    bio: [],
    activities: [{ title: "活動", description: "" }],
    career: [],
    education: [],
    links: [],
  };
  return {
    ja: {
      meta: {
        person: structuredClone(person),
        newsConfig: { file: "news.ja.toml", count: 5 },
        newsItems: structuredClone(jaNews),
      },
      body: "",
    },
    en: {
      meta: {
        person: { ...structuredClone(person), name: "Name" },
        newsConfig: { file: "news.en.toml", count: 5 },
        newsItems: structuredClone(enNews ?? jaNews),
      },
      body: "",
    },
  };
}

function newsEntries(count, { from = 1 } = {}) {
  return Array.from({ length: count }, (_, index) => ({
    date: `2026-08-${String(from + index).padStart(2, "0")}`,
    title: `News ${from + index}`,
    description: "",
  }));
}

// The editor is controlled by EditorRoot, so the harness holds the files and
// feeds every change back the way the real parent does.
function renderAbout(initialFiles, locale = "ja") {
  const latest = { files: initialFiles };
  function Harness() {
    const [files, setFiles] = useState(initialFiles);
    latest.files = files;
    return (
      <AboutEditor
        files={files}
        locale={locale}
        onChange={setFiles}
        onChooseAvatar={() => {}}
        onTakeAvatar={() => {}}
      />
    );
  }
  render(<Harness />);
  return latest;
}

// The About preview applies `count` after this order, so an entry the form shows
// first has to survive the cap there too.
describe("compareNewsDates", () => {
  test("orders newest first and keeps undated entries above a capped list", () => {
    const entries = [
      { date: "2026-06-27" },
      { date: "" },
      { date: "2026-08-07" },
      { date: "not-a-date" },
    ];
    const ordered = [...entries]
      .sort((a, b) => compareNewsDates(newsDateOf(a), newsDateOf(b)))
      .map((entry) => entry.date);
    expect(ordered).toEqual(["", "not-a-date", "2026-08-07", "2026-06-27"]);
    expect(ordered.slice(0, 2)).toContain("");
  });
});

describe("normalizeNewsItems", () => {
  test("copies a date onto the locale that is missing one", () => {
    const files = aboutFiles(
      [{ date: "2026-08-07", title: "登壇しました" }],
      [{ date: "", title: "Gave a talk" }],
    );
    normalizeNewsItems(files);
    expect(files.en.meta.newsItems[0].date).toBe("2026-08-07");
    expect(files.en.meta.newsItems[0].title).toBe("Gave a talk");
  });

  test("orders newest first and keeps both locales on the same order", () => {
    const files = aboutFiles(
      [
        { date: "2026-06-27", title: "古い" },
        { date: "2026-08-07", title: "新しい" },
      ],
      [
        { date: "2026-06-27", title: "Older" },
        { date: "2026-08-07", title: "Newer" },
      ],
    );
    normalizeNewsItems(files);
    expect(files.ja.meta.newsItems.map((item) => item.title)).toEqual(["新しい", "古い"]);
    expect(files.en.meta.newsItems.map((item) => item.title)).toEqual(["Newer", "Older"]);
  });

  test("keeps an entry without a date on top so a new row stays visible", () => {
    const files = aboutFiles([
      { date: "2026-08-07", title: "既存" },
      { date: "", title: "" },
    ]);
    normalizeNewsItems(files);
    expect(files.ja.meta.newsItems.map((item) => item.title)).toEqual(["", "既存"]);
  });

  test("leaves both locales alone when their item counts disagree", () => {
    const files = aboutFiles(
      [
        { date: "2026-06-27", title: "古い" },
        { date: "2026-08-07", title: "新しい" },
      ],
      [{ date: "", title: "Older" }],
    );
    normalizeNewsItems(files);
    // Position no longer says which entries pair up, so neither the order nor
    // the missing date may be touched until the counts match again.
    expect(files.ja.meta.newsItems.map((item) => item.title)).toEqual(["古い", "新しい"]);
    expect(files.en.meta.newsItems).toEqual([{ date: "", title: "Older" }]);
  });
});

describe("AboutEditor News section", () => {
  test("repairs stored entries that are unordered or missing the English date", () => {
    const latest = renderAbout(
      aboutFiles(
        [
          { date: "2026-06-27", title: "古い" },
          { date: "2026-08-07", title: "新しい" },
        ],
        [
          { date: "2026-06-27", title: "Older" },
          { date: "", title: "Newer" },
        ],
      ),
    );
    expect(latest.files.ja.meta.newsItems.map((item) => item.title)).toEqual(["新しい", "古い"]);
    expect(latest.files.en.meta.newsItems).toEqual([
      { date: "2026-08-07", title: "Newer" },
      { date: "2026-06-27", title: "Older" },
    ]);
  });

  test("writes an edited date to both locales and re-sorts", () => {
    const latest = renderAbout(
      aboutFiles(
        [
          { date: "", title: "日付未入力" },
          { date: "2026-08-07", title: "新しい" },
        ],
        [
          { date: "", title: "Undated" },
          { date: "2026-08-07", title: "Newer" },
        ],
      ),
    );
    fireEvent.change(screen.getAllByLabelText("日付")[0], { target: { value: "2026-09-01" } });

    expect(latest.files.ja.meta.newsItems.map((item) => item.date)).toEqual([
      "2026-09-01",
      "2026-08-07",
    ]);
    expect(latest.files.en.meta.newsItems).toEqual([
      { date: "2026-09-01", title: "Undated" },
      { date: "2026-08-07", title: "Newer" },
    ]);
  });

  test("keeps an edited date on one locale while the counts disagree", () => {
    const latest = renderAbout(
      aboutFiles(
        [
          { date: "2026-06-27", title: "古い" },
          { date: "2026-08-07", title: "新しい" },
        ],
        [{ date: "2026-06-27", title: "Older" }],
      ),
    );
    fireEvent.change(screen.getAllByLabelText("日付")[0], { target: { value: "2026-09-01" } });

    expect(latest.files.ja.meta.newsItems.map((item) => item.date)).toEqual([
      "2026-09-01",
      "2026-08-07",
    ]);
    expect(latest.files.en.meta.newsItems).toEqual([{ date: "2026-06-27", title: "Older" }]);
  });

  test("adds a new entry at the top of both locales", () => {
    const latest = renderAbout(aboutFiles(newsEntries(2)));
    fireEvent.click(screen.getByRole("button", { name: "Newsを追加" }));

    expect(latest.files.ja.meta.newsItems[0]).toEqual({
      date: "",
      title: "",
      description: "",
      href: "",
    });
    expect(latest.files.en.meta.newsItems).toHaveLength(3);
  });

  test("offers no manual reordering for News", () => {
    renderAbout(aboutFiles(newsEntries(2)));
    expect(screen.queryByRole("button", { name: "News 1を上へ移動" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "News 1を下へ移動" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activity 1を上へ移動" })).toBeInTheDocument();
  });

  test("pages long News lists and leaves the other sections whole", () => {
    const total = NEWS_PAGE_SIZE + 3;
    renderAbout(aboutFiles(newsEntries(total)));

    expect(screen.getAllByLabelText("日付")).toHaveLength(NEWS_PAGE_SIZE);
    expect(screen.getByText(`1–${NEWS_PAGE_SIZE} / ${total}`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Newsの前のページ" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Newsの次のページ" }));
    expect(screen.getByText(`${NEWS_PAGE_SIZE + 1}–${total} / ${total}`)).toBeInTheDocument();
    expect(screen.getAllByLabelText("日付")).toHaveLength(total - NEWS_PAGE_SIZE);
    expect(screen.getByRole("button", { name: "Newsの次のページ" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  test("shows no pager while the list fits on one page", () => {
    renderAbout(aboutFiles(newsEntries(NEWS_PAGE_SIZE)));
    expect(screen.queryByRole("button", { name: "Newsの次のページ" })).not.toBeInTheDocument();
  });
});
