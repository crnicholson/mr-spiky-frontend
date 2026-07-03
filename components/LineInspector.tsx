"use client";

import { AXIS_LABELS, AxisKey, LineFeedback } from "@/lib/types";

type Props = {
  selectedLine: number | null;
  lineFeedback: LineFeedback | null;
  dominantAxis: AxisKey | null;
};

const AXIS_ORDER: AxisKey[] = [
  "complexity",
  "tangled_state",
  "hidden_calls",
  "exception_surface",
  "naming",
];

export default function LineInspector({ selectedLine, lineFeedback, dominantAxis }: Props) {
  if (selectedLine === null) {
    return (
      <div className="rounded-md border border-[#22262b] bg-[#111317] p-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[#868c98]">
          line inspector
        </p>
        <p className="mt-2 text-xs text-[#4d525c]">
          Click a line in the editor to inspect its axes.
        </p>
      </div>
    );
  }

  if (!lineFeedback || lineFeedback.score === 0) {
    return (
      <div className="rounded-md border border-[#22262b] bg-[#111317] p-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[#868c98]">
          line {selectedLine}
        </p>
        <p className="mt-2 text-xs text-[#4d525c]">No signal on this line.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[#22262b] bg-[#111317] p-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[#868c98]">
          line {selectedLine}
        </p>
        <p
          className={`font-mono text-xs font-semibold ${
            lineFeedback.flag ? "text-[#ff5468]" : "text-[#ffb454]"
          }`}
        >
          {lineFeedback.score.toFixed(2)}
        </p>
      </div>

      <div className="mt-2.5 space-y-1.5">
        {AXIS_ORDER.map((axis) => {
          const value = lineFeedback.axes[axis];
          const isDominant = axis === dominantAxis;
          return (
            <div key={axis} className="flex items-center gap-2">
              <span
                className={`w-24 shrink-0 font-mono text-[10px] ${
                  isDominant ? "text-[#ffb454]" : "text-[#868c98]"
                }`}
              >
                {AXIS_LABELS[axis]}
                {isDominant ? " ●" : ""}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1a1d22]">
                <div
                  className={`h-full rounded-full ${
                    isDominant ? "bg-[#ffb454]" : "bg-[#5b6270]"
                  }`}
                  style={{ width: `${Math.min(value, 1) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right font-mono text-[10px] text-[#4d525c]">
                {value.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {lineFeedback.reason && (
        <p className="mt-2.5 border-t border-[#22262b] pt-2.5 text-xs leading-relaxed text-[#c7cbd1]">
          {lineFeedback.reason}
        </p>
      )}

      {lineFeedback.context && (
        <p className="mt-2 font-mono text-[10px] text-[#4d525c]">
          inside <span className="text-[#868c98]">{lineFeedback.context.function}</span>{" "}
          (lines {lineFeedback.context.span[0]}–{lineFeedback.context.span[1]}) · fn score{" "}
          {lineFeedback.context.function_score.toFixed(2)}
        </p>
      )}
    </div>
  );
}
