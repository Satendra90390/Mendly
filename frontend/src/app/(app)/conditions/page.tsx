"use client";

import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "@/lib/config";

interface Condition {
  id: string;
  name: string;
  description: string;
  symptoms: string[];
  causes?: string;
  treatment?: string;
  prevention?: string;
}

export default function ConditionsPage() {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Record<string, Condition>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  const fetchConditions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/conditions`);
      if (!res.ok) throw new Error("Failed to fetch conditions");
      const data = await res.json();
      setConditions(data.results || data.conditions || data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setConditions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConditions();
  }, [fetchConditions]);

  const handleExpand = async (condition: Condition) => {
    const isExpanding = expandedId !== condition.id;
    setExpandedId(isExpanding ? condition.id : null);

    if (isExpanding && !detailData[condition.id]) {
      setDetailLoading(condition.id);
      try {
        const res = await fetch(
          `${API_BASE}/conditions/${encodeURIComponent(condition.name)}`
        );
        if (res.ok) {
          const data = await res.json();
          setDetailData((prev) => ({ ...prev, [condition.id]: { ...condition, ...data } }));
        }
      } catch {
        // use existing data
      } finally {
        setDetailLoading(null);
      }
    }
  };

  return (
    <div className="page-wrap p-4 md:p-8">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(236,72,153,0.2)", border: "1px solid rgba(236,72,153,0.3)" }}>
            <i className="fa-solid fa-heart-pulse text-xl" style={{ color: "#EC4899" }}></i>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text)" }}>
              Medical Conditions
            </h1>
            <p className="text-sm text-muted">
              Browse conditions, symptoms, and treatment info
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
              <div key={i} className="h-48 rounded-xl animate-pulse" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
            ))}
          </div>
        </div>
      )}

      {!loading && conditions.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <p className="text-sm mb-4 text-dim">
            {conditions.length} condition{conditions.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {conditions.map((condition) => {
              const isExpanded = expandedId === condition.id;
              const isLoadingDetail = detailLoading === condition.id;
              const d = detailData[condition.id] || condition;

              return (
                <div
                  key={condition.id}
                  className="rounded-xl transition-all duration-300"
                  style={{
                    background: isExpanded ? "var(--surface-hover)" : "var(--surface)",
                    border: isExpanded ? "1px solid rgba(236,72,153,0.4)" : "1px solid var(--border)",
                  }}
                >
                  <button
                    onClick={() => handleExpand(condition)}
                    className="w-full text-left p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.2)" }}>
                        <i className="fa-solid fa-heart-pulse text-sm" style={{ color: "#EC4899" }}></i>
                      </div>
                      <i
                        className={`fa-solid fa-chevron-down text-xs transition-transform duration-300 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        style={{ color: "var(--text-dim)" }}
                      ></i>
                    </div>
                    <h3 className="font-semibold text-lg mb-1" style={{ color: "var(--text)" }}>
                      {condition.name}
                    </h3>
                    {condition.description && (
                      <p className="text-sm line-clamp-2 text-muted">
                        {condition.description}
                      </p>
                    )}

                    {!isExpanded && condition.symptoms && condition.symptoms.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {condition.symptoms.slice(0, 3).map((symptom, i) => (
                          <span
                            key={i}
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(236,72,153,0.1)", color: "#F472B6", border: "1px solid rgba(236,72,153,0.2)" }}
                          >
                            {symptom}
                          </span>
                        ))}
                        {condition.symptoms.length > 3 && (
                          <span className="text-[11px] px-2 py-0.5 text-dim">
                            +{condition.symptoms.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4">
                      {isLoadingDetail ? (
                        <div className="space-y-3">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "var(--surface)" }} />
                          ))}
                        </div>
                      ) : (
                        <>
                          {d.symptoms && d.symptoms.length > 0 && (
                            <div className="p-4 rounded-xl" style={{ background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.2)" }}>
                              <div className="flex items-center gap-2.5 mb-2">
                                <i className="fa-solid fa-list-check text-sm" style={{ color: "#EC4899" }}></i>
                                <h4 className="font-semibold text-sm" style={{ color: "var(--text)" }}>Symptoms</h4>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {d.symptoms.map((symptom, i) => (
                                  <span key={i} className="text-sm px-3 py-1 rounded-full" style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                                    {symptom}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {d.causes && (
                            <div className="p-4 rounded-xl" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                              <div className="flex items-center gap-2.5 mb-2">
                                <i className="fa-solid fa-magnifying-glass text-sm" style={{ color: "#8B5CF6" }}></i>
                                <h4 className="font-semibold text-sm" style={{ color: "var(--text)" }}>Causes</h4>
                              </div>
                              <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{d.causes}</p>
                            </div>
                          )}

                          {d.treatment && (
                            <div className="p-4 rounded-xl" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
                              <div className="flex items-center gap-2.5 mb-2">
                                <i className="fa-solid fa-stethoscope text-sm" style={{ color: "#34D399" }}></i>
                                <h4 className="font-semibold text-sm" style={{ color: "var(--text)" }}>Treatment</h4>
                              </div>
                              <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{d.treatment}</p>
                            </div>
                          )}

                          {d.prevention && (
                            <div className="p-4 rounded-xl" style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)" }}>
                              <div className="flex items-center gap-2.5 mb-2">
                                <i className="fa-solid fa-shield-halved text-sm" style={{ color: "#60A5FA" }}></i>
                                <h4 className="font-semibold text-sm" style={{ color: "var(--text)" }}>Prevention</h4>
                              </div>
                              <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{d.prevention}</p>
                            </div>
                          )}

                          {!d.causes && !d.treatment && !d.prevention && (
                            <div className="text-center py-6">
                              <i className="fa-solid fa-file-circle-question text-2xl mb-2 text-dim"></i>
                              <p className="text-sm text-muted">
                                No additional details available for this condition.
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      <p className="text-[11px] text-center pt-2 text-dim">
                        <i className="fa-solid fa-circle-info mr-1"></i>
                        This information is for educational purposes only. Consult a healthcare professional.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && conditions.length === 0 && !error && (
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <i className="fa-solid fa-heart-pulse text-3xl text-dim"></i>
            </div>
            <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text)" }}>
              No conditions available
            </h3>
            <p className="text-sm max-w-sm text-muted">
              The conditions database is currently empty. Check back later.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
