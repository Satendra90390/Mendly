"use client";

import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "./theme-provider";
import { type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
