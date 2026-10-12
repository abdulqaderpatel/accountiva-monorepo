import React, { createContext, useContext, useEffect, useState } from "react";

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

interface ThemeContextType {
  theme: Theme;
  accentColor: AccentColor;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  setAccentColor: (accent: AccentColor) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme") as Theme) || "system";
  });

  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    if (typeof window === "undefined") return "default";
    return (localStorage.getItem("accent-color") as AccentColor) || "default";
  });

  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (!accentColor || accentColor === "default") {
      root.removeAttribute("data-accent");
    } else {
      root.setAttribute("data-accent", accentColor);
    }
  }, [accentColor]);

  // Listen to system scheme changes
  useEffect(() => {
    if (theme !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const newResolved = getSystemTheme();
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(newResolved);
      root.style.colorScheme = newResolved;
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const setAccentColor = (newAccent: AccentColor) => {
    setAccentColorState(newAccent);
    localStorage.setItem("accent-color", newAccent);
  };

  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        accentColor,
        isDark,
        setTheme,
        setAccentColor,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

