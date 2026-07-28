"use client";

import { useState } from "react";
import AuthModal from "@/components/auth-modal";

export default function LandingPage({ oauthError = "" }: { oauthError?: string }) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const features = [
    {
      icon: "fa-solid fa-robot",
      title: "AI Chat",
      description: "Get instant answers to your health questions powered by advanced AI.",
    },
    {
      icon: "fa-solid fa-pills",
      title: "Medicines",
      description: "Track your medications with smart reminders and dosage info.",
    },
    {
      icon: "fa-solid fa-flask",
      title: "Drug Check",
      description: "Check drug interactions and side effects before you take anything.",
    },
    {
      icon: "fa-solid fa-hospital",
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        backgroundImage: "var(--bg-gradient)",
        color: "var(--text)",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        overflowX: "hidden",
      }}
    >
      {/* Hero Section */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 1.5rem",
        }}
      >
        {/* Decorative gradient blurs */}
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "-10%",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(13, 148, 136, 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-10%",
            right: "-10%",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, transparent 70%)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "30%",
            right: "20%",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(13, 148, 136, 0.08) 0%, transparent 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "0.4rem 1rem",
              borderRadius: "9999px",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              background: "rgba(255, 255, 255, 0.03)",
              fontSize: "0.8rem",
              color: "var(--text-muted, rgba(148, 163, 184, 0.7))",
              marginBottom: "2rem",
              backdropFilter: "blur(12px)",
            }}
          >
            <i
              className="fa-solid fa-sparkles"
              style={{ color: "#14B8A6", marginRight: "0.5rem" }}
            />
            Powered by Advanced AI
          </div>

          <h1
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: "1.5rem",
              letterSpacing: "-0.03em",
            }}
          >
            <span style={{ color: "#F1F5F9" }}>Your </span>
            <span
              style={{
                background: "var(--gradient-1)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              AI Health
            </span>
            <br />
            <span style={{ color: "#F1F5F9" }}>Companion</span>
          </h1>

          <p
            style={{
              fontSize: "clamp(1rem, 2vw, 1.25rem)",
              color: "var(--text-muted, rgba(148, 163, 184, 0.7))",
              maxWidth: "560px",
              margin: "0 auto 2.5rem",
              lineHeight: 1.7,
            }}
          >
            Ask health questions, check drug interactions, find nearby care, and
            manage your medications — all in one place.
          </p>

          {oauthError && (
            <div
              style={{
                maxWidth: "480px",
                margin: "0 auto 1.5rem",
                padding: "0.75rem 1rem",
                borderRadius: "12px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#FCA5A5",
                fontSize: "0.85rem",
                textAlign: "center",
              }}
            >
              {oauthError}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => openAuth("signup")}
              style={{
                padding: "0.875rem 2rem",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #14B8A6, #0891B2)",
                color: "#fff",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 24px rgba(13, 148, 136, 0.25)",
              }}
onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "var(--glow-teal)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 24px rgba(13, 148, 136, 0.25)";
                }}
              >
                Get Started
                <i className="fa-solid fa-arrow-right" style={{ marginLeft: "0.5rem" }} />
            </button>
            <button
              onClick={() => {
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                padding: "0.875rem 2rem",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                background: "rgba(255, 255, 255, 0.03)",
                color: "#F1F5F9",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
                backdropFilter: "blur(12px)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
              }}
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        style={{
          padding: "6rem 1.5rem",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h2
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 700,
              marginBottom: "1rem",
              letterSpacing: "-0.02em",
            }}
          >
            Everything you need for{" "}
            <span
              style={{
                background: "var(--gradient-1)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              better health
            </span>
          </h2>
          <p
            style={{
              color: "var(--text-muted, rgba(148, 163, 184, 0.7))",
              fontSize: "1.1rem",
              maxWidth: "500px",
              margin: "0 auto",
            }}
          >
            Powerful tools that put your health information at your fingertips.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {features.map((feature) => (
            <div
              key={feature.title}
              style={{
                padding: "2rem",
                borderRadius: "16px",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(12px)",
                transition: "all 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(20, 184, 166, 0.2)";
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow =
                  "0 8px 32px rgba(0, 0, 0, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg, rgba(13, 148, 136, 0.15), rgba(6, 182, 212, 0.15))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1.25rem",
                }}
              >
                <i
                  className={feature.icon}
                  style={{ fontSize: "1.2rem", color: "#14B8A6" }}
                />
              </div>
              <h3
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                }}
              >
                {feature.title}
              </h3>
              <p
                style={{
                  color: "var(--text-muted, rgba(148, 163, 184, 0.7))",
                  fontSize: "0.9rem",
                  lineHeight: 1.6,
                }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works Section */}
      <section
        style={{
          padding: "6rem 1.5rem",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h2
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 700,
              marginBottom: "1rem",
              letterSpacing: "-0.02em",
            }}
          >
            How it works
          </h2>
          <p
            style={{
              color: "var(--text-muted, rgba(148, 163, 184, 0.7))",
              fontSize: "1.1rem",
            }}
          >
            Up and running in three simple steps.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          {steps.map((step) => (
            <div
              key={step.number}
              style={{
                display: "flex",
                gap: "1.5rem",
                alignItems: "flex-start",
                padding: "2rem",
                borderRadius: "16px",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                style={{
                  minWidth: "56px",
                  height: "56px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #0D9488, #06B6D4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {step.number}
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: 600,
                    marginBottom: "0.4rem",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    color: "var(--text-muted, rgba(148, 163, 184, 0.7))",
                    fontSize: "0.95rem",
                    lineHeight: 1.6,
                  }}
                >
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "4rem 1.5rem 2rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2rem",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "2rem",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {[
              { icon: "fa-solid fa-shield-halved", label: "HIPAA Compliant" },
              { icon: "fa-solid fa-lock", label: "End-to-End Encrypted" },
              { icon: "fa-solid fa-user-shield", label: "Privacy First" },
            ].map((badge) => (
              <div
                key={badge.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "var(--text-muted, rgba(148, 163, 184, 0.7))",
                  fontSize: "0.85rem",
                }}
              >
                <i
                  className={badge.icon}
                  style={{ color: "#0D9488", fontSize: "1rem" }}
                />
                {badge.label}
              </div>
            ))}
          </div>

          <div
            style={{
              width: "100%",
              height: "1px",
              background: "rgba(255, 255, 255, 0.06)",
            }}
          />

          <div
            style={{
              display: "flex",
              gap: "2rem",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                background: "var(--gradient-1)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              <i
                className="fa-solid fa-heart-pulse"
                style={{
                  WebkitTextFillColor: "#14B8A6",
                  marginRight: "0.4rem",
                }}
              />
              Mendly
            </span>
            {[
              { label: "Privacy", href: "#" },
              { label: "Terms", href: "#" },
              { label: "Support", href: "#" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                style={{
                  color: "var(--text-muted, rgba(148, 163, 184, 0.7))",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "color 0.2s ease",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#F1F5F9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color =
                    "var(--text-muted, rgba(148, 163, 184, 0.7))";
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          <p
            style={{
              color: "var(--text-muted, rgba(148, 163, 184, 0.7))",
              fontSize: "0.8rem",
              textAlign: "center",
            }}
          >
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
