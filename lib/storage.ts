import { HelpEntry, Language, Settings } from "./types";

const KEYS = {
  code: "ic.code",
  language: "ic.language",
  settings: "ic.settings",
  helpCache: "ic.helpCache",
};

export const MAX_HELP_CACHE = 20;

export const DEFAULT_SETTINGS: Settings = {
  mode: "fake",
  serverUrl: "http://localhost:8000",
  snnEnabled: true,
  lintEnabled: true,
};

const DEFAULT_CODE = `def calculate_total(items, discount=None, apply_tax=True, region="US", extra=None):
    total = 0
    for i in range(len(items)):
        item = items[i]
        if item["price"] > 0:
            if discount != None:
                if discount > 0:
                    if discount < 1:
                        total = total + (item["price"] * (1 - discount))
                    else:
                        total = total + item["price"]
                else:
                    total = total + item["price"]
            else:
                total = total + item["price"]
    if apply_tax == True:
        if region == "US":
            total = total * 1.0725
        elif region == "EU":
            total = total * 1.20
    return total
`;

export function loadCode(): string {
  if (typeof window === "undefined") return DEFAULT_CODE;
  return window.localStorage.getItem(KEYS.code) ?? DEFAULT_CODE;
}

export function saveCode(code: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEYS.code, code);
}

export function loadLanguage(): Language {
  if (typeof window === "undefined") return "python";
  return (window.localStorage.getItem(KEYS.language) as Language) ?? "python";
}

export function saveLanguage(language: Language) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEYS.language, language);
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEYS.settings);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

export function loadHelpCache(): HelpEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEYS.helpCache);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Drop anything left mid-flight from a previous session — there's no
    // request left to resolve it, so it would otherwise spin forever.
    return Array.isArray(parsed) ? parsed.filter((e) => e && e.status !== "loading") : [];
  } catch {
    return [];
  }
}

export function saveHelpCache(entries: HelpEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEYS.helpCache, JSON.stringify(entries.slice(0, MAX_HELP_CACHE)));
  } catch {
    // Quota exceeded or storage disabled — the cache still lives in memory
    // for this session, so just skip persistence.
  }
}
