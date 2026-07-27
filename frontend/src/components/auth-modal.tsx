"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/config";

interface AuthModalProps {
  mode: "login" | "signup";
  onClose: () => void;
  onSwitch: (mode: "login" | "signup") => void;
}

export default function AuthModal({ mode, onClose, onSwitch }: AuthModalProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shake, setShake] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  useEffect(() => {
    setError("");
    setEmail("");
    setPassword("");
    setName("");
    setShowPassword(false);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/signup";
      const body = mode === "login" ? { email, password } : { email, password, name };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.detail || "Something went wrong");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }

      login(data.token, data.user);
      setMounted(false);
      setTimeout(onClose, 200);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: mounted ? "rgba(0, 0, 0, 0.75)" : "rgba(0, 0, 0, 0)",
        backdropFilter: "blur(12px)",
        transition: "all 0.3s ease",
      }}
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="relative w-full max-w-[420px] overflow-hidden"
        style={{
          background: "linear-gradient(180deg, rgba(20, 30, 48, 0.95) 0%, rgba(10, 15, 30, 0.98) 100%)",
          backdropFilter: "blur(40px)",
          borderRadius: "1.5rem",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.03), 0 25px 60px -12px rgba(0, 0, 0, 0.6), 0 0 120px -40px rgba(20, 184, 166, 0.12)",
          transform: mounted ? (shake ? "translateX(-6px)" : "translateY(0) scale(1)") : "translateY(20px) scale(0.96)",
          opacity: mounted ? 1 : 0,
          transition: shake
            ? "transform 0.08s ease"
            : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative top gradient line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "2px",
          background: "linear-gradient(90deg, transparent, #14B8A6, #0891B2, #14B8A6, transparent)",
          opacity: 0.6,
        }} />

        {/* Decorative glow */}
        <div style={{
          position: "absolute", top: "-60px", left: "50%", transform: "translateX(-50%)",
          width: "200px", height: "120px", borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(20, 184, 166, 0.15), transparent 70%)",
          pointerEvents: "none",
        }} />

        <div className="p-8 pb-7">
          {/* Close button */}
          <button
            onClick={() => { setMounted(false); setTimeout(onClose, 200); }}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-white/5"
            style={{ color: "rgba(148, 163, 184, 0.4)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Logo + Title */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{
              background: "linear-gradient(135deg, rgba(20, 184, 166, 0.15), rgba(8, 145, 178, 0.08))",
              border: "1px solid rgba(20, 184, 166, 0.15)",
            }}>
              <span className="text-2xl">💊</span>
            </div>
            <h1 className="text-xl font-bold mb-1" style={{
              background: "linear-gradient(135deg, #F1F5F9, rgba(241, 245, 249, 0.8))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm" style={{ color: "rgba(148, 163, 184, 0.5)" }}>
              {mode === "login" ? "Sign in to continue to Mendly" : "Join Mendly for smarter health management"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-2.5" style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.15)",
              color: "#FCA5A5",
              animation: "fade-in 0.3s ease",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === "signup" && (
              <div style={{ animation: "fade-in 0.3s ease" }}>
                <label className="block text-xs font-medium mb-1.5 ml-1" style={{ color: "rgba(148, 163, 184, 0.6)" }}>
                  Full name
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(148, 163, 184, 0.3)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  </span>
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      color: "#F1F5F9",
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "rgba(20, 184, 166, 0.4)"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)"}
                    placeholder="John Doe" required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5 ml-1" style={{ color: "rgba(148, 163, 184, 0.6)" }}>
                Email address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(148, 163, 184, 0.3)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" /></svg>
                </span>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    color: "#F1F5F9",
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "rgba(20, 184, 166, 0.4)"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)"}
                  placeholder="you@example.com" required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 ml-1" style={{ color: "rgba(148, 163, 184, 0.6)" }}>
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(148, 163, 184, 0.3)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    color: "#F1F5F9",
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "rgba(20, 184, 166, 0.4)"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)"}
                  placeholder="••••••••" required
                />
                <button
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors hover:bg-white/5"
                  style={{ color: "rgba(148, 163, 184, 0.4)" }}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 disabled:opacity-50 mt-1"
              style={{
                background: "linear-gradient(135deg, #14B8A6, #0891B2)",
                boxShadow: loading ? "none" : "0 4px 20px rgba(20, 184, 166, 0.3)",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = "0 6px 28px rgba(20, 184, 166, 0.4)"; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.boxShadow = "0 4px 20px rgba(20, 184, 166, 0.3)"; }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0110 10" /></svg>
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </span>
              ) : (
                mode === "login" ? "Sign in" : "Create account"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: "rgba(255, 255, 255, 0.05)" }} />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3" style={{ backgroundColor: "rgba(10, 15, 30, 1)", color: "rgba(148, 163, 184, 0.4)" }}>
                or
              </span>
            </div>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-3 transition-all duration-200"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              color: "rgba(241, 245, 249, 0.8)",
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.03)"}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          {/* Switch mode */}
          <p className="mt-5 text-center text-sm" style={{ color: "rgba(148, 163, 184, 0.4)" }}>
            {mode === "login" ? "New to Mendly? " : "Already have an account? "}
            <button
              onClick={() => onSwitch(mode === "login" ? "signup" : "login")}
              className="font-semibold transition-colors duration-200"
              style={{ color: "#14B8A6" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#2DD4BF"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#14B8A6"}
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
