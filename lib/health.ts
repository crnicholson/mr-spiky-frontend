import { HealthResponse } from "./types";

export function baseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export async function fetchHealth(
  serverUrl: string,
  signal?: AbortSignal
): Promise<HealthResponse> {
  const res = await fetch(`${baseUrl(serverUrl)}/health`, { signal });
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as HealthResponse;
}
