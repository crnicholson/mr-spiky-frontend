import { AXIS_LABELS, Axes, AxisKey, CompileResult, LineFeedback } from "./types";

// Simple seeded RNG so the same code produces stable-ish "gut reactions"
// instead of reshuffling on every keystroke debounce tick.
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Mirrors the real backend's mock-mode threshold (linear-scoring fallback
// used until trained weights are loaded — see /health `mode: "mock"`).
const FLAG_THRESHOLD = 0.55;

const COMMON_BUILTINS = new Set([
  "len", "range", "print", "str", "int", "float", "dict", "list", "set",
  "tuple", "super", "isinstance", "enumerate", "sorted", "zip", "map",
  "filter", "open", "type", "bool", "abs", "min", "max", "sum", "any", "all",
]);

const AXIS_REASON_CLAUSE: Record<AxisKey, string> = {
  complexity: "deeply nested / branchy control flow",
  tangled_state: "variables reach across long distances",
  hidden_calls: "delegates to opaque, non-stdlib calls",
  exception_surface: "heavy try/except/raise density",
  naming: "unusually dense or unusual identifier naming",
};

function clip01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function shannonEntropy(text: string): number {
  if (!text) return 0;
  const counts = new Map<string, number>();
  for (const ch of text) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / text.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function computeAxes(text: string, rand: () => number): Axes {
  const indent = text.match(/^\s*/)?.[0].length ?? 0;
  const nestingSignal = Math.min(indent / 16, 1);
  const lengthSignal = Math.min(text.length / 100, 1);
  const identifiers = text.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  const distinctNames = new Set(identifiers).size;
  const callMatches = text.match(/[A-Za-z_][A-Za-z0-9_]*\s*\(/g) ?? [];
  const hiddenCallCount = callMatches.filter(
    (c) => !COMMON_BUILTINS.has(c.replace(/\s*\($/, ""))
  ).length;
  const hasExceptionKeyword = /\b(try|except|raise|finally)\b/.test(text);
  const entropy = Math.min(shannonEntropy(text) / 4.5, 1);

  return {
    complexity: clip01(nestingSignal * 0.6 + lengthSignal * 0.25 + rand() * 0.3),
    tangled_state: clip01(Math.min(distinctNames / 12, 1) * 0.7 + rand() * 0.35),
    hidden_calls: clip01(Math.min(hiddenCallCount / 3, 1) * 0.8 + rand() * 0.3),
    exception_surface: hasExceptionKeyword
      ? clip01(0.6 + rand() * 0.4)
      : clip01(rand() * 0.2),
    naming: clip01(entropy * 0.7 + rand() * 0.3),
  };
}

function scoreFromAxes(axes: Axes, rand: () => number): number {
  const weighted =
    axes.complexity * 0.3 +
    axes.tangled_state * 0.25 +
    axes.hidden_calls * 0.2 +
    axes.exception_surface * 0.1 +
    axes.naming * 0.15;
  return Math.round(clip01(weighted + (rand() - 0.5) * 0.08) * 100) / 100;
}

function topTwoAxes(axes: Axes): AxisKey[] {
  return (Object.keys(axes) as AxisKey[]).sort((a, b) => axes[b] - axes[a]).slice(0, 2);
}

function buildReason(axes: Axes): string {
  const [first, second] = topTwoAxes(axes);
  return (
    `high on ${AXIS_LABELS[first]} (${axes[first].toFixed(2)}) + ` +
    `${AXIS_LABELS[second]} (${axes[second].toFixed(2)}) — ` +
    `${AXIS_REASON_CLAUSE[first]}; ${AXIS_REASON_CLAUSE[second]}`
  );
}

function enclosingFunctionSpan(
  lines: string[],
  lineIdx: number
): { name: string; start: number; end: number } | null {
  let defIdx = -1;
  let defIndent = 0;
  for (let i = lineIdx; i >= 0; i--) {
    const match = lines[i].match(/^(\s*)def\s+(\w+)/);
    if (match && match[1].length <= (lines[lineIdx].match(/^\s*/)?.[0].length ?? 0)) {
      defIdx = i;
      defIndent = match[1].length;
      break;
    }
  }
  if (defIdx === -1) return null;

  let endIdx = lines.length - 1;
  for (let i = defIdx + 1; i < lines.length; i++) {
    if (lines[i].trim().length === 0) continue;
    const indent = lines[i].match(/^\s*/)?.[0].length ?? 0;
    if (indent <= defIndent) {
      endIdx = i - 1;
      break;
    }
  }

  const nameMatch = lines[defIdx].match(/^\s*def\s+(\w+)/);
  return { name: nameMatch?.[1] ?? "unknown", start: defIdx, end: endIdx };
}

export async function fakeCompile(code: string): Promise<CompileResult> {
  const lines = code.split("\n");
  const rand = mulberry32(hashSeed(code));

  // Simulate the "reading" latency of a real network + inference call.
  await new Promise((resolve) => setTimeout(resolve, 250 + rand() * 350));

  const scored = lines.map((text, idx) => {
    if (text.trim().length === 0) {
      return { line: idx + 1, score: 0, axes: null as Axes | null };
    }
    const axes = computeAxes(text, rand);
    const score = scoreFromAxes(axes, rand);
    return { line: idx + 1, score, axes };
  });

  const feedback: LineFeedback[] = scored.map((s, idx) => {
    if (!s.axes) {
      return {
        line: s.line,
        score: 0,
        flag: false,
        axes: {
          complexity: 0,
          tangled_state: 0,
          hidden_calls: 0,
          exception_surface: 0,
          naming: 0,
        },
      };
    }

    const flag = s.score >= FLAG_THRESHOLD;
    if (!flag) {
      return { line: s.line, score: s.score, flag: false, axes: s.axes };
    }

    const span = enclosingFunctionSpan(lines, idx);
    const context = span
      ? {
          function: span.name,
          span: [span.start + 1, span.end + 1] as [number, number],
          function_score:
            Math.round(
              (scored
                .slice(span.start, span.end + 1)
                .reduce((sum, l) => sum + l.score, 0) /
                Math.max(span.end - span.start + 1, 1)) *
                100
            ) / 100,
        }
      : undefined;

    return {
      line: s.line,
      score: s.score,
      flag: true,
      axes: s.axes,
      reason: buildReason(s.axes),
      context,
      raw_features: {
        nesting_depth: clip01(s.axes.complexity * 0.9 + rand() * 0.1),
        length: clip01(rand() * 0.6 + s.axes.complexity * 0.2),
        token_entropy: clip01(s.axes.naming * 0.7 + rand() * 0.2),
        naming_entropy: s.axes.naming,
        cyclomatic_proxy: clip01(s.axes.complexity * 0.85 + rand() * 0.15),
        use_def_distance: s.axes.tangled_state,
        name_flow: clip01(s.axes.tangled_state * 0.7 + rand() * 0.2),
        call_graph_shape: s.axes.hidden_calls,
        exception_density: s.axes.exception_surface,
      },
    };
  });

  const flagged = feedback.filter((f) => f.flag).sort((a, b) => b.score - a.score);
  const topFlagged = flagged.slice(0, 3).map((f) => f.line);

  let dominantAxis: AxisKey | null = null;
  if (flagged.length > 0) {
    const totals: Record<AxisKey, number> = {
      complexity: 0,
      tangled_state: 0,
      hidden_calls: 0,
      exception_surface: 0,
      naming: 0,
    };
    for (const f of flagged) {
      (Object.keys(totals) as AxisKey[]).forEach((k) => {
        totals[k] += f.axes[k];
      });
    }
    dominantAxis = (Object.keys(totals) as AxisKey[]).sort(
      (a, b) => totals[b] - totals[a]
    )[0];
  }

  const verdict =
    flagged.length === 0
      ? "No high-intensity spikes — this reads clean"
      : `${flagged.length} high-intensity spike${flagged.length === 1 ? "" : "s"} detected — dominant axis: ${AXIS_LABELS[dominantAxis!]}`;

  return {
    verdict,
    dominant_axis: dominantAxis,
    lines: feedback,
    top_flagged: topFlagged,
  };
}
