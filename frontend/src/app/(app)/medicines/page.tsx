"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
            <i className="fa-solid fa-capsules text-teal-400 text-xl"></i>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Medicine Guide
            </h1>
            <p className="text-gray-400 text-sm">
              Search medicines, check dosage &amp; side effects
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            placeholder="Search medicines by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gray-800/60 backdrop-blur-md border border-gray-700/50 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all duration-300"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          )}
        </div>
      </div>

      {/* Filter Pills */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 backdrop-blur-md border ${
                activeCategory === cat.value
                  ? "bg-teal-500/20 border-teal-500/40 text-teal-300 shadow-lg shadow-teal-500/10"
                  : "bg-gray-800/40 border-gray-700/40 text-gray-400 hover:bg-gray-700/40 hover:text-gray-300 hover:border-gray-600/40"
              }`}
            >
              <i className={cat.icon}></i>
              <span>{cat.label}</span>
            </button>
          ))}
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

      {/* Medicines Grid */}
      {!loading && medicines.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-500 text-sm mb-4">
            {medicines.length} medicine{medicines.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {medicines.map((medicine) => (
              <button
                key={medicine.id || medicine.name}
                onClick={() => handleViewDetail(medicine)}
                className="text-left p-5 rounded-xl bg-gray-800/40 backdrop-blur-md border border-gray-700/30 hover:border-teal-500/30 hover:bg-gray-800/60 hover:shadow-lg hover:shadow-teal-500/5 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                    <i className={`${getCategoryIcon(medicine.category)} text-teal-400 text-sm`}></i>
                  </div>
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-gray-700/50 text-gray-400 border border-gray-600/30">
                    {medicine.category || "General"}
                  </span>
                </div>
                <h3 className="text-white font-semibold text-lg mb-1 group-hover:text-teal-300 transition-colors">
                  {medicine.name}
                </h3>
                {medicine.brand && (
                  <p className="text-gray-500 text-xs mb-2">
                    by {medicine.brand}
                  </p>
                )}
                {medicine.key_info && (
                  <p className="text-gray-400 text-sm line-clamp-2">
                    {medicine.key_info}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2 text-teal-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>View Details</span>
                  <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && medicines.length === 0 && !error && (
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-800/60 border border-gray-700/30 flex items-center justify-center mb-6">
              <i className="fa-solid fa-microscope text-gray-600 text-3xl"></i>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">
              No medicines found
            </h3>
            <p className="text-gray-500 text-sm max-w-sm">
              Try adjusting your search query or selecting a different category.
            </p>
          </div>
        </div>
      )}

      {/* Detail Modal Overlay */}
      {selectedMedicine && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedMedicine(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-gray-900/90 backdrop-blur-xl border border-gray-700/40 shadow-2xl shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 pb-4 bg-gray-900/90 backdrop-blur-xl border-b border-gray-700/30">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center">
                  <i className={`${getCategoryIcon(selectedMedicine.category)} text-teal-400`}></i>
                </div>
                <div>
                  <h2 className="text-white font-bold text-xl">
                    {selectedMedicine.name}
                  </h2>
                  {selectedMedicine.brand && (
                    <p className="text-gray-400 text-sm">
                      Brand: {selectedMedicine.brand}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedMedicine(null)}
                className="w-9 h-9 rounded-lg bg-gray-800/60 border border-gray-700/40 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/60 transition-all"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {detailLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-20 rounded-xl bg-gray-800/40 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <>
                  {/* Category Badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/20">
                      {selectedMedicine.category || "General"}
                    </span>
                  </div>

                  {/* Uses */}
                  {selectedMedicine.uses && (
                    <DetailSection
                      icon="fa-solid fa-bullseye"
                      title="Uses"
                      content={selectedMedicine.uses}
                      color="text-blue-400"
                      bg="bg-blue-500/10"
                      border="border-blue-500/20"
                    />
                  )}

                  {/* Dosage */}
                  {selectedMedicine.dosage && (
                    <DetailSection
                      icon="fa-solid fa-prescription-bottle-medical"
                      title="Dosage"
                      content={selectedMedicine.dosage}
                      color="text-emerald-400"
                      bg="bg-emerald-500/10"
                      border="border-emerald-500/20"
                    />
                  )}

                  {/* Side Effects */}
                  {selectedMedicine.side_effects && (
                    <DetailSection
                      icon="fa-solid fa-triangle-exclamation"
                      title="Side Effects"
                      content={selectedMedicine.side_effects}
                      color="text-amber-400"
                      bg="bg-amber-500/10"
                      border="border-amber-500/20"
                    />
                  )}

                  {/* Precautions */}
                  {selectedMedicine.precautions && (
                    <DetailSection
                      icon="fa-solid fa-shield-halved"
                      title="Precautions"
                      content={selectedMedicine.precautions}
                      color="text-rose-400"
                      bg="bg-rose-500/10"
                      border="border-rose-500/20"
                    />
                  )}

                  {/* No details */}
                  {!selectedMedicine.uses &&
                    !selectedMedicine.dosage &&
                    !selectedMedicine.side_effects &&
                    !selectedMedicine.precautions && (
                      <div className="text-center py-8">
                        <i className="fa-solid fa-file-circle-question text-gray-600 text-3xl mb-3"></i>
                        <p className="text-gray-500 text-sm">
                          No detailed information available for this medicine.
                        </p>
                      </div>
                    )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-2">
              <p className="text-[11px] text-gray-600 text-center">
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
  bg,
  border,
}: {
  icon: string;
  title: string;
  content: string;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <div className={`p-4 rounded-xl ${bg} border ${border} backdrop-blur-sm`}>
      <div className="flex items-center gap-2.5 mb-2">
        <i className={`${icon} ${color} text-sm`}></i>
        <h4 className="text-white font-semibold text-sm">{title}</h4>
      </div>
      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
        {content}
      </p>
    </div>
  );
}
