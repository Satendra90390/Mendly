"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE } from "@/lib/config";

interface Pharmacy {
  name: string;
  address: string;
  phone?: string;
  distance?: number;
  services?: string[];
  lat?: number;
  lng?: number;
}

export default function PharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationStatus, setLocationStatus] = useState("Getting location...");
  const userLocation = useRef<{ lat: number; lng: number } | null>(null);

  const fetchNearby = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/emergency/pharmacies/nearby`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, radius: 25 }),
      });
      const data = await res.json();
      setPharmacies(data.pharmacies || []);
    } catch { setPharmacies([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!navigator.geolocation) { setLocationStatus("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        userLocation.current = loc;
        setLocationStatus("Location active");
        fetchNearby(loc.lat, loc.lng);
      },
      () => { setLocationStatus("Location denied — use search"); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [fetchNearby]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      if (userLocation.current) fetchNearby(userLocation.current.lat, userLocation.current.lng);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/emergency/pharmacies/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          lat: userLocation.current?.lat || 0,
          lng: userLocation.current?.lng || 0,
        }),
      });
      const data = await res.json();
      setPharmacies(data.pharmacies || []);
    } catch { setPharmacies([]); }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen p-4 md:p-8"
      style={{
        backgroundColor: "hsl(var(--background))",
        backgroundImage: "var(--bg-gradient)",
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ color: "hsl(var(--foreground))" }}>
            Nearby Pharmacies
          </h1>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            Find pharmacies and medical stores near you
          </p>
        </div>

        <div className="glass-subtle p-4 mb-6">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                className="input"
                placeholder="Search pharmacies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <button onClick={handleSearch} className="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-middle mr-1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Search
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-500 inline-block align-middle mr-1"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> {locationStatus}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-subtle p-5 animate-pulse">
                <div className="h-5 bg-white/5 rounded w-2/3 mb-3" />
                <div className="h-3 bg-white/5 rounded w-1/2 mb-2" />
                <div className="h-3 bg-white/5 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : pharmacies.length === 0 ? (
          <div className="glass-subtle p-12 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="block mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><path d="M10 20v-4h4v4"/></svg>
            <p style={{ color: "hsl(var(--muted-foreground))" }}>
              No pharmacies found. Try enabling location or searching by name.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pharmacies.map((p, i) => (
              <div key={i} className="glass-subtle p-5 animate-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "hsl(260 90% 66% / 0.1)" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "hsl(260 90% 66%)" }}><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><path d="M10 20v-4h4v4"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1 truncate" style={{ color: "hsl(var(--foreground))" }}>
                      {p.name}
                    </h3>
                    <p className="text-xs mb-1 truncate" style={{ color: "hsl(var(--muted-foreground))" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-middle mr-1"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> {p.address || "Address not available"}
                    </p>
                    {p.phone && p.phone !== "N/A" && (
                      <p className="text-xs mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-middle mr-1"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/></svg> {p.phone}
                      </p>
                    )}
                    {p.distance != null && (
                      <span
                        className="inline-block text-xs px-2 py-0.5 rounded-full mt-1"
                        style={{ background: "hsl(260 90% 66% / 0.1)", color: "hsl(260 90% 66%)" }}
                      >
                        {p.distance.toFixed(1)} km
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {p.phone && p.phone !== "N/A" && (
                    <a href={`tel:${p.phone}`} className="btn btn-ghost text-xs flex-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-middle mr-1"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/></svg> Call
                    </a>
                  )}
                  <button
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.address || p.name)}`
                      )
                    }
                    className="btn btn-primary text-xs flex-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-middle mr-1"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> Directions
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
