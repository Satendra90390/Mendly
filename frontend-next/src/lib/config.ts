export const API_BASE =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8002/api"
    : "https://mendly-backend-0vyg.onrender.com/api";
