import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/config";
import Logo from "@/components/Logo";

interface AuthModalProps {
  mode: "login" | "signup";
  onClose: () => void;
  onSwitch: (mode: "login" | "signup") => void;
}

function XMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect width="20" height="16" x="2" y="4" rx="2" /><path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return off ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" className="shrink-0">
      <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0110 10" />
    </svg>
  );
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

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{
        backgroundColor: mounted ? "hsl(0 0% 0% / 0.7)" : "hsl(0 0% 0% / 0)",
        backdropFilter: "blur(16px) saturate(1.4)",
        transition: "all 0.3s ease",
      }}
      onClick={onClose}
    >
      <div
        className="w-full overflow-hidden flex rounded-2xl"
        style={{
          maxWidth: "960px",
          minHeight: "600px",
          height: "min(600px, 90vh)",
          background: "hsl(var(--card) / 0.65)",
          backdropFilter: "blur(24px)",
          border: "1px solid hsl(var(--border))",
          boxShadow: "var(--shadow-xl)",
          transform: mounted ? (shake ? "translateX(-6px)" : "translateY(0) scale(1)") : "translateY(24px) scale(0.95)",
          opacity: mounted ? 1 : 0,
          transition: shake
            ? "transform 0.08s ease"
            : "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Panel — Brand */}
        <div
          className="hidden lg:flex flex-col items-center justify-center relative overflow-hidden"
          style={{
            width: "40%",
            background: "var(--gradient-hero)",
            borderRight: "1px solid hsl(var(--border))",
          }}
        >
          <div style={{
            position: "absolute", top: "-80px", left: "-80px",
            width: "300px", height: "300px", borderRadius: "50%",
            background: "radial-gradient(circle, hsl(173 80% 36% / 0.15), transparent 70%)",
            filter: "blur(60px)", pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: "-60px", right: "-60px",
            width: "250px", height: "250px", borderRadius: "50%",
            background: "radial-gradient(circle, hsl(188 95% 43% / 0.12), transparent 70%)",
            filter: "blur(50px)", pointerEvents: "none",
          }} />

          <div className="relative z-10 text-center px-8">
            <div className="inline-flex items-center justify-center mb-8">
              <Logo size="lg" showText={false} />
            </div>
            <h2 className="font-serif text-3xl font-semibold mb-3 gradient-text">
              Mendly
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: "hsl(var(--muted-foreground))" }}>
              Your AI-powered health companion.<br />
              Smarter care, better outcomes.
            </p>

            <div className="flex flex-col gap-3 text-left">
              {[
                { icon: "M15.75 6v3.75m0 3v.75m-6-3.75H9m1.5-3h.75m0 0v3m0 0h-.75M12 3a9 9 0 00-9 9v2.25a9 9 0 0018 0V12a9 9 0 00-9-9z", text: "AI Health Chat" },
                { icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z", text: "Medicine Tracker" },
                { icon: "M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m-9 0h18M3 6.75h18M4.5 3h15M6 3v3M18 3v3", text: "Find Nearby Care" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 px-5 py-3 rounded-xl"
                  style={{ background: "hsl(var(--muted) / 0.5)", border: "1px solid hsl(var(--border))" }}>
                  <svg className="w-4 h-4 shrink-0" style={{ color: "hsl(173 80% 36%)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                  <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel — Form */}
        <div className="flex-1 flex flex-col relative overflow-y-auto">
          <button
            onClick={() => { setMounted(false); setTimeout(onClose, 200); }}
            className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-muted"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <XMark />
          </button>

          <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 py-10">
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center mb-4">
                <Logo size="md" showText={false} />
              </div>
            </div>

            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2 text-foreground">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="text-base" style={{ color: "hsl(var(--muted-foreground))" }}>
                {mode === "login" ? "Sign in to continue to Mendly" : "Join Mendly for smarter health management"}
              </p>
            </div>

            {error && (
              <div className="mb-5 px-4 py-3.5 rounded-xl text-sm flex items-center gap-2.5 animate-in"
                style={{ background: "hsl(0 84% 60% / 0.08)", border: "1px solid hsl(0 84% 60% / 0.15)", color: "hsl(0 84% 70%)" }}>
                <AlertIcon />
                {error}
              </div>
            )}

            <form key={mode} onSubmit={handleSubmit} className="flex flex-col gap-5">
              {mode === "signup" && (
                <div className="animate-in">
                  <label className="block text-sm font-medium mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>Full name</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
                      <UserIcon />
                    </span>
                    <input
                      type="text" value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-xl text-base outline-none transition-all duration-200 input"
                      placeholder="John Doe" required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>Email address</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
                    <MailIcon />
                  </span>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-xl text-base outline-none transition-all duration-200 input"
                    placeholder="you@example.com" required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
                    <LockIcon />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 rounded-xl text-base outline-none transition-all duration-200 input"
                    placeholder="••••••••" required
                  />
                  <button
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors hover:bg-muted"
                    style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}
                  >
                    <EyeIcon off={showPassword} />
                  </button>
                </div>
              </div>

              {mode === "login" && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: "hsl(173 80% 36%)" }} />
                    <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Remember me</span>
                  </label>
                  <button type="button" className="text-sm font-medium transition-colors text-primary">
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full py-4 rounded-xl font-semibold text-base text-white transition-all duration-200 disabled:opacity-50 hover:shadow-[0_6px_28px_hsl(173_80%_36%/0.4)] active:scale-[0.98]"
                style={{
                  background: "var(--gradient-1)",
                  boxShadow: loading ? "none" : "0 4px 20px hsl(173 80% 36% / 0.3)",
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />
                    {mode === "login" ? "Signing in..." : "Creating account..."}
                  </span>
                ) : (
                  mode === "login" ? "Sign in" : "Create account"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              {mode === "login" ? "New to Mendly? " : "Already have an account? "}
              <button
                onClick={() => onSwitch(mode === "login" ? "signup" : "login")}
                className="font-semibold transition-colors duration-200 hover:underline text-primary"
              >
                {mode === "login" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}