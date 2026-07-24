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

const API_KEYS = {
    googleMaps: "AIzaSyBwOhoM_V65Vf1QGpEydoyqpM6hSAGeMKQ",
    openFda: "ppuCypLAwNIy1JdhHIKVAl1zPxKU2OK35OoGPOI8"
};

window.MENDLY_CONFIG = { API_BASE, API_KEYS };
