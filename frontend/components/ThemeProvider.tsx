import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/theme";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  colors: typeof Colors.light;
  toggle: () => void;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() || "light";
  const [mode, setModeState] = useState<ThemeMode>(system);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("mendly_theme");
      if (saved === "light" || saved === "dark") setModeState(saved);
    })();
  }, []);

  const setMode = useCallback(async (m: ThemeMode) => {
    setModeState(m);
    await AsyncStorage.setItem("mendly_theme", m);
  }, []);

  const toggle = useCallback(async () => {
    const next = mode === "dark" ? "light" : "dark";
    setModeState(next);
    await AsyncStorage.setItem("mendly_theme", next);
  }, [mode]);

  const colors = Colors[mode];

  return (
    <ThemeContext.Provider value={{ mode, colors, toggle, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
