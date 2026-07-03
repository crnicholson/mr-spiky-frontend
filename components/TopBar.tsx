"use client";

import { useRef } from "react";
import { LANGUAGE_OPTIONS, languageFromFilename } from "@/lib/language";
import { Language, Mode, Settings } from "@/lib/types";

type Props = {
  language: Language;
  onLanguageChange: (l: Language) => void;
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
  onFileLoaded: (code: string, language: Language) => void;
  connectionOk: boolean | null;
};

export default function TopBar({
  language,
  onLanguageChange,
  settings,
  onSettingsChange,
  onFileLoaded,
  connectionOk,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    onFileLoaded(text, languageFromFilename(file.name));
    e.target.value = "";
  }

  function setMode(mode: Mode) {
    onSettingsChange({ ...settings, mode });
  }

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-[#22262b] bg-[#0a0b0d] px-4 py-2.5">
      <div className="mr-2 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[#ffb454] shadow-[0_0_8px_#ffb454]" />
        <h1 className="font-mono text-sm font-semibold tracking-tight text-[#e7e9ec]">
          Mr. Spiky
        </h1>
      </div>

      <div className="flex items-center gap-1 rounded-md border border-[#22262b] bg-[#111317] p-0.5">
        <button
          onClick={() => setMode("fake")}
          className={`rounded px-2.5 py-1 font-mono text-xs transition-colors ${
            settings.mode === "fake"
              ? "bg-[#ffb454] text-[#0a0b0d]"
              : "text-[#868c98] hover:text-[#e7e9ec]"
          }`}
        >
          fake
        </button>
        <button
          onClick={() => setMode("server")}
          className={`rounded px-2.5 py-1 font-mono text-xs transition-colors ${
            settings.mode === "server"
              ? "bg-[#ffb454] text-[#0a0b0d]"
              : "text-[#868c98] hover:text-[#e7e9ec]"
          }`}
        >
          server
        </button>
      </div>

      {settings.mode === "server" && (
        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              connectionOk === null
                ? "bg-[#4d525c]"
                : connectionOk
                  ? "bg-[#3ddc84]"
                  : "bg-[#ff5468]"
            }`}
          />
          <input
            value={settings.serverUrl}
            onChange={(e) => onSettingsChange({ ...settings, serverUrl: e.target.value })}
            placeholder="http://localhost:8000/compile"
            className="w-64 rounded border border-[#22262b] bg-[#111317] px-2 py-1 font-mono text-xs text-[#e7e9ec] outline-none focus:border-[#ffb454]/60"
          />
        </div>
      )}

      <select
        value={language}
        onChange={(e) => onLanguageChange(e.target.value as Language)}
        className="rounded border border-[#22262b] bg-[#111317] px-2 py-1 font-mono text-xs text-[#e7e9ec] outline-none focus:border-[#ffb454]/60"
      >
        {LANGUAGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="rounded border border-[#22262b] bg-[#111317] px-2.5 py-1 font-mono text-xs text-[#c7cbd1] transition-colors hover:border-[#ffb454]/60 hover:text-[#ffb454]"
      >
        upload file
      </button>
      <input ref={fileInputRef} type="file" onChange={handleFile} className="hidden" />
    </header>
  );
}
