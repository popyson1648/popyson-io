import { Button } from "smarthr-ui/lib/components/Button/index";
import { FormControl } from "smarthr-ui/lib/components/FormControl/index";
import { FaCameraIcon, FaImageIcon, FaPlusIcon } from "smarthr-ui/lib/components/Icon/index";
import { Input } from "smarthr-ui/lib/components/Input/index";
import { Textarea } from "smarthr-ui/lib/components/Textarea/index";

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

function RepeatableSection({
  title,
  description = "",
  items,
  fields,
  onField,
  onAdd,
  onMove,
  onRemove,
}) {
  return (
    <details className="editor-about-section" open>
      <summary>
        <span>{title}</span>
        <span>{items.length}件</span>
      </summary>
      <div className="editor-about-section-body">
        {description && <p className="editor-about-help">{description}</p>}
        <div className="editor-about-repeat-list">
          {items.map((item, index) => (
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
          ))}
        </div>
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

export default function AboutEditor({ files, locale, onChange, onChooseAvatar, onTakeAvatar }) {
  const active = files[locale].meta;
  const person = active.person || {};

  const mutate = (callback) => {
    const next = structuredClone(files);
    callback(next);
    onChange(next);
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
  const setNewsField = (index, key, value) =>
    mutate((next) => {
      next[locale].meta.newsItems[index][key] = value;
    });
  const addNews = () =>
    mutate((next) => {
      for (const fileLocale of ["ja", "en"]) {
        next[fileLocale].meta.newsItems ||= [];
        next[fileLocale].meta.newsItems.push(structuredClone(EMPTY_ITEMS.newsItems));
      }
    });
  const removeNews = (index) =>
    mutate((next) => {
      for (const fileLocale of ["ja", "en"]) next[fileLocale].meta.newsItems.splice(index, 1);
    });
  const moveNews = (index, direction) =>
    mutate((next) => {
      const target = index + direction;
      for (const fileLocale of ["ja", "en"]) {
        const list = next[fileLocale].meta.newsItems;
        [list[index], list[target]] = [list[target], list[index]];
      }
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
        description="日本語と英語で同じ順番になるよう、追加・移動・削除は両言語へ反映します。"
        items={active.newsItems || []}
        fields={[
          { key: "date", label: "日付", type: "date" },
          { key: "title", label: "見出し" },
          { key: "description", label: "説明" },
          { key: "href", label: "リンク（任意）" },
        ]}
        onField={setNewsField}
        onAdd={addNews}
        onMove={moveNews}
        onRemove={removeNews}
      />
    </div>
  );
}
