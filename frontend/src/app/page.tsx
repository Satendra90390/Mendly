"use client";

import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/config";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import LandingPage from "@/components/landing-page";

function HomeContent() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [oauthError, setOauthError] = useState("");
  const processed = useRef(false);

  useEffect(() => {
    if (loading || processed.current) return;

    const token = searchParams.get("token");
    const error = searchParams.get("auth_error");

    if (token) {
      processed.current = true;
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            login(token, data);
          }
          router.replace("/dashboard");
        })
        .catch(() => {
          router.replace("/");
        });
      return;
    }

    if (error) {
      processed.current = true;
      setOauthError(error.replace(/\+/g, " "));
      router.replace("/");
      return;
    }

    if (user) {
      processed.current = true;
      router.replace("/dashboard");
    }
  }, [user, loading, searchParams, login, router]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#14B8A6", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      </div>
    );
  }

  if (user) return null;
  return <LandingPage oauthError={oauthError} />;
}

export default function Home() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#14B8A6", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
