"use client";

import { useState } from "react";

type Props = {
  code: string;
};

// Shows Mr. Spiky's suggested drop-in replacement for a selection. Copy-only
// — nothing here ever touches the editor. The user reviews it and pastes it
// in themselves if they want it.
export default function SuggestedCodeBlock({ code }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable or permission denied — nothing to fall
      // back to; the code is still visible to select and copy by hand.
    }
  }

  if (!code.trim()) return null;

  return (
    <div className="mt-2 overflow-hidden rounded-sm border border-(--border-strong)">
      <div className="flex items-center justify-between bg-(--bg-elevated) px-2 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-(--text-secondary)">
          Suggested fix
        </span>
        <button
          onClick={handleCopy}
          className="text-[10px] text-(--text-secondary) transition-colors hover:text-(--accent-strong)"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="max-h-48 overflow-auto bg-(--bg-base) p-2 font-mono text-[11px] leading-relaxed text-(--text-primary)">
        <code>{code}</code>
      </pre>
    </div>
  );
}
