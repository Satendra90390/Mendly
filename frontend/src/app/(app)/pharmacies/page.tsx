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
        body: JSON.stringify({ query: searchQuery, lat: userLocation.current?.lat || 0, lng: userLocation.current?.lng || 0 }),
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
        background: "var(--bg)",
        backgroundImage: "var(--bg-gradient)",
      }}
    >
      <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Nearby Pharmacies</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Find pharmacies and medical stores near you</p>
      </div>

      <div className="glass-subtle p-4 mb-6">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input type="text" className="input" placeholder="Search pharmacies..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
          </div>
          <button onClick={handleSearch} className="btn btn-primary"><i className="fa-solid fa-magnifying-glass" /> Search</button>
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--text-dim)" }}><i className="fa-solid fa-location-dot text-teal-500" /> {locationStatus}</p>
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
          <i className="fa-solid fa-shop text-3xl mb-3 block" style={{ color: "var(--text-dim)" }} />
          <p style={{ color: "var(--text-muted)" }}>No pharmacies found. Try enabling location or searching by name.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pharmacies.map((p, i) => (
            <div key={i} className="glass-subtle p-5 animate-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(139,92,246,0.1)" }}>
                  <i className="fa-solid fa-store" style={{ color: "#8B5CF6" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm mb-1 truncate">{p.name}</h3>
                  <p className="text-xs mb-1 truncate" style={{ color: "var(--text-muted)" }}><i className="fa-solid fa-location-dot" /> {p.address || "Address not available"}</p>
                  {p.phone && p.phone !== "N/A" && <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}><i className="fa-solid fa-phone" /> {p.phone}</p>}
                  {p.distance != null && <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-1" style={{ background: "rgba(139,92,246,0.1)", color: "#8B5CF6" }}>{p.distance.toFixed(1)} km</span>}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {p.phone && p.phone !== "N/A" && <a href={`tel:${p.phone}`} className="btn btn-ghost text-xs flex-1"><i className="fa-solid fa-phone" /> Call</a>}
                <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.address || p.name)}`)} className="btn btn-primary text-xs flex-1"><i className="fa-solid fa-diamond-turn-right" /> Directions</button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
