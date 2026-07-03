"use client";

import { HealthResponse } from "@/lib/types";

type Props = {
  health: HealthResponse | null;
};

export default function ModeBanner({ health }: Props) {
  if (!health || health.mode !== "mock") return null;

  return (
    <div className="rounded-md border border-[#ffb454]/30 bg-[#ffb454]/[0.06] px-4 py-2.5">
      <p className="font-mono text-xs uppercase tracking-wider text-[#ffb454]">
        running on mock scores
      </p>
      <p className="mt-1 text-xs text-[#c7cbd1]">
        {health.reason ?? "No trained weights loaded — retrain to enable the SNN."}
      </p>
    </div>
  );
}
