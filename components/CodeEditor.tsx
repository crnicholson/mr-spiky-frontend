"use client";

import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { codeMirrorExtension } from "@/lib/language";
import { heatmapExtension } from "@/lib/heatmapExtension";
import { HelpEntry, Language, LineFeedback, LintFinding } from "@/lib/types";
import InlineCodeText from "./InlineCodeText";
import MrSpikyMascot from "./MrSpikyMascot";
import SuggestedCodeBlock from "./SuggestedCodeBlock";

const instrumentTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--bg-base)",
      height: "100%",
      fontSize: "14px",
    },
    ".cm-content": {
      fontFamily: "var(--font-geist-mono), Consolas, ui-monospace, monospace",
      caretColor: "var(--caret)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--bg-base)",
      color: "var(--text-muted)",
      border: "none",
    },
    ".cm-activeLine": {
      backgroundColor: "var(--bg-elevated)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "var(--bg-elevated)",
      color: "var(--text-primary)",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-scroller": {
      overflow: "auto",
    },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      backgroundColor: "var(--selection) !important",
    },
  },
  { dark: true }
);

export type JumpTarget = { line: number; nonce: number };
export type LineRange = { startLine: number; endLine: number };

type PopupState = {
  range: LineRange;
  top: number;
  left: number;
};

type Props = {
  code: string;
  onChange: (code: string) => void;
  language: Language;
  lineFeedback: LineFeedback[];
  lintFindings: LintFinding[];
  onSelectLine: (line: number) => void;
  // Fires whenever the user drags out a highlight (a non-empty selection);
  // null once the selection collapses back to a plain cursor.
  onRangeSelect: (range: LineRange | null) => void;
  onAskMrSpiky: (range: LineRange) => void;
  // Every cached fix-it result, so the popup can show one even if it was
  // fetched in an earlier selection/session — cache lookup, not live state.
  helpCache: HelpEntry[];
  jumpTarget: JumpTarget | null;
};

export default function CodeEditor({
  code,
  onChange,
  language,
  lineFeedback,
  lintFindings,
  onSelectLine,
  onRangeSelect,
  onAskMrSpiky,
  helpCache,
  jumpTarget,
}: Props) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [popup, setPopup] = useState<PopupState | null>(null);

  const selectionListener = useMemo(
    () =>
      EditorView.updateListener.of((update) => {
        if (!update.selectionSet && !update.docChanged) return;
        const sel = update.state.selection.main;
        onSelectLine(update.state.doc.lineAt(sel.head).number);

        // An empty selection is just the cursor — no highlight, no popup.
        // Structural feedback for a single line still flows through the
        // sidebar (Line Inspector), same as before.
        if (sel.empty) {
          onRangeSelect(null);
          setPopup(null);
          return;
        }

        const startLine = update.state.doc.lineAt(sel.from).number;
        const endLine = update.state.doc.lineAt(sel.to).number;
        const range: LineRange = { startLine, endLine };
        onRangeSelect(range);

        const coords = update.view.coordsAtPos(sel.head);
        if (coords) {
          setPopup({ range, top: coords.bottom, left: coords.left });
        }
      }),
    [onSelectLine, onRangeSelect]
  );

  const extensions = useMemo(
    () => [
      ...codeMirrorExtension(language),
      heatmapExtension(lineFeedback, lintFindings),
      instrumentTheme,
      selectionListener,
    ],
    [language, lineFeedback, lintFindings, selectionListener]
  );

  useEffect(() => {
    if (!jumpTarget) return;
    const view = editorRef.current?.view;
    if (!view) return;
    const lineNumber = Math.min(Math.max(jumpTarget.line, 1), view.state.doc.lines);
    const line = view.state.doc.line(lineNumber);
    view.dispatch({
      selection: { anchor: line.from, head: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: "center" }),
    });
    view.focus();
    // jumpTarget.nonce makes this fire again even for a repeat click on the
    // same line; the line itself is applied above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTarget?.nonce]);

  const popupHelp = popup
    ? (helpCache.find((e) => e.startLine === popup.range.startLine && e.endLine === popup.range.endLine) ?? null)
    : null;

  const popupMood =
    popupHelp?.status === "done" ? "pleased" : popupHelp?.status === "error" ? "stern" : "curious";

  return (
    <>
      <CodeMirror
        ref={editorRef}
        value={code}
        onChange={onChange}
        extensions={extensions}
        theme="dark"
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
        }}
        height="100%"
        className="h-full"
      />

      {popup &&
        createPortal(
          <div
            style={{
              top: popup.top + 8,
              left: Math.min(popup.left, Math.max(window.innerWidth - 300, 8)),
            }}
            className="fixed z-50 max-h-[70vh] w-72 overflow-y-auto rounded-sm border border-(--border-strong) bg-(--bg-surface) p-2.5 shadow-lg"
          >
            <div className="flex items-center gap-1.5">
              <MrSpikyMascot mood={popupMood} className="h-6 w-6 shrink-0" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-(--text-secondary)">
                {popup.range.startLine === popup.range.endLine
                  ? `Line ${popup.range.startLine}`
                  : `Lines ${popup.range.startLine}–${popup.range.endLine}`}
              </span>
            </div>

            <button
              onClick={() => onAskMrSpiky(popup.range)}
              disabled={popupHelp?.status === "loading"}
              className="mt-2 w-full rounded-sm bg-(--accent) px-2.5 py-1 text-[11px] font-medium text-(--text-bright) transition-colors hover:bg-(--accent-strong) disabled:cursor-wait disabled:opacity-60"
            >
              {popupHelp?.status === "loading" ? "Asking Mr. Spiky…" : "Ask Mr. Spiky"}
            </button>

            {popupHelp?.status === "done" && (
              <>
                <p className="mt-2 text-xs leading-relaxed text-(--text-primary)">
                  <InlineCodeText text={popupHelp.advice ?? ""} />
                </p>
                {popupHelp.suggestedCode && <SuggestedCodeBlock code={popupHelp.suggestedCode} />}
              </>
            )}

            {popupHelp?.status === "error" && (
              <p className="mt-2 text-xs leading-relaxed text-(--danger-light)">{popupHelp.error}</p>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
