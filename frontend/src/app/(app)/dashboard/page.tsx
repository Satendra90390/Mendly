"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/config";

interface Counts {
  medicines: number;
  conditions: number;
  hospitals: number;
  pharmacies: number;
  messages: number;
}

const STAT_CARDS: { key: keyof Counts; label: string; icon: string; color: string }[] = [
  { key: "medicines", label: "Medicines", icon: "fa-solid fa-pills", color: "#14B8A6" },
  { key: "conditions", label: "Conditions", icon: "fa-solid fa-heart-pulse", color: "#EC4899" },
  { key: "hospitals", label: "Hospitals", icon: "fa-solid fa-hospital", color: "#10B981" },
  { key: "pharmacies", label: "Pharmacies", icon: "fa-solid fa-prescription-bottle-medical", color: "#8B5CF6" },
  { key: "messages", label: "Messages", icon: "fa-solid fa-comments", color: "#F59E0B" },
];

const QUICK_ACTIONS = [
  { label: "Search Medicines", href: "/medicines", icon: "fa-solid fa-magnifying-glass", color: "#14B8A6" },
  { label: "AI Chat (Elix)", href: "/chatbot", icon: "fa-solid fa-robot", color: "#8B5CF6" },
  { label: "Hospitals", href: "/hospitals", icon: "fa-solid fa-location-dot", color: "#10B981" },
  { label: "Pharmacies", href: "/pharmacies", icon: "fa-solid fa-prescription-bottle-medical", color: "#8B5CF6" },
  { label: "Emergency Help", href: "/emergency", icon: "fa-solid fa-truck-medical", color: "#EF4444" },
  { label: "My Conditions", href: "/conditions", icon: "fa-solid fa-notes-medical", color: "#F59E0B" },
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
    <div className="min-h-screen" style={{ background: "var(--bg)", backgroundImage: "var(--bg-gradient)" }}>
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-10 space-y-10">

        {/* ── Greeting Card ── */}
        <section
          className="relative rounded-2xl overflow-hidden p-8 sm:p-10"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: 0.25,
              background:
                "radial-gradient(ellipse at 20% 50%, rgba(20,184,166,0.18) 0%, transparent 50%)," +
                "radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.12) 0%, transparent 50%)",
            }}
          />
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: "var(--text)" }}>
              {greeting}, {firstName} 👋
            </h1>
            <p className="mt-2 text-base" style={{ color: "var(--text-muted)" }}>
              Welcome back to your health dashboard.
            </p>

            {/* Health Tip */}
            <div
              className="mt-6 rounded-xl px-5 py-4 flex items-start gap-3"
              style={{
                background: "rgba(20,184,166,0.08)",
                border: "1px solid rgba(20,184,166,0.15)",
              }}
            >
              <i className="fa-solid fa-lightbulb mt-0.5 text-sm" style={{ color: "#14B8A6" }} />
              <div>
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "#14B8A6" }}
                >
                  Health Tip
                </span>
                <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
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
              className="stat-card rounded-xl p-5 sm:p-6 flex flex-col gap-3 cursor-default"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: `${stat.color}18` }}
              >
                <i className={stat.icon} style={{ color: stat.color }} />
              </div>
              <div>
                {countsLoading ? (
                  <div
                    className="h-8 w-14 rounded-md animate-pulse"
                    style={{ background: "var(--surface-hover)" }}
                  />
                ) : (
                  <span className="text-3xl font-bold" style={{ color: "var(--text)" }}>
                    {counts[stat.key]}
                  </span>
                )}
                <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* ── Quick Actions ── */}
        <section>
          <h2 className="text-xl font-semibold mb-5" style={{ color: "var(--text)" }}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-4 rounded-xl px-4 py-6 text-center transition-all duration-200 hover:scale-[1.03] hover:shadow-lg group"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                  style={{ background: `${action.color}14` }}
                >
                  <i className={action.icon} style={{ color: action.color, fontSize: "1.25rem" }} />
                </div>
                <span
                  className="text-sm font-medium leading-tight"
                  style={{ color: "var(--text-muted)" }}
                >
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <footer
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

            {/* Brand */}
            <div>
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: "var(--gradient-1)" }}
                >
                  M
                </div>
                <span className="text-lg font-bold" style={{ color: "var(--text)" }}>
                  Mendly
                </span>
              </Link>
              <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
                Your AI-powered medical assistant for medicines, drug interactions, and nearby
                healthcare facilities.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
                Quick Links
              </h3>
              <ul className="space-y-3">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors hover:underline"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
                Resources
              </h3>
              <ul className="space-y-3">
                {[
                  { label: "AI Chat (Elix)", href: "/chatbot" },
                  { label: "Pharmacies", href: "/pharmacies" },
                  { label: "Account", href: "/account" },
                  { label: "Saved Items", href: "/saved" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors hover:underline"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Disclaimer */}
            <div>
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
                Medical Disclaimer
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
                Mendly provides health information for educational purposes only and is not a
                substitute for professional medical advice, diagnosis, or treatment. Always consult a
                qualified healthcare provider.
              </p>
            </div>
          </div>

          {/* Copyright */}
          <div
            className="mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>
              &copy; {new Date().getFullYear()} Mendly. All rights reserved.
            </p>
            <div className="flex items-center gap-5">
              <Link
                href="/account"
                className="text-sm transition-colors hover:underline"
                style={{ color: "var(--text-dim)" }}
              >
                Account
              </Link>
              <Link
                href="/saved"
                className="text-sm transition-colors hover:underline"
                style={{ color: "var(--text-dim)" }}
              >
                Saved Items
              </Link>
              <Link
                href="/pharmacies"
                className="text-sm transition-colors hover:underline"
                style={{ color: "var(--text-dim)" }}
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
