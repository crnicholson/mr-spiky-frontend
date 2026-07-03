import { baseUrl } from "./health";
import { CompileResult } from "./types";

export async function serverCompile(
  code: string,
  language: string,
  serverUrl: string,
  signal?: AbortSignal
): Promise<CompileResult> {
  if (!serverUrl.trim()) {
    throw new Error("No server URL configured");
  }

  const res = await fetch(`${baseUrl(serverUrl)}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, language }),
    signal,
  });

  if (!res.ok) {
    let detail: string | undefined;
    try {
      detail = (await res.json())?.detail;
    } catch {
      // response wasn't JSON — fall through to the generic message
    }
    throw new Error(detail ?? `Server responded ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as CompileResult;

  if (!data || !Array.isArray(data.lines) || typeof data.verdict !== "string") {
    throw new Error("Malformed response from server");
  }

  return data;
}
