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
    <div
      className="min-h-screen p-4 md:p-8"
      style={{
        background: "var(--bg)",
        backgroundImage: "var(--bg-gradient)",
      }}
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">
            <i className="fa-solid fa-heart-pulse text-pink-400 text-xl"></i>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Medical Conditions
            </h1>
            <p className="text-gray-400 text-sm">
              Browse conditions, symptoms, and treatment info
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
                className="h-48 rounded-xl bg-gray-800/40 border border-gray-700/30 animate-pulse"
              />
            ))}
          </div>
        </div>
      )}

      {/* Conditions Grid */}
      {!loading && conditions.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-500 text-sm mb-4">
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
                  className={`rounded-xl bg-gray-800/40 backdrop-blur-md border transition-all duration-300 ${
                    isExpanded
                      ? "border-pink-500/40 bg-gray-800/60 shadow-lg shadow-pink-500/5"
                      : "border-gray-700/30 hover:border-pink-500/30 hover:bg-gray-800/60"
                  }`}
                >
                  {/* Card Header */}
                  <button
                    onClick={() => handleExpand(condition)}
                    className="w-full text-left p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                        <i className="fa-solid fa-heart-pulse text-pink-400 text-sm"></i>
                      </div>
                      <i
                        className={`fa-solid fa-chevron-down text-gray-500 text-xs transition-transform duration-300 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      ></i>
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-1">
                      {condition.name}
                    </h3>
                    {condition.description && (
                      <p className="text-gray-400 text-sm line-clamp-2">
                        {condition.description}
                      </p>
                    )}

                    {/* Symptoms Preview */}
                    {!isExpanded && condition.symptoms && condition.symptoms.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {condition.symptoms.slice(0, 3).map((symptom, i) => (
                          <span
                            key={i}
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/20"
                          >
                            {symptom}
                          </span>
                        ))}
                        {condition.symptoms.length > 3 && (
                          <span className="text-[11px] text-gray-500 px-2 py-0.5">
                            +{condition.symptoms.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4">
                      {isLoadingDetail ? (
                        <div className="space-y-3">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className="h-24 rounded-xl bg-gray-700/30 animate-pulse"
                            />
                          ))}
                        </div>
                      ) : (
                        <>
                          {/* Full Symptoms List */}
                          {d.symptoms && d.symptoms.length > 0 && (
                            <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
                              <div className="flex items-center gap-2.5 mb-2">
                                <i className="fa-solid fa-list-check text-pink-400 text-sm"></i>
                                <h4 className="text-white font-semibold text-sm">Symptoms</h4>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {d.symptoms.map((symptom, i) => (
                                  <span
                                    key={i}
                                    className="text-sm px-3 py-1 rounded-full bg-gray-800/60 text-gray-300 border border-gray-700/40"
                                  >
                                    {symptom}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Causes */}
                          {d.causes && (
                            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                              <div className="flex items-center gap-2.5 mb-2">
                                <i className="fa-solid fa-magnifying-glass text-purple-400 text-sm"></i>
                                <h4 className="text-white font-semibold text-sm">Causes</h4>
                              </div>
                              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                                {d.causes}
                              </p>
                            </div>
                          )}

                          {/* Treatment */}
                          {d.treatment && (
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                              <div className="flex items-center gap-2.5 mb-2">
                                <i className="fa-solid fa-stethoscope text-emerald-400 text-sm"></i>
                                <h4 className="text-white font-semibold text-sm">Treatment</h4>
                              </div>
                              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                                {d.treatment}
                              </p>
                            </div>
                          )}

                          {/* Prevention */}
                          {d.prevention && (
                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                              <div className="flex items-center gap-2.5 mb-2">
                                <i className="fa-solid fa-shield-halved text-blue-400 text-sm"></i>
                                <h4 className="text-white font-semibold text-sm">Prevention</h4>
                              </div>
                              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                                {d.prevention}
                              </p>
                            </div>
                          )}

                          {/* No extra details */}
                          {!d.causes && !d.treatment && !d.prevention && (
                            <div className="text-center py-6">
                              <i className="fa-solid fa-file-circle-question text-gray-600 text-2xl mb-2"></i>
                              <p className="text-gray-500 text-sm">
                                No additional details available for this condition.
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      <p className="text-[11px] text-gray-600 text-center pt-2">
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

      {/* Empty State */}
      {!loading && conditions.length === 0 && !error && (
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-800/60 border border-gray-700/30 flex items-center justify-center mb-6">
              <i className="fa-solid fa-heart-pulse text-gray-600 text-3xl"></i>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">
              No conditions available
            </h3>
            <p className="text-gray-500 text-sm max-w-sm">
              The conditions database is currently empty. Check back later.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
