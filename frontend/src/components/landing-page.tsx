"use client";

import { useState } from "react";
import AuthModal from "@/components/auth-modal";

function Sparkles() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function HeartPulse() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.25 4.533A9.707 9.707 0 016 3a9.735 9.735 0 00-3.25 5.034m12.5 0a9.735 9.735 0 00-3.25-5.034M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path d="M7.5 12l2.25 3 3.75-6 2.25 3H21" />
    </svg>
  );
}

const features = [
  {
    icon: "robot",
    title: "AI Chat (Elix)",
    description: "Get instant answers to your health questions powered by advanced AI.",
  },
  {
    icon: "pills",
    title: "Medicines",
    description: "Search medications, check dosages, and understand side effects.",
  },
  {
    icon: "flask",
    title: "Drug Interactions",
    description: "Check interactions between medications before you take anything.",
  },
  {
    icon: "hospital",
    title: "Nearby Care",
    description: "Find clinics, pharmacies, and hospitals near your location.",
  },
];

const steps = [
  {
    number: "01",
    title: "Sign Up",
    description: "Create your free account in seconds and set up your health profile.",
  },
  {
    number: "02",
    title: "Ask Anything",
    description: "Chat with our AI about symptoms, medications, or general health concerns.",
  },
  {
    number: "03",
    title: "Stay Healthy",
    description: "Get personalized insights, reminders, and recommendations every day.",
  },
];

const FeatureIcon = ({ icon }: { icon: string }) => {
  const paths: Record<string, string> = {
    robot: "M15.75 6v3.75m0 3v.75m-6-3.75H9m1.5-3h.75m0 0v3m0 0h-.75M12 3a9 9 0 00-9 9v2.25a9 9 0 0018 0V12a9 9 0 00-9-9z",
    pills: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
    flask: "M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M3 21h18",
    hospital: "M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m-9 0h18M3 6.75h18M4.5 3h15M6 3v3M18 3v3M6 9.75h.75M9 9.75h.75M12 9.75h.75M15 9.75h.75M18 9.75h.75M6 12.75h.75M9 12.75h.75M12 12.75h.75M15 12.75h.75M18 12.75h.75",
  };
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[icon] || paths.pills} />
    </svg>
  );
};

export default function LandingPage({ oauthError = "" }: { oauthError?: string }) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-24 pb-16">
        {/* Decorative blurs */}
        <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(173 80% 36% / 0.12), transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute -bottom-[10%] -right-[10%] w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(188 95% 43% / 0.1), transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute top-[30%] right-[15%] w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(173 80% 36% / 0.07), transparent 70%)", filter: "blur(60px)" }} />

        <div className="relative z-10 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-8 text-muted-foreground glass animate-in"
            style={{ animationDelay: "0.1s" }}>
            <Sparkles />
            Powered by Advanced AI
          </div>

          <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[1.1] mb-6 tracking-tight animate-in"
            style={{ animationDelay: "0.2s" }}>
            <span className="text-foreground">Your </span>
            <span className="gradient-text">AI Health</span>
            <br />
            <span className="text-foreground">Companion</span>
          </h1>

          <p className="text-[clamp(1rem,2vw,1.2rem)] text-muted-foreground max-w-[560px] mx-auto mb-10 leading-relaxed animate-in"
            style={{ animationDelay: "0.3s" }}>
            Ask health questions, check drug interactions, find nearby care, and
            manage your medications — all in one place.
          </p>

          {oauthError && (
            <div className="max-w-md mx-auto mb-5 px-4 py-3 rounded-xl text-sm text-left flex items-center gap-2.5 animate-in"
              style={{ background: "hsl(0 84% 60% / 0.1)", border: "1px solid hsl(0 84% 60% / 0.2)", color: "hsl(0 84% 70%)" }}>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
              {oauthError}
            </div>
          )}

          <div className="flex items-center justify-center gap-4 flex-wrap animate-in" style={{ animationDelay: "0.4s" }}>
            <button
              onClick={() => openAuth("signup")}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white border-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: "var(--gradient-1)", boxShadow: "0 4px 24px hsl(173 80% 36% / 0.25)" }}
            >
              Get Started
              <ArrowRight />
            </button>
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-foreground cursor-pointer transition-all duration-200 glass hover:bg-card"
            >
              Learn More
              <ChevronDown />
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold mb-4 tracking-tight">
              Everything you need for{" "}
              <span className="gradient-text">better health</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              Powerful tools that put your health information at your fingertips.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="group p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1"
                style={{ background: "hsl(var(--card) / 0.5)", borderColor: "hsl(var(--border))" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "hsl(173 80% 36% / 0.25)"; e.currentTarget.style.boxShadow = "var(--shadow)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "hsl(var(--border))"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "hsl(173 80% 36% / 0.1)", color: "hsl(173 80% 36%)", border: "1px solid hsl(173 80% 36% / 0.15)" }}>
                  <FeatureIcon icon={feature.icon} />
                </div>
                <h3 className="text-lg font-semibold mb-3 text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="px-6 py-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold mb-4 tracking-tight text-foreground">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground">
              Up and running in three simple steps.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {steps.map((step) => (
              <div key={step.number} className="flex items-start gap-6 p-6 rounded-2xl transition-all duration-300"
                style={{ background: "hsl(var(--card) / 0.5)", border: "1px solid hsl(var(--border))" }}>
                <div className="min-w-[56px] h-14 rounded-2xl flex items-center justify-center font-bold text-lg text-white shrink-0"
                  style={{ background: "var(--gradient-1)" }}>
                  {step.number}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">{step.title}</h3>
                  <p className="text-base leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-16 border-t" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-10">
          <div className="flex items-center gap-8 flex-wrap justify-center text-sm text-muted-foreground">
            {[
              { icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z", label: "HIPAA Compliant" },
              { icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z", label: "End-to-End Encrypted" },
              { icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z", label: "Privacy First" },
            ].map((badge) => (
              <div key={badge.label} className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" style={{ color: "hsl(173 80% 36%)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={badge.icon} />
                </svg>
                {badge.label}
              </div>
            ))}
          </div>

          <div className="w-full h-px" style={{ background: "hsl(var(--border))" }} />

          <div className="flex items-center gap-8 flex-wrap justify-center">
            <span className="text-lg font-bold gradient-text flex items-center gap-2">
              <HeartPulse />
              Mendly
            </span>
            {[
              { label: "Privacy", href: "#" },
              { label: "Terms", href: "#" },
              { label: "Support", href: "#" },
            ].map((link) => (
              <a key={link.label} href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground no-underline">
                {link.label}
              </a>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} Mendly. All rights reserved. Not a
            substitute for professional medical advice.
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      {authModalOpen && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthModalOpen(false)}
          onSwitch={(mode) => setAuthMode(mode)}
        />
      )}
    </div>
  );
}