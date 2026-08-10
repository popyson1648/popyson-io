import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import "../styles.css";
import "virtual:theme.css";
import "../app.css";
import { APPS } from "virtual:site-content";
import { Icon, L, Ph } from "../components.jsx";
import { makeDateLabel } from "../dateLabel.js";
import { splitLinks } from "../linkText.js";
import "./preview.css";

const MESSAGE_CONTENT = "popyson-editor-preview-content";
const MESSAGE_SCROLL_TO = "popyson-editor-preview-scroll-to";
const MESSAGE_SCROLL = "popyson-editor-preview-scroll";

function validPayload(value) {
  return (
    value &&
    typeof value === "object" &&
    ["post", "work", "about"].includes(value.kind) &&
    ["ja", "en"].includes(value.locale) &&
    (value.kind === "about" || typeof value.html === "string") &&
    value.meta &&
    typeof value.meta === "object"
  );
}

function RichText({ text }) {
  return splitLinks(text).map((part, index) =>
    part.type === "link" ? (
      <a
        key={`${index}:${part.href}`}
        href={part.href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-link"
      >
        {part.value}
      </a>
    ) : (
      part.value
    ),
  );
}

function AboutPreview({ data }) {
  const person = data.meta.person || {};
  const news = (data.meta.newsItems || []).slice(
    0,
    Number(data.meta.newsConfig?.count) || Infinity,
  );
  const [openActivity, setOpenActivity] = useState(null);
  const labels =
    data.locale === "ja"
      ? {
          news: "News",
          activity: "Activity",
          career: "Career",
          education: "Education",
          made: "Made",
        }
      : {
          news: "News",
          activity: "Activity",
          career: "Career",
          education: "Education",
          made: "Made",
        };
  const linkIcon = (label) => {
    if (label === "GitHub") return <Icon.github width={15} height={15} />;
    if (label === "X") return <Icon.xcom width={14} height={14} />;
    if (label === "LinkedIn") return <Icon.linkedin width={15} height={15} />;
    if (label === "Wantedly") return <Icon.wantedly width={15} height={15} />;
    if (label === "RSS") return <Icon.rss width={15} height={15} />;
    if (label.includes("@") || label.includes(" at ")) return <Icon.mail width={15} height={15} />;
    return <Icon.ext width={14} height={14} />;
  };

  return (
    <main className="app-main preview-site-main">
      <div className="container route-fade">
        <div className="about-top">
          {person.icon && <img className="avatar avatar-img" src={person.icon} alt="" />}
          <div>
            <h2 className="about-name">{person.name}</h2>
            <div className="about-role">
              {person.role} · {person.location}
            </div>
            {person.tagline && <p className="about-tag">{person.tagline}</p>}
            <div className="links-row">
              {(person.links || []).map((link) =>
                link.href && !link.href.startsWith("mailto:") ? (
                  <a
                    key={link.label}
                    className="profile-link"
                    href={link.href}
                    target={link.href.startsWith("/") ? undefined : "_blank"}
                    rel={link.href.startsWith("/") ? undefined : "noopener noreferrer"}
                  >
                    {linkIcon(link.label)}
                    {link.label}
                  </a>
                ) : (
                  <span key={link.label} className="profile-link profile-link-text">
                    {linkIcon(link.label)}
                    {link.label}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 32 }}>
          {(person.bio || []).filter(Boolean).map((paragraph, index) => (
            <p
              key={`${index}:${paragraph}`}
              style={{ maxWidth: "62ch", color: "var(--text-muted)", lineHeight: 1.8 }}
            >
              {paragraph}
            </p>
          ))}
        </div>
        <div className="about-grid">
          {news.length > 0 && (
            <div className="about-block about-block-wide">
              <h2>{labels.news}</h2>
              <div className="news-list">
                {news.map((item, index) => (
                  <div className="news-item" key={`${item.date}:${index}`}>
                    <div className="news-date">
                      {makeDateLabel(item.date)[data.locale] || item.date}
                    </div>
                    <div>
                      {item.href ? (
                        <a className="news-title news-link" href={item.href}>
                          <span>{item.title}</span>
                          {!item.href.startsWith("/") && <Icon.ext width={13} height={13} />}
                        </a>
                      ) : (
                        <div className="news-title">{item.title}</div>
                      )}
                      {item.description && (
                        <div className="news-desc">
                          <RichText text={item.description} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="about-block">
            <h2>{labels.activity}</h2>
            <div className="act-list">
              {(person.activities || []).map((item, index) => {
                const expanded = openActivity === index;
                return (
                  <div className="act-item" key={`${index}:${item.title}`}>
                    {item.description ? (
                      <>
                        <button
                          className="act-toggle"
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => setOpenActivity(expanded ? null : index)}
                        >
                          <span>{item.title}</span>
                          <Icon.chevron className={expanded ? "open" : ""} width={14} height={14} />
                        </button>
                        {expanded && (
                          <div className="act-detail">
                            <RichText text={item.description} />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="act-static">{item.title}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="about-col">
            <div className="about-block">
              <h2>{labels.career}</h2>
              <div className="timeline">
                {(person.career || []).map((item, index) => (
                  <div className="tl-item" key={`${index}:${item.period}`}>
                    <div className="tl-period">{item.period}</div>
                    <div>
                      <div className="tl-role">{item.role}</div>
                      {item.org && <div className="tl-org">{item.org}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="about-block">
              <h2>{labels.education}</h2>
              <div className="timeline">
                {(person.education || []).map((item, index) => (
                  <div className="tl-item" key={`${index}:${item.period}`}>
                    <div className="tl-period">{item.period}</div>
                    <div>
                      <div className="tl-role">{item.school}</div>
                      {item.description && (
                        <div className="tl-org">
                          <RichText text={item.description} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 40 }}>
          <div className="about-block">
            <h2>{labels.made}</h2>
            <div className="made-grid">
              {APPS.slice(0, 4).map((app) => (
                <div className="made-card" key={app.id}>
                  <div className="made-title">{L(app.title, data.locale)}</div>
                  <div className="made-sub">{L(app.tagline, data.locale)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
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
  if (data.kind === "post") return <BlogPreview data={data} />;
  if (data.kind === "work") return <WorkPreview data={data} />;
  return <AboutPreview data={data} />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PreviewRoot />
  </React.StrictMode>,
);
