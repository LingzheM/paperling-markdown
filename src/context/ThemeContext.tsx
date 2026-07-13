// src/context/ThemeContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSavedTheme, setSavedTheme } from "../utils/persistence";

export type Theme = "light" | "dark";

const ThemeContext = createContext<
  { theme: Theme; setTheme: (t: Theme) => void } | undefined
>(undefined);

function prefersLight(): boolean {
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: light)").matches;
  }
  return false;
}

function getInitialTheme(): Theme {
  const saved = getSavedTheme();
  if (saved === "light" || saved === "dark") return saved;

  if (prefersLight()) return "light";
  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    setSavedTheme(t);
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