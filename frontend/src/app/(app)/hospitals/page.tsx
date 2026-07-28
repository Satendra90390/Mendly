"use client";

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
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--accent-light)" }}>
            <i className="fa-solid fa-spinner fa-spin" />
            Getting location...
          </div>
        );
      case "ready":
        return (
          <div className="flex items-center gap-2 text-sm" style={{ color: "#34D399" }}>
            <i className="fa-solid fa-location-dot" />
            Location acquired
          </div>
        );
      case "denied":
        return (
          <div className="flex items-center gap-2 text-sm" style={{ color: "#FBBF24" }}>
            <i className="fa-solid fa-triangle-exclamation" />
            Location access denied
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-2 text-sm" style={{ color: "#EF4444" }}>
            <i className="fa-solid fa-circle-xmark" />
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
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            Nearby Hospitals
          </h1>
          <p className="text-muted">
            Find emergency care and hospital services near you.
          </p>
        </header>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-dim" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") searchHospitals(query);
              }}
              placeholder="Search hospitals by name..."
              className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-colors"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              onFocus={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
              onBlur={(e) => e.currentTarget.style.borderColor = "var(--border)"}
            />
          </div>

          <button
            onClick={() => {
              if (query) searchHospitals(query);
              else if (coords) fetchNearby(coords.lat, coords.lng);
            }}
            className="px-6 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shrink-0"
            style={{ background: "var(--accent)", color: "#fff" }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            <i className="fa-solid fa-magnifying-glass" />
            Search
          </button>

          <button
            onClick={getLocation}
            className="px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shrink-0"
            style={{ border: "1px solid var(--accent)", color: "var(--accent-light)", background: "transparent" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <i className="fa-solid fa-location-crosshairs" />
            Use My Location
          </button>
        </div>

        {statusLabel()}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted">
            <i className="fa-solid fa-bridge-circle-exclamation text-4xl" style={{ color: "var(--accent)" }} />
            <p>Loading hospitals...</p>
          </div>
        ) : hospitals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-dim">
            <i className="fa-solid fa-hospital text-5xl" style={{ color: "var(--text-dim)" }} />
            <p className="text-muted">No hospitals found. Try adjusting your search or location.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hospitals.map((h) => (
              <div
                key={h.id}
                onClick={() => openDirections(h)}
                className="group cursor-pointer rounded-2xl p-5 transition-all duration-200 flex flex-col gap-3 card-hover"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug transition-colors" style={{ color: "var(--text)" }}>
                    {h.name}
                  </h3>
                  {h.distance != null && (
                    <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(20,184,166,0.1)", color: "var(--accent-light)", border: "1px solid rgba(20,184,166,0.2)" }}>
                      {h.distance.toFixed(1)} km
                    </span>
                  )}
                </div>

                <p className="text-sm flex items-start gap-2 text-muted">
                  <i className="fa-solid fa-location-dot mt-0.5 shrink-0 text-dim" />
                  {h.address}
                </p>

                {h.phone && (
                  <p className="text-sm flex items-center gap-2 text-muted">
                    <i className="fa-solid fa-phone shrink-0 text-dim" />
                    {h.phone}
                  </p>
                )}

                {h.services && h.services.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {h.services.slice(0, 4).map((s) => (
                      <span key={s} className="text-[11px] px-2 py-0.5 rounded-full text-dim" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)" }}>
                        {s}
                      </span>
                    ))}
                    {h.services.length > 4 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full text-dim" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)" }}>
                        +{h.services.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-auto pt-2 flex items-center gap-1.5 text-xs transition-colors" style={{ color: "var(--accent-light)" }}>
                  <i className="fa-solid fa-diamond-turn-right" />
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
