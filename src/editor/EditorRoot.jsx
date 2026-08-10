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
  FaCircleQuestionIcon,
  FaCodeIcon,
  FaImageIcon,
  FaLinkIcon,
  FaListUlIcon,
  FaPlusIcon,
  FaSquareCheckIcon,
  FaTableIcon,
} from "smarthr-ui/lib/components/Icon/index";
import { Input } from "smarthr-ui/lib/components/Input/index";
import { NotificationBar } from "smarthr-ui/lib/components/NotificationBar/index";
import { SegmentedControl } from "smarthr-ui/lib/components/SegmentedControl/index";
import { Select } from "smarthr-ui/lib/components/Select/index";
import { StatusLabel } from "smarthr-ui/lib/components/StatusLabel/index";
import { Textarea } from "smarthr-ui/lib/components/Textarea/index";
import { ThemeProvider } from "smarthr-ui/lib/hooks/useTheme";
import { IntlProvider } from "smarthr-ui/lib/intl/IntlProvider";
import { createTheme } from "smarthr-ui/lib/themes/createTheme";
import "smarthr-ui/smarthr-ui.css";

import AboutEditor from "./AboutEditor.jsx";
import { createEditorApi } from "./editorApi.js";
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
const ACCEPTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
  "image/tiff",
]);
const IMAGE_ACCEPT =
  "image/png,image/jpeg,image/gif,image/webp,image/avif,image/heic,image/heif,image/tiff,.heic,.heif,.tif,.tiff";
