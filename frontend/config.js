// ============================================================
// Mendly — Frontend Configuration
// ============================================================
const API_BASE = (() => {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "http://localhost:8002/api";
    }
    // Production — Koyeb backend
    return window.__MENDLY_API_BASE__ || "https://mediguide-backend.koyeb.app/api";
})();
