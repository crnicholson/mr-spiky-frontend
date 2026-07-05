import { HelpEntry, Language, Settings } from "./types";

const KEYS = {
  code: "ic.code",
  language: "ic.language",
  settings: "ic.settings",
  helpCache: "ic.helpCache",
};

export const MAX_HELP_CACHE = 20;

export const DEFAULT_SETTINGS: Settings = {
  mode: "server",
  serverUrl: "https://api.mr-spiky.crnicholson.com",
  snnEnabled: true,
  lintEnabled: true,
  aiEnabled: false,
  anthropicApiKey: "",
};

const DEFAULT_CODE = `def SPAGHETTI_FUNCTION(x, Y):
  global total
  total = 0
  Stuff = "1,2,3,4,5"
  Stuff = Stuff.split(",")

  for i in range(100):
    try:
      if i < len(Stuff):
        total = total + eval(Stuff[i])
    except:
      pass

  def inner(lst=[]):
    lst.append(total)
    return lst

  if x == True:
    if Y == True:
      return inner()
    else:
      return None
  else:
    return False


print(SPAGHETTI_FUNCTION(True, True))
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
