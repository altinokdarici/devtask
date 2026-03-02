import { useEffect, useState, type ReactNode } from "react";
import { ThemeContext, type Theme } from "../hooks/use-theme.ts";

function getInitialTheme(): Theme {
  const saved = localStorage.getItem("devtask-theme");
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("devtask-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }

  return <ThemeContext value={{ theme, toggleTheme }}>{children}</ThemeContext>;
}
