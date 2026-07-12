// ============================================================
// Mendly — Frontend Configuration
// ============================================================
const API_BASE = (() => {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "http://localhost:8002/api";
    }
    // Set this env var on Vercel: NEXT_PUBLIC_API_URL or use the fallback below
    // For production, set REACT_APP_API_URL or just edit this line:
    return window.location.origin.includes("vercel")
        ? "https://mediguide-backend.onrender.com/api"
        : "https://mediguide-backend.onrender.com/api";
})();
