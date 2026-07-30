import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Theme = "dark" | "light";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: "dark", toggle: () => {} });

export function useTheme() { return useContext(ThemeContext); }

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(
    () => (typeof window !== "undefined" ? localStorage.getItem("mendly_theme") as Theme | null : null) || "dark"
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    localStorage.setItem("mendly_theme", theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === "dark" ? "light" : "dark"));

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}