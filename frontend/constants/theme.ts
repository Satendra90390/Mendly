import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export const Colors = {
  light: {
    background: "#f4f6f9",
    foreground: "#0a1628",
    card: "#ffffff",
    cardForeground: "#0a1628",
    primary: "#1a8a7d",
    primaryForeground: "#ffffff",
    secondary: "#e8f5f3",
    secondaryForeground: "#0d6b62",
    muted: "#eef1f5",
    mutedForeground: "#6b7280",
    accent: "#1a8a7d",
    accentForeground: "#ffffff",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    border: "#e2e6ed",
    input: "#e2e6ed",
    ring: "#1a8a7d",
    accentBlue: "#0ea5e9",
    gradientStart: "#1a8a7d",
    gradientEnd: "#0ea5e9",
    brandDot: "rgba(26, 138, 125, 0.07)",
  },
  dark: {
    background: "#060d1a",
    foreground: "#e5edf5",
    card: "#0a1628",
    cardForeground: "#e5edf5",
    primary: "#1a8a7d",
    primaryForeground: "#ffffff",
    secondary: "#0d2e2a",
    secondaryForeground: "#4dd1c0",
    muted: "#111e2e",
    mutedForeground: "#8ba0b8",
    accent: "#1a8a7d",
    accentForeground: "#ffffff",
    destructive: "#7f1d1d",
    destructiveForeground: "#ffffff",
    border: "#1a2940",
    input: "#1a2940",
    ring: "#1a8a7d",
    accentBlue: "#0ea5e9",
    gradientStart: "#1a8a7d",
    gradientEnd: "#0ea5e9",
    brandDot: "rgba(26, 138, 125, 0.12)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  display: 52,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const Shadow = {
  sm: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  lg: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 5 },
};

export const ScreenDimensions = { width, height };
