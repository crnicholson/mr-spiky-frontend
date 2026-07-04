"use client";

import { HelpEntry } from "@/lib/types";
import InlineCodeText from "./InlineCodeText";
import MrSpikyMascot from "./MrSpikyMascot";
import SuggestedCodeBlock from "./SuggestedCodeBlock";

type Props = {
  entries: HelpEntry[];
  onDismiss: (entry: HelpEntry) => void;
  onClearAll: () => void;
  onJumpToLine: (line: number) => void;
};

// Persistent list of every fix-it request/response, cached in the browser —
// stays visible in the sidebar no matter what's currently highlighted or
// selected, so the advice is still there once the user goes to make the edit.
export default function HelpNotes({ entries, onDismiss, onClearAll, onJumpToLine }: Props) {
  if (entries.length === 0) return null;

  return (
    <div className="mt-3 border-t border-(--border) pt-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-(--text-primary)">
          Mr. Spiky&apos;s Notes
        </p>
        <button
          onClick={onClearAll}
          className="text-[10px] text-(--text-muted) hover:text-(--text-secondary) hover:underline"
        >
          clear all
        </button>
      </div>

      <ul className="mt-1.5 space-y-2">
        {entries.map((entry) => (
          <li
            key={`${entry.startLine}-${entry.endLine}`}
            className="rounded-sm border border-(--border) bg-(--bg-surface-alt) p-2"
          >
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => onJumpToLine(entry.startLine)}
                className="flex items-center gap-1.5 text-[10px] font-semibold text-(--text-secondary) transition-colors hover:text-(--accent-strong)"
              >
                <MrSpikyMascot
                  mood={entry.status === "done" ? "pleased" : entry.status === "error" ? "stern" : "curious"}
                  className="h-4 w-4 shrink-0"
                />
                {entry.startLine === entry.endLine
                  ? `Line ${entry.startLine}`
                  : `Lines ${entry.startLine}–${entry.endLine}`}
              </button>
              <button
                onClick={() => onDismiss(entry)}
                aria-label="Dismiss note"
                className="px-1 text-xs text-(--text-muted) transition-colors hover:text-(--danger-light)"
              >
                ×
              </button>
            </div>

            {entry.status === "loading" && (
              <p className="mt-1.5 text-xs text-(--text-muted)">Asking Mr. Spiky…</p>
            )}
            {entry.status === "done" && (
              <>
                <p className="mt-1.5 text-xs leading-relaxed text-(--text-primary)">
                  <InlineCodeText text={entry.advice ?? ""} />
                </p>
                {entry.suggestedCode && <SuggestedCodeBlock code={entry.suggestedCode} />}
              </>
            )}
            {entry.status === "error" && (
              <p className="mt-1.5 text-xs leading-relaxed text-(--danger-light)">{entry.error}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
