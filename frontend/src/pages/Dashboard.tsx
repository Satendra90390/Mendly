import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/config";

interface Counts {
  medicines: number;
  conditions: number;
  hospitals: number;
  pharmacies: number;
  messages: number;
}

function hexToBg(color: string, alpha: number) {
  const map: Record<string, string> = {
    "#14B8A6": "173 80% 36%",
    "#EC4899": "330 80% 60%",
    "#10B981": "160 84% 39%",
    "#8B5CF6": "250 88% 66%",
    "#F59E0B": "38 92% 50%",
    "#EF4444": "0 84% 63%",
  };
  return `hsl(${map[color] ?? "0 0% 0%"} / ${alpha})`;
}

function SvgIcon({ name, className = "w-5 h-5", style }: { name: string; className?: string; style?: React.CSSProperties }) {
  switch (name) {
    case "pills":
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="3" width="7" height="18" rx="3.5" />
          <rect x="13" y="3" width="7" height="18" rx="3.5" />
        </svg>
      );
    case "heart-pulse":
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      );
    case "hospital":
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" />
          <path d="M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" />
          <path d="M9 7h1" />
          <path d="M9 10h1" />
          <path d="M9 13h1" />
          <path d="M14 7h1" />
          <path d="M14 10h1" />
          <path d="M14 13h1" />
          <path d="M10 21v-4a2 2 0 014 0v4" />
        </svg>
      );
    case "prescription":
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="3" width="12" height="18" rx="1" />
          <path d="M9 3v3h6V3" />
          <path d="M9 10h6" />
          <path d="M12 7v6" />
          <path d="M9 16h6" />
        </svg>
      );
    case "chat":
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      );
    case "search":
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      );
    case "robot":
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="8" width="12" height="12" rx="2" />
          <circle cx="10" cy="12" r="1.5" />
          <circle cx="14" cy="12" r="1.5" />
          <path d="M10 16h4" />
          <path d="M12 4v4" />
          <path d="M8 4h8" />
        </svg>
      );
    case "location":
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case "ambulance":
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 7h20v10H2z" />
          <path d="M9 12V9" />
          <path d="M7.5 10.5h3" />
          <path d="M15 10h2" />
          <circle cx="6" cy="17" r="2" />
          <circle cx="18" cy="17" r="2" />
          <path d="M22 12h-2l-3-5H8" />
        </svg>
      );
    case "notes":
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16v16H4z" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h5" />
        </svg>
      );
    case "lightbulb":
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 008.91 14" />
        </svg>
      );
    default:
      return null;
  }
}

const STAT_CARDS: { key: keyof Counts; label: string; icon: string; color: string }[] = [
  { key: "medicines", label: "Medicines", icon: "pills", color: "#14B8A6" },
  { key: "conditions", label: "Conditions", icon: "heart-pulse", color: "#EC4899" },
  { key: "hospitals", label: "Hospitals", icon: "hospital", color: "#10B981" },
  { key: "pharmacies", label: "Pharmacies", icon: "prescription", color: "#8B5CF6" },
  { key: "messages", label: "Messages", icon: "chat", color: "#F59E0B" },
];

const QUICK_ACTIONS = [
  { label: "Search Medicines", href: "/medicines", icon: "search", color: "#14B8A6" },
  { label: "AI Chat (Elix)", href: "/chatbot", icon: "robot", color: "#8B5CF6" },
  { label: "Hospitals", href: "/hospitals", icon: "location", color: "#10B981" },
  { label: "Pharmacies", href: "/pharmacies", icon: "prescription", color: "#8B5CF6" },
  { label: "Emergency Help", href: "/emergency", icon: "ambulance", color: "#EF4444" },
  { label: "My Conditions", href: "/conditions", icon: "notes", color: "#F59E0B" },
];

const NAV_LINKS = [
  { label: "Medicines", href: "/medicines" },
  { label: "Conditions", href: "/conditions" },
  { label: "Hospitals", href: "/hospitals" },
  { label: "Emergency", href: "/emergency" },
];

const FALLBACK_TIP =
  "Stay hydrated! Drinking enough water daily helps your body function properly and supports overall health.";

