import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import EditorRoot, { publicationIsLive } from "../src/editor/EditorRoot.jsx";

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
    const sidebar = container.querySelector(".editor-sidebar");
    expect(screen.getByRole("button", { name: "コンテンツ一覧を閉じる" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "コンテンツ一覧を閉じる" }));
    expect(sidebar).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".editor-shell")).toHaveClass("is-sidebar-collapsed");
    fireEvent.click(screen.getByRole("button", { name: "コンテンツ一覧を開く" }));
    expect(sidebar).not.toHaveAttribute("aria-hidden");
    expect(container.querySelector(".editor-shell")).toHaveClass("is-sidebar-open");
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
      currentRevisionId: "revision-0",
      visibility: "private",
      deletedAt: null,
      assets: [],
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
    const uploadBodies = [];
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
          const body = JSON.parse(options.body);
          uploadBodies.push(body);
          payload = {
            name: body.name,
            url: `/content-assets/posts/${content.id}/image-${uploadIndex}.png`,
            currentRevisionId: `revision-${uploadIndex}`,
            assets: [{ logicalPath: `assets/image-${uploadIndex}.png` }],
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
    expect(screen.getByRole("menuitem", { name: "削除" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "分割" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "公開設定を開く" }));
    expect(screen.getByRole("complementary", { name: "公開設定" })).toHaveTextContent("公開");
    expect(screen.getByRole("heading", { name: "公開設定" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "パネルを閉じる" }));
    fireEvent.click(screen.getByRole("button", { name: "アウトラインを開く" }));
    expect(screen.getByRole("complementary", { name: "文書アウトライン" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "パネルを閉じる" }));
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
    expect(uploadBodies.map(({ currentRevisionId }) => currentRevisionId)).toEqual([
      "revision-0",
      "revision-1",
    ]);
  });

  test("picks work images by upload and from images already attached", async () => {
    const content = {
      kind: "work",
      id: "linewatch",
      currentRevisionId: "revision-0",
      visibility: "private",
      deletedAt: null,
      assets: [{ logicalPath: "assets/screenshot.png", role: "body" }],
      files: {
        ja: {
          meta: { title: "LineWatch", year: 2025, stack: [], thumbnail: "", hero: "" },
          body: "本文",
          revision: "ja-revision",
        },
        en: { meta: { title: "LineWatch" }, body: "Body", revision: "en-revision" },
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (path, options = {}) => {
        let payload;
        if (path === "/api/editor/content") {
          payload = {
            items: [
              {
                kind: "work",
                id: content.id,
                title: { ja: "LineWatch", en: "LineWatch" },
                updatedAt: "2026-08-04T00:00:00.000Z",
              },
            ],
          };
        } else if (path.endsWith("/assets")) {
          payload = {
            name: JSON.parse(options.body).name,
            url: `/content-assets/works/${content.id}/hero.png`,
            currentRevisionId: "revision-1",
            assets: [
              { logicalPath: "assets/screenshot.png", role: "body" },
              { logicalPath: "assets/hero.png", role: "body" },
            ],
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
    fireEvent.click(await screen.findByText("Works"));
    fireEvent.click(await screen.findByRole("button", { name: /LineWatch/ }));
    await waitFor(() => expect(container.querySelector(".markdown-editor")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "公開設定を開く" }));

    // The two work image fields were plain text inputs before; each now offers
    // an upload and a list of the images already attached to the work.
    const listField = screen.getByLabelText("一覧画像を保存済みの画像から選ぶ");
    const heroInput = screen.getByLabelText("ヒーロー画像をアップロード");
    expect(listField).toBeInTheDocument();
    expect(screen.getByLabelText("一覧画像をアップロード")).toBeInTheDocument();

    fireEvent.change(listField, {
      target: { value: `/content-assets/works/${content.id}/screenshot.png` },
    });
    await waitFor(() =>
      expect(
        container.querySelector(
          `input[value="/content-assets/works/${content.id}/screenshot.png"]`,
        ),
      ).toBeTruthy(),
    );

    fireEvent.change(heroInput, {
      target: { files: [new File(["hero"], "hero.png", { type: "image/png" })] },
    });
    await waitFor(() =>
      expect(
        container.querySelector(`input[value="/content-assets/works/${content.id}/hero.png"]`),
      ).toBeTruthy(),
    );
  });

  test("restores the generated thumbnail after a post points at another image", async () => {
    const generated = "/thumbnails/20260804-123456.png";
    const content = {
      kind: "post",
      id: "20260804-123456",
      currentRevisionId: "revision-0",
      visibility: "private",
      deletedAt: null,
      assets: [{ logicalPath: "thumbnails/20260804-123456.png", role: "thumbnail" }],
      files: {
        ja: {
          meta: {
            title: "サムネイル",
            date: "2026-08-04",
            tags: [],
            sumup: { mode: "none" },
            thumbnail: { mode: "file", path: generated, generated: true },
          },
          body: "本文",
          revision: "ja-revision",
        },
        en: {
          meta: {
            title: "Thumbnail",
            date: "2026-08-04",
            tags: [],
            sumup: { mode: "none" },
            thumbnail: { mode: "file", path: generated, generated: true },
          },
          body: "Body",
          revision: "en-revision",
        },
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (path) => {
        let payload;
        if (path === "/api/editor/content") {
          payload = {
            items: [
              {
                kind: "post",
                id: content.id,
                title: { ja: "サムネイル", en: "Thumbnail" },
                updatedAt: "2026-08-04T00:00:00.000Z",
              },
            ],
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
    fireEvent.click(await screen.findByRole("button", { name: /サムネイル/ }));
    await waitFor(() => expect(container.querySelector(".markdown-editor")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "公開設定を開く" }));

    // Nothing to restore while the generated image is still the one in use.
    expect(screen.queryByRole("button", { name: "自動生成の画像に戻す" })).not.toBeInTheDocument();

    const pathInput = container.querySelector(`input[value="${generated}"]`);
    fireEvent.change(pathInput, { target: { value: "/uploads/other.png" } });

    const restore = await screen.findByRole("button", { name: "自動生成の画像に戻す" });
    fireEvent.click(restore);

    await waitFor(() =>
      expect(container.querySelector(`input[value="${generated}"]`)).toBeTruthy(),
    );
    expect(screen.queryByRole("button", { name: "自動生成の画像に戻す" })).not.toBeInTheDocument();
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

    expect(await screen.findByRole("tab", { name: "編集" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.queryByRole("tab", { name: "分割" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "プレビュー" })).toBeInTheDocument();
  });

  test("keeps content context while polling a Worker publication job", async () => {
    const content = {
      kind: "post",
      id: "20260812-101500",
      currentRevisionId: "revision-1",
      visibility: "public",
      deletedAt: null,
      status: "public",
      files: {
        ja: {
          meta: { title: "公開ジョブ", date: "2026-08-12", tags: [] },
          body: "本文",
          revision: "revision-1",
        },
        en: {
          meta: { title: "Publication job", date: "2026-08-12", tags: [] },
          body: "Body",
          revision: "revision-1",
        },
      },
    };
    const publishPath = `/api/editor/content/post/${content.id}/publish`;
    const contentPath = `/api/editor/content/post/${content.id}`;
    const fetchMock = vi.fn(async (path, options = {}) => {
      let payload;
      if (path === "/api/editor/content") {
        payload = {
          items: [
            {
              kind: "post",
              id: content.id,
              title: { ja: "公開ジョブ", en: "Publication job" },
              updatedAt: "2026-08-12T01:15:00.000Z",
              status: "public",
              visibility: "public",
            },
          ],
        };
      } else if (path === "/api/editor/preview") {
        payload = { html: "<p>本文</p>" };
      } else if (path === publishPath && options.method === "POST") {
        payload = {
          id: "00000000-0000-4000-8000-000000000001",
          kind: "post",
          contentId: content.id,
          status: "running",
          phase: "queued",
        };
      } else if (path === publishPath) {
        payload = { valid: true, issues: [], visibility: "public", deletedAt: null };
      } else if (path === "/api/editor/publish/00000000-0000-4000-8000-000000000001") {
        payload = { id: "00000000-0000-4000-8000-000000000001", status: "succeeded" };
      } else if (path === contentPath) {
        payload = content;
      } else {
        throw new Error(`Unexpected request: ${path}`);
      }
      return { ok: true, json: async () => payload };
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<EditorRoot />);
    fireEvent.click(await screen.findByRole("button", { name: /公開ジョブ/ }));
    await waitFor(() => expect(container.querySelector(".markdown-editor")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "公開" }));
    fireEvent.click(await screen.findByRole("button", { name: "公開処理を開始" }));

    await waitFor(
      () => {
        expect(fetchMock.mock.calls.filter(([path]) => path === contentPath)).toHaveLength(2);
      },
      { timeout: 2500 },
    );
    expect(fetchMock.mock.calls.some(([path]) => String(path).includes("undefined"))).toBe(false);
  });

  test("treats a retry as under way until the new run touches the job row", () => {
    // Publishing again after a failure dispatches a fresh run against the same
    // row, which still holds the previous attempt's failure.
    expect(publicationIsLive({ status: "failed", attempts: 1, dispatchedAttempts: 1 })).toBe(true);
    // The run has started and written to the row, so what it says is this
    // attempt's answer.
    expect(publicationIsLive({ status: "failed", attempts: 2, dispatchedAttempts: 1 })).toBe(false);
    expect(publicationIsLive({ status: "running", attempts: 2, dispatchedAttempts: 1 })).toBe(true);
    expect(publicationIsLive({ status: "succeeded", attempts: 1, dispatchedAttempts: 0 })).toBe(
      false,
    );
    expect(publicationIsLive(null)).toBe(false);
  });

  test("shows which stage of the publication is running", async () => {
    const content = {
      kind: "post",
      id: "20260814-090000",
      currentRevisionId: "revision-1",
      visibility: "public",
      deletedAt: null,
      status: "public",
      files: {
        ja: {
          meta: { title: "進捗", date: "2026-08-14", tags: [] },
          body: "本文",
          revision: "revision-1",
        },
        en: {
          meta: { title: "Progress", date: "2026-08-14", tags: [] },
          body: "Body",
          revision: "revision-1",
        },
      },
    };
    const publishPath = `/api/editor/content/post/${content.id}/publish`;
    const progress = {
      state: "running",
      stages: [
        "公開の受付",
        "準備",
        "英訳と付加情報の生成",
        "候補リリースの作成",
        "検証",
        "サイトへの反映",
      ],
      stageKey: "translate",
      stageLabel: "英訳と付加情報の生成",
      stageIndex: 2,
      stageCount: 6,
      stepLabel: "日本語から英語への翻訳",
      completedSteps: 12,
      totalSteps: 14,
      percent: 40,
      runUrl: "https://github.invalid/job/1",
      startedAt: new Date(Date.now() - 95_000).toISOString(),
    };
    const fetchMock = vi.fn(async (path, options = {}) => {
      let payload;
      if (path === "/api/editor/content") {
        payload = {
          items: [
            {
              kind: "post",
              id: content.id,
              title: { ja: "進捗", en: "Progress" },
              updatedAt: "2026-08-14T00:00:00.000Z",
              status: "public",
              visibility: "public",
            },
          ],
        };
      } else if (path === "/api/editor/preview") {
        payload = { html: "<p>本文</p>" };
      } else if (path === publishPath && options.method === "POST") {
        payload = {
          id: "00000000-0000-4000-8000-000000000002",
          kind: "post",
          contentId: content.id,
          status: "running",
          phase: "running",
          progress,
        };
      } else if (path === publishPath) {
        payload = { valid: true, issues: [], visibility: "public", deletedAt: null };
      } else if (path.startsWith("/api/editor/publish/")) {
        payload = { id: "00000000-0000-4000-8000-000000000002", status: "running", progress };
      } else {
        payload = content;
      }
      return { ok: true, json: async () => payload };
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<EditorRoot />);
    fireEvent.click(await screen.findByRole("button", { name: /進捗/ }));
    await waitFor(() => expect(container.querySelector(".markdown-editor")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "公開" }));
    fireEvent.click(await screen.findByRole("button", { name: "公開処理を開始" }));

    const panel = await screen.findByRole("region", { name: "公開の進捗" });
    expect(panel).toHaveTextContent("公開中");
    expect(panel).toHaveTextContent("日本語から英語への翻訳");
    expect(panel).toHaveTextContent("12/14 ステップ");
    expect(panel).toHaveTextContent("経過 1分35秒");
    expect(screen.getByRole("progressbar", { name: "公開の進み具合（目安）" })).toHaveAttribute(
      "aria-valuenow",
      "40",
    );
    expect(screen.getByRole("link", { name: "GitHub Actions の実行を開く" })).toHaveAttribute(
      "href",
      "https://github.invalid/job/1",
    );
    const current = container.querySelector('.editor-publish-stages li[data-state="current"]');
    expect(current).toHaveTextContent("英訳と付加情報の生成");
  });

  test("opens About without loading Markdown and exposes its structured fields", async () => {
    const content = {
      kind: "about",
      id: "about",
      status: "published",
      files: {
        ja: {
          meta: {
            person: {
              icon: "/avator.jpg",
              name: "日本語の名前",
              role: "学生",
              location: "Oita",
              tagline: "",
              bio: ["紹介"],
              activities: [{ title: "活動", description: "" }],
              career: [],
              education: [],
              links: [{ label: "GitHub", href: "https://github.com/example" }],
            },
            newsConfig: { file: "news.ja.toml", count: 5 },
            newsItems: [{ date: "2026-08-10", title: "更新", description: "" }],
          },
          body: "",
          revision: "ja-revision",
        },
        en: {
          meta: {
            person: {
              icon: "/avator.jpg",
              name: "English name",
              role: "Student",
              location: "Oita",
              tagline: "",
              bio: ["Bio"],
              activities: [{ title: "Activity", description: "" }],
              career: [],
              education: [],
              links: [{ label: "GitHub", href: "https://github.com/example" }],
            },
            newsConfig: { file: "news.en.toml", count: 5 },
            newsItems: [{ date: "2026-08-10", title: "Update", description: "" }],
          },
          body: "",
          revision: "en-revision",
        },
      },
    };
    const fetchMock = vi.fn(async (path) => ({
      ok: true,
      json: async () =>
        path === "/api/editor/content"
          ? {
              items: [
                {
                  kind: "about",
                  id: "about",
                  title: { ja: "日本語の名前", en: "English name" },
                  updatedAt: "2026-08-10T00:00:00.000Z",
                  status: "published",
                },
              ],
            }
          : content,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<EditorRoot />);
    fireEvent.click(screen.getByRole("radio", { name: "About" }));
    fireEvent.click(await screen.findByRole("button", { name: /日本語の名前/ }));

    expect(await screen.findByRole("heading", { name: "About" })).toBeInTheDocument();
    expect(container.querySelector(".editor-save-status")).toBeNull();
    expect(
      screen.queryByRole("textbox", { name: /タイトル|記事タイトル|作品名/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "名前" })).toHaveValue("日本語の名前");
    expect(screen.getByRole("button", { name: "写真を選ぶ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "撮影する" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activityを追加" })).toBeInTheDocument();
    expect(screen.queryByRole("toolbar", { name: "Markdown書式" })).not.toBeInTheDocument();
    expect(container.querySelector(".markdown-editor")).toBeNull();
    expect(fetchMock.mock.calls.some(([path]) => path === "/api/editor/preview")).toBe(false);
  });
});
