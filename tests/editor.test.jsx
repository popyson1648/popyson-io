import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import EditorRoot from "../src/editor/EditorRoot.jsx";

afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("content editor shell", () => {
  test("loads through the stable loopback URL without a token", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ items: [] }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(<EditorRoot />);

    expect(await screen.findByText("まだありません。")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers).not.toHaveProperty("X-Editor-Token");
  });

  test("loads the Tailscale-protected content list and authoring controls", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ items: [] }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<EditorRoot />);

    expect(await screen.findByText("まだありません。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新規" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下書きを保存" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "公開" })).toBeInTheDocument();
    expect(screen.queryByText("Content Editor")).not.toBeInTheDocument();
    expect(screen.queryByText("popyson.io")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /コンテンツを選択/ })).not.toBeInTheDocument();
    expect(container.querySelector(".editor-empty-mark")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/editor/content",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  test("shows progress and ignores duplicate requests while opening content", async () => {
    const content = {
      kind: "post",
      id: "20260810-120000",
      status: "draft",
      files: {
        ja: {
          meta: { title: "読み込みテスト", date: "2026-08-10", tags: [] },
          body: "本文",
          revision: "ja-revision",
        },
        en: {
          meta: { title: "Loading test", date: "2026-08-10", tags: [] },
          body: "Body",
          revision: "en-revision",
        },
      },
    };
    let finishRead;
    const readResponse = new Promise((resolve) => {
      finishRead = resolve;
    });
    const fetchMock = vi.fn(async (path) => {
      if (path === "/api/editor/content") {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                kind: content.kind,
                id: content.id,
                title: { ja: "読み込みテスト", en: "Loading test" },
                updatedAt: "2026-08-10T12:00:00.000Z",
                status: "draft",
              },
            ],
          }),
        };
      }
      if (path === `/api/editor/content/post/${content.id}`) return readResponse;
      if (path === "/api/editor/preview") {
        return { ok: true, json: async () => ({ html: "<p>本文</p>" }) };
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<EditorRoot />);
    const item = await screen.findByRole("button", { name: /読み込みテスト/ });
    fireEvent.click(item);
    fireEvent.click(item);

    expect(item).toBeDisabled();
    expect(item).toHaveAttribute("aria-busy", "true");
    expect(item).toHaveTextContent("読み込み中…");
    expect(container.querySelector(".editor-sr-only")).toHaveTextContent(
      "読み込みテストを開いています。",
    );
    expect(
      fetchMock.mock.calls.filter(([path]) => path === `/api/editor/content/post/${content.id}`),
    ).toHaveLength(1);

    finishRead({ ok: true, json: async () => content });
    await waitFor(() => expect(container.querySelector(".markdown-editor")).toBeTruthy());
    expect(container.querySelector(".editor-sr-only")).toBeEmptyDOMElement();
  });

  test("inserts every selected image into the current Markdown", async () => {
    const content = {
      kind: "post",
      id: "20260804-123456",
      files: {
        ja: {
          meta: {
            title: "画像テスト",
            date: "2026-08-04",
            tags: [],
            sumup: { mode: "none" },
            thumbnail: { mode: "none" },
          },
          body: "本文",
          revision: "ja-revision",
        },
        en: {
          meta: {
            title: "Image test",
            date: "2026-08-04",
            tags: [],
            sumup: { mode: "none" },
            thumbnail: { mode: "none" },
          },
          body: "Body",
          revision: "en-revision",
        },
      },
    };
    let uploadIndex = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (path, options = {}) => {
        let payload;
        if (path === "/api/editor/content") {
          payload = {
            items: [
              {
                kind: "post",
                id: content.id,
                title: { ja: "画像テスト", en: "Image test" },
                updatedAt: "2026-08-04T00:00:00.000Z",
              },
            ],
          };
        } else if (path.endsWith("/assets")) {
          uploadIndex += 1;
          const { name } = JSON.parse(options.body);
          payload = {
            name,
            url: `/content-assets/posts/${content.id}/image-${uploadIndex}.png`,
          };
        } else if (path === "/api/editor/preview") {
          payload = { html: "" };
        } else {
          payload = content;
        }
        return { ok: true, json: async () => payload };
      }),
    );

    const { container } = render(<EditorRoot />);
    fireEvent.click(await screen.findByRole("button", { name: /画像テスト/ }));
    await waitFor(() => expect(container.querySelector(".markdown-editor")).toBeTruthy());

    expect(screen.getByRole("button", { name: "写真を選ぶ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "撮影する" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "見出し" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "文字装飾" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "ブロック" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "画像" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /その他/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "変更履歴" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /その他/ }));
    expect(screen.getByRole("menuitem", { name: "変更履歴" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "公開版へ戻す" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "分割" })).toBeInTheDocument();
    expect(container.querySelector('input[capture="environment"]')).toBeTruthy();
    expect(screen.getByTitle("公開サイトと同じ見た目のプレビュー")).toBeInTheDocument();

    const imageInput = container.querySelector('input[type="file"]');
    fireEvent.change(imageInput, {
      target: {
        files: [
          new File(["one"], "one.png", { type: "image/png" }),
          new File(["two"], "two.png", { type: "image/png" }),
        ],
      },
    });
    fireEvent.click(await screen.findByRole("button", { name: "2件を保存して挿入" }));

    await waitFor(() => {
      const markdown = container.querySelector(".cm-content").textContent;
      expect(markdown).toContain(`/image-1.png`);
      expect(markdown).toContain(`/image-2.png`);
    });
    expect(uploadIndex).toBe(2);
  });

  test("removes split mode from phone-width layouts", async () => {
    vi.stubGlobal("matchMedia", (query) => ({
      matches: query === "(max-width: 900px)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const content = {
      kind: "post",
      id: "20260804-123456",
      status: "published",
      files: {
        ja: {
          meta: { title: "スマホ", date: "2026-08-04", tags: [] },
          body: "本文",
          revision: "ja-revision",
        },
        en: {
          meta: { title: "Phone", date: "2026-08-04", tags: [] },
          body: "Body",
          revision: "en-revision",
        },
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (path) => ({
        ok: true,
        json: async () =>
          path === "/api/editor/content"
            ? {
                items: [
                  {
                    kind: "post",
                    id: content.id,
                    title: { ja: "スマホ", en: "Phone" },
                    updatedAt: "2026-08-04T00:00:00.000Z",
                    status: "published",
                  },
                ],
              }
            : path === "/api/editor/preview"
              ? { html: "<p>本文</p>" }
              : content,
      })),
    );

    render(<EditorRoot />);
    fireEvent.click(screen.getByRole("button", { name: "コンテンツ一覧を開く" }));
    fireEvent.click(await screen.findByRole("button", { name: /スマホ/ }));

    expect(await screen.findByRole("radio", { name: "編集" })).toBeChecked();
    expect(screen.queryByRole("radio", { name: "分割" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "プレビュー" })).toBeInTheDocument();
  });
});
