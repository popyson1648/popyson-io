import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "smarthr-ui/lib/components/Button/index";
import { Checkbox } from "smarthr-ui/lib/components/Checkbox/index";
import { ControlledActionDialog } from "smarthr-ui/lib/components/Dialog/ControlledActionDialog/index";
import { ControlledFormDialog } from "smarthr-ui/lib/components/Dialog/ControlledFormDialog/index";
import { DropdownMenuButton } from "smarthr-ui/lib/components/Dropdown/DropdownMenuButton/index";
import { FormControl } from "smarthr-ui/lib/components/FormControl/index";
import {
  FaArrowRotateLeftIcon,
  FaArrowRotateRightIcon,
  FaBarsIcon,
  FaCameraIcon,
  FaCircleInfoIcon,
  FaCirclePlayIcon,
  FaCircleQuestionIcon,
  FaCodeIcon,
  FaEllipsisIcon,
  FaGearIcon,
  FaImageIcon,
  FaLinkIcon,
  FaListUlIcon,
  FaMagnifyingGlassIcon,
  FaPlusIcon,
  FaSquareCheckIcon,
  FaTableIcon,
  FaXmarkIcon,
} from "smarthr-ui/lib/components/Icon/index";
import { Input } from "smarthr-ui/lib/components/Input/index";
import { NotificationBar } from "smarthr-ui/lib/components/NotificationBar/index";
import { SegmentedControl } from "smarthr-ui/lib/components/SegmentedControl/index";
import { Select } from "smarthr-ui/lib/components/Select/index";
import { Textarea } from "smarthr-ui/lib/components/Textarea/index";
import { ThemeProvider } from "smarthr-ui/lib/hooks/useTheme";
import { IntlProvider } from "smarthr-ui/lib/intl/IntlProvider";
import { createTheme } from "smarthr-ui/lib/themes/createTheme";
import "smarthr-ui/smarthr-ui.css";

import AboutEditor from "./AboutEditor.jsx";
import { createEditorApi } from "./editorApi.js";
import { isSupportedSource, prepareImageForUpload } from "./imagePreparation.js";
import { writingMetrics } from "./markdownEditing.js";
import "./editor.css";

let markdownEditorPromise;

function loadMarkdownEditor() {
  if (!markdownEditorPromise) {
    markdownEditorPromise = import("./MarkdownEditor.jsx").catch((error) => {
      markdownEditorPromise = undefined;
      throw error;
    });
  }
  return markdownEditorPromise;
}

function preloadMarkdownEditor() {
  loadMarkdownEditor().catch(() => {});
}

const MarkdownEditor = lazy(loadMarkdownEditor);

function canTranslatePublicationItem(item) {
  return item?.translationEligible ?? ["add", "update"].includes(item?.action);
}

const theme = createTheme({
  color: {
    GREY_5: "#f7f7f9",
    GREY_6: "#f4f4f7",
    GREY_7: "#f0f1f4",
    GREY_9: "#e9eaee",
    GREY_20: "#dedfe4",
    GREY_30: "#b7bac2",
    GREY_65: "#686b74",
    GREY_100: "#1d1d22",
    TEXT_BLACK: "#1d1d22",
    TEXT_GREY: "#686b74",
    TEXT_DISABLED: "#a3a6ae",
    TEXT_LINK: "#4f4fc4",
    BACKGROUND: "#f7f7f9",
    COLUMN: "#f7f7f9",
    BASE_GREY: "#f4f4f7",
    OVER_BACKGROUND: "#f0f1f4",
    HEAD: "#e9eaee",
    BORDER: "#dedfe4",
    ACTION_BACKGROUND: "#dedfe4",
    MAIN: "#5b5bd6",
    OUTLINE: "#7777df",
    DANGER: "#c91c55",
    OVERLAY: "rgb(29 29 34 / 8%)",
    SCRIM: "rgb(29 29 34 / 42%)",
  },
  radius: {
    s: "6px",
    m: "8px",
    l: "10px",
  },
  shadow: {
    LAYER0: "none",
    LAYER1: "0 1px 2px rgb(23 23 31 / 6%)",
    LAYER2: "0 4px 12px rgb(23 23 31 / 9%)",
    LAYER3: "0 8px 24px rgb(23 23 31 / 12%)",
    LAYER4: "0 16px 40px rgb(23 23 31 / 16%)",
    OUTLINE: "0 0 0 2px #fff, 0 0 0 4px rgb(91 91 214 / 55%)",
  },
  interaction: {
    hover: {
      animationDuration: "120ms",
      animationTiming: "ease",
    },
  },
});
const PREVIEW_URL = import.meta.env.MODE === "test" ? "about:blank" : "/editor-preview";
const COMPACT_MEDIA = "(max-width: 900px)";
// HEIC is offered even though the Content API rejects it, because
// prepareImageForUpload converts it to JPEG before the upload. Anything the
// API itself accepts is listed in UPLOAD_IMAGE_TYPES, which
// tests/check_editor_image_types.test.mjs holds against the Worker.
const IMAGE_ACCEPT = "image/png,image/jpeg,image/gif,image/webp,image/heic,image/heif,.heic,.heif";
// Mirrors ASSET_SEGMENTS in scripts/contentCloudEditorModel.mjs, which builds
// the same URLs on the server when it returns a freshly uploaded asset.
const ASSET_SEGMENTS = { post: "posts", work: "works", about: "about" };
const LOCALES = ["ja", "en"];
// The publication job is polled at this interval. It stays short because the
// GitHub read behind it is cached on the server (RUN_CACHE_MS in
// scripts/githubWorkflowClient.mjs), so a fast poll costs a database read, not
// an API call.
const PUBLISH_POLL_MS = 900;
const TOOLBAR_GROUPS = [
  {
    label: "見出し",
    commands: [
      ["h2", "見出し2"],
      ["h3", "見出し3"],
    ],
  },
  {
    label: "文字装飾",
    commands: [
      ["bold", "太字"],
      ["italic", "斜体"],
      ["strike", "取消"],
      ["link", "リンク"],
      ["inline-code", "コード"],
    ],
  },
  {
    label: "ブロック",
    commands: [
      ["quote", "引用"],
      ["list", "リスト"],
      ["task", "タスク"],
      ["code", "コードブロック"],
      ["table", "表"],
      ["callout", "補足"],
      ["embed", "埋め込み"],
    ],
  },
];
const COMPACT_COMMAND_LABELS = {
  h2: "H2",
  h3: "H3",
  bold: "B",
  italic: "I",
  strike: "S",
  link: "↗",
  "inline-code": "<>",
  quote: "❝",
  list: "•",
  task: "☑",
  code: "{}",
  table: "▦",
  callout: "!",
  embed: "▶",
};
const COMMAND_ICONS = {
  link: FaLinkIcon,
  list: FaListUlIcon,
  task: FaSquareCheckIcon,
  code: FaCodeIcon,
  table: FaTableIcon,
  callout: FaCircleInfoIcon,
  embed: FaCirclePlayIcon,
};

function CompactLabel({ children, compact }) {
  return (
    <span className="editor-command-label" data-compact-label={compact}>
      {children}
    </span>
  );
}

