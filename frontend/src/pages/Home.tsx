import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/config";
import LandingPage from "@/components/landing-page";

export default function Home() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [oauthError, setOauthError] = useState("");
  const processed = useRef(false);

  useEffect(() => {
    if (loading || processed.current) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("auth_error");

    if (token) {
      processed.current = true;
      fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) login(token, data);
          navigate("/dashboard", { replace: true });
        })
        .catch(() => navigate("/", { replace: true }));
      return;
    }

    if (error) {
      processed.current = true;
      setOauthError(error.replace(/\+/g, " "));
      navigate("/", { replace: true });
      return;
    }

    if (user) {
      processed.current = true;
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate, login]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-10 h-10 rounded-full border-[3px] border-transparent animate-spin" style={{ borderTopColor: "hsl(var(--primary))" }} />
      </div>
    );
  }

  if (user) return null;
  return <LandingPage oauthError={oauthError} />;
}
