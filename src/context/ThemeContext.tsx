import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const ThemeContext = createContext<
  { theme: Theme; setTheme: (t: Theme) => void } | undefined
>(undefined);

const KEY = "paperling-theme";
const VALID: Theme[] = ["dark", "light"];

function prefersLight(): boolean {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
  ) {
    return window.matchMedia("(prefers-color-scheme: light)").matches;
  }
  return false;
}

function getInitialTheme(): Theme {
    const stored = localStorage.getItem("paperling-theme");
    if (stored && VALID.includes(stored as Theme)) return stored as Theme;

    if (prefersLight()) return "light";

    return "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem(KEY, t);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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