import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/config";
import Logo from "@/components/Logo";

interface Counts {
  medicines: number;
  conditions: number;
  hospitals: number;
  pharmacies: number;
  messages: number;
}

const COLORS: Record<string, string> = {
  "#14B8A6": "173 80% 36%",
  "#EC4899": "330 80% 60%",
  "#10B981": "160 84% 39%",
  "#8B5CF6": "250 88% 66%",
  "#F59E0B": "38 92% 50%",
  "#EF4444": "0 84% 63%",
};

const STAT_CARDS: { key: keyof Counts; label: string; color: string; icon: string }[] = [
  { key: "medicines", label: "Medicines", color: "#14B8A6", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
  { key: "conditions", label: "Conditions", color: "#EC4899", icon: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" },
  { key: "hospitals", label: "Hospitals", color: "#10B981", icon: "M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 7h1M9 10h1M9 13h1M14 7h1M14 10h1M14 13h1M10 21v-4a2 2 0 014 0v4" },
  { key: "pharmacies", label: "Pharmacies", color: "#8B5CF6", icon: "M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M3 21h18" },
  { key: "messages", label: "Messages", color: "#F59E0B", icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
];

const QUICK_ACTIONS = [
  { label: "Search Medicines", href: "/medicines", color: "#14B8A6", icon: "M21 21l-4.35-4.35M11 11a8 8 0 100-16 8 8 0 000 16z" },
  { label: "AI Chat (Elix)", href: "/chatbot", color: "#8B5CF6", icon: "M15.75 6v3.75m0 3v.75m-6-3.75H9m1.5-3h.75m0 0v3m0 0h-.75M12 3a9 9 0 00-9 9v2.25a9 9 0 0018 0V12a9 9 0 00-9-9z" },
  { label: "Hospitals", href: "/hospitals", color: "#10B981", icon: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" },
  { label: "Pharmacies", href: "/pharmacies", color: "#8B5CF6", icon: "M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M3 21h18" },
  { label: "Emergency", href: "/emergency", color: "#EF4444", icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" },
  { label: "My Conditions", href: "/conditions", color: "#F59E0B", icon: "M4 4h16v16H4zM8 8h8M8 12h8M8 16h5" },
];

const NAV_LINKS = [
  { label: "Medicines", href: "/medicines" },
  { label: "Conditions", href: "/conditions" },
  { label: "Hospitals", href: "/hospitals" },
  { label: "Emergency", href: "/emergency" },
];

const FALLBACK_TIP = "Stay hydrated! Drinking enough water daily helps your body function properly and supports overall health.";

function SvgIcon({ path, className = "w-5 h-5", style }: { path: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export default function DashboardPage() {
  const { user, authFetch } = useAuth();
  const [tip, setTip] = useState(FALLBACK_TIP);
  const [counts, setCounts] = useState<Counts>({ medicines: 0, conditions: 0, hospitals: 0, pharmacies: 0, messages: 0 });
  const [countsLoading, setCountsLoading] = useState(true);

  const firstName = user?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

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
          endpoints.map(([, path]) => authFetch(`${API_BASE}${path}`).then((r) => (r.ok ? r.json() : null)))
        );
        const next: Counts = { medicines: 0, conditions: 0, hospitals: 0, pharmacies: 0, messages: 0 };
        results.forEach((result, i) => {
          const key = endpoints[i][0];
          if (result.status === "fulfilled" && result.value) {
            const d = result.value;
            if (Array.isArray(d)) next[key] = d.length;
            else if (typeof d === "object") next[key] = d.count ?? d.total ?? d.results?.length ?? 0;
          }
        });
        if (!cancelled) setCounts(next);
      } catch {}
      if (!cancelled) setCountsLoading(false);
    }
    fetchCounts();
    return () => { cancelled = true; };
  }, [authFetch]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-10 space-y-10 flex-1">

        <section className="relative rounded-2xl overflow-hidden p-8 sm:p-10 bg-card border-border brand-stripe">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[400px] h-[400px]"
              style={{ background: "radial-gradient(circle, hsl(173 80% 36% / 0.08), transparent 70%)", filter: "blur(60px)" }} />
          </div>
          <div className="relative z-10 pl-2">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-foreground">
              {greeting}, {firstName}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              Welcome back to your health dashboard.
            </p>
            <div className="mt-6 rounded-xl px-5 py-4 flex items-start gap-3"
              style={{ background: "hsl(173 80% 36% / 0.06)", border: "1px solid hsl(173 80% 36% / 0.12)" }}>
              <SvgIcon path="M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 008.91 14"
                className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#14B8A6" }} />
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#14B8A6" }}>
                  Health Tip
                </span>
                <p className="text-sm mt-1.5 leading-relaxed text-muted-foreground">{tip}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
          {STAT_CARDS.map((stat) => (
            <div key={stat.key} className="rounded-xl p-5 sm:p-6 flex flex-col gap-3 cursor-default card-hover glass-card">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: `hsl(${COLORS[stat.color] ?? "0 0% 0%"} / 0.09)` }}>
                <SvgIcon path={stat.icon} style={{ color: stat.color }} />
              </div>
              <div>
                {countsLoading ? (
                  <div className="h-8 w-14 rounded-md animate-pulse" style={{ background: "hsl(var(--muted))" }} />
                ) : (
                  <span className="font-serif text-3xl font-semibold text-foreground">{counts[stat.key]}</span>
                )}
                <p className="text-sm mt-1 text-muted-foreground/60">{stat.label}</p>
              </div>
            </div>
          ))}
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold mb-5 text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} to={action.href}
                className="flex flex-col items-center gap-4 rounded-xl px-4 py-6 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg glass-card">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                  style={{ background: `hsl(${COLORS[action.color] ?? "0 0% 0%"} / 0.08)` }}>
                  <SvgIcon path={action.icon} className="w-5 h-5" style={{ color: action.color }} />
                </div>
                <span className="text-sm font-medium leading-tight text-muted-foreground">{action.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <footer className="mt-auto border-t border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div>
              <Link to="/dashboard"><Logo /></Link>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Your AI-powered medical assistant for medicines, drug interactions, and nearby healthcare facilities.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-foreground">Quick Links</h3>
              <ul className="space-y-3">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href} className="text-sm transition-colors hover:text-teal-400 text-muted-foreground">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-foreground">Resources</h3>
              <ul className="space-y-3">
                {[{ label: "AI Chat (Elix)", href: "/chatbot" }, { label: "Pharmacies", href: "/pharmacies" }, { label: "Account", href: "/account" }, { label: "Saved Items", href: "/saved" }].map((link) => (
                  <li key={link.href}>
                    <Link to={link.href} className="text-sm transition-colors hover:text-teal-400 text-muted-foreground">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-foreground">Medical Disclaimer</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Mendly provides health information for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.
              </p>
            </div>
          </div>
          <div className="mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border">
            <p className="text-sm text-muted-foreground/60">&copy; {new Date().getFullYear()} Mendly. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/account" className="text-sm transition-colors hover:text-teal-400 text-muted-foreground/60">Account</Link>
              <Link to="/saved" className="text-sm transition-colors hover:text-teal-400 text-muted-foreground/60">Saved Items</Link>
              <Link to="/pharmacies" className="text-sm transition-colors hover:text-teal-400 text-muted-foreground/60">Pharmacies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
