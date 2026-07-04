import { HelpRequest, HelpResponse } from "./types";

export async function fetchHelp(payload: HelpRequest, signal?: AbortSignal): Promise<HelpResponse> {
  const res = await fetch("/api/help", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  const data = (await res.json().catch(() => null)) as (Partial<HelpResponse> & { error?: string }) | null;

  if (!res.ok || !data) {
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }

  if (typeof data.advice !== "string" || typeof data.suggestedCode !== "string") {
    throw new Error("Malformed response from /api/help");
  }

  return { advice: data.advice, suggestedCode: data.suggestedCode };
}