function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const media = window.matchMedia?.(query);
      if (!media) return () => {};
      if (media.addEventListener) {
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
      }
      media.addListener?.(onChange);
      return () => media.removeListener?.(onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => window.matchMedia?.(query).matches ?? false, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

function cloneContent(value) {
  return value ? structuredClone(value) : null;
}

function titleFor(item) {
  return item.title.ja || item.title.en || `無題 (${item.id})`;
}

function statusFor(item) {
  if (item.deletedAt || item.status === "deleted") return "削除済み";
  if (item.visibility === "private" || item.status === "private") return "非公開";
  return "公開";
}

function splitValues(value) {
  const seen = new Set();
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => {
      const key = part.toLocaleLowerCase();
      if (!part || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function documentOutline(markdown) {
  const headings = [];
  const warnings = [];
  let offset = 0;
  let previousLevel = 1;
  for (const line of String(markdown || "").split("\n")) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (match) {
      const level = match[1].length;
      if (level === 1) warnings.push("本文内の見出し1は避け、記事タイトルを使ってください。");
      if (level > previousLevel + 1) {
        warnings.push(`「${match[2]}」の前で見出しレベルが飛んでいます。`);
      }
      headings.push({ level, title: match[2].replace(/\s+#+$/, ""), offset });
      previousLevel = level;
    }
    offset += line.length + 1;
  }
  return { headings, warnings: [...new Set(warnings)] };
}

function SuggestionButtons({ label, suggestions, selected, onAdd }) {
  const selectedKeys = new Set(selected.map((value) => value.toLocaleLowerCase()));
  const available = suggestions
    .filter((value) => !selectedKeys.has(value.toLocaleLowerCase()))
    .slice(0, 8);
  if (!available.length) return null;
  return (
    <div className="editor-suggestions" aria-label={label}>
      <span>{label}</span>
      <div>
        {available.map((value) => (
          <Button
            key={value}
            type="button"
            size="S"
            variant="secondary"
            onClick={() => onAdd(value)}
          >
            + {value}
          </Button>
        ))}
      </div>
    </div>
  );
}

// Body images land under `assets/`, while the metadata pipeline writes a
// generated thumbnail to `thumbnails/`, which the site serves from public/.
function assetUrl(kind, id, logicalPath) {
  const path = String(logicalPath || "");
  const segment = ASSET_SEGMENTS[kind];
  if (path.startsWith("thumbnails/")) {
    return `/thumbnails/${encodeURIComponent(path.slice("thumbnails/".length))}`;
  }
  const name = path.startsWith("assets/") ? path.slice("assets/".length) : path;
  if (!segment || !name) return "";
  return `/content-assets/${segment}/${encodeURIComponent(id)}/${encodeURIComponent(name)}`;
}

function assetChoices(kind, id, assets) {
  return (assets || [])
    .map((asset) => ({
      url: assetUrl(kind, id, asset.logicalPath),
      label: String(asset.logicalPath || "").replace(/^(assets|thumbnails)\//, ""),
      role: asset.role,
    }))
    .filter((choice) => choice.url);
}

/**
 * A path field that can also upload a new image or reuse one already attached
 * to the content. The text input stays editable because a path under public/
 * — a generated thumbnail, say — need not exist as an attached asset.
 */
function ImageField({
  label,
  value,
  onChange,
  onUpload,
  choices,
  helpMessage = undefined,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const current = value ?? "";

  const chooseFile = async (files) => {
    const file = files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    const url = await onUpload(file);
    if (url) onChange(url);
  };

  return (
    <FormControl label={label} helpMessage={helpMessage}>
      <div className="editor-image-field">
        <Input
          type="text"
          width="100%"
          value={current}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <div className="editor-image-field-actions">
          <Button
            type="button"
            size="S"
            variant="secondary"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            画像をアップロード
          </Button>
          <input
            ref={inputRef}
            className="editor-file-input"
            type="file"
            accept={IMAGE_ACCEPT}
            aria-label={`${label}をアップロード`}
            onChange={(event) => chooseFile(event.target.files)}
          />
          {current && (
            <Button
              type="button"
              size="S"
              variant="text"
              disabled={disabled}
              onClick={() => onChange("")}
            >
              画像を外す
            </Button>
          )}
        </div>
        {choices.length > 0 && (
          <Select
            width="100%"
            value={choices.some((choice) => choice.url === current) ? current : ""}
            disabled={disabled}
            aria-label={`${label}を保存済みの画像から選ぶ`}
            options={[
              { value: "", label: "保存済みの画像から選ぶ" },
              ...choices.map((choice) => ({ value: choice.url, label: choice.label })),
            ]}
            onChangeValue={(next) => {
              if (next) onChange(next);
            }}
          />
        )}
        {current && (
          <img className="editor-image-field-preview" src={current} alt="" loading="lazy" />
        )}
      </div>
    </FormControl>
  );
}

function MetaInput({ label, value, onChange, type = "text", helpMessage = undefined }) {
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

function PostMetadata({
  meta,
  update,
  locale,
  suggestions,
  imageChoices,
  onUpload,
  onRegenerateThumbnail,
  busy,
}) {
  const sumup = meta.sumup || { mode: "text", text: "" };
  const thumbnail = meta.thumbnail || { mode: "none" };
  // The metadata workflow rewrites `mode = "auto"` into a file path under
  // /thumbnails/ and attaches the image with role "thumbnail", so that asset is
  // the way back to the generated image after picking a different one.
  const generatedUrl = imageChoices.find((choice) => choice.role === "thumbnail")?.url || "";
  return (
    <div className="editor-meta-grid">
      <MetaInput label="タイトル" value={meta.title} onChange={(value) => update("title", value)} />
      <MetaInput
        label="公開日"
        value={meta.date instanceof Date ? meta.date.toISOString().slice(0, 10) : meta.date}
        onChange={(value) => update("date", value)}
        helpMessage='YYYY-MM-DD または "auto"'
      />
      <MetaInput
        label="タグ"
        value={(meta.tags || []).join(", ")}
        onChange={(value) => update("tags", splitValues(value))}
        helpMessage="カンマ区切り"
      />
      <SuggestionButtons
        label="既存タグ"
        suggestions={suggestions}
        selected={meta.tags || []}
        onAdd={(value) => update("tags", [...(meta.tags || []), value])}
      />
      <MetaInput label="読み仮名" value={meta.kana} onChange={(value) => update("kana", value)} />
      <FormControl label="概要の扱い">
        <Select
          width="100%"
          value={sumup.mode || "text"}
          options={[
            { value: "text", label: "手入力" },
            { value: "auto", label: "自動生成" },
            { value: "none", label: "表示しない" },
          ]}
          onChangeValue={(mode) => update("sumup", { ...sumup, mode })}
        />
      </FormControl>
      {sumup.mode === "text" && (
        <FormControl label="概要文">
          <Textarea
            width="100%"
            rows={3}
            value={sumup.text || ""}
            onChange={(event) => update("sumup", { ...sumup, text: event.target.value })}
          />
        </FormControl>
      )}
      <FormControl label="サムネイル">
        <Select
          width="100%"
          value={thumbnail.mode || "none"}
          options={[
            { value: "auto", label: "自動生成" },
            { value: "file", label: "画像パス" },
            { value: "none", label: "表示しない" },
          ]}
          onChangeValue={(mode) => update("thumbnail", { ...thumbnail, mode })}
        />
      </FormControl>
      {generatedUrl && (
        <Button
          type="button"
          size="S"
          variant="secondary"
          disabled={busy}
          onClick={onRegenerateThumbnail}
        >
          自動生成の画像を描き直す
        </Button>
      )}
      {thumbnail.mode === "file" && (
        <>
          <ImageField
            label="サムネイル画像"
            value={thumbnail.path}
            choices={imageChoices}
            onUpload={onUpload}
            disabled={busy}
            onChange={(value) =>
              update("thumbnail", {
                ...thumbnail,
                path: value,
                generated: Boolean(generatedUrl) && value === generatedUrl,
              })
            }
          />
          {generatedUrl && thumbnail.path !== generatedUrl && (
            <Button
              type="button"
              size="S"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                update("thumbnail", { ...thumbnail, path: generatedUrl, generated: true })
              }
            >
              自動生成の画像に戻す
            </Button>
          )}
        </>
      )}
      <FormControl label="自動タグ">
        <Checkbox
          checked={Boolean(meta.auto_tags)}
          onChange={(event) => update("auto_tags", event.target.checked ? {} : undefined)}
        >
          保存後のワークフローでタグを追加する
        </Checkbox>
      </FormControl>
      {meta.auto_tags && (
        <MetaInput
          label="追加するタグ数"
          type="number"
          value={meta.auto_tags.count || ""}
          onChange={(value) => update("auto_tags", value ? { count: Number(value) } : {})}
        />
      )}
      {locale === "en" && (
        <p className="editor-help">英語タグは日本語タグと同じ順序で入力します。</p>
      )}
    </div>
  );
}

function WorkMetadata({ meta, update, locale, suggestions, imageChoices, onUpload, busy }) {
  return (
    <div className="editor-meta-grid">
      <MetaInput label="作品名" value={meta.title} onChange={(value) => update("title", value)} />
      <MetaInput
        label="一行説明"
        value={meta.tagline}
        onChange={(value) => update("tagline", value)}
      />
      <FormControl label="一覧の説明文">
        <Textarea
          width="100%"
          rows={3}
          value={meta.summary || ""}
          onChange={(event) => update("summary", event.target.value)}
        />
      </FormControl>
      {locale === "ja" && (
        <>
          <MetaInput
            label="公開年"
            type="number"
            value={meta.year || ""}
            onChange={(value) => update("year", Number(value))}
          />
          <MetaInput
            label="使用技術"
            value={(meta.stack || []).join(", ")}
            onChange={(value) => update("stack", splitValues(value))}
            helpMessage="カンマ区切り"
          />
          <SuggestionButtons
            label="既存の使用技術"
            suggestions={suggestions}
            selected={meta.stack || []}
            onAdd={(value) => update("stack", [...(meta.stack || []), value])}
          />
          <ImageField
            label="一覧画像"
            value={meta.thumbnail}
            choices={imageChoices}
            onUpload={onUpload}
            disabled={busy}
            onChange={(value) => update("thumbnail", value)}
          />
          <ImageField
            label="ヒーロー画像"
            value={meta.hero}
            choices={imageChoices}
            onUpload={onUpload}
            disabled={busy}
            onChange={(value) => update("hero", value)}
          />
        </>
      )}
      {locale === "en" && (
        <p className="editor-help">公開年・使用技術・画像は日本語ファイルの値が使われます。</p>
      )}
    </div>
  );
}

function EmptyEditor({ compact = false, onOpen }) {
  return (
    <main className="editor-empty">
      <p>
        {compact
          ? "編集するコンテンツを選択してください。"
          : "左の一覧から編集するコンテンツを選択してください。"}
      </p>
      {compact && (
        <Button variant="secondary" onClick={onOpen}>
          一覧を開く
        </Button>
      )}
    </main>
  );
}

function elapsedLabel(startedAt, now) {
  const start = Date.parse(String(startedAt || ""));
  if (!Number.isFinite(start)) return "";
  const seconds = Math.max(0, Math.round((now - start) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}分${String(seconds % 60).padStart(2, "0")}秒`;
}

/**
 * Whether the publication the editor asked for is still under way.
 *
 * Publishing an item that failed before dispatches a fresh run against the same
 * job row, and that row keeps the previous attempt's outcome until the new run
 * reaches its first step and increments the attempt counter. Reading the state
 * alone would report the old failure as this attempt's result and stop polling
 * on a run that had only just started.
 */
export function publicationIsLive(job) {
  if (!job) return false;
  if (job.status === "running") return true;
  return Number(job.attempts) === Number(job.dispatchedAttempts);
}

/**
 * What the publication is doing right now.
 *
 * Publishing runs a workflow that takes minutes — it generates metadata,
 * translates the Japanese source, verifies the candidate and deploys it — and
 * the job row alone would say "running" for all of it. The stages, the step
 * name and the elapsed time come from the API, which reads them from the
 * workflow run itself.
 */
function PublishProgressPanel({ job, onClose }) {
  const running = publicationIsLive(job);
  // The clock ticks only while the job runs, so a finished publication keeps
  // the time it took instead of counting on past its own end.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  // Dispatched, but the run has not written to the job row yet, so everything
  // the row and its last run still say belongs to the attempt before this one.
  const waiting = running && job.status !== "running";
  const progress = waiting ? null : job.progress;
  const failed = !running && (job.status === "failed" || job.status === "cancelled");
  const succeeded = !running && job.status === "succeeded";
  const headline = failed ? "公開に失敗しました" : succeeded ? "公開が完了しました" : "公開中";
  const elapsed = elapsedLabel(progress?.startedAt, now);
  const percent = Math.min(100, Math.max(0, Number(progress?.percent) || 0));
  const stages = progress?.stages || job.progress?.stages || [];
  const stageIndex = waiting ? 0 : progress?.stageIndex;
  const stepLabel = waiting
    ? "GitHub Actions の実行開始を待っています"
    : progress?.stepLabel || job.phase || job.status;
  // A failure is measured up to the step that broke, so its counter would read
  // as a completed run. The step name is what says where it stopped.
  const stepCount =
    !failed && progress?.totalSteps > 0
      ? `${progress.completedSteps}/${progress.totalSteps} ステップ・`
      : "";

  return (
    <section
      className="editor-publish-progress"
      // The panel sits below a workspace that fills the window, so it lands
      // off-screen on the press of 公開. It is pinned for as long as it exists:
      // the outcome is as worth seeing as the progress.
      aria-label="公開の進捗"
    >
      <header>
        <strong data-state={failed ? "failed" : succeeded ? "succeeded" : "running"}>
          {headline}
        </strong>
        {elapsed && <span>経過 {elapsed}</span>}
        {!running && (
          <Button size="S" variant="text" onClick={onClose}>
            閉じる
          </Button>
        )}
      </header>
      {stages.length > 0 && (
        <ol className="editor-publish-stages">
          {stages.map((label, index) => (
            <li
              key={label}
              data-state={
                succeeded || index < stageIndex ? "done" : index === stageIndex ? "current" : "todo"
              }
            >
              {label}
            </li>
          ))}
        </ol>
      )}
      <div
        className="editor-publish-bar"
        data-state={failed ? "failed" : succeeded ? "succeeded" : "running"}
        role="progressbar"
        aria-label="公開の進み具合（目安）"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="editor-publish-step" aria-live="polite">
        {stepLabel}
        <span>
          （{stepCount}
          {percent}%・目安）
        </span>
      </p>
      {progress?.runUrl && (
        <a href={progress.runUrl} target="_blank" rel="noreferrer">
          GitHub Actions の実行を開く
        </a>
      )}
      {/* The row keeps the last failure's message, which is the previous
          attempt's while a new run is under way. */}
      {!running && job.log && <pre>{job.log}</pre>}
    </section>
  );
}

function App() {
  const api = useMemo(() => createEditorApi(), []);
  const [items, setItems] = useState([]);
  const [kind, setKind] = useState("post");
  const [content, setContent] = useState(null);
  const [locale, setLocale] = useState("ja");
  const [mode, setMode] = useState("split");
  const isCompact = useMediaQuery(COMPACT_MEDIA);
  const layoutMode = isCompact && mode === "split" ? "write" : mode;
  const [splitRatio, setSplitRatio] = useState(50);
  const [previewDevice, setPreviewDevice] = useState("auto");
  const [previewReady, setPreviewReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openingItem, setOpeningItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [preview, setPreview] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishPreflight, setPublishPreflight] = useState(null);
  const [publishTranslations, setPublishTranslations] = useState({});
  const [publishJob, setPublishJob] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formatState, setFormatState] = useState({});
  const [imageOpen, setImageOpen] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [inspector, setInspector] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [previewFull, setPreviewFull] = useState(false);
  const editorRef = useRef(null);
  const toolbarRef = useRef(null);
  const sidebarRef = useRef(null);
  const inspectorRef = useRef(null);
  const menuButtonRef = useRef(null);
  const libraryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const previewFrameRef = useRef(null);
  const workspaceRef = useRef(null);
  const editVersionRef = useRef(0);
  const saveInFlightRef = useRef(false);
  const openInFlightRef = useRef(false);
  const autoSaveFailureVersionRef = useRef(-1);
  const sidebarVisible = isCompact ? sidebarOpen : !sidebarCollapsed;

  const closeSidebar = useCallback(() => {
    if (isCompact) {
      setSidebarOpen(false);
      window.setTimeout(() => menuButtonRef.current?.focus(), 0);
    } else {
      setSidebarCollapsed(true);
    }
  }, [isCompact]);

  const openSidebar = () => {
    if (isCompact) setSidebarOpen(true);
    else setSidebarCollapsed(false);
  };

  const activeFile = content?.files?.[locale];
  const activeBody = activeFile?.body || "";
  const metrics = useMemo(() => writingMetrics(activeFile?.body || ""), [activeFile?.body]);
  const outline = useMemo(() => documentOutline(activeBody), [activeBody]);
  const tagSuggestions = useMemo(
    () => [...new Set(items.flatMap((item) => item.tags || []))].sort((a, b) => a.localeCompare(b)),
    [items],
  );
  const stackSuggestions = useMemo(
    () =>
      [...new Set(items.flatMap((item) => item.stack || []))].sort((a, b) => a.localeCompare(b)),
    [items],
  );
  const imageChoices = useMemo(
    () => (content ? assetChoices(content.kind, content.id, content.assets) : []),
    [content],
  );
  const filteredItems = useMemo(
    () =>
      items
        .filter((item) => item.kind === kind)
        .filter((item) => statusFilter === "all" || item.status === statusFilter)
        .filter((item) => {
          const needle = query.trim().toLocaleLowerCase();
          if (!needle) return true;
          return `${titleFor(item)} ${item.id}`.toLocaleLowerCase().includes(needle);
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [items, kind, query, statusFilter],
  );
  const basicReadiness =
    activeFile?.meta?.title?.trim() && activeBody.trim()
      ? "タイトル・本文入力済み"
      : "未入力項目あり";

  const loadList = useCallback(async () => {
    const result = await api.list();
    setItems(result.items);
    api
      .globalPublishPreflight()
      .then(setPublishPreflight)
      .catch(() => {});
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    api
      .list()
      .then((result) => {
        if (!cancelled) setItems(result.items);
      })
      .catch((error) => {
        if (!cancelled) setMessage({ type: "error", text: error.message });
      });
    api
      .globalPublishPreflight()
      .then((preflight) => {
        if (!cancelled) setPublishPreflight(preflight);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    const warn = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    workspaceRef.current?.style.setProperty("--editor-split", `${splitRatio}%`);
  }, [splitRatio]);

  useEffect(() => {
    if (!isCompact || !sidebarOpen) return;
    const sidebar = sidebarRef.current;
    const focusable = () =>
      [...(sidebar?.querySelectorAll("button,input,select,[href],[tabindex]") || [])].filter(
        (element) => !element.disabled && element.tabIndex >= 0,
      );
    focusable()[0]?.focus();
    const trap = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSidebar();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = focusable();
      if (!controls.length) return;
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    sidebar?.addEventListener("keydown", trap);
    return () => sidebar?.removeEventListener("keydown", trap);
  }, [closeSidebar, isCompact, sidebarOpen]);

  useEffect(() => {
    if (!inspector) return;
    const panel = inspectorRef.current;
    const focusable = () =>
      [...(panel?.querySelectorAll("button,input,select,textarea,[href],[tabindex]") || [])].filter(
        (element) => !element.disabled && element.tabIndex >= 0,
      );
    if (isCompact) focusable()[0]?.focus();
    const handleKeys = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setInspector(null);
        return;
      }
      if (!isCompact || event.key !== "Tab") return;
      const controls = focusable();
      if (!controls.length) return;
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [inspector, isCompact]);

  useEffect(() => {
    if (!content || content.kind === "about") return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      api
        .preview(activeBody, locale)
        .then((result) => {
          if (!cancelled) setPreview(result.html);
        })
        .catch((error) => {
          if (!cancelled) setMessage({ type: "error", text: `プレビュー: ${error.message}` });
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [activeBody, api, content, locale]);

  const sendPreview = useCallback((type, value = {}) => {
    try {
      previewFrameRef.current?.contentWindow?.postMessage(
        { type, ...value },
        window.location.origin,
      );
    } catch {
      // A blank test iframe has an opaque origin and cannot receive same-origin messages.
    }
  }, []);

  useEffect(() => {
    if (!content || !previewReady) return;
    sendPreview("popyson-editor-preview-content", {
      payload: {
        kind: content.kind,
        id: content.id,
        locale,
        meta: activeFile.meta,
        sharedMeta: content.files.ja.meta,
        html: content.kind === "about" ? undefined : preview,
        metrics,
      },
    });
  }, [activeFile, content, locale, metrics, preview, previewReady, sendPreview]);

  useEffect(() => {
    const receive = (event) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== previewFrameRef.current?.contentWindow
      ) {
        return;
      }
      if (event.data?.type === "popyson-editor-preview-ready") {
        setPreviewReady(true);
      }
      if (event.data?.type === "popyson-editor-preview-scroll") {
        const ratio = Number(event.data.ratio);
        if (!Number.isFinite(ratio)) return;
        editorRef.current?.setScrollRatio(ratio);
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

  useEffect(() => {
    if (!publicationIsLive(publishJob)) return;
    const timeout = setTimeout(() => {
      api
        .publishJob(publishJob.id)
        .then((job) => {
          const nextJob = { ...publishJob, ...job };
          setPublishJob(nextJob);
          // A row still holding the previous attempt's outcome is not this
          // run's answer; the next poll asks again.
          if (publicationIsLive(nextJob)) return;
          if (nextJob.status === "succeeded") {
            setMessage({
              type: "success",
              text: "コンテンツの公開処理が完了しました。",
            });
            loadList();
            if (content) {
              api
                .read(content.kind, content.id)
                .then((result) => {
                  setContent(cloneContent(result));
                  setSavedAt(new Date());
                })
                .catch((error) => setMessage({ type: "error", text: error.message }));
            }
          } else if (nextJob.status === "failed") {
            setMessage({ type: "error", text: "公開に失敗しました。ログを確認してください。" });
          }
        })
        .catch((error) => setMessage({ type: "error", text: error.message }));
    }, PUBLISH_POLL_MS);
    return () => clearTimeout(timeout);
  }, [api, content, loadList, publishJob]);

  const openItem = async (item) => {
    if (openInFlightRef.current) return;
    if (dirty && !window.confirm("保存していない変更を破棄して移動しますか？")) return;
    openInFlightRef.current = true;
    setOpeningItem(item);
    setBusy(true);
    try {
      const [result] = await Promise.all([
        api.read(item.kind, item.id),
        item.kind === "about" ? Promise.resolve() : loadMarkdownEditor(),
      ]);
      setContent(cloneContent(result));
      setKind(item.kind);
      setDirty(false);
      // The panel reports the publication of the item being left behind.
      if (item.id !== content?.id || item.kind !== content?.kind) setPublishJob(null);
      editVersionRef.current = 0;
      autoSaveFailureVersionRef.current = -1;
      setSavedAt(null);
      if (isCompact) closeSidebar();
      setMessage({ type: "", text: "" });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      openInFlightRef.current = false;
      setOpeningItem(null);
      setBusy(false);
    }
  };

  const updateFile = (updater) => {
    setContent((current) => {
      const next = cloneContent(current);
      updater(next.files[locale]);
      return next;
    });
    editVersionRef.current += 1;
    autoSaveFailureVersionRef.current = -1;
    setDirty(true);
  };

  const updateMeta = (field, value) => {
    updateFile((file) => {
      if (value === undefined) delete file.meta[field];
      else file.meta[field] = value;
    });
  };

  const updateAboutFiles = (files) => {
    setContent((current) => {
      const next = cloneContent(current);
      for (const fileLocale of LOCALES) {
        next.files[fileLocale] = {
          ...files[fileLocale],
          revision: current.files[fileLocale].revision,
        };
      }
      return next;
    });
    editVersionRef.current += 1;
    autoSaveFailureVersionRef.current = -1;
    setDirty(true);
  };

  const save = useCallback(
    async ({ quiet = false } = {}) => {
      if (!content || saveInFlightRef.current) return null;
      const savedVersion = editVersionRef.current;
      if (!quiet) autoSaveFailureVersionRef.current = -1;
      saveInFlightRef.current = true;
      setSaving(true);
      if (!quiet) setMessage({ type: "", text: "" });
      try {
        const saved = await api.save(content, { checkpoint: !quiet });
        const unchanged = editVersionRef.current === savedVersion;
        setContent((current) => {
          if (unchanged) return cloneContent(saved);
          const next = cloneContent(current);
          next.status = saved.status;
          next.visibility = saved.visibility;
          next.deletedAt = saved.deletedAt;
          next.currentRevisionId = saved.currentRevisionId;
          for (const fileLocale of LOCALES) {
            next.files[fileLocale].revision = saved.files[fileLocale].revision;
          }
          return next;
        });
        if (unchanged) setDirty(false);
        autoSaveFailureVersionRef.current = -1;
        setSavedAt(new Date());
        if (!quiet)
          setMessage({ type: "success", text: "新しい版としてデータベースに保存しました。" });
        await loadList();
        return saved;
      } catch (error) {
        if (quiet) autoSaveFailureVersionRef.current = savedVersion;
        if (error.code === "revision_conflict") setConflictOpen(true);
        setMessage({ type: "error", text: error.message });
        return null;
      } finally {
        saveInFlightRef.current = false;
        setSaving(false);
      }
    },
    [api, content, loadList],
  );

  useEffect(() => {
    if (!dirty || saving || busy || publicationIsLive(publishJob)) return;
    if (autoSaveFailureVersionRef.current === editVersionRef.current) return;
    const timeout = window.setTimeout(() => save({ quiet: true }), 1500);
    return () => window.clearTimeout(timeout);
  }, [busy, dirty, publishJob, save, saving]);

  useEffect(() => {
    if (!previewFull) return;
    const close = (event) => {
      if (event.key === "Escape") setPreviewFull(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [previewFull]);

  useEffect(() => {
    const shortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [save]);

  const applyEdit = (command) => editorRef.current?.apply(command);

  const resizeSplit = (clientX) => {
    const bounds = workspaceRef.current?.getBoundingClientRect();
    if (!bounds?.width) return;
    const percentage = ((clientX - bounds.left) / bounds.width) * 100;
    setSplitRatio(Math.min(70, Math.max(30, percentage)));
  };

  const rejectImage = (file) => {
    setMessage({
      type: "error",
      text: `${file.name || "画像"}は対応形式ではありません。`,
    });
  };

  /**
   * Converts and shrinks a file so the Content API will take it, reporting the
   * step because HEIC decoding and re-encoding both take a noticeable moment on
   * a phone.
   */
  const readyImage = async (file) => {
    const { file: prepared, notes } = await prepareImageForUpload(file, {
      onStep: (text) => setMessage({ type: "info", text }),
    });
    return { file: prepared, notes };
  };

  const prepareImages = (files) => {
    const selected = [...files];
    const invalid = selected.find((file) => !isSupportedSource(file));
    if (invalid) {
      rejectImage(invalid);
      return;
    }
    if (!selected.length) return;
    setPendingImages(
      selected.map((file) => ({
        file,
        alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") || "画像",
      })),
    );
    setImageOpen(true);
  };

  const uploadImages = async (event, helpers) => {
    event.preventDefault();
    helpers.close();
    setImageOpen(false);
    if (!content || !pendingImages.length) return;
    setBusy(true);
    const failures = [];
    let uploaded = 0;
    let uploadRevisionId = content.currentRevisionId;
    const uploadQueue = content.kind === "about" ? pendingImages.slice(0, 1) : pendingImages;
    for (const [index, item] of uploadQueue.entries()) {
      try {
        setMessage({
          type: "info",
          text: `画像を準備しています… ${index + 1}/${uploadQueue.length}`,
        });
        const { file: ready } = await readyImage(item.file);
        setMessage({
          type: "info",
          text: `画像を保存しています… ${index + 1}/${uploadQueue.length}`,
        });
        const asset = await api.upload(content.kind, content.id, ready, uploadRevisionId);
        uploadRevisionId = asset.currentRevisionId;
        setContent((current) => {
          const next = cloneContent(current);
          next.currentRevisionId = asset.currentRevisionId;
          next.assets = asset.assets;
          for (const fileLocale of LOCALES) {
            next.files[fileLocale].revision = asset.currentRevisionId;
          }
          if (content.kind === "about") {
            for (const fileLocale of LOCALES) {
              next.files[fileLocale].meta.person ||= {};
              next.files[fileLocale].meta.person.icon = asset.url;
            }
          }
          return next;
        });
        if (content.kind === "about") {
          editVersionRef.current += 1;
          autoSaveFailureVersionRef.current = -1;
          setDirty(true);
        } else {
          editorRef.current?.insertImage(asset.url, item.alt, {
            selectAlt: index === uploadQueue.length - 1,
          });
        }
        uploaded += 1;
      } catch (error) {
        failures.push(`${item.file.name}: ${error.message}`);
      }
    }
    setBusy(false);
    setPendingImages([]);
    if (libraryInputRef.current) libraryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    setMessage(
      failures.length
        ? {
            type: "error",
            text: `${uploaded}件を挿入しました。失敗: ${failures.join(" / ")}`,
          }
        : {
            type: "success",
            text:
              content.kind === "about"
                ? "プロフィール画像をデータベースへ関連付けました。"
                : `${uploaded}件の画像をオブジェクトストレージへ保存して挿入しました。`,
          },
    );
  };

  /**
   * Uploads a single image for a metadata field and returns its URL. Unlike
   * `uploadImages` it never touches the Markdown body, and it leaves the field
   * itself to the caller so each field owns how it stores the path.
   */
  const uploadMetaImage = async (file) => {
    if (!content) return "";
    if (!isSupportedSource(file)) {
      rejectImage(file);
      return "";
    }
    setBusy(true);
    setMessage({ type: "info", text: "画像を準備しています…" });
    try {
      const { file: ready, notes } = await readyImage(file);
      setMessage({ type: "info", text: "画像を保存しています…" });
      const asset = await api.upload(content.kind, content.id, ready, content.currentRevisionId);
      setContent((current) => {
        const next = cloneContent(current);
        next.currentRevisionId = asset.currentRevisionId;
        next.assets = asset.assets;
        for (const fileLocale of LOCALES) {
          next.files[fileLocale].revision = asset.currentRevisionId;
        }
        return next;
      });
      setMessage({
        type: "success",
        text: notes.length
          ? `画像をオブジェクトストレージへ保存しました。${notes.join("、")}。`
          : "画像をオブジェクトストレージへ保存しました。",
      });
      return asset.url;
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      return "";
    } finally {
      setBusy(false);
    }
  };

  /**
   * Take away the stored image so the next publication draws a new one.
   * Generation reuses the file it already wrote, so this is what asking again
   * means, and the drawing itself happens during publication rather than here.
   */
  const regenerateThumbnail = async () => {
    if (!content) return;
    if (!window.confirm("保存済みのサムネイルを削除します。次の公開で描き直されます。")) return;
    setBusy(true);
    try {
      const result = await api.regenerateThumbnail(content.kind, content.id);
      setContent(cloneContent(result));
      setSavedAt(new Date());
      setMessage({
        type: "success",
        text: "サムネイルを削除しました。次の公開で描き直されます。",
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const openHistory = async () => {
    if (!content) return;
    setBusy(true);
    try {
      const result = await api.history(content.kind, content.id);
      setHistoryEntries(result.entries);
      setInspector("history");
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const restoreHistory = async (_event, helpers) => {
    helpers.close();
    setRestoreTarget(null);
    if (!content || !restoreTarget) return;
    const base = dirty ? await save() : content;
    if (!base) return;
    setBusy(true);
    try {
      const restored = await api.restoreHistory(
        base.kind,
        base.id,
        restoreTarget.id,
        base.currentRevisionId,
      );
      setContent(cloneContent(restored));
      setDirty(false);
      setSavedAt(new Date());
      setInspector(null);
      setMessage({
        type: "success",
        text: "選択した版を復元しました。復元前の版も履歴に残っています。",
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const changeContentState = async (value, successMessage) => {
    if (!content) return;
    const base = dirty ? await save() : content;
    if (!base) return;
    setBusy(true);
    try {
      const result = await api.updateState(base, value);
      setContent(cloneContent(result));
      setDirty(false);
      await loadList();
      setMessage({ type: "success", text: successMessage });
    } catch (error) {
      if (error.code === "revision_conflict") setConflictOpen(true);
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const changeVisibility = async (visibility) => {
    if (!content || visibility === content.visibility) return;
    if (
      visibility === "private" &&
      !window.confirm(
        "非公開へ変更しますか？ 過去に公開した内容はGit履歴や外部キャッシュから消えるとは限りません。",
      )
    ) {
      return;
    }
    await changeContentState(
      { visibility },
      visibility === "public"
        ? "公開に設定しました。公開ボタンでサイトへ反映してください。"
        : "非公開に設定しました。公開ボタンでサイトから除外してください。",
    );
  };

  const deleteContent = async (_event, helpers) => {
    helpers.close();
    setDiscardOpen(false);
    if (!content) return;
    await changeContentState(
      { deleted: true },
      "削除済みにしました。公開ボタンでサイトから除外できます。履歴は復元のため保持されます。",
    );
  };

  const restoreDeletedContent = async () => {
    await changeContentState(
      { deleted: false },
      "コンテンツを復元しました。公開設定を確認してサイトへ反映してください。",
    );
  };

  const createContent = async (event, helpers) => {
    event.preventDefault();
    setBusy(true);
    try {
      const created = await api.create(kind, kind === "work" ? { slug: newSlug } : {});
      setContent(cloneContent(created));
      setDirty(false);
      editVersionRef.current = 0;
      setSavedAt(new Date());
      setNewSlug("");
      helpers.close();
      setCreateOpen(false);
      await loadList();
      setMessage({
        type: "info",
        text: "新しい下書きを作成しました。タイトルを入力して保存してください。",
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const startPublish = async (_event, helpers) => {
    helpers.close();
    setPublishOpen(false);
    try {
      const translations = (publishPreflight?.items || [])
        .filter(canTranslatePublicationItem)
        .map((item) => ({
          itemId: item.itemId,
          enabled: publishTranslations[item.itemId] !== false,
        }));
      const job = await api.globalPublish(publishPreflight.intentChecksum, translations);
      if (job.noChanges) {
        setMessage({ type: "info", text: "公開待ちの変更はありません。" });
        return;
      }
      // The attempt count as it stood when this run was dispatched. The run
      // increments it when it starts, which is what tells the outcome of this
      // attempt apart from the one already recorded on the row.
      setPublishJob({ ...job, dispatchedAttempts: Number(job.attempts) || 0 });
      setMessage({ type: "info", text: "公開ジョブを開始しました…" });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  };

  const openPublish = async () => {
    if (dirty && !(await save())) return;
    setBusy(true);
    try {
      const result = await api.globalPublishPreflight();
      setPublishPreflight(result);
      setPublishTranslations(
        Object.fromEntries(
          (result.items || [])
            .filter(canTranslatePublicationItem)
            .map((item) => [item.itemId, true]),
        ),
      );
      setPublishOpen(true);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const reloadAfterConflict = async (_event, helpers) => {
    helpers.close();
    setConflictOpen(false);
    if (!content) return;
    setBusy(true);
    try {
      const result = await api.read(content.kind, content.id);
      setContent(cloneContent(result));
      setDirty(false);
      setSavedAt(null);
      setMessage({ type: "info", text: "データベースの最新版を読み込みました。" });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const toolbarKeyDown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = [...(toolbarRef.current?.querySelectorAll("button") || [])].filter(
      (button) => !button.disabled,
    );
    if (!buttons.length) return;
    event.preventDefault();
    const current = Math.max(0, buttons.indexOf(document.activeElement));
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    buttons.forEach((button, index) => {
      button.tabIndex = index === next ? 0 : -1;
    });
    buttons[next].focus();
  };

  const viewModes = isCompact
    ? [
        ["write", "編集"],
        ["preview", "プレビュー"],
      ]
    : [
        ["write", "編集"],
        ["split", "分割"],
        ["preview", "プレビュー"],
      ];

  const viewTabKeyDown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = [...event.currentTarget.parentElement.querySelectorAll('[role="tab"]')];
    const current = tabs.indexOf(event.currentTarget);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    tabs[next].focus();
    setMode(tabs[next].dataset.mode);
  };

  return (
    <div className="editor-app">
      <header className="editor-header" inert={isCompact && (sidebarVisible || Boolean(inspector))}>
        <div className="editor-header-leading">
          <Button
            ref={menuButtonRef}
            className="editor-menu-button"
            variant="text"
            aria-label={sidebarVisible ? "コンテンツ一覧を閉じる" : "コンテンツ一覧を開く"}
            aria-controls="editor-sidebar"
            aria-expanded={sidebarVisible}
            onClick={() => (sidebarVisible ? closeSidebar() : openSidebar())}
          >
            <FaBarsIcon alt="" />
          </Button>
        </div>
        <div className="editor-header-actions">
          {content && (
            <>
              {content.kind !== "about" && (
                <Button
                  className="editor-header-icon-button"
                  variant="text"
                  aria-label="アウトラインを開く"
                  title="アウトライン"
                  aria-controls="editor-inspector"
                  aria-expanded={inspector === "outline"}
                  onClick={() =>
                    setInspector((current) => (current === "outline" ? null : "outline"))
                  }
                >
                  <FaListUlIcon alt="" />
                </Button>
              )}
              <Button
                className="editor-header-icon-button"
                variant="text"
                aria-label="公開設定を開く"
                title="公開設定"
                aria-controls="editor-inspector"
                aria-expanded={inspector === "settings"}
                onClick={() =>
                  setInspector((current) => (current === "settings" ? null : "settings"))
                }
              >
                <FaGearIcon alt="" />
              </Button>
            </>
          )}
          {content && (
            <DropdownMenuButton
              aria-label="その他"
              trigger={{ children: "その他", size: "S", onlyIcon: { component: FaEllipsisIcon } }}
            >
              <Button variant="text" onClick={openHistory} disabled={busy}>
                変更履歴
              </Button>
              {content.deletedAt ? (
                <Button variant="text" onClick={restoreDeletedContent} disabled={busy}>
                  削除から復元
                </Button>
              ) : (
                <Button variant="text" onClick={() => setDiscardOpen(true)} disabled={busy}>
                  削除
                </Button>
              )}
            </DropdownMenuButton>
          )}
          <Button
            variant="secondary"
            disabled={!content || busy || saving}
            loading={saving}
            onClick={() => save()}
            aria-label={!dirty && savedAt ? "保存済み" : "下書きを保存"}
          >
            <span className="editor-save-label-long" aria-hidden="true">
              {!dirty && savedAt ? "保存済み" : "下書きを保存"}
            </span>
            <span className="editor-save-label-short" aria-hidden="true">
              {!dirty && savedAt ? "保存済み" : "保存"}
            </span>
          </Button>
          <Button
            variant="primary"
            // Covers the window where a retry has been dispatched but the job
            // row still reads as the previous attempt's failure; publishing
            // again there would put a second run on the same job.
            disabled={busy || saving || publicationIsLive(publishJob)}
            onClick={openPublish}
          >
            変更をまとめて公開
            {publishPreflight?.pendingCount > 0 ? ` (${publishPreflight.pendingCount})` : ""}
          </Button>
        </div>
      </header>

      {message.text && (
        <div className="editor-message">
          <NotificationBar
            type={message.type}
            base="base"
            onClose={() => setMessage({ type: "", text: "" })}
          >
            {message.text}
          </NotificationBar>
        </div>
      )}

      <p className="editor-sr-only" role="status" aria-live="polite">
        {openingItem ? `${titleFor(openingItem)}を開いています。` : ""}
      </p>

      <div
        className={`editor-shell ${sidebarVisible ? "is-sidebar-open" : "is-sidebar-collapsed"}`}
      >
        <aside
          id="editor-sidebar"
          ref={sidebarRef}
          className={`editor-sidebar ${sidebarVisible ? "is-open" : ""}`}
          role={isCompact ? "dialog" : undefined}
          aria-modal={isCompact && sidebarVisible ? "true" : undefined}
          aria-label="コンテンツ一覧"
          aria-hidden={!sidebarVisible ? "true" : undefined}
        >
          <div className="editor-sidebar-head">
            <SegmentedControl
              size="S"
              value={kind}
              options={[
                { value: "post", content: "記事" },
                { value: "work", content: "Works" },
                { value: "about", content: "About" },
              ]}
              onClickOption={setKind}
            />
            {kind !== "about" && (
              <Button
                className="editor-create-button"
                size="S"
                variant="secondary"
                onClick={() => setCreateOpen(true)}
                aria-label="新規"
              >
                <FaPlusIcon alt="" />
              </Button>
            )}
          </div>
          <div className="editor-list-filters">
            <Input
              className="editor-search-input"
              name="content-query"
              width="100%"
              value={query}
              prefix={<FaMagnifyingGlassIcon alt="" />}
              placeholder="タイトルまたはIDを検索"
              aria-label="コンテンツを検索"
              onChange={(event) => setQuery(event.target.value)}
            />
            <Select
              name="content-status-filter"
              width="100%"
              value={statusFilter}
              aria-label="公開状態で絞り込む"
              options={[
                { value: "all", label: "すべての状態" },
                { value: "private", label: "非公開" },
                { value: "public", label: "公開" },
                { value: "deleted", label: "削除済み" },
              ]}
              onChangeValue={setStatusFilter}
            />
          </div>
          <nav className="editor-content-list" aria-label="コンテンツ一覧">
            {filteredItems.map((item) => {
              const itemKey = `${item.kind}:${item.id}`;
              const isActive = content?.kind === item.kind && content?.id === item.id;
              const isOpening = openingItem?.kind === item.kind && openingItem?.id === item.id;
              return (
                <button
                  key={itemKey}
                  type="button"
                  className={`editor-content-item ${isActive ? "is-active" : ""} ${isOpening ? "is-loading" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                  aria-busy={isOpening || undefined}
                  disabled={busy}
                  onPointerEnter={item.kind === "about" ? undefined : preloadMarkdownEditor}
                  onFocus={item.kind === "about" ? undefined : preloadMarkdownEditor}
                  onClick={() => openItem(item)}
                >
                  <span>{titleFor(item)}</span>
                  <small>
                    {isOpening ? "読み込み中…" : statusFor(item)} · {item.id}
                  </small>
                </button>
              );
            })}
            {!filteredItems.length && <p className="editor-list-empty">まだありません。</p>}
          </nav>
          <Button className="editor-sidebar-close" variant="secondary" onClick={closeSidebar}>
            閉じる
          </Button>
        </aside>
        {isCompact && sidebarVisible && (
          <button
            className="editor-scrim"
            type="button"
            aria-label="一覧を閉じる"
            onClick={closeSidebar}
          />
        )}

        {!content ? (
          <EmptyEditor compact={isCompact || !sidebarVisible} onOpen={openSidebar} />
        ) : (
          <main className="editor-main" inert={isCompact && (sidebarVisible || Boolean(inspector))}>
            <section className="editor-document-head">
              <div>
                <div className="editor-document-context">
                  <p className="editor-path">
                    {content.kind === "post" ? "Blog" : content.kind === "work" ? "Works" : "About"}{" "}
                    / {content.id}
                  </p>
                </div>
                {content.kind === "about" ? (
                  <h1 className="editor-fixed-title">About</h1>
                ) : (
                  <input
                    type="text"
                    className="editor-title-input"
                    value={activeFile.meta.title || ""}
                    placeholder="タイトルを入力"
                    aria-label={content.kind === "post" ? "記事タイトル" : "作品名"}
                    onChange={(event) => updateMeta("title", event.target.value)}
                  />
                )}
              </div>
              <div className="editor-document-controls">
                <SegmentedControl
                  size="S"
                  value={locale}
                  options={[
                    { value: "ja", content: "日本語" },
                    { value: "en", content: "English" },
                  ]}
                  onClickOption={setLocale}
                />
              </div>
            </section>
            <div className="editor-viewbar">
              <div className="editor-view-tabs" role="tablist" aria-label="エディター表示">
                {viewModes.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    data-mode={value}
                    tabIndex={layoutMode === value ? 0 : -1}
                    aria-selected={layoutMode === value}
                    onClick={() => setMode(value)}
                    onKeyDown={viewTabKeyDown}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <section
              ref={workspaceRef}
              className={`editor-workspace mode-${layoutMode} ${content.kind === "about" ? "is-about" : ""}`}
            >
              {content.kind !== "about" && (
                <div
                  ref={toolbarRef}
                  className="editor-toolbar"
                  role="toolbar"
                  aria-label="Markdown書式"
                  onKeyDown={toolbarKeyDown}
                >
                  <div className="editor-toolbar-group" role="group" aria-label="編集履歴">
                    <span className="editor-toolbar-group-label">編集</span>
                    <div className="editor-toolbar-actions">
                      <Button
                        type="button"
                        size="S"
                        variant="text"
                        tabIndex={0}
                        onClick={() => editorRef.current?.undo()}
                        aria-label="元に戻す"
                        title="元に戻す"
                      >
                        <FaArrowRotateLeftIcon alt="" />
                      </Button>
                      <Button
                        type="button"
                        size="S"
                        variant="text"
                        tabIndex={-1}
                        onClick={() => editorRef.current?.redo()}
                        aria-label="やり直す"
                        title="やり直す"
                      >
                        <FaArrowRotateRightIcon alt="" />
                      </Button>
                      <Button
                        type="button"
                        size="S"
                        variant="text"
                        tabIndex={-1}
                        onClick={() => setShortcutOpen(true)}
                        aria-label="操作一覧"
                        title="操作一覧"
                      >
                        <FaCircleQuestionIcon alt="" />
                      </Button>
                    </div>
                  </div>
                  {TOOLBAR_GROUPS.map((group) => (
                    <div
                      key={group.label}
                      className="editor-toolbar-group"
                      role="group"
                      aria-label={group.label}
                    >
                      <span className="editor-toolbar-group-label">{group.label}</span>
                      <div className="editor-toolbar-actions">
                        {group.commands.map(([command, label]) => {
                          const CommandIcon = COMMAND_ICONS[command];
                          return (
                            <Button
                              key={command}
                              type="button"
                              size="S"
                              variant="text"
                              className={formatState[command] ? "is-active" : undefined}
                              aria-pressed={
                                command in formatState ? Boolean(formatState[command]) : undefined
                              }
                              aria-label={label}
                              title={label}
                              tabIndex={-1}
                              onClick={() => applyEdit(command)}
                            >
                              {CommandIcon ? (
                                <CommandIcon alt="" />
                              ) : (
                                <CompactLabel compact={COMPACT_COMMAND_LABELS[command]}>
                                  {label}
                                </CompactLabel>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="editor-toolbar-group" role="group" aria-label="画像">
                    <span className="editor-toolbar-group-label">画像</span>
                    <div className="editor-toolbar-actions">
                      <Button
                        type="button"
                        size="S"
                        variant="text"
                        tabIndex={-1}
                        onClick={() => libraryInputRef.current?.click()}
                        aria-label="写真を選ぶ"
                        title="写真を選ぶ"
                      >
                        <FaImageIcon alt="" />
                      </Button>
                      <input
                        ref={libraryInputRef}
                        className="editor-file-input"
                        type="file"
                        accept={IMAGE_ACCEPT}
                        multiple
                        onChange={(event) => prepareImages(event.target.files || [])}
                      />
                      <Button
                        type="button"
                        size="S"
                        variant="text"
                        tabIndex={-1}
                        onClick={() => cameraInputRef.current?.click()}
                        aria-label="撮影する"
                        title="撮影する"
                      >
                        <FaCameraIcon alt="" />
                      </Button>
                      <input
                        ref={cameraInputRef}
                        className="editor-file-input"
                        type="file"
                        accept={IMAGE_ACCEPT}
                        capture="environment"
                        onChange={(event) => prepareImages(event.target.files || [])}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="editor-write-pane">
                {content.kind === "about" ? (
                  <AboutEditor
                    files={content.files}
                    locale={locale}
                    onChange={updateAboutFiles}
                    onChooseAvatar={() => libraryInputRef.current?.click()}
                    onTakeAvatar={() => cameraInputRef.current?.click()}
                  />
                ) : (
                  <div className="editor-textarea-wrap">
                    <Suspense
                      fallback={
                        <div className="editor-loading" role="status">
                          エディターを準備しています…
                        </div>
                      }
                    >
                      <MarkdownEditor
                        key={`${content.kind}:${content.id}:${locale}`}
                        ref={editorRef}
                        value={activeFile.body}
                        ariaLabel="Markdown本文"
                        onChange={(body) =>
                          updateFile((file) => {
                            file.body = body;
                          })
                        }
                        onSelectionChange={setFormatState}
                        onImages={prepareImages}
                        onSave={() => save()}
                        onTogglePreview={() =>
                          setMode((current) => (current === "preview" ? "write" : "preview"))
                        }
                        onFocusToolbar={() => toolbarRef.current?.querySelector("button")?.focus()}
                        onScrollRatio={(ratio) =>
                          sendPreview("popyson-editor-preview-scroll-to", { ratio })
                        }
                      />
                    </Suspense>
                  </div>
                )}
                {content.kind !== "about" && (
                  <footer className="editor-metrics">
                    <span>{metrics.characters.toLocaleString()}文字</span>
                    <span>{metrics.lines.toLocaleString()}行</span>
                    <span>約{metrics.minutes}分</span>
                    <span>画像は選択・ドロップ・貼り付けに対応</span>
                  </footer>
                )}
              </div>
              {layoutMode === "split" && (
                <button
                  className="editor-resize-handle"
                  type="button"
                  role="separator"
                  aria-orientation="vertical"
                  aria-valuemin={30}
                  aria-valuemax={70}
                  aria-valuenow={Math.round(splitRatio)}
                  aria-label="編集欄とプレビューの幅を調整"
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    resizeSplit(event.clientX);
                  }}
                  onPointerMove={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      resizeSplit(event.clientX);
                    }
                  }}
                  onPointerUp={(event) =>
                    event.currentTarget.releasePointerCapture(event.pointerId)
                  }
                  onKeyDown={(event) => {
                    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
                    event.preventDefault();
                    setSplitRatio((current) =>
                      Math.min(70, Math.max(30, current + (event.key === "ArrowRight" ? 5 : -5))),
                    );
                  }}
                />
              )}
              <div className={`editor-preview-pane ${previewFull ? "is-full-window" : ""}`}>
                <div className="editor-preview-label">
                  <span>公開サイトプレビュー</span>
                  <div>
                    <SegmentedControl
                      size="S"
                      value={previewDevice}
                      options={[
                        { value: "auto", content: "自動" },
                        { value: "desktop", content: "PC" },
                        { value: "mobile", content: "スマホ" },
                      ]}
                      onClickOption={setPreviewDevice}
                    />
                    <Button
                      size="S"
                      variant="secondary"
                      onClick={() => setPreviewFull((current) => !current)}
                    >
                      {previewFull ? "全画面を閉じる" : "全画面"}
                    </Button>
                  </div>
                </div>
                <div className={`editor-preview-frame is-${previewDevice}`}>
                  <iframe
                    ref={previewFrameRef}
                    src={PREVIEW_URL}
                    title="公開サイトと同じ見た目のプレビュー"
                    onLoad={() => setPreviewReady(true)}
                  />
                </div>
              </div>
              {content.kind === "about" && (
                <>
                  <input
                    ref={libraryInputRef}
                    className="editor-file-input"
                    type="file"
                    accept={IMAGE_ACCEPT}
                    onChange={(event) => prepareImages(event.target.files || [])}
                  />
                  <input
                    ref={cameraInputRef}
                    className="editor-file-input"
                    type="file"
                    accept={IMAGE_ACCEPT}
                    capture="environment"
                    onChange={(event) => prepareImages(event.target.files || [])}
                  />
                </>
              )}
            </section>

            {publishJob && (
              <PublishProgressPanel job={publishJob} onClose={() => setPublishJob(null)} />
            )}
          </main>
        )}
        {content && inspector && (
          <aside
            id="editor-inspector"
            ref={inspectorRef}
            className="editor-inspector"
            role={isCompact ? "dialog" : undefined}
            aria-modal={isCompact ? "true" : undefined}
            aria-label={
              inspector === "settings"
                ? "公開設定"
                : inspector === "outline"
                  ? "文書アウトライン"
                  : "変更履歴"
            }
          >
            <header>
              <div>
                <h2>
                  {inspector === "settings"
                    ? "公開設定"
                    : inspector === "outline"
                      ? "アウトライン"
                      : "変更履歴"}
                </h2>
                {inspector === "settings" && (
                  <p>
                    {statusFor(content)} · {basicReadiness}
                  </p>
                )}
              </div>
              <Button
                className="editor-inspector-close"
                size="S"
                variant="text"
                aria-label="パネルを閉じる"
                title="閉じる"
                onClick={() => setInspector(null)}
              >
                <FaXmarkIcon alt="" />
              </Button>
            </header>
            <div className="editor-inspector-body">
              {inspector === "settings" && (
                <div className="editor-meta-grid">
                  <FormControl
                    label="公開範囲"
                    helpMessage="変更後に公開すると静的サイトへ反映されます"
                  >
                    <Select
                      width="100%"
                      value={content.visibility}
                      disabled={busy || Boolean(content.deletedAt)}
                      options={[
                        { value: "private", label: "非公開" },
                        { value: "public", label: "公開" },
                      ]}
                      onChangeValue={changeVisibility}
                    />
                  </FormControl>
                  {content.deletedAt && (
                    <p className="editor-validation-error">
                      このコンテンツは削除済みです。「その他」から復元できます。
                    </p>
                  )}
                </div>
              )}
              {inspector === "settings" &&
                content.kind !== "about" &&
                (content.kind === "post" ? (
                  <PostMetadata
                    meta={activeFile.meta}
                    update={updateMeta}
                    locale={locale}
                    suggestions={tagSuggestions}
                    imageChoices={imageChoices}
                    onUpload={uploadMetaImage}
                    onRegenerateThumbnail={regenerateThumbnail}
                    busy={busy}
                  />
                ) : (
                  <WorkMetadata
                    meta={activeFile.meta}
                    update={updateMeta}
                    locale={locale}
                    suggestions={stackSuggestions}
                    imageChoices={imageChoices}
                    onUpload={uploadMetaImage}
                    busy={busy}
                  />
                ))}
              {inspector === "outline" && (
                <div className="editor-inspector-outline">
                  {outline.warnings.map((warning) => (
                    <p key={warning} className="editor-validation-error">
                      {warning}
                    </p>
                  ))}
                  {outline.headings.length ? (
                    <ol>
                      {outline.headings.map((heading) => (
                        <li
                          key={`${heading.offset}:${heading.title}`}
                          style={{ paddingLeft: `${Math.max(0, heading.level - 1) * 14}px` }}
                        >
                          <button
                            type="button"
                            onClick={() => editorRef.current?.reveal(heading.offset)}
                          >
                            {heading.title}
                          </button>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p>見出しを追加すると、ここから本文内を移動できます。</p>
                  )}
                </div>
              )}
              {inspector === "history" && (
                <div className="editor-inspector-history">
                  <p className="editor-local-draft-note">
                    各保存はデータベースに変更履歴として残り、以前の版を新しい版として復元できます。
                  </p>
                  {historyEntries.length ? (
                    <ul>
                      {historyEntries.map((entry) => (
                        <li key={entry.id}>
                          <span>
                            {new Date(entry.createdAt).toLocaleString()} —{" "}
                            {entry.createdBy === "author-restore" ? "復元版" : "保存版"}
                          </span>
                          <Button
                            size="S"
                            variant="secondary"
                            onClick={() => setRestoreTarget(entry)}
                          >
                            この版を復元
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>復元できる履歴はまだありません。</p>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
        {isCompact && inspector && (
          <button
            className="editor-inspector-scrim"
            type="button"
            aria-label="パネルを閉じる"
            onClick={() => setInspector(null)}
          />
        )}
      </div>

      <ControlledFormDialog
        isOpen={createOpen}
        size="S"
        heading={kind === "post" ? "記事を新しく作る" : "Worksを新しく作る"}
        actionButton={{ text: "作成", disabled: busy || (kind === "work" && !newSlug) }}
        closeButton="キャンセル"
        onSubmit={createContent}
        onClickClose={() => setCreateOpen(false)}
        onPressEscape={() => setCreateOpen(false)}
      >
        {kind === "post" ? (
          <p>日本語・英語のMarkdownを非公開の新しい版として作成します。</p>
        ) : (
          <FormControl label="URLスラッグ" helpMessage="半角小文字・数字・ハイフン">
            <Input
              autoFocus
              width="100%"
              value={newSlug}
              onChange={(event) => setNewSlug(event.target.value)}
            />
          </FormControl>
        )}
      </ControlledFormDialog>

      <ControlledFormDialog
        isOpen={imageOpen}
        size="M"
        heading={content?.kind === "about" ? "プロフィール画像を変更" : "画像を追加"}
        actionButton={{
          text:
            content?.kind === "about" ? "画像を保存" : `${pendingImages.length}件を保存して挿入`,
          disabled: busy,
        }}
        closeButton="キャンセル"
        onSubmit={uploadImages}
        onClickClose={() => setImageOpen(false)}
        onPressEscape={() => setImageOpen(false)}
      >
        <p>
          {content?.kind === "about"
            ? "画像は非公開のオブジェクトストレージへ保存され、日本語・英語のプロフィールで共通利用されます。"
            : "画像は非公開のオブジェクトストレージへ保存されます。代替テキストは画像の内容を短く説明してください。"}
        </p>
        {content?.kind !== "about" && (
          <div className="editor-image-queue">
            {pendingImages.map((item, index) => (
              <FormControl
                key={`${item.file.name}:${item.file.lastModified}`}
                label={`${item.file.name} の代替テキスト`}
              >
                <Input
                  width="100%"
                  value={item.alt}
                  onChange={(event) =>
                    setPendingImages((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, alt: event.target.value } : entry,
                      ),
                    )
                  }
                />
              </FormControl>
            ))}
          </div>
        )}
      </ControlledFormDialog>

      <ControlledActionDialog
        isOpen={publishOpen}
        size="S"
        heading="変更をまとめて公開しますか？"
        actionButton={{
          text: "公開処理を開始",
          theme: "primary",
          disabled: busy || !publishPreflight?.valid || !publishPreflight?.pendingCount,
        }}
        closeButton="キャンセル"
        onClickAction={startPublish}
        onClickClose={() => setPublishOpen(false)}
        onPressEscape={() => setPublishOpen(false)}
      >
        <div className="editor-publish-summary">
          {publishPreflight?.items?.length ? (
            ["post", "work", "about"].map((group) => {
              const entries = publishPreflight.items.filter((item) => item.kind === group);
              return entries.length ? (
                <section key={group}>
                  <strong>
                    {group === "post" ? "Blog" : group === "work" ? "Works" : "About"}
                  </strong>
                  <ul>
                    {entries.map((item) => (
                      <li className="editor-publish-item" key={item.itemId}>
                        <span>
                          {item.title} —{" "}
                          {item.action === "add"
                            ? "追加"
                            : item.action === "update"
                              ? "更新"
                              : item.action === "delete"
                                ? "削除"
                                : "非公開へ移動"}
                        </span>
                        {canTranslatePublicationItem(item) && (
                          <Checkbox
                            checked={publishTranslations[item.itemId] !== false}
                            disabled={busy}
                            onChange={(event) =>
                              setPublishTranslations((current) => ({
                                ...current,
                                [item.itemId]: event.target.checked,
                              }))
                            }
                          >
                            英語に翻訳する
                          </Checkbox>
                        )}
                        {item.issues?.map((issue) => (
                          <p
                            key={`${issue.locale}:${issue.field}`}
                            className="editor-validation-error"
                          >
                            {issue.locale.toUpperCase()}: {issue.message}
                          </p>
                        ))}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null;
            })
          ) : (
            <p>公開待ちの変更はありません。</p>
          )}
          <p>
            現在のデータベース版を固定して公開ジョブを作成し、ジョブIDだけをGitHub
            Actionsへ送ります。本文や画像はdispatch入力へ含めません。
          </p>
        </div>
      </ControlledActionDialog>

      <ControlledActionDialog
        isOpen={Boolean(restoreTarget)}
        size="S"
        heading="この版を復元しますか？"
        actionButton={{ text: "復元する", theme: "primary", disabled: busy }}
        closeButton="キャンセル"
        onClickAction={restoreHistory}
        onClickClose={() => setRestoreTarget(null)}
        onPressEscape={() => setRestoreTarget(null)}
      >
        <p>
          {restoreTarget ? new Date(restoreTarget.createdAt).toLocaleString() : ""}{" "}
          の内容へ戻します。現在の内容も履歴へ保存されます。
        </p>
      </ControlledActionDialog>

      <ControlledActionDialog
        isOpen={discardOpen}
        size="S"
        heading="コンテンツを削除しますか？"
        actionButton={{
          text: "削除する",
          theme: "danger",
          disabled: busy,
        }}
        closeButton="キャンセル"
        onClickAction={deleteContent}
        onClickClose={() => setDiscardOpen(false)}
        onPressEscape={() => setDiscardOpen(false)}
      >
        <p>
          データベース上で削除済みにします。本文・画像・変更履歴は復元のため保持されます。公開済みの場合は、続けて公開処理を実行するとサイトから除外されます。
        </p>
      </ControlledActionDialog>

      <ControlledActionDialog
        isOpen={conflictOpen}
        size="S"
        heading="別の変更が見つかりました"
        actionButton={{ text: "データベースの最新版を読み込む", theme: "primary", disabled: busy }}
        closeButton="編集画面へ戻る"
        onClickAction={reloadAfterConflict}
        onClickClose={() => setConflictOpen(false)}
        onPressEscape={() => setConflictOpen(false)}
      >
        <p>
          この画面の変更はまだ残っています。最新版を読み込む前に必要なら本文をコピーしてください。
        </p>
        {content?.kind !== "about" && (
          <Button
            variant="secondary"
            onClick={() => navigator.clipboard?.writeText(activeFile?.body || "")}
          >
            現在の本文をコピー
          </Button>
        )}
      </ControlledActionDialog>

      <ControlledActionDialog
        isOpen={shortcutOpen}
        size="S"
        heading="エディターの操作"
        actionButton={{ text: "閉じる" }}
        onClickAction={(_event, helpers) => {
          helpers.close();
          setShortcutOpen(false);
        }}
        onClickClose={() => setShortcutOpen(false)}
        onPressEscape={() => setShortcutOpen(false)}
      >
        <ul className="editor-shortcut-list">
          <li>保存: Ctrl / ⌘ + S</li>
          <li>太字: Ctrl / ⌘ + B</li>
          <li>斜体: Ctrl / ⌘ + I</li>
          <li>リンク: Ctrl / ⌘ + K、または選択文字へURLを貼り付け</li>
          <li>編集・プレビュー切替: Ctrl / ⌘ + Shift + P</li>
          <li>ツールバーへ移動: Alt + F10</li>
          <li>元に戻す / やり直す: Ctrl / ⌘ + Z、Ctrl / ⌘ + Shift + Z</li>
        </ul>
      </ControlledActionDialog>
    </div>
  );
}

export default function EditorRoot() {
  return (
    <IntlProvider locale="ja">
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </IntlProvider>
  );
}
