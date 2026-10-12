import { ref, onMounted, onUnmounted, computed } from "vue";

export type Theme = "light" | "dark" | "system";
export type AccentColor = "default" | "blue" | "emerald" | "violet" | "amber" | "rose";

export interface AccentOption {
  id: AccentColor;
  name: string;
  colorHex: string;
}

export const ACCENT_COLORS: AccentOption[] = [
  { id: "default", name: "Default (Slate)", colorHex: "#71717a" },
  { id: "blue", name: "Blue (Sky)", colorHex: "#2563eb" },
  { id: "emerald", name: "Emerald (Green)", colorHex: "#10b981" },
  { id: "violet", name: "Violet (Purple)", colorHex: "#8b5cf6" },
  { id: "amber", name: "Amber (Orange)", colorHex: "#f59e0b" },
  { id: "rose", name: "Rose (Pink)", colorHex: "#f43f5e" },
];

// Shared state
const theme = ref<Theme>((localStorage.getItem("theme") as Theme) || "system");
const accentColor = ref<AccentColor>((localStorage.getItem("accent-color") as AccentColor) || "default");

const getSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const applyTheme = (currentTheme: Theme) => {
  const root = window.document.documentElement;
  const resolvedTheme =
    currentTheme === "system" ? getSystemTheme() : currentTheme;

  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);
  root.style.colorScheme = resolvedTheme;
};

const applyAccentColor = (color: AccentColor) => {
  const root = window.document.documentElement;
  if (!color || color === "default") {
    root.removeAttribute("data-accent");
  } else {
    root.setAttribute("data-accent", color);
  }
};

// Initial application
if (typeof window !== "undefined") {
  applyTheme(theme.value);
  applyAccentColor(accentColor.value);
}

export function useTheme() {
  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme;
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  const setAccentColor = (newColor: AccentColor) => {
    accentColor.value = newColor;
    localStorage.setItem("accent-color", newColor);
    applyAccentColor(newColor);
  };

  const effectiveTheme = computed(() => {
    if (theme.value === "system") return getSystemTheme();
    return theme.value;
  });

  const handleSystemChange = () => {
    if (theme.value === "system") {
      applyTheme("system");
    }
  };

  onMounted(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", handleSystemChange);
  });

  onUnmounted(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.removeEventListener("change", handleSystemChange);
  });

  return {
    theme,
    accentColor,
    effectiveTheme,
    setTheme,
    setAccentColor,
  };
}
