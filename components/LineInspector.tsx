"use client";

import { AXIS_DESCRIPTIONS, AXIS_LABELS, AxisKey, HelpEntry, LineFeedback, LintFinding, SCORE_DESCRIPTION } from "@/lib/types";
import { LineRange } from "./CodeEditor";
import HelpNotes from "./HelpNotes";
import InfoTip from "./InfoTip";
import InlineCodeText from "./InlineCodeText";
import MrSpikyMascot from "./MrSpikyMascot";
import SuggestedCodeBlock from "./SuggestedCodeBlock";

type Props = {
  selectedLine: number | null;
  lineFeedback: LineFeedback | null;
  dominantAxis: AxisKey | null;
  lintFindings: LintFinding[];
  snnEnabled: boolean;
  lintEnabled: boolean;
  // The active highlight in the editor (a drag-selection), if any — distinct
  // from just placing the cursor on a line.
  rangeSelection: LineRange | null;
  // Every fix-it request/response, cached client side — looked up here for
  // display, and rendered in full (regardless of current selection) via
  // HelpNotes below so the sidebar never loses feedback the user already asked for.
  helpCache: HelpEntry[];
  onRequestHelp: (range: LineRange) => void;
  onDismissHelp: (range: LineRange) => void;
  onClearHelp: () => void;
  onJumpToLine: (line: number) => void;
};

const AXIS_ORDER: AxisKey[] = [
  "complexity",
  "tangled_state",
  "hidden_calls",
  "exception_surface",
  "naming",
  "malformed",
];

