import { basicSetup, EditorView } from "codemirror";
import { autocompletion } from "@codemirror/autocomplete";
import { redo, undo } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { EditorSelection, Transaction } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";

import {
  insertImageMarkdown,
  linkSelection,
  markdownCommandState,
  markdownEdit,
} from "./markdownEditing.js";

const TOGGLE_COMMANDS = [
  "h2",
  "h3",
  "bold",
  "italic",
  "strike",
  "link",
  "inline-code",
  "quote",
  "list",
  "task",
];

function insertDetailsCompletion(view, _completion, from, to) {
  const template = ":::details[タイトル]\n本文\n:::";
  const bodyStart = from + template.indexOf("本文");
  view.dispatch({
    changes: { from, to, insert: template },
    selection: EditorSelection.range(bodyStart, bodyStart + "本文".length),
    scrollIntoView: true,
  });
}

const SLASH_OPTIONS = [
  { label: "/見出し2", detail: "大見出し", apply: "## " },
  { label: "/見出し3", detail: "小見出し", apply: "### " },
  { label: "/引用", detail: "引用ブロック", apply: "> " },
  { label: "/リスト", detail: "箇条書き", apply: "- " },
  { label: "/タスク", detail: "チェックリスト", apply: "- [ ] " },
  { label: "/コード", detail: "コードブロック", apply: "```\n\n```" },
  {
    label: "/表",
    detail: "2列の表",
    apply: "| 見出し | 見出し |\n| --- | --- |\n| 内容 | 内容 |",
  },
  { label: "/補足", detail: "補足ブロック", apply: ":::message\n\n:::" },
  { label: "/折りたたみ", detail: "折りたたみブロック", apply: insertDetailsCompletion },
];

function slashCompletions(context) {
  const word = context.matchBefore(/\/[^\s]*/);
  if (!word) return null;
  const line = context.state.doc.lineAt(word.from);
  if (context.state.doc.sliceString(line.from, word.from).trim()) return null;
  return { from: word.from, options: SLASH_OPTIONS };
}

function commandState(view) {
  const value = view.state.doc.toString();
  const { from, to } = view.state.selection.main;
  return Object.fromEntries(
    TOGGLE_COMMANDS.map((command) => [command, markdownCommandState(command, value, from, to)]),
  );
}

/**
 * @typedef {object} MarkdownEditorProps
 * @property {string} value
 * @property {string} ariaLabel
 * @property {(value: string) => void} onChange
 * @property {(state: Record<string, boolean>) => void} onSelectionChange
 * @property {(files: File[]) => void} onImages
 * @property {() => void} onSave
 * @property {() => void} onTogglePreview
 * @property {() => void} onFocusToolbar
 * @property {(ratio: number) => void} onScrollRatio
 */

/**
 * @param {MarkdownEditorProps} props
 * @param {import("react").ForwardedRef<any>} ref
 */
