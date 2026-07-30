"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  avatar_color?: string;
  profile_photo?: string;
  auth_provider?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => typeof window !== "undefined" ? localStorage.getItem("mendly_token") : null
  );
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("mendly_user");
        return stored ? JSON.parse(stored) : null;
      } catch {}
    }
    return null;
  });
  const [loading] = useState(false);

  const login = useCallback((t: string, u: User) => {
    setToken(t);
    setUser(u);
    localStorage.setItem("mendly_token", t);
    localStorage.setItem("mendly_user", JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("mendly_token");
    localStorage.removeItem("mendly_user");
  }, []);

  const authFetch = useCallback(
    async (url: string, opts: RequestInit = {}) => {
      const headers = new Headers(opts.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const res = await fetch(url, { ...opts, headers });
      if (res.status === 401) { logout(); throw new Error("Session expired"); }
      return res;
    },
    [token, logout]
  );

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
