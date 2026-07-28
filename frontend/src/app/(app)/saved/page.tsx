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
        bg: "bg-teal-500/10",
        border: "border-teal-500/20",
        text: "text-teal-300",
      };
    }
    return {
      icon: "fa-solid fa-heart-pulse",
      label: "Condition",
      color: "#14B8A6",
      bg: "bg-teal-500/10",
      border: "border-teal-500/20",
      text: "text-teal-300",
    };
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--bg)",
        backgroundImage: "var(--bg-gradient)",
      }}
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
            <i className="fa-solid fa-bookmark text-teal-400 text-xl"></i>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Saved Items</h1>
            <p className="text-gray-400 text-sm">
              Your bookmarked medicines and conditions
            </p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-triangle-exclamation text-red-400"></i>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-xl bg-gray-800/40 border border-gray-700/30 animate-pulse"
              />
            ))}
          </div>
        </div>
      )}

      {/* Saved Items Grid */}
      {!loading && items.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-500 text-sm mb-4">
            {items.length} saved item{items.length !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const typeCfg = getTypeConfig(item.type);
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-xl bg-gray-800/40 backdrop-blur-md border border-gray-700/30 hover:border-teal-500/30 hover:bg-gray-800/60 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                      <i className={`${typeCfg.icon} text-teal-400 text-sm`}></i>
                    </div>
                    <span
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${typeCfg.bg} ${typeCfg.text} border ${typeCfg.border}`}
                    >
                      {typeCfg.label}
                    </span>
                  </div>

                  <h3 className="text-white font-semibold text-lg mb-1 group-hover:text-teal-300 transition-colors">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700/30">
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <i className="fa-regular fa-calendar"></i>
                      <span>{formatDate(item.date_saved)}</span>
                    </div>
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={removingId === item.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-all duration-200 disabled:opacity-50"
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

      {/* Empty State */}
      {!loading && items.length === 0 && !error && (
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-800/60 border border-gray-700/30 flex items-center justify-center mb-6">
              <i className="fa-regular fa-bookmark text-gray-600 text-3xl"></i>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">
              No saved items yet
            </h3>
            <p className="text-gray-500 text-sm max-w-sm">
              Browse medicines and conditions, then save them here for quick access later.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
