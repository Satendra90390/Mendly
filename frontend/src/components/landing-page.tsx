import { useState } from "react";
import AuthModal from "@/components/auth-modal";
import Logo from "@/components/Logo";

function ArrowRight() { return (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
); }
function CheckIcon() { return (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
); }

const features = [
  { icon: "M15.75 6v3.75m0 3v.75m-6-3.75H9m1.5-3h.75m0 0v3m0 0h-.75M12 3a9 9 0 00-9 9v2.25a9 9 0 0018 0V12a9 9 0 00-9-9z", title: "AI Health Chat", desc: "Get instant answers to your health questions from our advanced AI assistant, Elix." },
  { icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z", title: "Medicine Guide", desc: "Search medications, check dosages, understand side effects and interactions." },
  { icon: "M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m-9 0h18M3 6.75h18M4.5 3h15M6 3v3M18 3v3", title: "Nearby Care", desc: "Find hospitals, clinics, and pharmacies near you with real-time location data." },
  { icon: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z", title: "Health Tracking", desc: "Save conditions, track symptoms, and get personalized health insights." },
];

const steps = [
  { num: "01", title: "Create Account", desc: "Sign up free in seconds with email. No credit card needed." },
  { num: "02", title: "Explore Tools", desc: "Chat with Elix, search medicines, check interactions, and find nearby care." },
  { num: "03", title: "Stay Informed", desc: "Get health tips, track your conditions, and make smarter health decisions daily." },
];

function FeatureCard({ icon, title, desc, i }: { icon: string; title: string; desc: string; i: number }) {
  return (
    <div className={`group relative p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg glass-card animate-in-up stagger-${i + 1}`}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
        style={{ background: "hsl(173 80% 36% / 0.1)", color: "hsl(var(--primary))" }}>
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <h3 className="font-semibold mb-2.5 text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

export default function LandingPage({ oauthError = "" }: { oauthError?: string }) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="bg-background text-foreground overflow-x-hidden">
      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border glass" style={{ borderRadius: 0 }}>
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-teal-400/60 to-transparent" />
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-5 lg:px-8">
          <Logo />
          <nav className="hidden md:flex items-center gap-1">
            <a href="#features" className="nav-link" style={{ color: "hsl(var(--muted-foreground))" }}>Features</a>
            <a href="#how-it-works" className="nav-link" style={{ color: "hsl(var(--muted-foreground))" }}>How It Works</a>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => { setAuthMode("login"); setAuthModalOpen(true); }}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] bg-card border-border"
              style={{ color: "hsl(var(--foreground))" }}>
              Sign In
            </button>
            <button onClick={() => { setAuthMode("signup"); setAuthModalOpen(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
              style={{ background: "var(--gradient-1)" }}>
              Get Started
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl"
              style={{ color: "hsl(var(--foreground))" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {mobileMenuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                }
              </svg>
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border px-5 py-4 animate-in" style={{ background: "hsl(var(--card))" }}>
            <div className="flex flex-col gap-2">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="nav-link" style={{ color: "hsl(var(--muted-foreground))" }}>Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="nav-link" style={{ color: "hsl(var(--muted-foreground))" }}>How It Works</a>
              <button onClick={() => { setAuthMode("login"); setAuthModalOpen(true); setMobileMenuOpen(false); }}
                className="nav-link" style={{ color: "hsl(var(--muted-foreground))" }}>Sign In</button>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-[90vh] flex items-center px-6 pt-32 pb-20 md:pt-36 md:pb-28 brand-dot-bg">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/3 -left-1/4 w-[900px] h-[900px] rounded-full animate-float"
            style={{ background: "radial-gradient(circle, hsl(173 80% 36% / 0.1), transparent 70%)", filter: "blur(120px)" }} />
          <div className="absolute -bottom-1/3 -right-1/4 w-[700px] h-[700px] rounded-full animate-float"
            style={{ background: "radial-gradient(circle, hsl(188 95% 43% / 0.08), transparent 70%)", filter: "blur(100px)", animationDelay: "2s" }} />
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full animate-float"
            style={{ background: "radial-gradient(circle, hsl(250 95% 66% / 0.06), transparent 70%)", filter: "blur(80px)", animationDelay: "4s" }} />
          <div className="absolute inset-0 opacity-[0.015]"
            style={{ backgroundImage: "radial-gradient(circle, hsl(173 80% 36%) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto w-full text-center">
          <div className="max-w-3xl mx-auto animate-in-up">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-sm mb-8 border border-border glass-subtle">
              <Logo size="sm" showText={false} />
              <span className="text-muted-foreground">Powered by Mendly AI</span>
            </div>

            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[1.08] mb-6 tracking-tight">
              Your <span className="gradient-text">AI Health</span>
              <br />
              Companion
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
              Ask health questions, check drug interactions, find nearby care, and
              manage your medications — all in one place.
            </p>

            {oauthError && (
              <div className="max-w-md mx-auto mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2.5"
                style={{ background: "hsl(0 84% 60% / 0.08)", border: "1px solid hsl(0 84% 60% / 0.15)", color: "hsl(0 84% 70%)" }}>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
                {oauthError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button onClick={() => { setAuthMode("signup"); setAuthModalOpen(true); }}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] animate-pulse-glow"
                style={{ background: "var(--gradient-1)" }}>
                Get Started Free <ArrowRight />
              </button>
              <button onClick={() => { setAuthMode("login"); setAuthModalOpen(true); }}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] bg-card border-border"
                style={{ color: "hsl(var(--foreground))" }}>
                Sign In
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckIcon /> Free to start</span>
              <span className="flex items-center gap-1.5"><CheckIcon /> No credit card</span>
              <span className="flex items-center gap-1.5"><CheckIcon /> HIPAA compliant</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="px-6 py-24 md:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20 animate-in-up">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase mb-4 text-primary">Features</span>
            <h2 className="font-serif text-4xl sm:text-5xl font-semibold mb-5 tracking-tight">
              Everything you need for{" "}
              <span className="gradient-text">better health</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Powerful tools designed to put your health information at your fingertips.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="px-6 py-24 md:py-32 brand-dot-bg">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20 animate-in-up">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase mb-4 text-primary">How It Works</span>
            <h2 className="font-serif text-4xl sm:text-5xl font-semibold mb-5 tracking-tight text-foreground">
              Three simple steps
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Up and running in minutes. No complicated setup required.
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 hidden md:block"
              style={{ background: "linear-gradient(180deg, hsl(173 80% 36% / 0.4), hsl(173 80% 36% / 0.05))" }} />
            <div className="flex flex-col gap-8">
              {steps.map((step, i) => (
                <div key={step.num} className={`relative flex items-start gap-6 md:gap-8 animate-in-up stagger-${i + 1}`}>
                  <div className="relative z-10 hidden md:flex w-16 h-16 rounded-2xl items-center justify-center font-semibold text-lg text-white shrink-0 font-serif"
                    style={{
                      background: "var(--gradient-1)",
                      boxShadow: "0 0 0 4px hsl(173 80% 36% / 0.15), 0 8px 32px hsl(173 80% 36% / 0.2)",
                    }}>
                    {step.num}
                  </div>
                  <div className="flex-1 p-8 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg glass-card">
                    <span className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold text-white mr-3 mb-3 font-serif"
                      style={{ background: "var(--gradient-1)" }}>{step.num}</span>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">{step.title}</h3>
                    <p className="text-base text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-24 md:py-32">
        <div className="max-w-3xl mx-auto text-center animate-in-up">
          <div className="gradient-border p-0">
            <div className="p-12 md:p-16 rounded-2xl relative overflow-hidden"
              style={{ background: "hsl(var(--card) / 0.6)" }}>
              <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, hsl(173 80% 36% / 0.1), transparent 70%)", filter: "blur(50px)" }} />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, hsl(188 95% 43% / 0.08), transparent 70%)", filter: "blur(50px)" }} />
              <div className="relative z-10">
                <h2 className="font-serif text-4xl sm:text-5xl font-semibold mb-4 tracking-tight text-foreground">
                  Ready to take control?
                </h2>
                <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-8">
                  Join Mendly today and start making smarter health decisions with AI-powered guidance.
                </p>
                <button onClick={() => { setAuthMode("signup"); setAuthModalOpen(true); }}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] animate-pulse-glow"
                  style={{ background: "var(--gradient-1)" }}>
                  Get Started Free <ArrowRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <Logo size="md" />
              <p className="text-sm text-muted-foreground mt-4 max-w-xs leading-relaxed">
                Empowering health decisions through AI — where information meets compassion.
              </p>
            </div>
            <div className="md:text-center">
              <h4 className="text-sm font-semibold mb-4 text-foreground">Product</h4>
              <div className="flex flex-col gap-2.5">
                <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
                <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              </div>
            </div>
            <div className="md:text-right">
              <h4 className="text-sm font-semibold mb-4 text-foreground">Support</h4>
              <div className="flex flex-col gap-2.5">
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Mendly. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground/60 text-center max-w-md">
              Not a substitute for professional medical advice. Always consult a qualified healthcare provider.
            </p>
          </div>
        </div>
      </footer>

      {authModalOpen && (
        <AuthModal mode={authMode} onClose={() => setAuthModalOpen(false)}
          onSwitch={(m) => setAuthMode(m)} />
      )}
    </div>
  );
}
