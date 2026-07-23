// ============================================================
// Mendly — Frontend Configuration
// ============================================================
const API_BASE = (() => {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "http://localhost:8002/api";
    }
    return window.__MENDLY_API_BASE__ || "https://mendly-backend-0vyg.onrender.com/api";
})();
