import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { AXIS_LABELS, Axes, AxisKey, HelpLineSummary, HelpRequest } from "@/lib/types";

// Only called when the user explicitly presses "Ask Mr. Spiky" — never on
// every keystroke — to keep token spend bounded to deliberate requests.
export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-4-5";
// Generous enough to cover both the prose advice and a full drop-in
// replacement for a multi-line selection without truncating the JSON output.
const MAX_TOKENS = 1024;

const AXIS_ORDER: AxisKey[] = [
  "complexity",
  "tangled_state",
  "hidden_calls",
  "exception_surface",
  "naming",
  "malformed",
];

// Structured output: keeps `advice` (prose) and `suggested_code` (a raw,
// drop-in replacement for the selection) reliably separated, instead of
// parsing a fenced code block out of free text.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    advice: { type: "string" },
    suggested_code: { type: "string" },
  },
  required: ["advice", "suggested_code"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are Mr. Spiky's fix-it helper. Mr. Spiky is a spiking neural network trained on senior-written Python (CPython, Django, Flask, requests, etc.) that flags lines whose structural features look unusual for that reference corpus. Mr. Spiky has already decided which lines are flagged — that decision is final. Your only job is to help the developer fix the code they've highlighted.

You will receive one selection from the editor, which may be a single line or a highlighted range spanning many. For each line in the selection that carries an SNN signal, you get:
- score: the line's suspicion score, 0 to 1.
- axes: six structural axis scores (0 to 1) — complexity, tangled_state, hidden_calls, exception_surface, naming, malformed. The highest ones explain what's driving the flag.
- reason: Mr. Spiky's own templated explanation (for reference only).

You also get: the selection's lineage (up to three enclosing blocks — if/for/try/def/etc., innermost first), the enclosing function name if any, and the raw source of the whole selection.

A lot of what Mr. Spiky flags is structural — the problem lives in the shape of the block, not any one line in isolation. When the selection spans multiple lines, reason about how they relate (repeated branching, state threaded across the block, nesting that could be flattened) instead of addressing each line separately.

Respond with two fields:

1. \`advice\`: 2-4 sentences of concrete, actionable explanation for what's wrong and how to fix it. Ground everything in what's given — the actual axis or axes driving the flag, the enclosing block from lineage, and the actual code in the selection. Wrap every identifier, function/variable name, or code snippet you mention in backticks (e.g. \`compute_score\`, \`if strict\`) — this is required, since the UI renders backticked spans as code. Don't invent details about code you can't see, and don't give generic advice like "reduce complexity" or "simplify this." Do not question, soften, or override the flag — treat it as correct and explain how to address it. Tone: direct and specific, like a senior engineer pairing with you — no "consider," no "you might want to," no hedging. State the fix. No headers, no markdown besides backticked code spans, no preamble, no trailing summary.

2. \`suggested_code\`: a complete, syntactically valid, drop-in replacement for the ENTIRE selected source (every line given to you, in order) that applies the fix described in \`advice\`. Preserve the original indentation level of the selection so it can be pasted back in its place unmodified. Plain source code only — no markdown code fences, no backticks, no line numbers, no commentary. This is a suggestion for the developer to review and apply themselves, not something applied automatically — make it something they could paste in as-is if they choose to.`;

function formatAxes(axes: Axes): string {
  return AXIS_ORDER.map((axis) => `${AXIS_LABELS[axis]}=${axes[axis].toFixed(2)}`).join(", ");
}

function formatLineSummary(line: HelpLineSummary): string {
  const reasonPart = line.reason ? ` — ${line.reason}` : "";
  return `  - line ${line.line}: score ${line.score.toFixed(2)} (${formatAxes(line.axes)})${reasonPart}`;
}

function buildUserPrompt(body: HelpRequest): string {
  const rangeLabel =
    body.startLine === body.endLine ? `line ${body.startLine}` : `lines ${body.startLine}-${body.endLine}`;

  const lineage =
    body.lineage && body.lineage.length > 0
      ? body.lineage
          .slice()
          .reverse()
          .map((l) => l.label)
          .join(" -> ")
      : "(none — top level)";

  const linesBlock =
    body.lines.length > 0 ? body.lines.map(formatLineSummary).join("\n") : "  (no SNN signal on these lines)";

  return [
    `- selection: ${rangeLabel}`,
    `- lines with SNN signal:`,
    linesBlock,
    `- lineage: ${lineage}`,
    `- function_name: ${body.functionName ? `\`${body.functionName}\`` : "None"}`,
    "- selected source:",
    "```",
    body.codeText,
    "```",
  ].join("\n");
}

function isValidAxes(value: unknown): value is Axes {
  if (!value || typeof value !== "object") return false;
  return AXIS_ORDER.every((axis) => typeof (value as Record<string, unknown>)[axis] === "number");
}

function isValidLineSummary(value: unknown): value is HelpLineSummary {
  if (!value || typeof value !== "object") return false;
  const line = value as Record<string, unknown>;
  return typeof line.line === "number" && typeof line.score === "number" && isValidAxes(line.axes);
}

function isValidBody(value: unknown): value is HelpRequest {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.startLine === "number" &&
    typeof body.endLine === "number" &&
    typeof body.codeText === "string" &&
    Array.isArray(body.lines) &&
    body.lines.every(isValidLineSummary)
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: "Missing or invalid selection data." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
      messages: [{ role: "user", content: buildUserPrompt(body) }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock) {
      return NextResponse.json({ error: "Claude returned an empty response." }, { status: 502 });
    }

    let parsed: { advice?: unknown; suggested_code?: unknown };
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      return NextResponse.json({ error: "Claude returned malformed JSON." }, { status: 502 });
    }

    const advice = typeof parsed.advice === "string" ? parsed.advice.trim() : "";
    const suggestedCode = typeof parsed.suggested_code === "string" ? parsed.suggested_code : "";

    if (!advice) {
      return NextResponse.json({ error: "Claude returned an empty response." }, { status: 502 });
    }

    return NextResponse.json({ advice, suggestedCode });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude request failed: ${err.message}` },
        { status: err.status ?? 502 }
      );
    }
    return NextResponse.json({ error: "Unexpected error contacting Claude." }, { status: 502 });
  }
}
