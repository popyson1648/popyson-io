import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { BlogList } from "../src/blog.jsx";
import { AppCtx } from "../src/components.jsx";
import "../src/i18n.js";

const posts = [
  { id: "older", title: "Alpha", kana: "あ", date: "2026-01-01", tags: ["design"] },
  { id: "newer", title: "Beta", kana: "か", date: "2026-02-01", tags: ["code"] },
  { id: "middle", title: "Gamma", kana: "さ", date: "2026-01-15", tags: ["design"] },
].map((post) => ({
  ...post,
  title: { ja: post.title, en: post.title },
  summary: { ja: `Summary ${post.id}`, en: `Summary ${post.id}` },
  reading: { ja: 1, en: 1 },
}));

beforeEach(() => {
  window.BlogData = { POSTS: posts, TAGS: ["design", "code"] };
  window.ArticleBody = { get: () => ({ ja: { html: "body" }, en: { html: "body" } }) };
  window.matchMedia = vi.fn(() => ({ matches: true }));
});

function tree(tag) {
  return (
    <AppCtx.Provider value={{ t: window.I18N.en, lang: "en", nav: vi.fn(), route: { tag } }}>
      <BlogList />
    </AppCtx.Provider>
  );
}
const titles = (container) =>
  [...container.querySelectorAll(".post-index-title")].map((node) => node.textContent);

test("sorts dates and Japanese kana in both directions with the real v9 row models", async () => {
  const user = userEvent.setup();
  const { container } = render(tree());
  expect(titles(container)).toEqual(["Beta", "Gamma", "Alpha"]);
  await user.click(screen.getByRole("button", { name: /Sort: Date/ }));
  await user.click(screen.getByRole("button", { name: "Ascending", exact: true }));
  expect(titles(container)).toEqual(["Alpha", "Gamma", "Beta"]);
  await user.click(screen.getByRole("button", { name: "Kana", exact: true }));
  expect(titles(container)).toEqual(["Alpha", "Beta", "Gamma"]);
  await user.click(screen.getByRole("button", { name: "Descending", exact: true }));
  expect(titles(container)).toEqual(["Gamma", "Beta", "Alpha"]);
});

test("combines tag and case-insensitive title filters and clears them", async () => {
  const user = userEvent.setup();
  const { container } = render(tree("design"));
  expect(titles(container)).toEqual(["Gamma", "Alpha"]);
  await user.click(screen.getByRole("button", { name: "Filter", exact: true }));
  await user.click(screen.getByRole("button", { name: "Title", exact: true }));
  await user.type(screen.getByPlaceholderText(window.I18N.en.title_contains), "ALPHA");
  expect(titles(container)).toEqual(["Alpha"]);
  await user.click(screen.getByRole("button", { name: window.I18N.en.clear_all }));
  expect(titles(container)).toEqual(["Beta", "Gamma", "Alpha"]);
});

test("applies route tag changes while mounted and allows clearing the filter", async () => {
  const user = userEvent.setup();
  const { container, rerender } = render(tree("design"));
  rerender(tree("code"));
  expect(titles(container)).toEqual(["Beta"]);
  await user.click(screen.getByRole("button", { name: window.I18N.en.clear_all }));
  expect(titles(container)).toEqual(["Beta", "Gamma", "Alpha"]);
  rerender(tree("unknown"));
  expect(titles(container)).toEqual(["Beta", "Gamma", "Alpha"]);
});
