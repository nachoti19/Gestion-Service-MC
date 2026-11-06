export type Theme = "light" | "dark";

const STORAGE_KEY = "service-mc-theme";

// Mientras el usuario no elija, se usa el tema del sistema.
export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // sin localStorage: se usa el del sistema
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-bs-theme", theme);
}

export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignorar
  }
}
