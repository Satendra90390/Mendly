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
  >("idle");
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

  const useMyLocation = () => {
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
    useMyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <div className="flex items-center gap-2 text-teal-300 text-sm">
            <i className="fa-solid fa-spinner fa-spin" />
            Getting location...
          </div>
        );
      case "ready":
        return (
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <i className="fa-solid fa-location-dot" />
            Location acquired
          </div>
        );
      case "denied":
        return (
          <div className="flex items-center gap-2 text-amber-400 text-sm">
            <i className="fa-solid fa-triangle-exclamation" />
            Location access denied
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <i className="fa-solid fa-circle-xmark" />
            Geolocation unavailable
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-screen p-4 py-8 md:px-8 lg:px-16"
      style={{
        background: "var(--bg)",
        backgroundImage: "var(--bg-gradient)",
      }}
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Nearby Hospitals
          </h1>
          <p className="text-gray-400">
            Find emergency care and hospital services near you.
          </p>
        </header>

        {/* Location & Search Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") searchHospitals(query);
              }}
              placeholder="Search hospitals by name..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-colors"
            />
          </div>

          <button
            onClick={() => {
              if (query) searchHospitals(query);
              else if (coords) fetchNearby(coords.lat, coords.lng);
            }}
            className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-semibold transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <i className="fa-solid fa-magnifying-glass" />
            Search
          </button>

          <button
            onClick={useMyLocation}
            className="px-6 py-3 rounded-xl border border-teal-400/40 text-teal-300 hover:bg-teal-400/10 transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <i className="fa-solid fa-location-crosshairs" />
            Use My Location
          </button>
        </div>

        {/* Status */}
        {statusLabel()}

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <i className="fa-solid fa-bridge-circle-exclamation text-4xl text-teal-400/60" />
            <p>Loading hospitals...</p>
          </div>
        ) : hospitals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
            <i className="fa-solid fa-hospital text-5xl text-white/10" />
            <p>No hospitals found. Try adjusting your search or location.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hospitals.map((h) => (
              <div
                key={h.id}
                onClick={() => openDirections(h)}
                className="group cursor-pointer rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md p-5 hover:border-teal-400/30 hover:bg-teal-400/[0.04] transition-all duration-200 flex flex-col gap-3"
              >
                {/* Name & Distance */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white leading-snug group-hover:text-teal-300 transition-colors">
                    {h.name}
                  </h3>
                  {h.distance != null && (
                    <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-teal-400/10 text-teal-300 border border-teal-400/20">
                      {h.distance.toFixed(1)} km
                    </span>
                  )}
                </div>

                {/* Address */}
                <p className="text-sm text-gray-400 flex items-start gap-2">
                  <i className="fa-solid fa-location-dot mt-0.5 text-gray-500 shrink-0" />
                  {h.address}
                </p>

                {/* Phone */}
                {h.phone && (
                  <p className="text-sm text-gray-400 flex items-center gap-2">
                    <i className="fa-solid fa-phone text-gray-500 shrink-0" />
                    {h.phone}
                  </p>
                )}

                {/* Services */}
                {h.services && h.services.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {h.services.slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/[0.06] text-gray-400"
                      >
                        {s}
                      </span>
                    ))}
                    {h.services.length > 4 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/[0.06] text-gray-500">
                        +{h.services.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {/* Directions badge */}
                <div className="mt-auto pt-2 flex items-center gap-1.5 text-xs text-teal-400/70 group-hover:text-teal-300 transition-colors">
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