export default function LineInspector({
  selectedLine,
  lineFeedback,
  dominantAxis,
  lintFindings,
  snnEnabled,
  lintEnabled,
  rangeSelection,
  helpCache,
  onRequestHelp,
  onDismissHelp,
  onClearHelp,
  onJumpToLine,
}: Props) {
  const hasSnnSignal = snnEnabled && !!lineFeedback && lineFeedback.score > 0;
  const hasLintSignal = lintEnabled && lintFindings.length > 0;

  const rangeHelp = rangeSelection
    ? (helpCache.find((e) => e.startLine === rangeSelection.startLine && e.endLine === rangeSelection.endLine) ?? null)
    : null;
  const singleLineHelp =
    selectedLine !== null
      ? (helpCache.find((e) => e.startLine === selectedLine && e.endLine === selectedLine) ?? null)
      : null;

  return (
    <div className="flex-1 overflow-y-auto bg-(--bg-surface) p-3">
      {selectedLine === null ? (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-(--text-primary)">
            Line Inspector
          </p>
          <div className="mt-3 flex items-start gap-2">
            <MrSpikyMascot mood="curious" className="h-8 w-8 shrink-0" />
            <p className="mt-1 text-xs text-(--text-muted)">
              Click a line to put it under the monocle.
            </p>
          </div>
        </>
      ) : (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-(--text-primary)">
            Line {selectedLine}
          </p>

          {rangeSelection && (
            <div className="mt-2.5 rounded-sm border border-(--border-strong) bg-(--bg-surface-alt) p-2">
              <div className="flex items-center gap-1.5">
                <MrSpikyMascot
                  mood={rangeHelp?.status === "done" ? "pleased" : rangeHelp?.status === "error" ? "stern" : "curious"}
                  className="h-6 w-6 shrink-0"
                />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-(--text-secondary)">
                  Highlighted —{" "}
                  {rangeSelection.startLine === rangeSelection.endLine
                    ? `line ${rangeSelection.startLine}`
                    : `lines ${rangeSelection.startLine}–${rangeSelection.endLine}`}
                </span>
              </div>

              <button
                onClick={() => onRequestHelp(rangeSelection)}
                disabled={rangeHelp?.status === "loading"}
                className="mt-2 w-full rounded-sm bg-(--accent) px-2.5 py-1 text-[11px] font-medium text-(--text-bright) transition-colors hover:bg-(--accent-strong) disabled:cursor-wait disabled:opacity-60"
              >
                {rangeHelp?.status === "loading" ? "Asking Mr. Spiky…" : "Ask Mr. Spiky"}
              </button>

              {rangeHelp?.status === "done" && (
                <>
                  <p className="mt-2 text-xs leading-relaxed text-(--text-primary)">
                    <InlineCodeText text={rangeHelp.advice ?? ""} />
                  </p>
                  {rangeHelp.suggestedCode && <SuggestedCodeBlock code={rangeHelp.suggestedCode} />}
                </>
              )}

              {rangeHelp?.status === "error" && (
                <p className="mt-2 text-xs leading-relaxed text-(--danger-light)">{rangeHelp.error}</p>
              )}
            </div>
          )}

          {snnEnabled && (
            <div className="mt-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-(--danger-light)">SNN</p>
              {!hasSnnSignal || !lineFeedback ? (
                <p className="mt-1 text-xs text-(--text-muted)">No signal on this line.</p>
              ) : (
                <>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-(--text-secondary)">
                      score
                      <InfoTip text={SCORE_DESCRIPTION} />
                    </span>
                    <span
                      className={`font-mono text-xs font-semibold ${
                        lineFeedback.flag ? "text-(--danger)" : "text-(--warning-light)"
                      }`}
                    >
                      {lineFeedback.score.toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-1.5 space-y-1.5">
                    {AXIS_ORDER.map((axis) => {
                      const value = lineFeedback.axes[axis];
                      const isDominant = axis === dominantAxis;
                      return (
                        <div key={axis} className="flex items-center gap-2">
                          <span
                            className={`flex w-28 shrink-0 items-center gap-1 text-[10px] ${
                              isDominant ? "text-(--danger-light)" : "text-(--text-secondary)"
                            }`}
                          >
                            {AXIS_LABELS[axis]}
                            {isDominant ? " ●" : ""}
                            <InfoTip text={AXIS_DESCRIPTIONS[axis]} />
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-(--border)">
                            <div
                              className={`h-full rounded-sm ${
                                isDominant ? "bg-(--danger)" : "bg-(--text-muted)"
                              }`}
                              style={{ width: `${Math.min(value, 1) * 100}%` }}
                            />
                          </div>
                          <span className="w-8 shrink-0 text-right font-mono text-[10px] text-(--text-muted)">
                            {value.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* {lineFeedback.reason && (
                    <p className="mt-2 text-xs leading-relaxed text-(--text-primary)">
                      {lineFeedback.reason}
                    </p>
                  )} */}

                  {lineFeedback.flag && (
                    <div className="mt-2.5">
                      <button
                        onClick={() => onRequestHelp({ startLine: selectedLine, endLine: selectedLine })}
                        disabled={singleLineHelp?.status === "loading"}
                        className="rounded-sm bg-(--accent) px-2.5 py-1 text-[11px] font-medium text-(--text-bright) transition-colors hover:bg-(--accent-strong) disabled:cursor-wait disabled:opacity-60"
                      >
                        {singleLineHelp?.status === "loading" ? "Asking Mr. Spiky…" : "Help me fix this"}
                      </button>

                      {singleLineHelp?.status === "done" && (
                        <div className="mt-2">
                          <div className="flex items-start gap-2">
                            <MrSpikyMascot mood="pleased" className="h-6 w-6 shrink-0" />
                            <p className="text-xs leading-relaxed text-(--text-primary)">
                              <InlineCodeText text={singleLineHelp.advice ?? ""} />
                            </p>
                          </div>
                          {singleLineHelp.suggestedCode && <SuggestedCodeBlock code={singleLineHelp.suggestedCode} />}
                        </div>
                      )}

                      {singleLineHelp?.status === "error" && (
                        <p className="mt-2 text-xs leading-relaxed text-(--danger-light)">{singleLineHelp.error}</p>
                      )}
                    </div>
                  )}

                  {/* {lineFeedback.context && (
                    <>
                      <p className="mt-1.5 font-mono text-[10px] text-(--text-muted)">
                        inside <span className="text-(--text-secondary)">{lineFeedback.context.function}</span>{" "}
                        (lines {lineFeedback.context.span[0]}–{lineFeedback.context.span[1]}) · fn score{" "}
                        {lineFeedback.context.function_score.toFixed(2)}
                        {lineFeedback.context.function_score_delta !== undefined && (
                          <span className={lineFeedback.context.function_score_delta >= 0 ? "text-(--danger-light)" : "text-(--success)"}>
                            {" "}
                            {lineFeedback.context.function_score_delta >= 0 ? "↑" : "↓"}
                            {Math.abs(lineFeedback.context.function_score_delta).toFixed(2)} vs base
                          </span>
                        )}
                      </p>
                      {lineFeedback.context.lineage && lineFeedback.context.lineage.length > 0 && (
                        <p className="mt-1 font-mono text-[10px] text-(--text-muted)">
                          {lineFeedback.context.lineage
                            .slice()
                            .reverse()
                            .map((l) => l.label)
                            .join(" ⟶ ")}
                        </p>
                      )}
                    </>
                  )} */}
                </>
              )}
            </div>
          )}

          {snnEnabled && lintEnabled && <div className="my-3 border-t border-(--border)" />}

          {lintEnabled && (
            <div className={snnEnabled ? "" : "mt-2.5"}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-(--info)">Lint</p>
              {!hasLintSignal ? (
                <p className="mt-1 text-xs text-(--text-muted)">No findings on this line.</p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {lintFindings.map((f, i) => (
                    <li key={`${f.rule}-${i}`} className="text-xs leading-relaxed">
                      <span
                        className={`font-mono text-[10px] font-semibold ${
                          f.severity === "error" ? "text-(--danger)" : "text-(--warning-light)"
                        }`}
                      >
                        {f.rule}
                      </span>{" "}
                      <span className="text-(--text-primary)">{f.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      <HelpNotes entries={helpCache} onDismiss={onDismissHelp} onClearAll={onClearHelp} onJumpToLine={onJumpToLine} />
    </div>
  );
}
