import { useState, useEffect, useCallback, type ReactNode } from "react";
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

function MagnifyingGlassIcon({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function XMarkIcon({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function MicroscopeIcon({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 18h8" />
      <path d="M3 22h18" />
      <path d="M14 22a7 7 0 1 0 0-14h-1" />
      <path d="M9 14h2" />
      <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" />
      <path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
    </svg>
  );
}

function TriangleExclamationIcon({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  );
}

function BullseyeIcon({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function PrescriptionBottleIcon({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 4h14" />
      <path d="M6 4v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V4" />
      <path d="M12 9v6" />
      <path d="M9 12h6" />
    </svg>
  );
}

function ShieldIcon({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}

function FileQuestionIcon({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M10 13a1 1 0 1 1 2 0c0 .5-.34.75-.74.94" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CircleInfoIcon({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function PillsIcon({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="14" width="8" height="6" rx="2" />
      <rect x="12" y="14" width="8" height="6" rx="2" />
      <path d="M10.5 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2Z" />
    </svg>
  );
}

function VirusSlashIcon({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m4.93 19.07 1.41-1.41" />
      <path d="m17.66 6.34 1.41-1.41" />
      <path d="M2 2l20 20" />
    </svg>
  );
}

function HandHoldingMedicalIcon({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
      <path d="M12 11v2" />
      <path d="M11 12h2" />
    </svg>
  );
}

function HeartPulseIcon({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 14c1.5-1 3-2.5 3-5.5A5.5 5.5 0 0 0 13 3c-1.6 0-3 .6-4 1.4C7.9 3.6 6.5 3 5 3A5.5 5.5 0 0 0 2 8.5c0 3 1.5 4.5 3 5.5" />
      <polyline points="3.5 12 8 12 10 8 14 16 16 12 20.5 12" />
    </svg>
  );
}

function BrainIcon({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9.5 3A2.5 2.5 0 0 1 12 5.5V5a2.5 2.5 0 0 1 5 0v.5a2.5 2.5 0 0 1 2.5 2.5" />
      <path d="M12 21a2.5 2.5 0 0 1-2.5-2.5V19a2.5 2.5 0 0 0-5 0v.5a2.5 2.5 0 0 1-2.5 2.5" />
      <path d="M21 12a2.5 2.5 0 0 1-2.5 2.5H19a2.5 2.5 0 0 0 2.5 2.5" />
      <path d="M3 12a2.5 2.5 0 0 0 2.5-2.5H5a2.5 2.5 0 0 1 2.5-2.5" />
    </svg>
  );
}

function SyringeIcon({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m18 2 4 4" />
      <path d="m17 7 3-3" />
      <path d="M10 18 4 6l4-4 6 12Z" />
      <path d="m21 13-4 4-6-6" />
      <path d="M7 17l4 4" />
    </svg>
  );
}

const CATEGORIES: { label: string; value: string; icon: ReactNode }[] = [
  { label: "All", value: "all", icon: <PillsIcon /> },
  { label: "Antibiotics", value: "antibiotics", icon: <VirusSlashIcon /> },
  { label: "Painkillers", value: "painkillers", icon: <HandHoldingMedicalIcon /> },
  { label: "Cardiac", value: "cardiac", icon: <HeartPulseIcon /> },
  { label: "Mental Health", value: "mental_health", icon: <BrainIcon /> },
  { label: "Diabetes", value: "diabetes", icon: <SyringeIcon /> },
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
    return cat?.icon || <PillsIcon />;
  };

  return (
    <div className="page-wrap p-4 md:p-8">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsl(173 80% 36% / 0.2)", border: "1px solid hsl(173 80% 36% / 0.3)" }}>
            <PillsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Medicine Guide
            </h1>
            <p className="text-sm text-muted-foreground">
              Search medicines, check dosage &amp; side effects
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }} />
          <input
            type="text"
            placeholder="Search medicines by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-xl outline-none transition-all duration-300 bg-card text-foreground border-border focus:border-primary focus:shadow-[0_0_0_3px_hsl(173_80%_36%/0.1)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:text-foreground"
              style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}
            >
              <XMarkIcon className="w-5 h-5" />
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
                background: activeCategory === cat.value ? "hsl(173 80% 36% / 0.2)" : "hsl(var(--card))",
                border: activeCategory === cat.value ? "1px solid hsl(173 80% 36% / 0.4)" : "1px solid hsl(var(--border))",
                color: activeCategory === cat.value ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
              }}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="p-4 rounded-xl" style={{ background: "hsl(0 84% 60% / 0.1)", border: "1px solid hsl(0 84% 60% / 0.2)" }}>
            <div className="flex items-center gap-3">
              <TriangleExclamationIcon style={{ color: "#EF4444" }} />
              <p className="text-sm" style={{ color: "#FCA5A5" }}>{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-xl animate-pulse bg-card" style={{ border: "1px solid hsl(var(--border))" }} />
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
                className="text-left p-5 rounded-xl transition-all duration-300 group card-hover bg-card"
                style={{ border: "1px solid hsl(var(--border))" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "hsl(173 80% 36% / 0.1)", border: "1px solid hsl(173 80% 36% / 0.2)" }}>
                    <span style={{ color: "hsl(var(--primary))" }}>{getCategoryIcon(medicine.category)}</span>
                  </div>
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full text-dim bg-muted" style={{ border: "1px solid hsl(var(--border))" }}>
                    {medicine.category || "General"}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-1 text-foreground">
                  {medicine.name}
                </h3>
                {medicine.brand && (
                  <p className="text-xs mb-2 text-dim">
                    by {medicine.brand}
                  </p>
                )}
                {medicine.key_info && (
                  <p className="text-sm line-clamp-2 text-muted-foreground">
                    {medicine.key_info}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "hsl(var(--primary))" }}>
                  <span>View Details</span>
                  <ArrowRightIcon className="w-[10px] h-[10px]" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && medicines.length === 0 && !error && (
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-card" style={{ border: "1px solid hsl(var(--border))" }}>
              <MicroscopeIcon className="w-7 h-7" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }} />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-foreground">
              No medicines found
            </h3>
            <p className="text-sm max-w-sm text-muted-foreground">
              Try adjusting your search query or selecting a different category.
            </p>
          </div>
        </div>
      )}

      {selectedMedicine && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "hsl(0 0% 0% / 0.6)", backdropFilter: "blur(8px)" }}
          onClick={() => setSelectedMedicine(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 pb-4 border-b border-border"
              style={{ background: "hsl(var(--card))", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "hsl(173 80% 36% / 0.15)", border: "1px solid hsl(173 80% 36% / 0.25)" }}>
                  <span style={{ color: "hsl(var(--primary))" }}>{getCategoryIcon(selectedMedicine.category)}</span>
                </div>
                <div>
                  <h2 className="font-bold text-xl text-foreground">
                    {selectedMedicine.name}
                  </h2>
                  {selectedMedicine.brand && (
                    <p className="text-sm text-muted-foreground">
                      Brand: {selectedMedicine.brand}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedMedicine(null)}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all bg-card hover:bg-muted hover:text-foreground"
                style={{ border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground) / 0.6)" }}
              >
                <XMarkIcon />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {detailLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-20 rounded-xl animate-pulse bg-card" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: "hsl(173 80% 36% / 0.15)", color: "hsl(var(--primary))", border: "1px solid hsl(173 80% 36% / 0.2)" }}>
                      {selectedMedicine.category || "General"}
                    </span>
                  </div>

                  {selectedMedicine.uses && (
                    <DetailSection
                      icon={<BullseyeIcon />}
                      title="Uses"
                      content={selectedMedicine.uses}
                      color="hsl(217 91% 60%)"
                    />
                  )}

                  {selectedMedicine.dosage && (
                    <DetailSection
                      icon={<PrescriptionBottleIcon />}
                      title="Dosage"
                      content={selectedMedicine.dosage}
                      color="#34D399"
                    />
                  )}

                  {selectedMedicine.side_effects && (
                    <DetailSection
                      icon={<TriangleExclamationIcon />}
                      title="Side Effects"
                      content={selectedMedicine.side_effects}
                      color="#FBBF24"
                    />
                  )}

                  {selectedMedicine.precautions && (
                    <DetailSection
                      icon={<ShieldIcon />}
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
                        <FileQuestionIcon className="w-7 h-7 mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }} />
                        <p className="text-sm text-muted-foreground">
                          No detailed information available for this medicine.
                        </p>
                      </div>
                    )}
                </>
              )}
            </div>

            <div className="p-6 pt-2">
              <p className="text-[11px] text-center text-dim">
                <CircleInfoIcon className="w-3 h-3 inline mr-1" />
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
  icon: ReactNode;
  title: string;
  content: string;
  color: string;
}) {
  const getWithAlpha = (base: string, alpha: number): string => {
    if (base.startsWith("hsl("))
      return base.replace(")", ` / ${alpha})`);
    if (base.startsWith("#"))
      return base + Math.round(alpha * 255).toString(16).padStart(2, "0");
    return base;
  };

  return (
    <div
      className="p-4 rounded-xl backdrop-blur-sm"
      style={{
        background: getWithAlpha(color, 0.08),
        border: `1px solid ${getWithAlpha(color, 0.15)}`,
      }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-sm" style={{ color }}>{icon}</span>
        <h4 className="font-semibold text-sm text-foreground">{title}</h4>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
        {content}
      </p>
    </div>
  );
}
