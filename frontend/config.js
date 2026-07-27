// ============================================================
// Mendly — Frontend Configuration
// ============================================================
const API_BASE = (() => {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "http://localhost:8002/api";
    }
    return "https://mendly-backend-0vyg.onrender.com/api";
})();

const API_KEYS = {
    openFda: "ppuCypLAwNIy1JdhHIKVAl1zPxKU2OK35OoGPOI8"
};

window.MENDLY_CONFIG = { API_BASE, API_KEYS };
