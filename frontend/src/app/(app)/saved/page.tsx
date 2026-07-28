"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/config";

interface SavedItem {
  id: string;
  name: string;
  type: "medicine" | "condition";
  date_saved: string;
  description?: string;
}

export default function SavedPage() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${API_BASE}/user/saved`);
      if (!res.ok) throw new Error("Failed to fetch saved items");
      const data = await res.json();
      setItems(data.results || data.items || data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSaved();
  }, [fetchSaved]);

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await authFetch(`${API_BASE}/user/saved/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {
    } finally {
      setRemovingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getTypeConfig = (type: string) => {
    if (type === "medicine") {
      return {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <rect x="4" y="5" width="16" height="14" rx="7" />
            <line x1="10" y1="5" x2="10" y2="19" />
          </svg>
        ),
        label: "Medicine",
        color: "#14B8A6",
        bg: "hsl(173 80% 36% / 0.1)",
        border: "1px solid hsl(173 80% 36% / 0.2)",
        text: "hsl(var(--primary))",
      };
    }
    return {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      ),
      label: "Condition",
      color: "#EC4899",
      bg: "hsl(330 80% 60% / 0.1)",
      border: "1px solid hsl(330 80% 60% / 0.2)",
      text: "#F472B6",
    };
  };

  return (
    <div className="page-wrap p-4 md:p-8">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsl(173 80% 36% / 0.2)", border: "1px solid hsl(173 80% 36% / 0.3)" }}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" style={{ color: "hsl(var(--primary))" }}>
              <path d="M4 2h16v20l-8-6-8 6V2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "hsl(var(--foreground))" }}>Saved Items</h1>
            <p className="text-sm text-muted">
              Your bookmarked medicines and conditions
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="p-4 rounded-xl" style={{ background: "hsl(0 84% 60% / 0.1)", border: "1px solid hsl(0 84% 60% / 0.2)" }}>
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 shrink-0" style={{ color: "#EF4444" }}>
                <path d="M12 2L2 22h20L12 2z" />
                <line x1="12" y1="8" x2="12" y2="14" />
                <circle cx="12" cy="18" r="0.5" fill="currentColor" />
              </svg>
              <p className="text-sm" style={{ color: "#FCA5A5" }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 rounded-xl animate-pulse" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            ))}
          </div>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <p className="text-sm mb-4 text-dim">
            {items.length} saved item{items.length !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const typeCfg = getTypeConfig(item.type);
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-xl transition-all duration-300 group card-hover"
                  style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: typeCfg.bg, border: typeCfg.border }}>
                      <span style={{ color: typeCfg.color }}>{typeCfg.icon}</span>
                    </div>
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: typeCfg.bg, color: typeCfg.text, border: typeCfg.border }}>
                      {typeCfg.label}
                    </span>
                  </div>

                  <h3 className="font-semibold text-lg mb-1 transition-colors" style={{ color: "hsl(var(--foreground))" }}>
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-sm line-clamp-2 mb-3 text-muted">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid hsl(var(--border))" }}>
                    <div className="flex items-center gap-2 text-xs text-dim">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>{formatDate(item.date_saved)}</span>
                    </div>
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={removingId === item.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50"
                      style={{ background: "hsl(0 84% 60% / 0.1)", border: "1px solid hsl(0 84% 60% / 0.2)", color: "#EF4444" }}
                      onMouseEnter={(e) => { if (removingId !== item.id) { e.currentTarget.style.background = "hsl(0 84% 60% / 0.2)"; e.currentTarget.style.borderColor = "hsl(0 84% 60% / 0.3)"; }}}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "hsl(0 84% 60% / 0.1)"; e.currentTarget.style.borderColor = "hsl(0 84% 60% / 0.2)"; }}
                    >
                      {removingId === item.id ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-[10px] h-[10px] animate-spin">
                          <path d="M21 12a9 9 0 11-6.219-8.56" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-[10px] h-[10px]">
                          <path d="M3 6h18" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      )}
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8 text-dim">
                <path d="M4 2h16v20l-8-6-8 6V2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2" style={{ color: "hsl(var(--foreground))" }}>
              No saved items yet
            </h3>
            <p className="text-sm max-w-sm text-muted">
              Browse medicines and conditions, then save them here for quick access later.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
