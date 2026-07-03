import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { Extension, RangeSetBuilder } from "@codemirror/state";
import { LineFeedback } from "./types";

// Bands follow the backend's score interpretation cheat-sheet:
// <0.5 normal, 0.5-0.7 subtle, 0.7-0.9 warm (hover only), >=0.9 flagged.
function styleFor(fb: LineFeedback): string | null {
  if (fb.score < 0.5) return null;

  if (fb.flag) {
    const alpha = 0.28 + fb.score * 0.32;
    return `background-color: rgba(239, 68, 68, ${alpha}); border-left: 3px solid rgba(239, 68, 68, 0.9);`;
  }

  if (fb.score >= 0.7) {
    const alpha = 0.14 + (fb.score - 0.7) * 0.6;
    return `background-color: rgba(255, 148, 68, ${alpha}); border-left: 2px solid rgba(255, 148, 68, 0.55);`;
  }

  const alpha = 0.06 + (fb.score - 0.5) * 0.4;
  return `background-color: rgba(255, 180, 84, ${alpha});`;
}

function tooltipFor(fb: LineFeedback): string {
  if (fb.reason) return fb.reason;
  return `score ${fb.score.toFixed(2)}`;
}

export function heatmapExtension(lines: LineFeedback[]): Extension {
  const byLine = new Map(lines.map((l) => [l.line, l]));

  return EditorView.decorations.of((view): DecorationSet => {
    const builder = new RangeSetBuilder<Decoration>();
    const totalLines = view.state.doc.lines;

    for (let i = 1; i <= totalLines; i++) {
      const fb = byLine.get(i);
      if (!fb) continue;
      const style = styleFor(fb);
      if (!style) continue;

      const line = view.state.doc.line(i);
      builder.add(
        line.from,
        line.from,
        Decoration.line({ attributes: { style, title: tooltipFor(fb) } })
      );
    }

    return builder.finish();
  });
}
