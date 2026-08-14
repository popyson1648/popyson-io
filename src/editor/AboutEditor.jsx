import { useEffect, useState } from "react";
import { Button } from "smarthr-ui/lib/components/Button/index";
import { FormControl } from "smarthr-ui/lib/components/FormControl/index";
import { FaCameraIcon, FaImageIcon, FaPlusIcon } from "smarthr-ui/lib/components/Icon/index";
import { Input } from "smarthr-ui/lib/components/Input/index";
import { Textarea } from "smarthr-ui/lib/components/Textarea/index";

import { compareNewsDates, newsDateOf } from "./newsOrder.js";

export const NEWS_PAGE_SIZE = 5;

function TextField({ label, value, onChange, type = "text", helpMessage = undefined }) {
  return (
    <FormControl label={label} helpMessage={helpMessage}>
      <Input
        type={type}
        width="100%"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </FormControl>
  );
}

function ItemActions({ index, count, label, onMove, onRemove }) {
  return (
    <div className="editor-about-item-actions">
      {onMove && (
        <>
          <Button
            size="S"
            variant="text"
            disabled={index === 0}
            aria-label={`${label} ${index + 1}を上へ移動`}
            onClick={() => onMove(index, -1)}
          >
            上へ
          </Button>
          <Button
            size="S"
            variant="text"
            disabled={index === count - 1}
            aria-label={`${label} ${index + 1}を下へ移動`}
            onClick={() => onMove(index, 1)}
          >
            下へ
          </Button>
        </>
      )}
      <Button
        size="S"
        variant="text"
        aria-label={`${label} ${index + 1}を削除`}
        onClick={() => onRemove(index)}
      >
        削除
      </Button>
    </div>
  );
}

// One page of a long list, Gmail style: the range and the total, with a step on
// either side. `page` is zero-based and always in range because the caller
// clamps it against the current item count.
function Pager({ label, page, pageSize, total, onPage }) {
  const last = Math.max(0, Math.ceil(total / pageSize) - 1);
  return (
    <div className="editor-about-pager">
      <Button
        size="S"
        variant="text"
        disabled={page === 0}
        aria-label={`${label}の前のページ`}
        onClick={() => onPage(page - 1)}
      >
        ‹
      </Button>
      <span>
        {page * pageSize + 1}–{Math.min(total, (page + 1) * pageSize)} / {total}
      </span>
      <Button
        size="S"
        variant="text"
        disabled={page >= last}
        aria-label={`${label}の次のページ`}
        onClick={() => onPage(page + 1)}
      >
        ›
      </Button>
    </div>
  );
}

function RepeatableSection({
  title,
  description = "",
  items,
  fields,
  onField,
  onAdd,
  onMove = undefined,
  onRemove,
  pageSize = 0,
  page = 0,
  onPage = undefined,
}) {
  const paged = pageSize > 0 && items.length > pageSize;
  const offset = paged ? page * pageSize : 0;
  const visible = paged ? items.slice(offset, offset + pageSize) : items;
  return (
    <details className="editor-about-section" open>
      <summary>
        <span>{title}</span>
        <span>{items.length}件</span>
      </summary>
      <div className="editor-about-section-body">
        {description && <p className="editor-about-help">{description}</p>}
        <div className="editor-about-repeat-list">
          {visible.map((item, visibleIndex) => {
            const index = offset + visibleIndex;
            return (
              <article className="editor-about-card" key={`${title}:${index}`}>
                <header>
                  <strong>{index + 1}</strong>
                  <ItemActions
                    index={index}
                    count={items.length}
                    label={title}
                    onMove={onMove}
                    onRemove={onRemove}
                  />
                </header>
                <div className="editor-about-grid">
                  {fields.map((field) => (
                    <TextField
                      key={field.key}
                      label={field.label}
                      type={field.type}
                      value={item?.[field.key]}
                      helpMessage={field.helpMessage}
                      onChange={(value) => onField(index, field.key, value)}
                    />
                  ))}
                </div>
              </article>
            );
          })}
        </div>
        {paged && (
          <Pager
            label={title}
            page={page}
            pageSize={pageSize}
            total={items.length}
            onPage={onPage}
          />
        )}
        <Button size="S" variant="secondary" prefix={<FaPlusIcon alt="" />} onClick={onAdd}>
          {title}を追加
        </Button>
      </div>
    </details>
  );
}