export default function DashboardPage() {
  const { user, authFetch } = useAuth();
  const [tip, setTip] = useState(FALLBACK_TIP);
  const [counts, setCounts] = useState<Counts>({
    medicines: 0,
    conditions: 0,
    hospitals: 0,
    pharmacies: 0,
    messages: 0,
  });
  const [countsLoading, setCountsLoading] = useState(true);

  const firstName = user?.name?.split(" ")[0] || "there";

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? "Good morning" : greetingHour < 18 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    authFetch(`${API_BASE}/health/tips/random`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (typeof data === "string") setTip(data);
        else if (data.tip) setTip(data.tip);
        else if (data.text) setTip(data.text);
        else if (data.content) setTip(data.content);
      })
      .catch(() => {});
  }, [authFetch]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCounts() {
      setCountsLoading(true);
      try {
        const endpoints: [keyof Counts, string][] = [
          ["medicines", "/medicines"],
          ["conditions", "/conditions"],
          ["hospitals", "/hospitals/search"],
          ["pharmacies", "/pharmacies/search"],
          ["messages", "/messages"],
        ];

        const results = await Promise.allSettled(
          endpoints.map(([, path]) =>
            authFetch(`${API_BASE}${path}`).then((r) => (r.ok ? r.json() : null))
          )
        );

        const next: Counts = { medicines: 0, conditions: 0, hospitals: 0, pharmacies: 0, messages: 0 };
        results.forEach((result, i) => {
          const key = endpoints[i][0];
          if (result.status === "fulfilled" && result.value) {
            const d = result.value;
            if (Array.isArray(d)) {
              next[key] = d.length;
            } else if (typeof d === "object") {
              next[key] = d.count ?? d.total ?? d.results?.length ?? 0;
            }
          }
        });

        if (!cancelled) setCounts(next);
      } catch {
        // keep defaults
      }
      if (!cancelled) setCountsLoading(false);
    }

    fetchCounts();
    return () => { cancelled = true; };
  }, [authFetch]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground" style={{ backgroundImage: "var(--bg-gradient)" }}>
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-10 space-y-10 flex-1">

        {/* ── Greeting Card ── */}
        <section
          className="relative rounded-2xl overflow-hidden p-8 sm:p-10 bg-card border"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: 0.25,
              background:
                "radial-gradient(ellipse at 20% 50%, hsl(173 80% 36% / 0.18) 0%, transparent 50%)," +
                "radial-gradient(ellipse at 80% 20%, hsl(250 88% 66% / 0.12) 0%, transparent 50%)",
            }}
          />
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              {greeting}, {firstName} 👋
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              Welcome back to your health dashboard.
            </p>

            {/* Health Tip */}
            <div
              className="mt-6 rounded-xl px-5 py-4 flex items-start gap-3"
              style={{
                background: "hsl(173 80% 36% / 0.08)",
                border: "1px solid hsl(173 80% 36% / 0.15)",
              }}
            >
              <SvgIcon name="lightbulb" className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#14B8A6" }} />
              <div>
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "#14B8A6" }}
                >
                  Health Tip
                </span>
                <p className="text-sm mt-1.5 leading-relaxed text-muted-foreground">
                  {tip}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stat Cards ── */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
          {STAT_CARDS.map((stat) => (
            <div
              key={stat.key}
              className="rounded-xl p-5 sm:p-6 flex flex-col gap-3 cursor-default bg-card border"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: hexToBg(stat.color, 0.09) }}
              >
                <SvgIcon name={stat.icon} style={{ color: stat.color }} />
              </div>
              <div>
                {countsLoading ? (
                  <div
                    className="h-8 w-14 rounded-md animate-pulse"
                    style={{ background: "hsl(var(--muted))" }}
                  />
                ) : (
                  <span className="text-3xl font-bold text-foreground">
                    {counts[stat.key]}
                  </span>
                )}
                <p className="text-sm mt-1 text-muted-foreground/60">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* ── Quick Actions ── */}
        <section>
          <h2 className="text-xl font-semibold mb-5 text-foreground">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                to={action.href}
                className="flex flex-col items-center gap-4 rounded-xl px-4 py-6 text-center transition-all duration-200 hover:scale-[1.03] hover:shadow-lg group bg-card border"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                  style={{ background: hexToBg(action.color, 0.08) }}
                >
                  <SvgIcon name={action.icon} className="w-5 h-5" style={{ color: action.color }} />
                </div>
                <span className="text-sm font-medium leading-tight text-muted-foreground">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <footer
        className="mt-auto pb-24 lg:pb-0 bg-card border-t"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">

            {/* Brand */}
            <div>
              <Link to="/dashboard" className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base"
                  style={{ background: "var(--gradient-1)" }}
                >
                  M
                </div>
                <span className="text-xl font-bold text-foreground">
                  Mendly
                </span>
              </Link>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                Your AI-powered medical assistant for medicines, drug interactions, and nearby
                healthcare facilities.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold mb-5 uppercase tracking-wider text-foreground">
                Quick Links
              </h3>
              <ul className="space-y-3.5">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm transition-colors hover:text-teal-400 text-muted-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-sm font-semibold mb-5 uppercase tracking-wider text-foreground">
                Resources
              </h3>
              <ul className="space-y-3.5">
                {[
                  { label: "AI Chat (Elix)", href: "/chatbot" },
                  { label: "Pharmacies", href: "/pharmacies" },
                  { label: "Account", href: "/account" },
                  { label: "Saved Items", href: "/saved" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm transition-colors hover:text-teal-400 text-muted-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Disclaimer */}
            <div>
              <h3 className="text-sm font-semibold mb-5 uppercase tracking-wider text-foreground">
                Medical Disclaimer
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Mendly provides health information for educational purposes only and is not a
                substitute for professional medical advice, diagnosis, or treatment. Always consult a
                qualified healthcare provider.
              </p>
            </div>
          </div>

          {/* Copyright */}
          <div
            className="mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <p className="text-sm text-muted-foreground/60">
              &copy; {new Date().getFullYear()} Mendly. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link
                to="/account"
                className="text-sm transition-colors hover:text-teal-400 text-muted-foreground/60"
              >
                Account
              </Link>
              <Link
                to="/saved"
                className="text-sm transition-colors hover:text-teal-400 text-muted-foreground/60"
              >
                Saved Items
              </Link>
              <Link
                to="/pharmacies"
                className="text-sm transition-colors hover:text-teal-400 text-muted-foreground/60"
              >
                Pharmacies
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
