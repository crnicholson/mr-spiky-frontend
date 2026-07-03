export type AxisKey =
  | "complexity"
  | "tangled_state"
  | "hidden_calls"
  | "exception_surface"
  | "naming";

export const AXIS_LABELS: Record<AxisKey, string> = {
  complexity: "complexity",
  tangled_state: "tangled state",
  hidden_calls: "hidden calls",
  exception_surface: "exception surface",
  naming: "naming",
};

export const AXIS_DESCRIPTIONS: Record<AxisKey, string> = {
  complexity: "Deeply nested / branchy control flow.",
  tangled_state: "Variables reach across long distances in this line.",
  hidden_calls: "Delegates to opaque, non-stdlib calls.",
  exception_surface: "Try/except/raise density is high for the scope.",
  naming: "Unusual identifier density or character distribution.",
};

export type Axes = Record<AxisKey, number>;

export type RawFeatures = {
  nesting_depth: number;
  length: number;
  token_entropy: number;
  naming_entropy: number;
  cyclomatic_proxy: number;
  use_def_distance: number;
  name_flow: number;
  call_graph_shape: number;
  exception_density: number;
};

export type LineContext = {
  function: string;
  span: [number, number];
  function_score: number;
};

export type LineFeedback = {
  line: number;
  score: number;
  flag: boolean;
  axes: Axes;
  reason?: string;
  context?: LineContext;
  raw_features?: RawFeatures;
};

export type CompileResult = {
  verdict: string;
  dominant_axis: AxisKey | null;
  top_flagged: number[];
  lines: LineFeedback[];
};

export type HealthMode = "snn" | "mock";

export type HealthResponse = {
  status: string;
  supported_languages: string[];
  mode: HealthMode;
  threshold: number;
  hidden_size?: number;
  output_size?: number;
  hidden_baselines_distinct?: number;
  ecdf_reference_size?: number;
  reason?: string;
};

export type Mode = "fake" | "server";

export type Settings = {
  mode: Mode;
  serverUrl: string;
};

export type Language =
  | "javascript"
  | "typescript"
  | "python"
  | "cpp"
  | "java"
  | "rust"
  | "go"
  | "text";
