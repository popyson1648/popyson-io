import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import "../styles.css";
import "virtual:theme.css";
import "../app.css";
import { Ph } from "../components.jsx";
import "./preview.css";

const MESSAGE_CONTENT = "popyson-editor-preview-content";
const MESSAGE_SCROLL_TO = "popyson-editor-preview-scroll-to";
const MESSAGE_SCROLL = "popyson-editor-preview-scroll";

function validPayload(value) {
  return (
    value &&
    typeof value === "object" &&
    ["post", "work"].includes(value.kind) &&
    ["ja", "en"].includes(value.locale) &&
    typeof value.html === "string" &&
    value.meta &&
    typeof value.meta === "object"
  );
}

function headingsFromHtml(html) {
  const document = new DOMParser().parseFromString(html, "text/html");
  return [...document.querySelectorAll("h2[id], h3[id], h4[id]")].map((heading) => ({
    id: heading.id,
    text: heading.textContent || "",
    depth: Number(heading.tagName.slice(1)),
  }));
}

function PreviewBody({ html }) {
  const proseRef = useRef(null);

  useEffect(() => {
    const root = proseRef.current;
    if (!root) return undefined;
    const click = (event) => {
      const button = event.target.closest?.(".code-copy");
      if (!button || !root.contains(button)) return;
      const code = button.closest(".code")?.querySelector(".code-highlight")?.textContent || "";
      navigator.clipboard?.writeText(code);
      button.dataset.copied = "true";
      window.setTimeout(() => {
        button.dataset.copied = "false";
      }, 1400);
    };
    root.addEventListener("click", click);
    return () => root.removeEventListener("click", click);
  }, []);

  return (
    <div
      ref={proseRef}
      className="prose"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is produced by the site's safe Markdown renderer.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function BlogPreview({ data }) {
  const headings = useMemo(() => headingsFromHtml(data.html), [data.html]);
  const tags = Array.isArray(data.meta.tags) ? data.meta.tags : [];
  const date =
    data.meta.date instanceof Date ? data.meta.date.toISOString().slice(0, 10) : data.meta.date;
  const minutes = data.metrics?.minutes || 1;

  return (
    <main className="app-main preview-site-main">
      <div className="container article-shell">
        {headings.length > 0 && (
          <aside className="article-toc" aria-label={data.locale === "ja" ? "目次" : "Contents"}>
            <div className="toc-title">{data.locale === "ja" ? "目次" : "Contents"}</div>
            <ol className="toc-list">
              {headings.map((heading) => (
                <li key={heading.id} className={`preview-toc-depth-${heading.depth}`}>
                  <a href={`#${heading.id}`}>{heading.text}</a>
                </li>
              ))}
            </ol>
          </aside>
        )}
        <article className="article">
          <button className="article-back" type="button" disabled>
            ← {data.locale === "ja" ? "ブログ一覧" : "Back to Blog"}
          </button>
          <div className="article-head">
            <h1>{data.meta.title || (data.locale === "ja" ? "無題の下書き" : "Untitled draft")}</h1>
            <div className="article-meta">
              <span>{String(date || "auto")}</span>
              <span>
                {minutes} {data.locale === "ja" ? "分で読めます" : "min read"}
              </span>
            </div>
            <div className="article-tags">
              {tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          </div>
          <PreviewBody html={data.html} />
        </article>
      </div>
    </main>
  );
}

function WorkPreview({ data }) {
  const shared = data.sharedMeta || data.meta;
  const stack = Array.isArray(shared.stack) ? shared.stack : [];
  return (
    <main className="app-main preview-site-main">
      <div className="container">
        <div className="adetail">
          <button className="btn btn-ghost" type="button" disabled>
            ← {data.locale === "ja" ? "Works一覧" : "Back to Works"}
          </button>
          <h1>{data.meta.title || (data.locale === "ja" ? "無題の下書き" : "Untitled draft")}</h1>
          <div className="adetail-tagline">{data.meta.tagline || ""}</div>
          {shared.hero ? (
            <img className="adetail-hero" src={shared.hero} alt="" />
          ) : (
            <Ph className="adetail-hero" />
          )}
          <PreviewBody html={data.html} />
          <div className="adetail-side">
            <div className="kv">
              <span className="k">{data.locale === "ja" ? "使用技術" : "Stack"}</span>
              <span>{stack.join(" · ")}</span>
            </div>
            <div className="kv">
              <span className="k">{data.locale === "ja" ? "公開年" : "Year"}</span>
              <span>{shared.year || "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function PreviewRoot() {
  const [data, setData] = useState(null);
  const ignoreScroll = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const preference = localStorage.getItem("blog.theme") || "system";
      document.documentElement.dataset.theme =
        preference === "system" ? (media.matches ? "dark" : "light") : preference;
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    window.addEventListener("storage", applyTheme);
    return () => {
      media.removeEventListener("change", applyTheme);
      window.removeEventListener("storage", applyTheme);
    };
  }, []);

  useEffect(() => {
    const receive = (event) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if (event.data?.type === MESSAGE_CONTENT && validPayload(event.data.payload)) {
        document.documentElement.lang = event.data.payload.locale;
        setData(event.data.payload);
      }
      if (event.data?.type === MESSAGE_SCROLL_TO) {
        const ratio = Number(event.data.ratio);
        if (!Number.isFinite(ratio)) return;
        ignoreScroll.current = true;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({ top: Math.max(0, Math.min(1, ratio)) * Math.max(0, max) });
        requestAnimationFrame(() => {
          ignoreScroll.current = false;
        });
      }
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "popyson-editor-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);

  useEffect(() => {
    const report = () => {
      if (ignoreScroll.current) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.parent.postMessage(
        { type: MESSAGE_SCROLL, ratio: max > 0 ? window.scrollY / max : 0 },
        window.location.origin,
      );
    };
    window.addEventListener("scroll", report, { passive: true });
    return () => window.removeEventListener("scroll", report);
  }, []);

  if (!data) return <div className="preview-loading">プレビューを準備しています…</div>;
  return data.kind === "post" ? <BlogPreview data={data} /> : <WorkPreview data={data} />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PreviewRoot />
  </React.StrictMode>,
);