function MarkdownEditorImpl(props, ref) {
  const {
    value,
    ariaLabel,
    onChange,
    onSelectionChange,
    onImages,
    onSave,
    onTogglePreview,
    onFocusToolbar,
    onScrollRatio,
  } = props;
  const hostRef = useRef(null);
  const viewRef = useRef(null);
  const initialValueRef = useRef(value);
  const callbacksRef = useRef(/** @type {any} */ ({}));
  const suppressChangeRef = useRef(false);
  useLayoutEffect(() => {
    callbacksRef.current = {
      onChange,
      onSelectionChange,
      onImages,
      onSave,
      onTogglePreview,
      onFocusToolbar,
      onScrollRatio,
    };
  }, [
    onChange,
    onFocusToolbar,
    onImages,
    onSave,
    onScrollRatio,
    onSelectionChange,
    onTogglePreview,
  ]);

  useLayoutEffect(() => {
    if (!hostRef.current) return;
    const customKeymap = keymap.of([
      { key: "Mod-b", run: () => refApi().apply("bold") },
      { key: "Mod-i", run: () => refApi().apply("italic") },
      { key: "Mod-k", run: () => refApi().apply("link") },
      {
        key: "Mod-s",
        run: () => {
          callbacksRef.current.onSave?.();
          return true;
        },
      },
      {
        key: "Mod-Shift-p",
        run: () => {
          callbacksRef.current.onTogglePreview?.();
          return true;
        },
      },
      {
        key: "Alt-F10",
        run: () => {
          callbacksRef.current.onFocusToolbar?.();
          return true;
        },
      },
    ]);
    const view = new EditorView({
      doc: initialValueRef.current,
      parent: hostRef.current,
      extensions: [
        customKeymap,
        basicSetup,
        markdown(),
        autocompletion({ override: [slashCompletions] }),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
        EditorView.theme({
          "&": { height: "100%", fontSize: "15px" },
          ".cm-scroller": { fontFamily: "var(--editor-mono)", lineHeight: "1.75" },
          ".cm-content": { padding: "18px 10px 35vh" },
          ".cm-gutters": { backgroundColor: "transparent", borderRight: "0" },
          "&.cm-focused": { outline: "none" },
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !suppressChangeRef.current) {
            callbacksRef.current.onChange?.(update.state.doc.toString());
          }
          if (update.docChanged || update.selectionSet) {
            callbacksRef.current.onSelectionChange?.(commandState(update.view));
          }
        }),
        EditorView.domEventHandlers({
          paste(event, viewInstance) {
            const files = [...(event.clipboardData?.files || [])].filter((file) =>
              file.type.startsWith("image/"),
            );
            if (files.length) {
              event.preventDefault();
              callbacksRef.current.onImages?.(files);
              return true;
            }
            const text = event.clipboardData?.getData("text/plain")?.trim();
            const { from, to } = viewInstance.state.selection.main;
            const edit = linkSelection(viewInstance.state.doc.toString(), from, to, text);
            if (!edit) return false;
            event.preventDefault();
            dispatchEdit(viewInstance, edit);
            return true;
          },
          drop(event) {
            const files = [...(event.dataTransfer?.files || [])].filter((file) =>
              file.type.startsWith("image/"),
            );
            if (!files.length) return false;
            event.preventDefault();
            callbacksRef.current.onImages?.(files);
            return true;
          },
          scroll(_event, viewInstance) {
            const scroller = viewInstance.scrollDOM;
            const max = scroller.scrollHeight - scroller.clientHeight;
            callbacksRef.current.onScrollRatio?.(max > 0 ? scroller.scrollTop / max : 0);
            return false;
          },
        }),
      ],
    });
    viewRef.current = view;
    callbacksRef.current.onSelectionChange?.(commandState(view));

    function dispatchEdit(viewInstance, edit) {
      viewInstance.dispatch({
        changes: { from: 0, to: viewInstance.state.doc.length, insert: edit.value },
        selection: EditorSelection.range(edit.selectionStart, edit.selectionEnd),
        scrollIntoView: true,
      });
      viewInstance.focus();
    }

    function refApi() {
      return {
        apply(command) {
          const current = view.state.doc.toString();
          const { from, to } = view.state.selection.main;
          dispatchEdit(view, markdownEdit(command, current, from, to));
          return true;
        },
      };
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [ariaLabel]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    suppressChangeRef.current = true;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
      annotations: Transaction.addToHistory.of(false),
    });
    suppressChangeRef.current = false;
    callbacksRef.current.onSelectionChange?.(commandState(view));
  }, [value]);

  useImperativeHandle(ref, () => ({
    apply(command) {
      const view = viewRef.current;
      if (!view) return;
      const current = view.state.doc.toString();
      const { from, to } = view.state.selection.main;
      const edit = markdownEdit(command, current, from, to);
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: edit.value },
        selection: EditorSelection.range(edit.selectionStart, edit.selectionEnd),
        scrollIntoView: true,
      });
      view.focus();
    },
    insertImage(url, alt, { selectAlt = true } = {}) {
      const view = viewRef.current;
      if (!view) return;
      const current = view.state.doc.toString();
      const { from, to } = view.state.selection.main;
      const edit = insertImageMarkdown(current, from, to, url, alt);
      const marker = `![${alt}](${url})`;
      const markerStart = edit.value.lastIndexOf(marker, edit.selectionStart);
      const selection = selectAlt
        ? EditorSelection.range(edit.selectionStart, edit.selectionEnd)
        : EditorSelection.cursor(markerStart + marker.length);
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: edit.value },
        selection,
        scrollIntoView: true,
      });
      view.focus();
    },
    undo() {
      const view = viewRef.current;
      if (view) undo(view);
    },
    redo() {
      const view = viewRef.current;
      if (view) redo(view);
    },
    focus() {
      viewRef.current?.focus();
    },
    setScrollRatio(ratio) {
      const view = viewRef.current;
      if (!view) return;
      const max = view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight;
      view.scrollDOM.scrollTop = Math.max(0, Math.min(1, ratio)) * Math.max(0, max);
    },
    reveal(offset) {
      const view = viewRef.current;
      if (!view) return;
      const position = Math.min(view.state.doc.length, Math.max(0, Number(offset) || 0));
      view.dispatch({ selection: EditorSelection.cursor(position), scrollIntoView: true });
      view.focus();
    },
  }));

  return <div ref={hostRef} className="markdown-editor" />;
}

const MarkdownEditor = forwardRef(MarkdownEditorImpl);

export default MarkdownEditor;