const EMPTY_ITEMS = {
  activities: { title: "", description: "" },
  career: { period: "", role: "", org: "" },
  education: { period: "", school: "", description: "" },
  newsItems: { date: "", title: "", description: "", href: "" },
};

function newsItemsOf(files, locale) {
  const items = files[locale]?.meta?.newsItems;
  return Array.isArray(items) ? items : [];
}

// The two locales describe the same events in the same positions, so an entry
// only has a counterpart while the lists are the same length.
export function newsLocalesArePaired(files) {
  return newsItemsOf(files, "ja").length === newsItemsOf(files, "en").length;
}

/**
 * A News date names the same event in both locales, so the two sides are kept
 * equal and the list is ordered by it. Lists of differing lengths are left
 * untouched: position no longer says which entries belong together, and
 * reordering or copying a date across would attach it to the wrong event. The
 * parity check reports that state, and the counts are the thing to fix first.
 */
export function normalizeNewsItems(files) {
  if (!newsLocalesArePaired(files)) return files;
  const ja = newsItemsOf(files, "ja");
  const en = newsItemsOf(files, "en");
  for (const [index, item] of ja.entries()) {
    const date = newsDateOf(item) || newsDateOf(en[index]);
    item.date = date;
    en[index].date = date;
  }
  const order = ja
    .map((item, index) => ({ index, date: newsDateOf(item) }))
    .sort((a, b) => compareNewsDates(a.date, b.date) || a.index - b.index)
    .map((entry) => entry.index);
  for (const fileLocale of ["ja", "en"]) {
    const items = newsItemsOf(files, fileLocale);
    files[fileLocale].meta.newsItems = order.map((index) => items[index]);
  }
  return files;
}

function newsSignature(files) {
  return JSON.stringify(["ja", "en"].map((locale) => newsItemsOf(files, locale)));
}

