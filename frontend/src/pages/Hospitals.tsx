import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "@/lib/config";

interface Hospital {
  id: string;
  name: string;
  address: string;
  distance?: number;
  phone?: string;
  services?: string[];
  lat?: number;
  lng?: number;
}

export default function HospitalsPage() {
  const [query, setQuery] = useState("");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "loading" | "ready" | "denied" | "error"
  >("loading");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );

  const fetchNearby = useCallback(
    async (lat: number, lng: number) => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/emergency/hospitals/nearby`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng, radius: 25 }),
        });
        const data = await res.json();
        setHospitals(data.hospitals ?? data);
      } catch {
        setHospitals([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const searchHospitals = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        if (coords) fetchNearby(coords.lat, coords.lng);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/emergency/hospitals/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: searchQuery,
            lat: coords?.lat ?? 0,
            lng: coords?.lng ?? 0,
          }),
        });
        const data = await res.json();
        setHospitals(data.hospitals ?? data);
      } catch {
        setHospitals([]);
      } finally {
        setLoading(false);
      }
    },
    [coords, fetchNearby]
  );

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        setLocationStatus("ready");
        fetchNearby(c.lat, c.lng);
      },
      () => {
        setLocationStatus("denied");
      }
    );
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocationStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        setLocationStatus("ready");
        fetchNearby(c.lat, c.lng);
      },
      () => {
        setLocationStatus("denied");
      }
    );
  }, [fetchNearby]);

  const openDirections = (hospital: Hospital) => {
    if (hospital.lat && hospital.lng) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`,
        "_blank"
      );
    } else {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hospital.address)}`,
        "_blank"
      );
    }
  };

  const statusLabel = () => {
    switch (locationStatus) {
      case "loading":
        return (
          <div className="flex items-center gap-2 text-sm" style={{ color: "hsl(var(--primary))" }}>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
              <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
            </svg>
            Getting location...
          </div>
        );
      case "ready":
        return (
          <div className="flex items-center gap-2 text-sm" style={{ color: "#34D399" }}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
            </svg>
            Location acquired
          </div>
        );
      case "denied":
        return (
          <div className="flex items-center gap-2 text-sm" style={{ color: "#FBBF24" }}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L1 21h22L12 2zm0 4v6m0 4v.01" />
            </svg>
            Location access denied
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-2 text-sm" style={{ color: "#EF4444" }}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
            </svg>
            Geolocation unavailable
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="page-wrap p-4 py-8 md:px-8 lg:px-16">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
            Nearby Hospitals
          </h1>
          <p className="text-muted">
            Find emergency care and hospital services near you.
          </p>
        </header>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <svg className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-dim" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") searchHospitals(query);
              }}
              placeholder="Search hospitals by name..."
              className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all bg-card border-border text-foreground focus:border-primary"
            />
          </div>

          <button
            onClick={() => {
              if (query) searchHospitals(query);
              else if (coords) fetchNearby(coords.lat, coords.lng);
            }}
            className="px-6 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shrink-0 hover:opacity-90"
            style={{ background: "hsl(var(--primary))", color: "#fff" }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            Search
          </button>

          <button
            onClick={getLocation}
            className="px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shrink-0 hover:bg-[hsl(var(--muted))]"
            style={{ border: "1px solid hsl(var(--primary))", color: "hsl(var(--primary))", background: "transparent" }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
            </svg>
            Use My Location
          </button>
        </div>

        {statusLabel()}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted">
            <svg className="h-9 w-9" viewBox="0 0 24 24" fill="currentColor" style={{ color: "hsl(var(--primary))" }} xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <p>Loading hospitals...</p>
          </div>
        ) : hospitals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-dim">
            <svg className="h-12 w-12" viewBox="0 0 24 24" fill="currentColor" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }} xmlns="http://www.w3.org/2000/svg">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z" />
            </svg>
            <p className="text-muted">No hospitals found. Try adjusting your search or location.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hospitals.map((h) => (
              <div
                key={h.id}
                onClick={() => openDirections(h)}
                className="group cursor-pointer rounded-2xl p-5 transition-all duration-200 flex flex-col gap-3 card-hover"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug transition-colors" style={{ color: "hsl(var(--foreground))" }}>
                    {h.name}
                  </h3>
                  {h.distance != null && (
                    <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "hsl(173 80% 36% / 0.1)", color: "hsl(var(--primary))", border: "1px solid hsl(173 80% 36% / 0.2)" }}>
                      {h.distance.toFixed(1)} km
                    </span>
                  )}
                </div>

                <p className="text-sm flex items-start gap-2 text-muted">
                  <svg className="h-3.5 w-3.5 mt-0.5 shrink-0 text-dim" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                  </svg>
                  {h.address}
                </p>

                {h.phone && (
                  <p className="text-sm flex items-center gap-2 text-muted">
                    <svg className="h-3.5 w-3.5 shrink-0 text-dim" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                    {h.phone}
                  </p>
                )}

                {h.services && h.services.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {h.services.slice(0, 4).map((s) => (
                      <span key={s} className="text-[11px] px-2 py-0.5 rounded-full text-dim" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
                        {s}
                      </span>
                    ))}
                    {h.services.length > 4 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full text-dim" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
                        +{h.services.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-auto pt-2 flex items-center gap-1.5 text-xs transition-colors" style={{ color: "hsl(var(--primary))" }}>
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 12l10 10 10-10L12 2zm-1 14v-4H8v-2h5v6h-2z" />
                  </svg>
                  Get directions
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