const ACCEPTED_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "heic",
  "heif",
  "tif",
  "tiff",
]);
const LOCALES = ["ja", "en"];
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
};
const COMMAND_ICONS = {
  link: FaLinkIcon,
  list: FaListUlIcon,
  task: FaSquareCheckIcon,
  code: FaCodeIcon,
  table: FaTableIcon,
  callout: FaCircleInfoIcon,
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
  if (item.status === "draft") return "下書き";
  if (item.status === "published_with_draft") return "公開済み・下書きあり";
  return "公開済み";
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

function PostMetadata({ meta, update, locale, suggestions }) {
  const sumup = meta.sumup || { mode: "text", text: "" };
  const thumbnail = meta.thumbnail || { mode: "none" };
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
      {thumbnail.mode === "file" && (
        <MetaInput
          label="サムネイルのパス"
          value={thumbnail.path}
          onChange={(value) => update("thumbnail", { ...thumbnail, path: value })}
        />
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

function WorkMetadata({ meta, update, locale, suggestions }) {
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
          <MetaInput
            label="一覧画像"
            value={meta.thumbnail}
            onChange={(value) => update("thumbnail", value)}
          />
          <MetaInput
            label="ヒーロー画像"
            value={meta.hero}
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
  const [createOpen, setCreateOpen] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishPreflight, setPublishPreflight] = useState(null);
  const [publishJob, setPublishJob] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formatState, setFormatState] = useState({});
  const [imageOpen, setImageOpen] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [previewFull, setPreviewFull] = useState(false);
  const editorRef = useRef(null);
  const toolbarRef = useRef(null);
  const sidebarRef = useRef(null);
  const menuButtonRef = useRef(null);
  const libraryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const previewFrameRef = useRef(null);
  const workspaceRef = useRef(null);
  const editVersionRef = useRef(0);
  const saveInFlightRef = useRef(false);
  const openInFlightRef = useRef(false);
  const autoSaveFailureVersionRef = useRef(-1);

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
  const saveState = saving
    ? { type: "grey", text: "保存中" }
    : dirty
      ? { type: "warning", text: "未保存" }
      : content?.status === "published"
        ? { type: "green", text: "公開済み" }
        : savedAt
          ? {
              type: "green",
              text: `下書き保存済み ${savedAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}`,
            }
          : content
            ? { type: "grey", text: statusFor(content) }
            : null;
  const basicReadiness = (
    content?.kind === "about"
      ? activeFile?.meta?.person?.name?.trim()
      : activeFile?.meta?.title?.trim() && activeBody.trim()
  )
    ? "タイトル・本文入力済み"
    : "未入力項目あり";

  const loadList = useCallback(async () => {
    const result = await api.list();
    setItems(result.items);
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
        setSidebarOpen(false);
        menuButtonRef.current?.focus();
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
  }, [isCompact, sidebarOpen]);

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
        html: preview,
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
    if (!publishJob || publishJob.status !== "running") return;
    const timeout = setTimeout(() => {
      api
        .publishJob(publishJob.id)
        .then((job) => {
          setPublishJob(job);
          if (job.status === "succeeded") {
            setMessage({
              type: "success",
              text: "mainへのpushが完了し、本番デプロイを開始しました。公開ログで進行状態を確認できます。",
            });
            loadList();
            api
              .read(job.kind, job.contentId)
              .then((result) => {
                setContent(cloneContent(result));
                setSavedAt(new Date());
              })
              .catch((error) => setMessage({ type: "error", text: error.message }));
          } else if (job.status === "failed") {
            setMessage({ type: "error", text: "公開に失敗しました。ログを確認してください。" });
          }
        })
        .catch((error) => setMessage({ type: "error", text: error.message }));
    }, 900);
    return () => clearTimeout(timeout);
  }, [api, loadList, publishJob]);

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
      editVersionRef.current = 0;
      autoSaveFailureVersionRef.current = -1;
      setSavedAt(null);
      setSidebarOpen(false);
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
    setContent((current) => ({ ...cloneContent(current), files }));
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
          for (const fileLocale of LOCALES) {
            next.files[fileLocale].revision = saved.files[fileLocale].revision;
          }
          return next;
        });
        if (unchanged) setDirty(false);
        autoSaveFailureVersionRef.current = -1;
        setSavedAt(new Date());
        if (!quiet) setMessage({ type: "success", text: "非公開の下書きとして保存しました。" });
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
    if (!dirty || saving || busy || publishJob?.status === "running") return;
    if (autoSaveFailureVersionRef.current === editVersionRef.current) return;
    const timeout = window.setTimeout(() => save({ quiet: true }), 1500);
    return () => window.clearTimeout(timeout);
  }, [busy, dirty, publishJob?.status, save, saving]);

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

  const prepareImages = (files) => {
    const selected = [...files];
    const invalid = selected.find(
      (file) =>
        (!ACCEPTED_IMAGE_TYPES.has(file.type) &&
          !ACCEPTED_IMAGE_EXTENSIONS.has(file.name.split(".").pop()?.toLowerCase())) ||
        file.size === 0 ||
        file.size > 10 * 1024 * 1024,
    );
    if (invalid) {
      setMessage({
        type: "error",
        text: `${invalid.name || "画像"}は対応形式ではないか、10MBを超えています。`,
      });
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
    const uploadQueue = content.kind === "about" ? pendingImages.slice(0, 1) : pendingImages;
    for (const [index, item] of uploadQueue.entries()) {
      try {
        setMessage({
          type: "info",
          text: `画像を保存しています… ${index + 1}/${uploadQueue.length}`,
        });
        const asset = await api.upload(content.kind, content.id, item.file);
        if (content.kind === "about") {
          setContent((current) => {
            const next = cloneContent(current);
            for (const fileLocale of LOCALES) next.files[fileLocale].meta.person.icon = asset.url;
            return next;
          });
          editVersionRef.current += 1;
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
                ? "プロフィール画像をassets/へ保存しました。"
                : `${uploaded}件の画像をassets/へ保存して挿入しました。`,
          },
    );
  };

  const openHistory = async () => {
    if (!content) return;
    setBusy(true);
    try {
      const result = await api.history(content.kind, content.id);
      setHistoryEntries(result.entries);
      setHistoryOpen(true);
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
    setBusy(true);
    try {
      const restored = await api.restoreHistory(content.kind, content.id, restoreTarget.id, {
        ja: content.files.ja.revision,
        en: content.files.en.revision,
      });
      setContent(cloneContent(restored));
      setDirty(false);
      setSavedAt(new Date());
      setHistoryOpen(false);
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

  const discardDraft = async (_event, helpers) => {
    helpers.close();
    setDiscardOpen(false);
    if (!content) return;
    setBusy(true);
    try {
      const result = await api.discard(content.kind, content.id);
      if (result.deleted) setContent(null);
      else setContent(cloneContent(result));
      setDirty(false);
      setSavedAt(null);
      await loadList();
      setMessage({
        type: "success",
        text: result.deleted ? "下書きを削除しました。" : "下書きを破棄し、公開版へ戻しました。",
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
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
    const saved = await save();
    if (!saved) return;
    try {
      const job = await api.publish(saved.kind, saved.id);
      setPublishJob(job);
      setMessage({ type: "info", text: "検証して公開しています…" });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  };

  const openPublish = async () => {
    if (!content) return;
    const saved = dirty ? await save() : content;
    if (!saved) return;
    setBusy(true);
    try {
      const result = await api.publishPreflight(saved.kind, saved.id);
      setPublishPreflight(result);
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
      setMessage({ type: "info", text: "ディスク上の最新版を読み込みました。" });
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

  return (
    <div className="editor-app">
      <header className="editor-header" inert={isCompact && sidebarOpen}>
        <div className="editor-header-leading">
          <Button
            ref={menuButtonRef}
            className="editor-menu-button"
            variant="secondary"
            onClick={() => setSidebarOpen(true)}
          >
            <FaBarsIcon alt="コンテンツ一覧を開く" />
          </Button>
        </div>
        <div className="editor-header-actions">
          {saveState && (
            <StatusLabel className="editor-save-status" type={saveState.type}>
              {saveState.text}
            </StatusLabel>
          )}
          <Button
            variant="secondary"
            disabled={!content || busy || saving}
            loading={saving}
            onClick={() => save()}
            aria-label="下書きを保存"
          >
            <span className="editor-save-label-long" aria-hidden="true">
              下書きを保存
            </span>
            <span className="editor-save-label-short" aria-hidden="true">
              保存
            </span>
          </Button>
          <Button
            variant="primary"
            disabled={!content || busy || saving || publishJob?.status === "running"}
            onClick={openPublish}
          >
            公開
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

      <div className="editor-shell">
        <aside
          ref={sidebarRef}
          className={`editor-sidebar ${sidebarOpen ? "is-open" : ""}`}
          role={isCompact ? "dialog" : undefined}
          aria-modal={isCompact && sidebarOpen ? "true" : undefined}
          aria-label={isCompact ? "コンテンツ一覧" : undefined}
          aria-hidden={isCompact && !sidebarOpen ? "true" : undefined}
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
                size="S"
                variant="secondary"
                prefix={<FaPlusIcon alt="" />}
                onClick={() => setCreateOpen(true)}
              >
                新規
              </Button>
            )}
          </div>
          <div className="editor-list-filters">
            <Input
              name="content-query"
              width="100%"
              value={query}
              placeholder="タイトル・IDを検索"
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
                { value: "draft", label: "下書き" },
                { value: "published_with_draft", label: "公開済み・下書きあり" },
                { value: "published", label: "公開済み" },
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
          <Button
            className="editor-sidebar-close"
            variant="secondary"
            onClick={() => setSidebarOpen(false)}
          >
            閉じる
          </Button>
        </aside>
        {sidebarOpen && (
          <button
            className="editor-scrim"
            type="button"
            aria-label="一覧を閉じる"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {!content ? (
          <EmptyEditor compact={isCompact} onOpen={() => setSidebarOpen(true)} />
        ) : (
          <main className="editor-main" inert={isCompact && sidebarOpen}>
            <section className="editor-document-head">
              <div>
                <div className="editor-document-context">
                  <p className="editor-path">
                    {content.kind === "post" ? "Blog" : content.kind === "work" ? "Works" : "About"}{" "}
                    / {content.id}
                  </p>
                  {saveState && (
                    <span className="editor-document-save-state">{saveState.text}</span>
                  )}
                </div>
                {content.kind === "about" ? (
                  <h1 className="editor-fixed-title">About</h1>
                ) : (
                  <Input
                    className="editor-title-input"
                    width="100%"
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
                <SegmentedControl
                  size="S"
                  value={layoutMode}
                  options={
                    isCompact
                      ? [
                          { value: "write", content: "編集" },
                          { value: "preview", content: "プレビュー" },
                        ]
                      : [
                          { value: "write", content: "編集" },
                          { value: "split", content: "分割" },
                          { value: "preview", content: "プレビュー" },
                        ]
                  }
                  onClickOption={setMode}
                />
              </div>
            </section>

            {content.kind !== "about" && (
              <details className="editor-metadata">
                <summary>
                  <span>公開設定</span>
                  <span className="editor-metadata-readiness">{basicReadiness}</span>
                </summary>
                {content.kind === "post" ? (
                  <PostMetadata
                    meta={activeFile.meta}
                    update={updateMeta}
                    locale={locale}
                    suggestions={tagSuggestions}
                  />
                ) : (
                  <WorkMetadata
                    meta={activeFile.meta}
                    update={updateMeta}
                    locale={locale}
                    suggestions={stackSuggestions}
                  />
                )}
              </details>
            )}
            <div className="editor-document-actions">
              {content.kind !== "about" && (
                <Button
                  size="S"
                  variant="text"
                  prefix={<FaListUlIcon alt="" />}
                  onClick={() => setOutlineOpen((current) => !current)}
                >
                  アウトライン
                </Button>
              )}
              <DropdownMenuButton trigger={{ children: "その他", size: "S" }}>
                <Button variant="text" onClick={openHistory} disabled={busy}>
                  変更履歴
                </Button>
                <Button variant="text" onClick={() => setDiscardOpen(true)} disabled={busy}>
                  {content.status === "draft" ? "下書きを削除" : "公開版へ戻す"}
                </Button>
              </DropdownMenuButton>
            </div>
            {content.kind !== "about" && outlineOpen && (
              <section className="editor-outline-panel" aria-label="文書アウトライン">
                <div>
                  <strong>アウトライン</strong>
                  <Button size="S" variant="secondary" onClick={() => setOutlineOpen(false)}>
                    閉じる
                  </Button>
                </div>
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
              </section>
            )}
            {historyOpen && (
              <section className="editor-history-panel" aria-label="変更履歴">
                <div>
                  <strong>変更履歴</strong>
                  <Button size="S" variant="secondary" onClick={() => setHistoryOpen(false)}>
                    閉じる
                  </Button>
                </div>
                <p className="editor-local-draft-note">
                  下書きと履歴はこの端末の .drafts/ に保存されます。バックアップではありません。
                </p>
                {historyEntries.length ? (
                  <ul>
                    {historyEntries.map((entry) => (
                      <li key={entry.id}>
                        <span>
                          {new Date(entry.createdAt).toLocaleString()} —{" "}
                          {entry.title?.[locale] || "無題"}
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
              </section>
            )}

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
              <details className="editor-publish-log" open={publishJob.status !== "succeeded"}>
                <summary>公開ログ — {publishJob.phase || publishJob.status}</summary>
                <pre>{publishJob.log}</pre>
              </details>
            )}
          </main>
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
          <p>日本語・英語のMarkdownとassetsフォルダをまとめて作成します。</p>
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
            ? "画像はAbout専用のassetsフォルダへ保存され、日本語・英語のプロフィールで共通利用されます。"
            : "画像はこの記事のassetsフォルダに保存されます。代替テキストは画像の内容を短く説明してください。"}
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
        heading="下書きを公開しますか？"
        actionButton={{
          text: "検証してmainへ公開",
          theme: "primary",
          disabled: busy || !publishPreflight?.valid || !publishPreflight?.productionEligible,
        }}
        closeButton="キャンセル"
        onClickAction={startPublish}
        onClickClose={() => setPublishOpen(false)}
        onPressEscape={() => setPublishOpen(false)}
      >
        <div className="editor-publish-summary">
          <p>
            <strong>
              {content?.kind === "about"
                ? activeFile?.meta?.person?.name || "About"
                : activeFile?.meta?.title || "無題"}
            </strong>
          </p>
          <dl>
            <div>
              <dt>コンテンツ</dt>
              <dd>
                {content?.kind} / {content?.id}
              </dd>
            </div>
            <div>
              <dt>現在のブランチ</dt>
              <dd>{publishPreflight?.branch || "確認中"}</dd>
            </div>
            <div>
              <dt>公開対象</dt>
              <dd>{publishPreflight?.deployBranch || "main"}</dd>
            </div>
            {content?.kind === "about" ? (
              <div>
                <dt>News</dt>
                <dd>{content.files.ja.meta.newsItems.length}件</dd>
              </div>
            ) : (
              <>
                <div>
                  <dt>日本語本文</dt>
                  <dd>{content?.files.ja.body.trim() ? "入力済み" : "未入力"}</dd>
                </div>
                <div>
                  <dt>英語本文</dt>
                  <dd>{content?.files.en.body.trim() ? "入力済み" : "未入力"}</dd>
                </div>
              </>
            )}
          </dl>
          {!publishPreflight?.productionEligible && (
            <p className="editor-validation-error">
              このブランチへのpushでは本番サイトが更新されません。mainでエディターを起動してください。
            </p>
          )}
          {publishPreflight?.issues?.map((issue) => (
            <p key={`${issue.locale}:${issue.field}`} className="editor-validation-error">
              {issue.locale.toUpperCase()}: {issue.message}
            </p>
          ))}
          <p>
            検証成功後に対象コンテンツだけをコミットしてmainへpushします。push後は本番デプロイが別途開始されます。
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
        heading={content?.status === "draft" ? "下書きを削除しますか？" : "公開版へ戻しますか？"}
        actionButton={{
          text: content?.status === "draft" ? "削除する" : "下書きを破棄する",
          theme: "danger",
          disabled: busy,
        }}
        closeButton="キャンセル"
        onClickAction={discardDraft}
        onClickClose={() => setDiscardOpen(false)}
        onPressEscape={() => setDiscardOpen(false)}
      >
        <p>
          {content?.status === "draft"
            ? "未公開の内容とassetsを削除します。"
            : "公開サイトの内容は残し、公開後に加えた下書きの変更だけを破棄します。"}
        </p>
      </ControlledActionDialog>

      <ControlledActionDialog
        isOpen={conflictOpen}
        size="S"
        heading="別の変更が見つかりました"
        actionButton={{ text: "ディスクの最新版を読み込む", theme: "primary", disabled: busy }}
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