export default function AboutEditor({ files, locale, onChange, onChooseAvatar, onTakeAvatar }) {
  const active = files[locale].meta;
  const person = active.person || {};
  const newsItems = active.newsItems || [];
  const [newsPage, setNewsPage] = useState(0);
  // Clamped on read: removing entries can leave the stored page past the end.
  const currentNewsPage = Math.min(
    Math.max(newsPage, 0),
    Math.max(0, Math.ceil(newsItems.length / NEWS_PAGE_SIZE) - 1),
  );

  // Entries stored before the date was shared can be out of order or missing the
  // English date. normalizeNewsItems is idempotent, so this repairs such content
  // once, on the first render that sees it, and then stays quiet.
  useEffect(() => {
    const next = normalizeNewsItems(structuredClone(files));
    if (newsSignature(next) !== newsSignature(files)) onChange(next);
  }, [files, onChange]);

  const mutate = (callback) => {
    const next = structuredClone(files);
    callback(next);
    onChange(normalizeNewsItems(next));
  };
  const setPerson = (field, value) =>
    mutate((next) => {
      next[locale].meta.person ||= {};
      next[locale].meta.person[field] = value;
    });
  const setSharedPerson = (field, value) =>
    mutate((next) => {
      for (const fileLocale of ["ja", "en"]) {
        next[fileLocale].meta.person ||= {};
        next[fileLocale].meta.person[field] = structuredClone(value);
      }
    });
  const setNewsCount = (value) =>
    mutate((next) => {
      for (const fileLocale of ["ja", "en"]) {
        next[fileLocale].meta.newsConfig ||= {};
        next[fileLocale].meta.newsConfig.count = value;
      }
    });
  const updateItem = (field, index, key, value) =>
    mutate((next) => {
      next[locale].meta.person[field][index][key] = value;
    });
  const addPaired = (field) =>
    mutate((next) => {
      for (const fileLocale of ["ja", "en"]) {
        next[fileLocale].meta.person[field] ||= [];
        next[fileLocale].meta.person[field].push(structuredClone(EMPTY_ITEMS[field]));
      }
    });
  const removePaired = (field, index) =>
    mutate((next) => {
      for (const fileLocale of ["ja", "en"]) {
        next[fileLocale].meta.person[field].splice(index, 1);
      }
    });
  const movePaired = (field, index, direction) =>
    mutate((next) => {
      const target = index + direction;
      for (const fileLocale of ["ja", "en"]) {
        const list = next[fileLocale].meta.person[field];
        [list[index], list[target]] = [list[target], list[index]];
      }
    });
  // The date is one value shown twice: writing it to both locales keeps the
  // ordering identical and stops the other locale from being left without one.
  // While the lists have different lengths there is no counterpart to write to,
  // so the date stays on the locale being edited until the counts are fixed.
  const shareNewsDate = newsLocalesArePaired(files);
  // English prose is written by the publication translation, so an empty field
  // here is a normal state to publish from, not something left undone.
  const translatedHelp = locale === "en" ? "空欄なら公開時に翻訳されます" : undefined;
  const setNewsField = (index, key, value) =>
    mutate((next) => {
      for (const fileLocale of key === "date" && shareNewsDate ? ["ja", "en"] : [locale]) {
        const item = next[fileLocale].meta.newsItems?.[index];
        if (item) item[key] = value;
      }
    });
  const addNews = () => {
    setNewsPage(0);
    mutate((next) => {
      for (const fileLocale of ["ja", "en"]) {
        next[fileLocale].meta.newsItems ||= [];
        next[fileLocale].meta.newsItems.unshift(structuredClone(EMPTY_ITEMS.newsItems));
      }
    });
  };
  const removeNews = (index) =>
    mutate((next) => {
      for (const fileLocale of ["ja", "en"]) next[fileLocale].meta.newsItems.splice(index, 1);
    });

  return (
    <div className="editor-about-editor">
      <section className="editor-about-profile">
        <div className="editor-about-avatar">
          {person.icon ? (
            <img src={person.icon} alt="現在のプロフィール画像" />
          ) : (
            <span>画像なし</span>
          )}
          <div>
            <Button
              size="S"
              variant="secondary"
              prefix={<FaImageIcon alt="" />}
              onClick={onChooseAvatar}
            >
              写真を選ぶ
            </Button>
            <Button
              size="S"
              variant="secondary"
              prefix={<FaCameraIcon alt="" />}
              onClick={onTakeAvatar}
            >
              撮影する
            </Button>
          </div>
        </div>
        <div className="editor-about-grid">
          <TextField
            label="名前"
            value={person.name}
            onChange={(value) => setPerson("name", value)}
          />
          <TextField
            label="肩書き"
            value={person.role}
            onChange={(value) => setPerson("role", value)}
          />
          <TextField
            label="拠点"
            value={person.location}
            onChange={(value) => setPerson("location", value)}
          />
          <TextField
            label="一言紹介"
            value={person.tagline}
            onChange={(value) => setPerson("tagline", value)}
          />
          <TextField
            label="表示するNews数"
            type="number"
            value={active.newsConfig?.count ?? 5}
            onChange={(value) => setNewsCount(value ? Number(value) : 5)}
          />
        </div>
        <FormControl label="自己紹介" helpMessage="段落の間を1行空けて入力します">
          <Textarea
            width="100%"
            rows={5}
            value={(person.bio || []).join("\n\n")}
            onChange={(event) =>
              setPerson(
                "bio",
                event.target.value.split(/\n\s*\n/).filter((paragraph) => paragraph.trim()),
              )
            }
          />
        </FormControl>
      </section>

      <RepeatableSection
        title="Activity"
        items={person.activities || []}
        fields={[
          { key: "title", label: "活動名" },
          { key: "description", label: "説明" },
        ]}
        onField={(index, key, value) => updateItem("activities", index, key, value)}
        onAdd={() => addPaired("activities")}
        onMove={(index, direction) => movePaired("activities", index, direction)}
        onRemove={(index) => removePaired("activities", index)}
      />
      <RepeatableSection
        title="Career"
        items={person.career || []}
        fields={[
          { key: "period", label: "期間" },
          { key: "role", label: "役割・業務" },
          { key: "org", label: "組織" },
        ]}
        onField={(index, key, value) => updateItem("career", index, key, value)}
        onAdd={() => addPaired("career")}
        onMove={(index, direction) => movePaired("career", index, direction)}
        onRemove={(index) => removePaired("career", index)}
      />
      <RepeatableSection
        title="Education"
        items={person.education || []}
        fields={[
          { key: "period", label: "期間" },
          { key: "school", label: "学校" },
          { key: "description", label: "説明" },
        ]}
        onField={(index, key, value) => updateItem("education", index, key, value)}
        onAdd={() => addPaired("education")}
        onMove={(index, direction) => movePaired("education", index, direction)}
        onRemove={(index) => removePaired("education", index)}
      />

      <details className="editor-about-section" open>
        <summary>
          <span>Links</span>
          <span>{(person.links || []).length}件・日英共通</span>
        </summary>
        <div className="editor-about-section-body">
          <div className="editor-about-repeat-list">
            {(person.links || []).map((link, index) => (
              <article className="editor-about-card" key={`link:${index}`}>
                <header>
                  <strong>{index + 1}</strong>
                  <ItemActions
                    index={index}
                    count={person.links.length}
                    label="Link"
                    onMove={(itemIndex, direction) =>
                      setSharedPerson(
                        "links",
                        person.links
                          .map((item) => ({ ...item }))
                          .map((item, currentIndex, list) => {
                            const target = itemIndex + direction;
                            if (currentIndex === itemIndex) return list[target];
                            if (currentIndex === target) return list[itemIndex];
                            return item;
                          }),
                      )
                    }
                    onRemove={(itemIndex) =>
                      setSharedPerson(
                        "links",
                        person.links.filter((_, currentIndex) => currentIndex !== itemIndex),
                      )
                    }
                  />
                </header>
                <div className="editor-about-grid">
                  <TextField
                    label="表示名"
                    value={link.label}
                    onChange={(value) =>
                      setSharedPerson(
                        "links",
                        person.links.map((item, currentIndex) =>
                          currentIndex === index ? { ...item, label: value } : item,
                        ),
                      )
                    }
                  />
                  <TextField
                    label="URL（空欄ならテキスト）"
                    value={link.href}
                    onChange={(value) =>
                      setSharedPerson(
                        "links",
                        person.links.map((item, currentIndex) =>
                          currentIndex === index ? { ...item, href: value } : item,
                        ),
                      )
                    }
                  />
                </div>
              </article>
            ))}
          </div>
          <Button
            size="S"
            variant="secondary"
            prefix={<FaPlusIcon alt="" />}
            onClick={() =>
              setSharedPerson("links", [...(person.links || []), { label: "", href: "" }])
            }
          >
            Linkを追加
          </Button>
        </div>
      </details>

      <RepeatableSection
        title="News"
        description={
          locale === "ja"
            ? "日付の新しい順に自動で並びます。日付は日英共通で、追加・削除は両言語へ反映します。"
            : "空欄のまま公開すると、公開処理が日本語から翻訳して埋めます。手を入れたいときだけ書いてください。"
        }
        items={newsItems}
        fields={[
          { key: "date", label: "日付", type: "date", helpMessage: "日英共通" },
          { key: "title", label: "見出し", helpMessage: translatedHelp },
          { key: "description", label: "説明", helpMessage: translatedHelp },
          { key: "href", label: "リンク（任意）" },
        ]}
        onField={setNewsField}
        onAdd={addNews}
        onRemove={removeNews}
        pageSize={NEWS_PAGE_SIZE}
        page={currentNewsPage}
        onPage={setNewsPage}
      />
    </div>
  );
}
