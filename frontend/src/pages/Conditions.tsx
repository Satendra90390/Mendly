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
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.2)", border: "1px solid hsl(var(--primary) / 0.3)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} fill="currentColor">
              <path d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Medical Conditions
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse conditions, symptoms, and treatment info
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="p-4 rounded-xl" style={{ background: "hsl(var(--destructive) / 0.1)", border: "1px solid hsl(var(--destructive) / 0.2)" }}>
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-4 h-4" style={{ color: "hsl(var(--destructive))" }} fill="currentColor">
                <path d="M256 32c14.2 0 27.3 7.5 33.8 19.4l216 368c6.6 11.3 6.6 25.3 0 36.6S488.2 448 472 448H40c-16.2 0-31.1-8.5-37.8-20s-6.6-25.3 0-36.6l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24l0 80c0 13.3 10.7 24 24 24s24-10.7 24-24l0-80c0-13.3-10.7-24-24-24zm32 224l0 0c0 17.7-14.3 32-32 32s-32-14.3-32-32l0 0c0-17.7 14.3-32 32-32s32 14.3 32 32z" />
              </svg>
              <p className="text-sm" style={{ color: "hsl(var(--destructive) / 0.8)" }}>{error}</p>
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

      {!loading && conditions.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <p className="text-sm mb-4" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
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
                  className={`rounded-xl transition-all duration-300 ${isExpanded ? 'bg-muted' : 'bg-card'}`}
                  style={{
                    border: isExpanded ? "1px solid hsl(var(--primary) / 0.4)" : "1px solid hsl(var(--border))",
                  }}
                >
                  <button
                    onClick={() => handleExpand(condition)}
                    className="w-full text-left p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.2)" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} fill="currentColor">
                          <path d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z" />
                        </svg>
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 512 512"
                        className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                        style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}
                        fill="currentColor"
                      >
                        <path d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-lg mb-1 text-foreground">
                      {condition.name}
                    </h3>
                    {condition.description && (
                      <p className="text-sm line-clamp-2 text-muted-foreground">
                        {condition.description}
                      </p>
                    )}

                    {!isExpanded && condition.symptoms && condition.symptoms.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {condition.symptoms.slice(0, 3).map((symptom, i) => (
                          <span
                            key={i}
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                            style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.2)" }}
                          >
                            {symptom}
                          </span>
                        ))}
                        {condition.symptoms.length > 3 && (
                          <span className="text-[11px] px-2 py-0.5" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
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
                            <div key={i} className="h-24 rounded-xl animate-pulse bg-card" />
                          ))}
                        </div>
                      ) : (
                        <>
                          {d.symptoms && d.symptoms.length > 0 && (
                            <div className="p-4 rounded-xl" style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.2)" }}>
                              <div className="flex items-center gap-2.5 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} fill="currentColor">
                                  <path d="M192 0c-17.7 0-32 14.3-32 32l0 32L128 64c-35.3 0-64 28.7-64 64l0 320c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64l-32 0 0-32c0-17.7-14.3-32-32-32L192 0zM128 128l256 0 0 32L128 160l0-32zm174.6 102.6l-72 72c-4.7 4.7-12.3 4.7-17 0l-40-40c-4.7-4.7-4.7-12.3 0-17s12.3-4.7 17 0L224 278.1l63-63c4.7-4.7 12.3-4.7 17 0s4.7 12.3 0 17z" />
                                </svg>
                                <h4 className="font-semibold text-sm text-foreground">Symptoms</h4>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {d.symptoms.map((symptom, i) => (
                                  <span key={i} className="text-sm px-3 py-1 rounded-full bg-card text-muted-foreground" style={{ border: "1px solid hsl(var(--border))" }}>
                                    {symptom}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {d.causes && (
                            <div className="p-4 rounded-xl" style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.2)" }}>
                              <div className="flex items-center gap-2.5 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} fill="currentColor">
                                  <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z" />
                                </svg>
                                <h4 className="font-semibold text-sm text-foreground">Causes</h4>
                              </div>
                              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{d.causes}</p>
                            </div>
                          )}

                          {d.treatment && (
                            <div className="p-4 rounded-xl" style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.2)" }}>
                              <div className="flex items-center gap-2.5 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} fill="currentColor">
                                  <path d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 32c0 17.7 14.3 32 32 32s32-14.3 32-32l0-32zM168 112c-13.3 0-24 10.7-24 24l0 40c0 70.7 57.3 128 128 128s128-57.3 128-128l0-40c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 40c0 44.2-35.8 80-80 80s-80-35.8-80-80l0-40c0-13.3-10.7-24-24-24zM512 272c0-35.3-28.7-64-64-64s-64 28.7-64 64c0 25.8 15.3 48 37.2 58.4C413.3 359.7 388 394 352 402.6c0 .9 0 1.8 0 2.7c0 53 43 96 96 96s96-43 96-96l0-16-32 0 0 16c0 35.3-28.7 64-64 64s-64-28.7-64-64c0-2.4 .1-4.7 .4-7c-19.5-8-33.4-26.8-35.8-49.1c24.4-12.7 41.4-38.6 41.4-68.9c0-17.7-14.3-32-32-32s-32 14.3-32 32c0 8.2 3.1 15.7 8.2 21.3C352 293 336 313 336 336c0 37.6 26.8 68.8 62.6 75.4C406.3 429.5 419.9 448 438 448l50 0c22.1 0 40-17.9 40-40l0-40c0-35.3-28.7-64-64-64z" />
                                </svg>
                                <h4 className="font-semibold text-sm text-foreground">Treatment</h4>
                              </div>
                              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{d.treatment}</p>
                            </div>
                          )}

                          {d.prevention && (
                            <div className="p-4 rounded-xl" style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.2)" }}>
                              <div className="flex items-center gap-2.5 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} fill="currentColor">
                                  <path d="M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.4 31 38.3 57.2c-.5 99.2-41.3 280.7-213.6 363.2c-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.8 1 251.4 0 256 0zm0 66.8l0 380.9C393.2 381.4 428.3 233.9 432 140.4L256 66.8z" />
                                </svg>
                                <h4 className="font-semibold text-sm text-foreground">Prevention</h4>
                              </div>
                              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{d.prevention}</p>
                            </div>
                          )}

                          {!d.causes && !d.treatment && !d.prevention && (
                            <div className="text-center py-6">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-6 h-6 mx-auto mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }} fill="currentColor">
                                <path d="M96 0C60.7 0 32 28.7 32 64l0 384c0 35.3 28.7 64 64 64l196.2 0c-12-19.6-19.1-42.1-20.1-66.9C245.9 409.1 208 360 208 304c0-79.5 64.5-144 144-144c13.5 0 26.6 1.9 39 5.4L320 64c0-35.3-28.7-64-64-64H96z" />
                                <path d="M352 448a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm0-288c-79.5 0-144 64.5-144 144c0 13.3 10.7 24 24 24s24-10.7 24-24c0-53 43-96 96-96s96 43 96 96c0 14.1-3 27.5-8.5 39.6c-2.6 5.8-5.7 11.2-9.3 16.2c-5.7 8-7.1 18.7-1.2 27.4c6.3 9.3 19.1 11.8 28.4 5.5c5.4-3.6 10.4-7.9 14.9-12.7c8.5-9.1 15.2-19.8 19.7-31.4C495.6 371.2 512 339.9 512 304c0-79.5-64.5-144-144-144z" />
                              </svg>
                              <p className="text-sm text-muted-foreground">
                                No additional details available for this condition.
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      <p className="text-[11px] text-center pt-2" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-3 h-3 inline-block mr-1" fill="currentColor">
                          <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z" />
                        </svg>
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
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-card" style={{ border: "1px solid hsl(var(--border))" }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-8 h-8" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }} fill="currentColor">
                <path d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2 text-foreground">
              No conditions available
            </h3>
            <p className="text-sm max-w-sm text-muted-foreground">
              The conditions database is currently empty. Check back later.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}