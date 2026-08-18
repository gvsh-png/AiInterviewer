export const THEME_STORAGE_KEY = "probe:theme";
export const THEME_EVENT = "probe:theme-changed";

export type ThemePreference = "system" | "light" | "dark";

export function getThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return value === "light" || value === "dark" ? value : "system";
}

export function applyThemePreference(preference: ThemePreference) {
  if (typeof document === "undefined") return;
  if (preference === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.dataset.theme = preference;
  }
}

export function setThemePreference(preference: ThemePreference) {
  if (typeof window === "undefined") return;
  if (preference === "system") {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  } else {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  }
  applyThemePreference(preference);
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function subscribeToTheme(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const storageListener = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", storageListener);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", storageListener);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}
