"use client";

import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "@/lib/config";

interface Medicine {
  id: string;
  name: string;
  category: string;
  key_info?: string;
  brand?: string;
  uses?: string;
  dosage?: string;
  side_effects?: string;
  precautions?: string;
}

const CATEGORIES = [
  { label: "All", value: "all", icon: "fa-solid fa-pills" },
  { label: "Antibiotics", value: "antibiotics", icon: "fa-solid fa-virus-slash" },
  { label: "Painkillers", value: "painkillers", icon: "fa-solid fa-hand-holding-medical" },
  { label: "Cardiac", value: "cardiac", icon: "fa-solid fa-heart-pulse" },
  { label: "Mental Health", value: "mental_health", icon: "fa-solid fa-brain" },
  { label: "Diabetes", value: "diabetes", icon: "fa-solid fa-syringe" },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function MedicinesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 400);

  const fetchMedicines = useCallback(async (query: string, category: string) => {
    setLoading(true);
    setError(null);
    try {
      let url: string;
      if (query.trim()) {
        url = `${API_BASE}/medicines/search?q=${encodeURIComponent(query)}`;
      } else {
        url = `${API_BASE}/medicines`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch medicines");
      const data = await res.json();
      let results: Medicine[] = data.results || data.medicines || data || [];
      if (category !== "all") {
        results = results.filter(
          (m) => m.category?.toLowerCase().replace(/\s+/g, "_") === category
        );
      }
      setMedicines(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMedicines(debouncedSearch, activeCategory);
  }, [debouncedSearch, activeCategory, fetchMedicines]);

  const handleViewDetail = async (medicine: Medicine) => {
    setDetailLoading(true);
    setSelectedMedicine(medicine);
    try {
      const res = await fetch(
        `${API_BASE}/medicines/${encodeURIComponent(medicine.name)}`
      );
      if (!res.ok) throw new Error("Failed to fetch medicine details");
      const data = await res.json();
      setSelectedMedicine((prev) => ({ ...prev!, ...data }));
    } catch (err) {
      console.error("Detail fetch error:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat?.icon || "fa-solid fa-pills";
  };

  return (
    <div className="page-wrap p-4 md:p-8">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(20,184,164,0.2)", border: "1px solid rgba(20,184,164,0.3)" }}>
            <i className="fa-solid fa-capsules text-xl" style={{ color: "var(--accent)" }}></i>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text)" }}>
              Medicine Guide
            </h1>
            <p className="text-sm text-muted">
              Search medicines, check dosage &amp; side effects
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mb-6">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-dim"></i>
          <input
            type="text"
            placeholder="Search medicines by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-xl outline-none transition-all duration-300"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(20,184,166,0.1)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: "var(--text-dim)" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--text)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-dim)"}
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300"
              style={{
                background: activeCategory === cat.value ? "rgba(20,184,166,0.2)" : "var(--surface)",
                border: activeCategory === cat.value ? "1px solid rgba(20,184,166,0.4)" : "1px solid var(--border)",
                color: activeCategory === cat.value ? "var(--accent-light)" : "var(--text-muted)",
              }}
            >
              <i className={cat.icon}></i>
              <span>{cat.label}</span>
            </button>
          ))}
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

      {!loading && medicines.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <p className="text-sm mb-4 text-dim">
            {medicines.length} medicine{medicines.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {medicines.map((medicine) => (
              <button
                key={medicine.id || medicine.name}
                onClick={() => handleViewDetail(medicine)}
                className="text-left p-5 rounded-xl transition-all duration-300 group card-hover"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.2)" }}>
                    <i className={`${getCategoryIcon(medicine.category)} text-sm`} style={{ color: "var(--accent)" }}></i>
                  </div>
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full text-dim" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)" }}>
                    {medicine.category || "General"}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-1 transition-colors" style={{ color: "var(--text)" }}>
                  {medicine.name}
                </h3>
                {medicine.brand && (
                  <p className="text-xs mb-2 text-dim">
                    by {medicine.brand}
                  </p>
                )}
                {medicine.key_info && (
                  <p className="text-sm line-clamp-2 text-muted">
                    {medicine.key_info}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--accent)" }}>
                  <span>View Details</span>
                  <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && medicines.length === 0 && !error && (
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <i className="fa-solid fa-microscope text-3xl text-dim"></i>
            </div>
            <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text)" }}>
              No medicines found
            </h3>
            <p className="text-sm max-w-sm text-muted">
              Try adjusting your search query or selecting a different category.
            </p>
          </div>
        </div>
      )}

      {selectedMedicine && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          onClick={() => setSelectedMedicine(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl"
            style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 pb-4" style={{ background: "var(--glass)", borderBottom: "1px solid var(--glass-border)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.25)" }}>
                  <i className={`${getCategoryIcon(selectedMedicine.category)}`} style={{ color: "var(--accent)" }}></i>
                </div>
                <div>
                  <h2 className="font-bold text-xl" style={{ color: "var(--text)" }}>
                    {selectedMedicine.name}
                  </h2>
                  {selectedMedicine.brand && (
                    <p className="text-sm text-muted">
                      Brand: {selectedMedicine.brand}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedMedicine(null)}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-dim)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.color = "var(--text-dim)"; }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {detailLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "var(--surface)" }} />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: "rgba(20,184,166,0.15)", color: "var(--accent-light)", border: "1px solid rgba(20,184,166,0.2)" }}>
                      {selectedMedicine.category || "General"}
                    </span>
                  </div>

                  {selectedMedicine.uses && (
                    <DetailSection
                      icon="fa-solid fa-bullseye"
                      title="Uses"
                      content={selectedMedicine.uses}
                      color="var(--accent-blue)"
                    />
                  )}

                  {selectedMedicine.dosage && (
                    <DetailSection
                      icon="fa-solid fa-prescription-bottle-medical"
                      title="Dosage"
                      content={selectedMedicine.dosage}
                      color="#34D399"
                    />
                  )}

                  {selectedMedicine.side_effects && (
                    <DetailSection
                      icon="fa-solid fa-triangle-exclamation"
                      title="Side Effects"
                      content={selectedMedicine.side_effects}
                      color="#FBBF24"
                    />
                  )}

                  {selectedMedicine.precautions && (
                    <DetailSection
                      icon="fa-solid fa-shield-halved"
                      title="Precautions"
                      content={selectedMedicine.precautions}
                      color="#FB7185"
                    />
                  )}

                  {!selectedMedicine.uses &&
                    !selectedMedicine.dosage &&
                    !selectedMedicine.side_effects &&
                    !selectedMedicine.precautions && (
                      <div className="text-center py-8">
                        <i className="fa-solid fa-file-circle-question text-3xl mb-3 text-dim"></i>
                        <p className="text-sm text-muted">
                          No detailed information available for this medicine.
                        </p>
                      </div>
                    )}
                </>
              )}
            </div>

            <div className="p-6 pt-2">
              <p className="text-[11px] text-center text-dim">
                <i className="fa-solid fa-circle-info mr-1"></i>
                Always consult a healthcare professional before taking any medication.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailSection({
  icon,
  title,
  content,
  color,
}: {
  icon: string;
  title: string;
  content: string;
  color: string;
}) {
  return (
    <div className="p-4 rounded-xl backdrop-blur-sm" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
      <div className="flex items-center gap-2.5 mb-2">
        <i className={`${icon} text-sm`} style={{ color }}></i>
        <h4 className="font-semibold text-sm" style={{ color: "var(--text)" }}>{title}</h4>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-line text-muted">
        {content}
      </p>
    </div>
  );
}
