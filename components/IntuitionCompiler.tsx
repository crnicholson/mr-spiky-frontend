"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeEditor, { JumpTarget, LineRange } from "./CodeEditor";
import TopBar from "./TopBar";
import VerdictBanner from "./VerdictBanner";
import SpikeTimeline from "./SpikeTimeline";
import LineInspector from "./LineInspector";
import ModeBanner from "./ModeBanner";
import StatusBar from "./StatusBar";
import { fakeCompile } from "@/lib/fakeCompile";
import { serverCompile } from "@/lib/serverCompile";
import { fakeLint } from "@/lib/fakeLint";
import { fetchHealth } from "@/lib/health";
import { fetchHelp } from "@/lib/haikuHelp";
import {
  loadCode,
  loadHelpCache,
  loadLanguage,
  loadSettings,
  saveCode,
  saveHelpCache,
  saveLanguage,
  saveSettings,
} from "@/lib/storage";
import { CompileResult, HealthResponse, HelpEntry, Language, Settings } from "@/lib/types";

function rangeKey(range: LineRange): string {
  return `${range.startLine}-${range.endLine}`;
}

const DEBOUNCE_MS = 500;
const HEALTH_DEBOUNCE_MS = 400;

export default function IntuitionCompiler() {
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<Language>("python");
  const [settings, setSettings] = useState<Settings>({
    mode: "fake",
    serverUrl: "",
    snnEnabled: true,
    lintEnabled: true,
  });

  const [result, setResult] = useState<CompileResult | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [jumpTarget, setJumpTarget] = useState<JumpTarget | null>(null);
  const [rangeSelection, setRangeSelection] = useState<LineRange | null>(null);
  // Every fix-it request/response, most-recently-touched first. Kept here
  // (not tied to the current selection) and persisted to localStorage so it
  // survives clicking elsewhere in the editor or reloading the page.
  const [helpCache, setHelpCache] = useState<HelpEntry[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestSeq = useRef(0);
  const helpAbortsRef = useRef<Map<string, AbortController>>(new Map());

  const healthDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const healthAbortRef = useRef<AbortController | null>(null);
  const jumpNonceRef = useRef(0);

  // Hydrate from localStorage on mount only, deferred past the first paint
  // so the client's initial render matches the server (no localStorage there).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setCode(loadCode());
    setLanguage(loadLanguage());
    setSettings(loadSettings());
    setHelpCache(loadHelpCache());
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (ready) saveCode(code);
  }, [code, ready]);

  useEffect(() => {
    if (ready) saveLanguage(language);
  }, [language, ready]);

  useEffect(() => {
    if (ready) saveSettings(settings);
  }, [settings, ready]);

  useEffect(() => {
    if (ready) saveHelpCache(helpCache);
  }, [helpCache, ready]);

  // Mr. Spiky's AST features are Python-only; once /health reports which
  // languages the backend actually supports, gate the analyze call to those.
  const languageGated =
    settings.mode === "server" &&
    !!health &&
    !health.supported_languages.includes(language);

  async function runCompile() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const seq = ++requestSeq.current;
    setIsCompiling(true);
    setError(null);

    try {
      const res =
        settings.mode === "fake"
          ? await fakeCompile(code)
          : await serverCompile(code, language, settings.serverUrl, controller.signal);

      if (seq !== requestSeq.current) return;
      setResult(res);
      setRunId((n) => n + 1);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (seq !== requestSeq.current) return;
      setError(err instanceof Error ? err.message : "Compile failed");
    } finally {
      if (seq === requestSeq.current) setIsCompiling(false);
    }
  }

  // Debounced auto-compile whenever code, language, or mode/server changes.
  useEffect(() => {
    if (!ready || !code.trim() || languageGated || !settings.snnEnabled) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      runCompile();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, language, settings.mode, settings.serverUrl, settings.snnEnabled, ready, languageGated]);

  // Debounced /health poll whenever server mode is active or the URL changes.
  useEffect(() => {
    if (healthDebounceRef.current) clearTimeout(healthDebounceRef.current);

    if (!ready || settings.mode !== "server" || !settings.serverUrl.trim()) {
      healthAbortRef.current?.abort();
      return;
    }

    healthDebounceRef.current = setTimeout(() => {
      healthAbortRef.current?.abort();
      const controller = new AbortController();
      healthAbortRef.current = controller;

      fetchHealth(settings.serverUrl, controller.signal)
        .then((h) => {
          if (controller.signal.aborted) return;
          setHealth(h);
          setHealthError(null);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setHealth(null);
          setHealthError(err instanceof Error ? err.message : "Health check failed");
        });
    }, HEALTH_DEBOUNCE_MS);

    return () => {
      if (healthDebounceRef.current) clearTimeout(healthDebounceRef.current);
    };
  }, [ready, settings.mode, settings.serverUrl]);

  const lintFindings = useMemo(
    () => (settings.lintEnabled ? fakeLint(code, language) : []),
    [code, language, settings.lintEnabled]
  );

  function handleFileLoaded(fileCode: string, fileLanguage: Language) {
    setCode(fileCode);
    setLanguage(fileLanguage);
  }

  const handleSelectLine = useCallback((line: number) => {
    setSelectedLine(line);
  }, []);

  const handleJumpToLine = useCallback((line: number) => {
    jumpNonceRef.current += 1;
    setJumpTarget({ line, nonce: jumpNonceRef.current });
    setSelectedLine(line);
  }, []);

  // Replaces (or inserts) the cache entry for `range` and moves it to the
  // front — used for both the initial "loading" placeholder and the
  // resolved done/error result.
  const upsertHelpEntry = useCallback((entry: HelpEntry) => {
    setHelpCache((prev) => [entry, ...prev.filter((e) => rangeKey(e) !== rangeKey(entry))]);
  }, []);

  // Fired only when the user presses "Help me fix this" / "Ask Mr. Spiky" —
  // never automatically — so a Claude Haiku call is made at most once per
  // click. `range` is either a single line (cursor, startLine === endLine)
  // or a highlighted block spanning many lines — a lot of what's flagged is
  // structural and doesn't live on one line in isolation. Requests for
  // different ranges run independently, so asking about one selection
  // doesn't cancel an in-flight request for another.
  const handleRequestHelp = useCallback(
    (range: LineRange) => {
      const key = rangeKey(range);
      helpAbortsRef.current.get(key)?.abort();
      const controller = new AbortController();
      helpAbortsRef.current.set(key, controller);

      upsertHelpEntry({ startLine: range.startLine, endLine: range.endLine, status: "loading", updatedAt: Date.now() });

      const codeText = code.split("\n").slice(range.startLine - 1, range.endLine).join("\n");
      const linesInRange = (result?.lines ?? []).filter(
        (l) => l.line >= range.startLine && l.line <= range.endLine && l.score > 0
      );
      const withContext = linesInRange.find((l) => l.context) ?? linesInRange[0];

      fetchHelp(
        {
          startLine: range.startLine,
          endLine: range.endLine,
          codeText,
          lines: linesInRange.map((l) => ({ line: l.line, score: l.score, axes: l.axes, reason: l.reason })),
          functionName: withContext?.context?.function ?? null,
          lineage: withContext?.context?.lineage,
        },
        controller.signal
      )
        .then(({ advice, suggestedCode }) => {
          if (controller.signal.aborted) return;
          upsertHelpEntry({
            startLine: range.startLine,
            endLine: range.endLine,
            status: "done",
            advice,
            suggestedCode,
            updatedAt: Date.now(),
          });
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          upsertHelpEntry({
            startLine: range.startLine,
            endLine: range.endLine,
            status: "error",
            error: err instanceof Error ? err.message : "Request failed",
            updatedAt: Date.now(),
          });
        });
    },
    [code, result, upsertHelpEntry]
  );

  const handleDismissHelp = useCallback((range: LineRange) => {
    setHelpCache((prev) => prev.filter((e) => rangeKey(e) !== rangeKey(range)));
  }, []);

  const handleClearHelp = useCallback(() => {
    setHelpCache([]);
  }, []);

  if (!ready) {
    return <div className="flex h-full items-center justify-center bg-(--bg-base)" />;
  }

  const hasCode = code.trim().length > 0;
  const showSnn = hasCode && !languageGated && settings.snnEnabled;
  const showLint = hasCode && settings.lintEnabled;
  const notice = languageGated
    ? `Mr. Spiky only reads ${health!.supported_languages.join(", ")} — switch the language above to analyze this snippet.`
    : null;
  const visibleLines = showSnn ? (result?.lines ?? []) : [];
  const visibleLintFindings = showLint ? lintFindings : [];
  const inspectorFeedback = visibleLines.find((l) => l.line === selectedLine) ?? null;
  const inspectorLintFindings = visibleLintFindings.filter((f) => f.line === selectedLine);

  return (
    <div className="flex h-full flex-col bg-(--bg-base)">
      <TopBar
        language={language}
        onLanguageChange={setLanguage}
        settings={settings}
        onSettingsChange={setSettings}
        onFileLoaded={handleFileLoaded}
        health={health}
        healthError={healthError}
      />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-80 flex-1 overflow-hidden">
          <CodeEditor
            code={code}
            onChange={setCode}
            language={language}
            lineFeedback={visibleLines}
            lintFindings={visibleLintFindings}
            onSelectLine={handleSelectLine}
            onRangeSelect={setRangeSelection}
            onAskMrSpiky={handleRequestHelp}
            helpCache={helpCache}
            jumpTarget={jumpTarget}
          />
        </div>
        <div className="flex w-full flex-col border-t border-(--border) lg:w-80 lg:border-l lg:border-t-0">
          <ModeBanner health={settings.mode === "server" && settings.snnEnabled ? health : null} />
          <VerdictBanner
            snnEnabled={settings.snnEnabled}
            lintEnabled={settings.lintEnabled}
            result={showSnn ? result : null}
            isCompiling={showSnn && isCompiling}
            error={showSnn ? error : null}
            notice={notice}
            lintFindings={visibleLintFindings}
            onJumpToLine={handleJumpToLine}
          />
          <SpikeTimeline lines={visibleLines} runId={runId} enabled={settings.snnEnabled} />
          <LineInspector
            selectedLine={selectedLine}
            lineFeedback={inspectorFeedback}
            dominantAxis={showSnn ? (result?.dominant_axis ?? null) : null}
            lintFindings={inspectorLintFindings}
            snnEnabled={settings.snnEnabled}
            lintEnabled={settings.lintEnabled}
            rangeSelection={rangeSelection}
            helpCache={helpCache}
            onRequestHelp={handleRequestHelp}
            onDismissHelp={handleDismissHelp}
            onClearHelp={handleClearHelp}
            onJumpToLine={handleJumpToLine}
          />
        </div>
      </div>
      <StatusBar
        settings={settings}
        language={language}
        health={health}
        healthError={healthError}
        result={showSnn ? result : null}
        lintFindings={visibleLintFindings}
        selectedLine={selectedLine}
      />
    </div>
  );
}
