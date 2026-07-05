"use client";

import { createPortal } from "react-dom";
import { HealthResponse, Mode, Settings } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
  health: HealthResponse | null;
  healthError: string | null;
};

const FRONTEND_REPO = "https://github.com/crnicholson/mr-spiky-frontend";
const BACKEND_REPO = "https://github.com/Arpan-206/mr-spiky";
const ANTHROPIC_KEYS_URL = "https://console.anthropic.com/settings/keys";

export default function SettingsPanel({ open, onClose, settings, onSettingsChange, health, healthError }: Props) {
  if (!open) return null;

  function setMode(mode: Mode) {
    onSettingsChange({ ...settings, mode });
  }

  const dotColor = healthError
    ? "bg-(--danger)"
    : health?.mode === "mock"
      ? "bg-(--warning)"
      : health
        ? "bg-(--success)"
        : "bg-(--text-muted)";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-y-auto rounded-md border border-(--border-strong) bg-(--bg-elevated) shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-(--border) px-4 py-3">
          <h2 className="text-sm font-semibold text-(--text-bright)">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-sm px-1.5 py-0.5 text-(--text-secondary) hover:text-(--text-primary)"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5 px-4 py-4">
          {/* Compile mode */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">
              Compile mode
            </h3>
            <div className="flex items-center overflow-hidden rounded-sm border border-(--border-strong)">
              <button
                onClick={() => setMode("fake")}
                className={`flex-1 px-3 py-1.5 text-xs transition-colors ${
                  settings.mode === "fake"
                    ? "bg-(--bg-base) text-(--text-bright)"
                    : "bg-(--bg-surface-alt) text-(--text-secondary) hover:text-(--text-primary)"
                }`}
              >
                fake
              </button>
              <button
                onClick={() => setMode("server")}
                className={`flex-1 border-l border-(--border-strong) px-3 py-1.5 text-xs transition-colors ${
                  settings.mode === "server"
                    ? "bg-(--bg-base) text-(--text-bright)"
                    : "bg-(--bg-surface-alt) text-(--text-secondary) hover:text-(--text-primary)"
                }`}
              >
                server
              </button>
            </div>

            {settings.mode === "server" && (
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`}
                  title={healthError ?? (health ? `mode: ${health.mode}` : "not connected")}
                />
                <input
                  value={settings.serverUrl}
                  onChange={(e) => onSettingsChange({ ...settings, serverUrl: e.target.value })}
                  placeholder="https://api.mr-spiky.crnicholson.com"
                  className="w-full rounded-sm border border-(--border) bg-(--bg-surface-alt) px-2 py-1 text-xs text-(--text-primary) outline-none focus:border-(--accent-strong)"
                />
              </div>
            )}
          </section>

          {/* AI help / BYOK */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">
              AI fix-it help
            </h3>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-(--text-primary)">
              <input
                type="checkbox"
                checked={settings.aiEnabled}
                onChange={(e) => onSettingsChange({ ...settings, aiEnabled: e.target.checked })}
                className="accent-(--accent)"
              />
              Enable &quot;Ask Mr. Spiky&quot; AI suggestions
            </label>
            <p className="text-[11px] leading-relaxed text-(--text-muted)">
              Off by default. This is bring-your-own-key: your Anthropic API key is stored only in
              this browser and sent with each request you make.
            </p>
            {settings.aiEnabled && (
              <>
                <input
                  type="password"
                  value={settings.anthropicApiKey}
                  onChange={(e) => onSettingsChange({ ...settings, anthropicApiKey: e.target.value })}
                  placeholder="sk-ant-..."
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-sm border border-(--border) bg-(--bg-surface-alt) px-2 py-1 text-xs text-(--text-primary) outline-none focus:border-(--accent-strong)"
                />
                <a
                  href={ANTHROPIC_KEYS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-start text-[11px] text-(--info) hover:underline"
                >
                  Get an Anthropic API key ↗
                </a>
              </>
            )}
          </section>

          {/* About */}
          <section className="flex flex-col gap-2 border-t border-(--border) pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">
              About
            </h3>
            <div className="flex flex-col gap-1 text-[11px]">
              <a
                href={FRONTEND_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="text-(--info) hover:underline"
              >
                Frontend source ↗
              </a>
              <a
                href={BACKEND_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="text-(--info) hover:underline"
              >
                Backend / SNN source ↗
              </a>
            </div>
            <p className="text-[11px] text-(--text-muted)">Built by <a href="https://crnicholson.com" target="_blank" rel="noopener noreferrer" className="underline">Charlie Nicholson</a> and <a href="https://arpanpandey.dev/" target="_blank" rel="noopener noreferrer" className="underline">Arpan Pandey</a>.</p>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}
