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
      // keep items on failure
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
        icon: "fa-solid fa-pills",
        label: "Medicine",
        color: "#14B8A6",
        bg: "rgba(20,184,166,0.1)",
        border: "1px solid rgba(20,184,166,0.2)",
        text: "var(--accent-light)",
      };
    }
    return {
      icon: "fa-solid fa-heart-pulse",
      label: "Condition",
      color: "#EC4899",
      bg: "rgba(236,72,153,0.1)",
      border: "1px solid rgba(236,72,153,0.2)",
      text: "#F472B6",
    };
  };

  return (
    <div className="page-wrap p-4 md:p-8">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(20,184,166,0.2)", border: "1px solid rgba(20,184,166,0.3)" }}>
            <i className="fa-solid fa-bookmark text-xl" style={{ color: "var(--accent)" }}></i>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text)" }}>Saved Items</h1>
            <p className="text-sm text-muted">
              Your bookmarked medicines and conditions
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-triangle-exclamation" style={{ color: "#EF4444" }}></i>
              <p className="text-sm" style={{ color: "#FCA5A5" }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 rounded-xl animate-pulse" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
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
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: typeCfg.bg, border: typeCfg.border }}>
                      <i className={`${typeCfg.icon} text-sm`} style={{ color: typeCfg.color }}></i>
                    </div>
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: typeCfg.bg, color: typeCfg.text, border: typeCfg.border }}>
                      {typeCfg.label}
                    </span>
                  </div>

                  <h3 className="font-semibold text-lg mb-1 transition-colors" style={{ color: "var(--text)" }}>
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-sm line-clamp-2 mb-3 text-muted">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-2 text-xs text-dim">
                      <i className="fa-regular fa-calendar"></i>
                      <span>{formatDate(item.date_saved)}</span>
                    </div>
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={removingId === item.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50"
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}
                      onMouseEnter={(e) => { if (removingId !== item.id) { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
                    >
                      {removingId === item.id ? (
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fa-solid fa-trash-can text-[10px]"></i>
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
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <i className="fa-regular fa-bookmark text-3xl text-dim"></i>
            </div>
            <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text)" }}>
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
