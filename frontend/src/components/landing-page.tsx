import { useState } from "react";
import AuthModal from "@/components/auth-modal";

function Sparkles() { return (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
  </svg>
); }
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
  { icon: "robot", title: "AI Health Chat", desc: "Get instant answers to your health questions from our advanced AI assistant, Elix." },
  { icon: "pills", title: "Medicine Guide", desc: "Search medications, check dosages, understand side effects and interactions." },
  { icon: "hospital", title: "Nearby Care", desc: "Find hospitals, clinics, and pharmacies near you with real-time location data." },
  { icon: "heart", title: "Health Tracking", desc: "Save conditions, track symptoms, and get personalized health insights." },
];

const steps = [
  { num: "01", title: "Create Account", desc: "Sign up free in seconds with email or Google. No credit card needed." },
  { num: "02", title: "Explore Tools", desc: "Chat with Elix, search medicines, check interactions, and find nearby care." },
  { num: "03", title: "Stay Informed", desc: "Get health tips, track your conditions, and make smarter health decisions daily." },
];

const FeatureIcon = ({ icon }: { icon: string }) => {
  const p: Record<string, string> = {
    robot: "M15.75 6v3.75m0 3v.75m-6-3.75H9m1.5-3h.75m0 0v3m0 0h-.75M12 3a9 9 0 00-9 9v2.25a9 9 0 0018 0V12a9 9 0 00-9-9z",
    pills: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
    hospital: "M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m-9 0h18M3 6.75h18M4.5 3h15M6 3v3M18 3v3",
    heart: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z",
  };
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={p[icon] || p.pills} />
    </svg>
  );
};

export default function LandingPage({ oauthError = "" }: { oauthError?: string }) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");

  return (
    <div className="bg-background text-foreground overflow-x-hidden">
      {/* ── Hero ── */}
      <section className="relative px-6 pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/4 -left-1/4 w-[800px] h-[800px] rounded-full"
            style={{ background: "radial-gradient(circle, hsl(173 80% 36% / 0.08), transparent 70%)", filter: "blur(100px)" }} />
          <div className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] rounded-full"
            style={{ background: "radial-gradient(circle, hsl(188 95% 43% / 0.06), transparent 70%)", filter: "blur(80px)" }} />
          <div className="absolute inset-0 opacity-[0.015]"
            style={{ backgroundImage: "radial-gradient(circle, hsl(173 80% 36%) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-6 border border-border"
              style={{ background: "hsl(var(--card) / 0.6)" }}>
              <Sparkles />
              <span className="text-muted-foreground">Powered by Advanced AI</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] mb-6 tracking-tight">
              Your <span className="gradient-text">AI Health</span>
              <br />
              Companion
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mb-10 leading-relaxed">
              Ask health questions, check drug interactions, find nearby care, and
              manage your medications — all in one place.
            </p>

            {oauthError && (
              <div className="max-w-md mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2.5"
                style={{ background: "hsl(0 84% 60% / 0.08)", border: "1px solid hsl(0 84% 60% / 0.15)", color: "hsl(0 84% 70%)" }}>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
                {oauthError}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <button onClick={() => { setAuthMode("signup"); setAuthModalOpen(true); }}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
                style={{ background: "var(--gradient-1)", boxShadow: "0 4px 24px hsl(173 80% 36% / 0.3)" }}>
                Get Started Free <ArrowRight />
              </button>
              <button onClick={() => { setAuthMode("login"); setAuthModalOpen(true); }}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}>
                Sign In
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-6 mt-10 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckIcon /> Free to start</span>
              <span className="flex items-center gap-1.5"><CheckIcon /> No credit card</span>
              <span className="flex items-center gap-1.5"><CheckIcon /> HIPAA compliant</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="px-6 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase mb-4 text-primary">Features</span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">
              Everything you need for{" "}
              <span className="gradient-text">better health</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Powerful tools designed to put your health information at your fingertips.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <div key={f.title}
                className="group relative p-6 rounded-2xl border border-border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/25"
                style={{ background: "hsl(var(--card) / 0.5)" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "hsl(173 80% 36% / 0.1)", color: "hsl(var(--primary))" }}>
                  <FeatureIcon icon={f.icon} />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase mb-4 text-primary">How It Works</span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight text-foreground">
              Three simple steps
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Up and running in minutes. No complicated setup required.
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-px hidden md:block" style={{ background: "hsl(var(--border))" }} />
            <div className="flex flex-col gap-8">
              {steps.map((step, i) => (
                <div key={step.num} className="relative flex items-start gap-6 md:gap-8">
                  <div className="relative z-10 hidden md:flex w-16 h-16 rounded-2xl items-center justify-center font-bold text-lg text-white shrink-0"
                    style={{ background: "var(--gradient-1)", boxShadow: i === 0 ? "0 0 0 4px hsl(173 80% 36% / 0.2)" : undefined }}>
                    {step.num}
                  </div>
                  <div className="flex-1 p-6 rounded-2xl border border-border transition-all duration-300"
                    style={{ background: "hsl(var(--card) / 0.5)" }}>
                    <span className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold text-white mr-3 mb-3"
                      style={{ background: "var(--gradient-1)" }}>{step.num}</span>
                    <h3 className="text-lg font-semibold mb-1.5 text-foreground">{step.title}</h3>
                    <p className="text-base text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-10 md:p-14 rounded-3xl border border-border relative overflow-hidden"
            style={{ background: "hsl(var(--card) / 0.6)" }}>
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, hsl(173 80% 36% / 0.1), transparent 70%)", filter: "blur(50px)" }} />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight text-foreground">
                Ready to take control?
              </h2>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-8">
                Join Mendly today and start making smarter health decisions with AI-powered guidance.
              </p>
              <button onClick={() => { setAuthMode("signup"); setAuthModalOpen(true); }}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
                style={{ background: "var(--gradient-1)", boxShadow: "0 4px 24px hsl(173 80% 36% / 0.3)" }}>
                Get Started Free <ArrowRight />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ background: "var(--gradient-1)" }}>M</div>
              <span className="text-lg font-bold text-foreground">Mendly</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Support</a>
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