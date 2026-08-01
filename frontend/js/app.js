/* ═══════════════════════════════════════════════════
   MENDLY app.js — v2
════════════════════════════════════════════════════ */

const API = location.hostname === "localhost"
  ? "http://localhost:8002/api"
  : "https://mendly-backend-0vyg.onrender.com/api";

let state = { user: null, token: null, theme: "light" };

/* ── Helpers ── */
function apiFetch(path, opts = {}) {
  return fetch(`${API}${path}`, opts).then(r => r.json().catch(() => ({ detail: "Could not reach server. Please check your connection." })));
}
function authFetch(path, opts = {}) {
  const h = new Headers(opts.headers);
  if (state.token) h.set("Authorization", `Bearer ${state.token}`);
  return fetch(`${API}${path}`, { ...opts, headers: h }).then(r => {
    if (r.status === 401) { logout(); throw new Error("Your session has expired. Please sign in again."); }
    return r.json().catch(() => ({ detail: "Could not reach server. Please check your connection." }));
  });
}
/* ── Toast Notifications ── */
function showToast(msg, type = "success") {
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.setAttribute("role", "alert");
  t.setAttribute("aria-live", "assertive");
  const s = document.createElement("span");
  s.textContent = msg;
  t.appendChild(s);
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("toast-show"));
  setTimeout(() => { t.classList.remove("toast-show"); setTimeout(() => t.remove(), 300); }, 2500);
}

function escapeHtml(t) {
  if (t == null) return "";
  return String(t)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function nl2br(t) { return t == null ? "" : String(t).replace(/\n/g, "<br>"); }

/* ── Distance formatting ── */
function formatDistance(km) {
  if (km == null) return "";
  if (km < 1) return Math.round(km * 1000) + " m";
  if (km < 10) return km.toFixed(1) + " km";
  return Math.round(km) + " km";
}

/* ── Simple markdown to HTML for chat ── */
function renderMd(text) {
  if (!text) return "";
  let s = escapeHtml(text);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  s = s.replace(/`(.+?)`/g, "<code>$1</code>");
  s = s.replace(/^### (.+)$/gm, "<h4>$1</h4>");
  s = s.replace(/^## (.+)$/gm, "<h3>$1</h3>");
  s = s.replace(/^# (.+)$/gm, "<h2>$1</h2>");
  s = s.replace(/^- (.+)$/gm, "<li>$1</li>");
  s = s.replace(/((?:^<li>.*<\/li>\n?)+)/gm, "<ul>$1</ul>");
  s = s.replace(/\n/g, "<br>");
  s = s.replace(/(<br>){3,}/g, "<br><br>");
  return s;
}

/* ── Health Vitals (localStorage) ── */
function getVitals() {
  try { return JSON.parse(localStorage.getItem("mendly_vitals")) || []; } catch { return []; }
}
function saveVital(entry) {
  const v = getVitals();
  v.push({ ...entry, ts: Date.now() });
  if (v.length > 200) v.splice(0, v.length - 200);
  try { localStorage.setItem("mendly_vitals", JSON.stringify(v)); }
  catch (e) { console.warn("Could not save vital:", e); }
}
function getLatestVitals() {
  const v = getVitals();
  const latest = {};
  for (const e of v) { latest[e.type] = e; }
  return latest;
}

/* ── Persist ── */
function saveState() {
  try {
    localStorage.setItem("mendly_token", state.token || "");
    localStorage.setItem("mendly_user", state.user ? JSON.stringify(state.user) : "");
    localStorage.setItem("mendly_theme", state.theme);
  } catch (e) { console.warn("Could not save state:", e); }
}
function loadState() {
  state.token = localStorage.getItem("mendly_token") || null;
  try { state.user = JSON.parse(localStorage.getItem("mendly_user")); } catch { state.user = null; }
  state.theme = localStorage.getItem("mendly_theme") || "light";
}
function login(token, user) { state.token = token; state.user = user; saveState(); resetChat(); }
function logout() { state.token = null; state.user = null; saveState(); history.replaceState(null, "", "/"); render(); }

/* ── Theme ── */
function applyTheme() { document.documentElement.classList.toggle("dark", state.theme === "dark"); }
function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  saveState(); applyTheme(); renderHeader();
}

/* ── Logo SVG (medical cross + leaf) ── */
function logoHtml(size = 22) {
  return `<div class="logo-icon-wrap"><svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none">
    <defs><linearGradient id="lg${size}" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
      <stop stop-color="#1a8a7d"/><stop offset="1" stop-color="#0ea5e9"/>
    </linearGradient></defs>
    <rect width="40" height="40" rx="10" fill="url(#lg${size})"/>
    <path d="M20 10 L20 30" stroke="white" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M10 20 L30 20" stroke="white" stroke-width="5.5" stroke-linecap="round"/>
    <circle cx="28" cy="13" r="3.5" fill="rgba(255,255,255,0.35)"/>
    <circle cx="28" cy="13" r="1.8" fill="white"/>
  </svg></div>`;
}

/* ── SVG Icon System ── */
const IC = {
  home:      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  chat:      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>`,
  pill:      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 1.5l-8 8a4.95 4.95 0 0 0 7 7l8-8a4.95 4.95 0 0 0-7-7z"/><path d="M8.5 8.5l7 7"/></svg>`,
  hospital:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/><path d="M10 10h4M12 8v4"/></svg>`,
  pharmacy:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8l4-2"/><path d="M8 10l4 2 4-2"/><path d="M12 12v10"/><path d="M6 22h12"/></svg>`,
  emergency: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v4M12 16h.01"/></svg>`,
  settings:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  logout:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  search:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  bell:      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  heart:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  stethoscope:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>`,
  scale:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M6 7l6-4 6 4M3 14l3-7 3 7M15 14l3-7 3 7"/></svg>`,
  shoe:      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h20M4 18v-4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M8 12V8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"/></svg>`,
  thermometer:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>`,
  sun:       `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  moon:      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  attach:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`,
  send:      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  close:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  menu:      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  directions:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
  info:      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  shield:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  activity:  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  trash:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  chevron:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
};

/* inject logo into footer on page load */
function injectStaticLogos() {
  document.querySelectorAll("#footer-logo-icon, #cta-logo-icon, .cta-logo .logo-icon-wrap").forEach(el => {
    el.innerHTML = `<svg width="20" height="20" viewBox="0 0 40 40" fill="none">
      <defs><linearGradient id="lgf" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stop-color="#1a8a7d"/><stop offset="1" stop-color="#0ea5e9"/>
      </linearGradient></defs>
      <rect width="40" height="40" rx="10" fill="url(#lgf)"/>
      <path d="M20 10 L20 30" stroke="white" stroke-width="5.5" stroke-linecap="round"/>
      <path d="M10 20 L30 20" stroke="white" stroke-width="5.5" stroke-linecap="round"/>
    </svg>`;
  });
}

/* ═══════════════════════════════════════════════════
   ROUTER
════════════════════════════════════════════════════ */
const AUTH_REQUIRED = new Set(["dashboard", "account"]);
const GUEST_ALLOWED = new Set(["landing", "chat", "medicines", "hospitals", "pharmacies", "more", "features", "about", "faq", "how"]);
const LANDING_SECTIONS = new Set(["features", "about", "faq", "how"]);

function navigate(hash, replace) {
  const target = hash || location.hash.slice(1) || (state.user ? "dashboard" : "landing");
  if (replace || !hash) history.replaceState(null, "", `#${target}`);
  else history.pushState(null, "", `#${target}`);
  render();
}

window.addEventListener("hashchange", render);

function toggleFaq(btn) {
  const item = btn.closest(".faq-item");
  if (item) {
    const isOpen = item.classList.toggle("open");
    btn.setAttribute("aria-expanded", isOpen);
  }
}

function closeSidebar() {
  const s = document.getElementById("sidebar");
  const o = document.getElementById("sidebar-overlay");
  s && s.classList.remove("open");
  o && o.classList.remove("visible");
}
function openSidebar() {
  const s = document.getElementById("sidebar");
  const o = document.getElementById("sidebar-overlay");
  s && s.classList.add("open");
  o && o.classList.add("visible");
}

/* ── Render ── */
function render() {
  try {
  destroyMap();
  closeSidebar();
  const am = document.getElementById("auth-modal");
  if (am) am.innerHTML = "";
  applyTheme();
  document.body.classList.toggle("logged-in", !!state.user);
  const route = location.hash.slice(1) || (state.user ? "dashboard" : "landing");

  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));

  if (AUTH_REQUIRED.has(route) && !state.user) {
    const fallback = document.getElementById("view-landing");
    if (fallback) fallback.classList.add("active");
    renderHeader();
    openAuth("signup");
    return;
  }
  if (!GUEST_ALLOWED.has(route) && !state.user) { navigate("landing", true); return; }
  if (state.user && (LANDING_SECTIONS.has(route) || route === "landing")) { navigate("dashboard", true); return; }

  const targetView = LANDING_SECTIONS.has(route) ? "landing" : route;

  if (!document.getElementById(`view-${targetView}`)) {
    navigate(state.user ? "dashboard" : "landing", true);
    return;
  }

  /* sidebar body class —
     dashboard has its own built-in icon sidebar, so aside sidebar only shows on
     other logged-in pages (chat, medicines, hospitals, more, account) */
  if (state.user && targetView !== "dashboard" && targetView !== "landing") {
    document.body.classList.add("has-sidebar");
  } else {
    document.body.classList.remove("has-sidebar");
  }

  renderHeader();
  renderSidebar(targetView);
  const el = document.getElementById(`view-${targetView}`);
  if (el) el.classList.add("active");

  renderMobileNav(targetView);

  switch (targetView) {
    case "landing":   injectStaticLogos(); break;
    case "dashboard": renderDashboard(); fetchLiveWeather(); fetchLiveNews(); renderQuote(); break;
    case "chat":      renderChat(); break;
    case "medicines": renderMedicines(); break;
    case "hospitals": renderHospitals(); break;
    case "pharmacies": renderPharmacies(); break;
    case "more":      renderMore(); break;
    case "account":   renderAccount(); break;
  }

  if (!state.user && LANDING_SECTIONS.has(route)) {
    setTimeout(() => {
      const sec = document.getElementById(route);
      if (sec) sec.scrollIntoView({ behavior: "smooth" });
    }, 60);
  }
  } catch(e) {
    console.error("Render error:", e);
    const fb = document.getElementById("view-landing");
    if (fb) fb.classList.add("active");
    renderHeader();
  }
}

/* ═══════════════════════════════════════════════════
   HEADER
════════════════════════════════════════════════════ */
function renderHeader() {
  const h = document.getElementById("header");
  if (!h) return;
  const route = location.hash.slice(1) || (state.user ? "dashboard" : "landing");

  if (!state.user) {
    const guestLinks = [
      { h: "landing",  l: "Home" },
      { h: "features", l: "Features" },
      { h: "how",      l: "How It Works" },
      { h: "about",    l: "About" },
      { h: "faq",      l: "FAQ" }
    ];
    h.innerHTML = `
      <div class="header-inner">
        <a href="#landing" class="logo">${logoHtml(22)}<span>Mendly</span></a>
        <nav class="header-nav">
          ${guestLinks.map(l => `<a href="#${l.h}" class="${route===l.h ? 'active' : ''}">${l.l}</a>`).join("")}
        </nav>
        <div class="header-actions">
          <button class="theme-btn" onclick="toggleTheme()" aria-label="Toggle theme">${state.theme==="dark" ? IC.sun : IC.moon}</button>
          <button class="btn btn-ghost btn-sm" onclick="openAuth('login')">Log In</button>
          <button class="btn btn-primary btn-sm" onclick="openAuth('signup')">Get Started Free</button>
          <button class="hamb-btn" onclick="toggleMobileDrawer()" aria-label="Menu">${IC.menu}</button>
        </div>
      </div>
      <div id="mobile-drawer" class="mobile-drawer hidden">
        ${guestLinks.map(l => `<a href="#${l.h}" class="${route===l.h ? 'active' : ''}" onclick="closeMobileDrawer()">${l.l}</a>`).join("")}
        <div class="drawer-divider"></div>
        <div class="drawer-btn-row">
          <button class="btn btn-ghost" onclick="openAuth('login');closeMobileDrawer()">Log In</button>
          <button class="btn btn-primary" onclick="openAuth('signup');closeMobileDrawer()">Get Started Free</button>
        </div>
      </div>`;
    return;
  }

  h.innerHTML = "";
}

function toggleMobileDrawer() {
  const d = document.getElementById("mobile-drawer");
  if (d) d.classList.toggle("hidden");
}
function closeMobileDrawer() {
  const d = document.getElementById("mobile-drawer");
  if (d) d.classList.add("hidden");
}

/* ═══════════════════════════════════════════════════
   SIDEBAR (logged-in)
════════════════════════════════════════════════════ */
function renderSidebar(route) {
  const s = document.getElementById("sidebar");
  if (!s) return;
  if (!state.user) {
    s.innerHTML = "";
    s.style.display = "none";
    return;
  }
  s.style.display = "";

  const items = [
    { h: "dashboard", icon: IC.home,     l: "Dashboard" },
    { h: "chat",      icon: IC.chat,     l: "Elix AI" },
    { h: "medicines", icon: IC.pill,     l: "Medicines" },
    { h: "hospitals", icon: IC.hospital,  l: "Nearby" },
    { h: "more",      icon: IC.emergency, l: "Emergency" },
  ];
  const bottomItems = [
    { h: "account", icon: IC.settings, l: "Settings" },
  ];

  s.innerHTML = `
    <button class="sidebar-brand" onclick="navigate('dashboard')" style="border:none;background:none;padding:0;cursor:pointer;font:inherit;text-align:left">
      ${logoHtml(28)}<span>Mendly</span>
    </button>
    <div class="sidebar-divider"></div>
    <div style="flex:1">
      ${items.map(i => `
        <a class="sidebar-item ${route===i.h ? 'active' : ''}" href="#${i.h}" onclick="closeSidebar()" ${route===i.h ? 'aria-current="page"' : ''}>
          <span class="sidebar-icon">${i.icon}</span>${i.l}
        </a>`).join("")}
    </div>
    <div>
      <div class="sidebar-divider"></div>
      ${bottomItems.map(i => `
        <a class="sidebar-item ${route===i.h ? 'active' : ''}" href="#${i.h}" onclick="closeSidebar()" ${route===i.h ? 'aria-current="page"' : ''}>
          <span class="sidebar-icon">${i.icon}</span>${i.l}
        </a>`).join("")}
      <a class="sidebar-item sidebar-logout" href="#" onclick="if(confirm('Log out?')){logout();}">
        <span class="sidebar-icon">${IC.logout}</span>Log Out
      </a>
    </div>`;
}

/* ── Mobile Bottom Nav ── */
function renderMobileNav(route) {
  const m = document.getElementById("mobile-nav");
  if (!m) return;
  if (!state.user) { m.innerHTML = ""; return; }
  const tabs = [
    { h: "dashboard", l: "Home",      i: IC.home },
    { h: "chat",      l: "Elix",      i: IC.chat },
    { h: "medicines", l: "Medicines", i: IC.pill },
    { h: "hospitals", l: "Nearby",    i: IC.hospital },
    { h: "more",      l: "SOS",       i: IC.emergency },
  ];
  m.innerHTML = tabs.map(t => `
    <a href="#${t.h}" class="${route===t.h ? 'active' : ''}" onclick="closeSidebar()" ${route===t.h ? 'aria-current="page"' : ''}>
      <span class="nav-icon">${t.i}</span>${t.l}
    </a>`).join("");
}

/* ═══════════════════════════════════════════════════
   AUTH MODAL
════════════════════════════════════════════════════ */
let authMode = "login";
function openAuth(mode) {
  authMode = mode;
  renderAuthModal();
  document.removeEventListener("keydown", authKeyHandler);
  document.addEventListener("keydown", authKeyHandler);
}
function closeAuth() {
  const el = document.getElementById("auth-modal");
  if (el) el.innerHTML = "";
  document.removeEventListener("keydown", authKeyHandler);
  if (!state.user) {
    const active = document.querySelector(".view.active");
    if (!active) navigate("landing");
  }
}
function authKeyHandler(e) {
  if (e.key === "Escape") { closeAuth(); return; }
  if (e.key === "Tab") {
    const modal = document.querySelector(".modal");
    if (!modal) return;
    const focusable = modal.querySelectorAll('input, button, a, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

function renderAuthModal() {
  const el = document.getElementById("auth-modal");
  if (!el) return;
  el.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeAuth()">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2 class="modal-title">${authMode === "login" ? "Welcome Back" : "Create Account"}</h2>
          <button class="modal-close" onclick="closeAuth()" aria-label="Close" type="button">✕</button>
        </div>
        <div id="auth-error" class="form-error hidden"></div>
        ${authMode === "signup" ? `<div class="form-group"><input id="auth-name" class="form-input" placeholder="Full Name" autocomplete="name" /></div>` : ""}
        <div class="form-group"><input id="auth-email" class="form-input" type="email" placeholder="Email address" autocomplete="email" /></div>
        <div class="form-group"><input id="auth-pass" class="form-input" type="password" placeholder="Password (min 6 characters)" minlength="6" autocomplete="${authMode==="login"?"current":"new"}-password" /></div>
        <button id="auth-submit" class="form-submit" onclick="submitAuth()" type="button">
          ${authMode === "login" ? "Sign In" : "Create Account"}
        </button>
        <div class="form-switch">
          ${authMode === "login"
            ? `Don't have an account? <a onclick="authMode='signup';renderAuthModal()">Sign up free</a>`
            : `Already have an account? <a onclick="authMode='login';renderAuthModal()">Sign in</a>`}
        </div>
      </div>
    </div>`;
  setTimeout(() => {
    const first = document.getElementById(authMode === "signup" ? "auth-name" : "auth-email");
    if (first) first.focus();
  }, 80);
}

async function submitAuth() {
  const email = document.getElementById("auth-email")?.value?.trim();
  const pass  = document.getElementById("auth-pass")?.value;
  const name  = document.getElementById("auth-name")?.value?.trim();
  const errEl = document.getElementById("auth-error");
  if (!errEl) return;
  errEl.classList.add("hidden"); errEl.textContent = "";
  if (!email || !pass) { errEl.textContent = "Please fill in all fields."; errEl.classList.remove("hidden"); return; }
  if (authMode === "signup" && pass.length < 6) { errEl.textContent = "Password needs at least 6 characters."; errEl.classList.remove("hidden"); return; }
  const btn = document.getElementById("auth-submit");
  if (btn) { btn.disabled = true; btn.textContent = authMode === "login" ? "Signing in..." : "Creating account..."; }
  try {
    const body = authMode === "login"
      ? { email, password: pass }
      : { name: name || email.split("@")[0], email, password: pass };
    const res = await fetch(`${API}/auth/${authMode === "login" ? "login" : "signup"}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      let msg = data.detail || "Something went wrong. Please try again.";
      if (Array.isArray(msg)) msg = msg.map(e => e.msg || e.loc?.join(" ") || "Invalid input").join(". ");
      errEl.textContent = msg;
      errEl.classList.remove("hidden");
      return;
    }
    login(data.access_token, data.user); closeAuth(); navigate("dashboard");
  } catch(e) { console.error("submitAuth error:", e); errEl.textContent = "Could not connect to server. Check your internet and try again."; errEl.classList.remove("hidden"); }
  finally {
    if (btn) { btn.disabled = false; btn.textContent = authMode === "login" ? "Sign In" : "Create Account"; }
  }
}

/* ═══════════════════════════════════════════════════
   DASHBOARD — Health Overview mockup
════════════════════════════════════════════════════ */

const HEALTH_NEWS = [
  { title: "WHO: Global mental health crisis worsening", tag: "Global Health", color: "var(--danger)" },
  { title: "Study: 7+ hours of sleep boosts immunity by 40%", tag: "Research", color: "var(--primary)" },
  { title: "New guidelines for managing Type 2 diabetes released", tag: "Guidelines", color: "var(--accent)" },
  { title: "Walking 8000 steps daily cuts heart disease risk by 50%", tag: "Fitness", color: "#8b5cf6" },
  { title: "Gut microbiome linked to depression and anxiety", tag: "Mental Health", color: "#f59e0b" },
  { title: "Flu season early warning: Vaccination recommended now", tag: "Prevention", color: "var(--danger)" },
];

const WEATHER_TIPS = {
  hot:  { title: "Hot Weather",  tips: ["Drink extra water — heat dehydrates you fast", "Wear light, loose clothing in cotton or linen", "Avoid outdoor exercise between 11am-3pm", "Eat water-rich foods: watermelon, cucumber, oranges", "Keep curtains closed during peak sun hours"], food: ["Watermelon, cucumber, coconut water", "Salads with leafy greens and citrus dressing", "Cold soups like gazpacho or chilled cucumber soup"] },
  cold: { title: "Cold Weather", tips: ["Layer clothing — base layer wicks sweat, outer layer blocks wind", "Hot soups and warm fluids keep your body temperature up", "Cover your head and hands — you lose heat fastest there", "Indoor stretching or yoga is great when it's freezing outside", "Eat warm, hearty meals: oatmeal, stews, root vegetables"], food: ["Hot oatmeal with nuts and honey", "Chicken or vegetable soup with ginger", "Root vegetable stews with sweet potato and carrots"] },
  mild: { title: "Pleasant Weather", tips: ["Perfect for outdoor walks — aim for 30 minutes", "Open windows for fresh air circulation", "Try outdoor exercise: jogging, cycling, or yoga in the park", "Eat seasonal fruits — they're fresher and more nutritious", "Stay active — mild weather is ideal for movement"], food: ["Fresh seasonal fruits and berries", "Grilled vegetables with olive oil", "Light grain bowls with fresh herbs"] },
};

function getWeatherCategory() {
  const month = new Date().getMonth();
  if (month >= 4 && month <= 8) return "hot";
  if (month >= 10 || month <= 2) return "cold";
  return "mild";
}

/* ── Weather Unit State ── */
let weatherUnit = "fahrenheit";
let weatherData = null;

function getWeatherIcon(code) {
  if (code == null) return "☀️";
  if (code <= 1) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 49) return "🌫️";
  if (code <= 59) return "🌦️";
  if (code <= 69) return "🌧️";
  if (code <= 79) return "🌨️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "❄️";
  if (code <= 99) return "⛈️";
  return "🌤️";
}
function getWeatherDesc(code) {
  if (code == null) return "Unknown";
  if (code <= 0) return "Clear Sky";
  if (code <= 1) return "Mainly Clear";
  if (code <= 3) return "Partly Cloudy";
  if (code <= 49) return "Foggy";
  if (code <= 59) return "Drizzle";
  if (code <= 69) return "Rain";
  if (code <= 79) return "Snow";
  if (code <= 82) return "Rain Showers";
  if (code <= 86) return "Snow Showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
}
function convertTemp(celsiusF) {
  if (weatherUnit === "celsius") return Math.round(celsiusF);
  return Math.round(celsiusF * 9/5 + 32);
}
function unitLabel() { return weatherUnit === "celsius" ? "°C" : "°F"; }
function toggleWeatherUnit(u) {
  weatherUnit = u;
  renderWeatherWidget();
}

function renderWeatherWidget() {
  const el = document.getElementById("dash-weather-content");
  if (!el || !weatherData) return;
  const c = weatherData.current;
  const hourly = weatherData.hourly;
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const code = c.weather_code || 0;
  const temp = convertTemp(c.temperature_2m);
  const feelsLike = c.apparent_temperature != null ? convertTemp(c.apparent_temperature) : null;
  const humidity = c.relative_humidity_2m;
  const wind = c.wind_speed_10m != null ? Math.round(c.wind_speed_10m) : null;
  const windDir = c.wind_direction_10m;
  const uvIndex = c.uv_index;
  const visibility = c.visibility;

  // Build hourly forecast (next 12 hours)
  let hourlyHtml = "";
  if (hourly && hourly.time) {
    const currentHour = now.getHours();
    const items = [];
    for (let i = 0; i < hourly.time.length && items.length < 12; i++) {
      const h = new Date(hourly.time[i]);
      if (h <= now) continue;
      items.push({
        time: h.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
        temp: convertTemp(hourly.temperature_2m[i]),
        code: hourly.weather_code[i],
      });
    }
    hourlyHtml = items.map(h => `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;min-width:52px">
        <span style="font-size:11px;color:var(--muted)">${h.time}</span>
        <span style="font-size:20px">${getWeatherIcon(h.code)}</span>
        <span style="font-size:13px;font-weight:700;color:var(--fg)">${h.temp}°</span>
      </div>`).join("");
  }

  // Build daily forecast (next 7 days)
  let dailyHtml = "";
  if (weatherData.daily && weatherData.daily.time) {
    const days = weatherData.daily;
    dailyHtml = days.time.slice(0, 7).map((d, i) => {
      const dayDate = new Date(d + "T00:00:00");
      const dayName = i === 0 ? "Today" : dayDate.toLocaleDateString("en-US", { weekday: "short" });
      const hi = convertTemp(days.temperature_2m_max[i]);
      const lo = convertTemp(days.temperature_2m_min[i]);
      const code = days.weather_code[i];
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:13px;font-weight:600;width:50px;color:var(--fg)">${dayName}</span>
          <span style="font-size:18px;width:28px;text-align:center">${getWeatherIcon(code)}</span>
          <span style="flex:1;font-size:12px;color:var(--muted)">${getWeatherDesc(code)}</span>
          <span style="font-size:13px;font-weight:600;color:var(--fg)">${hi}°</span>
          <span style="font-size:13px;color:var(--muted)">${lo}°</span>
        </div>`;
    }).join("");
  }

  // Build mini temperature graph (SVG)
  let graphHtml = "";
  if (hourly && hourly.time) {
    const now2 = new Date();
    const temps = [];
    for (let i = 0; i < hourly.time.length && temps.length < 24; i++) {
      const h = new Date(hourly.time[i]);
      if (h <= now2) continue;
      temps.push(convertTemp(hourly.temperature_2m[i]));
    }
    if (temps.length > 1) {
      const min = Math.min(...temps);
      const max = Math.max(...temps);
      const range = max - min || 1;
      const w = 100;
      const h = 40;
      const points = temps.map((t, i) => {
        const x = (i / (temps.length - 1)) * w;
        const y = h - ((t - min) / range) * (h - 8) - 4;
        return `${x},${y}`;
      }).join(" ");
      const areaPoints = `0,${h} ${points} ${w},${h}`;
      graphHtml = `
        <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:60px;margin:8px 0" preserveAspectRatio="none">
          <defs>
            <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.02"/>
            </linearGradient>
          </defs>
          <polygon points="${areaPoints}" fill="url(#tempGrad)" />
          <polyline points="${points}" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          ${temps.map((t, i) => {
            const x = (i / (temps.length - 1)) * w;
            const y = h - ((t - min) / range) * (h - 8) - 4;
            return `<circle cx="${x}" cy="${y}" r="1.5" fill="var(--primary)" opacity="0.6"/>`;
          }).join("")}
        </svg>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted)">
          <span>${min}°</span><span>${Math.round((min+max)/2)}°</span><span>${max}°</span>
        </div>`;
    }
  }

  el.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:48px;line-height:1">${getWeatherIcon(code)}</span>
          <span style="font-size:42px;font-weight:800;color:var(--fg);line-height:1">${temp}<span style="font-size:20px;font-weight:600">${unitLabel()}</span></span>
        </div>
        <div style="font-size:15px;font-weight:600;color:var(--fg);margin-bottom:2px">${getWeatherDesc(code)}</div>
        ${feelsLike != null ? `<div style="font-size:13px;color:var(--muted)">Feels like ${feelsLike}${unitLabel()}</div>` : ""}
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;font-weight:600;color:var(--fg)">${dateStr}</div>
        <div style="font-size:12px;color:var(--muted)">${timeStr}</div>
      </div>
    </div>
    <div style="display:flex;gap:2px;margin:12px 0;background:var(--bg);border-radius:999px;padding:3px;width:fit-content">
      <button onclick="toggleWeatherUnit('fahrenheit')" style="padding:5px 14px;border-radius:999px;font-size:12px;font-weight:700;border:none;cursor:pointer;transition:all 0.2s;background:${weatherUnit==='fahrenheit'?'var(--primary)':'transparent'};color:${weatherUnit==='fahrenheit'?'#fff':'var(--muted)'}">°F</button>
      <button onclick="toggleWeatherUnit('celsius')" style="padding:5px 14px;border-radius:999px;font-size:12px;font-weight:700;border:none;cursor:pointer;transition:all 0.2s;background:${weatherUnit==='celsius'?'var(--primary)':'transparent'};color:${weatherUnit==='celsius'?'#fff':'var(--muted)'}">°C</button>
    </div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin:8px 0 12px">
      ${humidity != null ? `<div style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--muted)">${IC.thermometer} <b>${humidity}%</b> Humidity</div>` : ""}
      ${wind != null ? `<div style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--muted)">💨 <b>${wind} mph</b> Wind</div>` : ""}
      ${uvIndex != null ? `<div style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--muted)">☀️ UV <b>${Math.round(uvIndex)}</b></div>` : ""}
    </div>
    ${graphHtml}
    ${hourlyHtml ? `<div style="border-top:1px solid var(--border);padding-top:12px;margin-top:8px"><div style="font-size:12px;font-weight:700;color:var(--fg);margin-bottom:8px">Hourly Forecast</div><div style="display:flex;gap:4px;overflow-x:auto;padding-bottom:4px">${hourlyHtml}</div></div>` : ""}
    ${dailyHtml ? `<div style="border-top:1px solid var(--border);padding-top:12px;margin-top:12px"><div style="font-size:12px;font-weight:700;color:var(--fg);margin-bottom:8px">7-Day Forecast</div>${dailyHtml}</div>` : ""}`;
}

async function fetchLiveWeather() {
  const el = document.getElementById("dash-weather-content");
  if (!el) return;
  try {
    const pos = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error("no geo")); return; }
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
    });
    const lat = pos.coords.latitude, lng = pos.coords.longitude;
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,uv_index,visibility&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=celsius&timezone=auto&forecast_days=7`);
    const d = await r.json();
    if (!d.current || d.current.temperature_2m == null) { el.innerHTML = `<span style="font-size:13px">Weather data unavailable</span>`; return; }
    weatherData = d;
    renderWeatherWidget();
  } catch(e) {
    el.innerHTML = `<span style="font-size:13px">Enable location for live weather</span>`;
  }
}

function renderDashboard() {
  const weather = WEATHER_TIPS[getWeatherCategory()];
  const memberSince = state.user?.created_at
    ? new Date(state.user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "Recent";
  const initials = (state.user?.name || state.user?.email || "U").charAt(0).toUpperCase();
  const displayName = (state.user?.name || "User").split(" ").slice(0, 2).join(" ");

  const quickActions = [
    { icon: IC.chat,     label: "Elix AI",    hash: "chat",      color: "rgba(26,138,125,0.12)", iconColor: "var(--primary)" },
    { icon: IC.pill,     label: "Medicines",  hash: "medicines", color: "rgba(14,165,233,0.12)", iconColor: "var(--accent)" },
    { icon: IC.hospital,  label: "Hospitals",  hash: "hospitals", color: "rgba(245,158,11,0.12)", iconColor: "#f59e0b" },
    { icon: IC.emergency, label: "Emergency",  hash: "more",      color: "rgba(239,68,68,0.12)",  iconColor: "var(--danger)" },
  ];

  const dashEl = document.getElementById("view-dashboard");
  if (!dashEl) return;
  dashEl.innerHTML = `
  <div class="dash-layout">
    <div class="dash-sidebar">
      <div class="dash-sidebar-logo" onclick="navigate('dashboard')">${logoHtml(30)}</div>
      <button class="dash-sidebar-btn active" onclick="navigate('dashboard')" title="Dashboard" aria-label="Dashboard">${IC.home}</button>
      <button class="dash-sidebar-btn" onclick="navigate('chat')" title="Elix AI" aria-label="Elix AI">${IC.chat}</button>
      <button class="dash-sidebar-btn" onclick="navigate('medicines')" title="Medicines" aria-label="Medicines">${IC.pill}</button>
      <button class="dash-sidebar-btn" onclick="navigate('hospitals')" title="Hospitals" aria-label="Hospitals">${IC.hospital}</button>
      <div style="margin-top:auto">
        <button class="dash-sidebar-btn" onclick="navigate('account')" title="Settings" aria-label="Settings">${IC.settings}</button>
      </div>
    </div>

    <div class="dash-main">
      <div class="dash-main-inner">
      <div class="dash-topbar">
        <div class="dash-search">
          <span class="dash-search-icon">${IC.search}</span>
          <input type="text" placeholder="Search medicines..." onkeydown="if(event.key==='Enter'){const v=this.value.trim();navigate('medicines');if(v)setTimeout(()=>{const el=document.getElementById('med-search');if(el){el.value=v;searchMedicines();}},100);}" />
        </div>
        <div class="dash-topbar-right">
          <button class="dash-notif" aria-label="Notifications" title="Notifications" onclick="showToast('No new notifications','info')" style="border:none;background:none;padding:0;cursor:pointer;font:inherit">${IC.bell}</button>
          <button class="dash-user-chip" onclick="navigate('account')" style="border:none;background:none;padding:0;cursor:pointer;font:inherit;text-align:left">
            <div class="chip-avatar">${initials}</div>
            <span>${escapeHtml(displayName)}</span>
            <span class="chip-caret">▾</span>
          </div>
        </div>
      </div>

      <div class="dash-quick-grid">
        ${quickActions.map(c => `
          <button class="dash-quick-card" onclick="navigate('${c.hash}')">
            <div class="dash-quick-icon" style="background:${c.color};color:${c.iconColor}">${c.icon}</div>
            <div class="dash-quick-label">${c.label}</div>
          </button>`).join("")}
      </div>

      <div class="dash-content-grid">
        <!-- Left Column -->
        <div class="dash-content-left">
          <!-- Weather Now -->
          <div class="dash-stat-card" id="dash-weather-info">
            <div class="dash-stat-title"><span style="display:flex;align-items:center;gap:8px;color:#f59e0b">${IC.sun} Weather Now</span></div>
            <div id="dash-weather-content" style="color:var(--muted);font-size:13px">Loading weather...</div>
          </div>

          <!-- Weather Tips -->
          <div class="dash-stat-card">
            <div class="dash-stat-title"><span style="display:flex;align-items:center;gap:8px;color:#f59e0b">${IC.sun} ${weather.title} Tips</span></div>
            <ul class="dash-health-list">
              ${weather.tips.map(t => `<li>${t}</li>`).join("")}
            </ul>
          </div>

          <!-- What to Eat -->
          <div class="dash-stat-card">
            <div class="dash-stat-title"><span style="display:flex;align-items:center;gap:8px;color:var(--primary)">${IC.pill} What to Eat Today</span></div>
            <ul class="dash-health-list">
              ${weather.food.map(f => `<li>${f}</li>`).join("")}
            </ul>
          </div>
        </div>

        <!-- Right Column -->
        <div class="dash-content-right">
          <!-- Live Health News (fetched) -->
          <div class="dash-stat-card" id="dash-live-news">
            <div class="dash-stat-title"><span style="display:flex;align-items:center;gap:8px">${IC.info} Live Health News</span></div>
            <div id="live-news-content" style="font-size:13px;color:var(--muted)">Loading latest news...</div>
          </div>

          <!-- Health News -->
          <div class="dash-stat-card">
            <div class="dash-stat-title"><span style="display:flex;align-items:center;gap:8px">${IC.chat} Health News</span></div>
            <div class="dash-health-news">
              ${HEALTH_NEWS.map(n => `
                <div class="dash-news-item">
                  <span class="dash-news-tag" style="color:${n.color}">${n.tag}</span>
                  <div class="dash-news-title">${n.title}</div>
                </div>`).join("")}
            </div>
          </div>

          <!-- Daily Health Tip -->
          <div class="dash-stat-card">
            <div class="dash-stat-title"><span style="display:flex;align-items:center;gap:8px;color:var(--primary)">${IC.shield} Daily Health Tip</span></div>
            <ul class="dash-health-list">
              <li>Drink at least 8 glasses of water daily</li>
              <li>Aim for 7-9 hours of sleep each night</li>
              <li>Take short walking breaks every hour</li>
              <li>Include fruits and vegetables in every meal</li>
              <li>Practice deep breathing for 5 minutes daily</li>
            </ul>
          </div>

          <!-- Member Since -->
          <div class="dash-stat-card" style="text-align:center">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--primary);margin-bottom:4px">Member Since</div>
            <div style="font-size:16px;font-weight:800;font-family:var(--font-display);color:var(--fg)">${memberSince}</div>
          </div>

          <!-- Quote of the Day -->
          <div class="dash-stat-card" style="background:var(--gradient);border:none;color:#fff;text-align:center">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;opacity:0.7;margin-bottom:10px">Quote of the Day</div>
            <div id="dash-quote-text" style="font-size:15px;font-weight:600;line-height:1.5;font-style:italic;margin-bottom:8px"></div>
            <div id="dash-quote-author" style="font-size:12px;opacity:0.7"></div>
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>`;
}

/* ── Live News Feed ── */
const HEALTH_RSS_FEEDS = [
  { url: "https://api.rss2json.com/v1/api.json?rss_url=https://www.who.int/rss-feeds/news-english.xml", tag: "WHO", color: "var(--danger)" },
  { url: "https://api.rss2json.com/v1/api.json?rss_url=https://www.medicalnewstoday.com/newsrss", tag: "Medical News", color: "var(--primary)" },
];

async function fetchLiveNews() {
  const el = document.getElementById("live-news-content");
  if (!el) return;
  try {
    const results = [];
    for (const feed of HEALTH_RSS_FEEDS) {
      try {
        const r = await fetch(feed.url, { signal: AbortSignal.timeout(5000) });
        const d = await r.json();
        if (d.items) {
          d.items.slice(0, 3).forEach(item => {
            results.push({ title: item.title, link: item.link, pubDate: item.pubDate, tag: feed.tag, color: feed.color });
          });
        }
      } catch(e) { /* skip failed feed */ }
    }
    if (!results.length) { el.innerHTML = `<span>Latest health news will appear here</span>`; return; }
    results.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    el.innerHTML = results.slice(0, 5).map(n => {
      const timeAgo = getTimeAgo(n.pubDate);
      return `<a href="${n.link}" target="_blank" rel="noopener" style="display:block;padding:8px 0;border-bottom:1px solid var(--border);text-decoration:none;color:inherit;transition:opacity 0.2s" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:${n.color}">${n.tag}</span>
          <span style="font-size:10px;color:var(--muted-2)">${timeAgo}</span>
        </div>
        <div style="font-size:13px;font-weight:600;color:var(--fg);line-height:1.4">${escapeHtml(n.title)}</div>
      </a>`;
    }).join("");
  } catch(e) {
    el.innerHTML = `<span>Unable to load live news</span>`;
  }
}

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ── Quote of the Day ── */
const HEALTH_QUOTES = [
  { text: "The greatest wealth is health.", author: "Virgil" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Health is not valued till sickness comes.", author: "Thomas Fuller" },
  { text: "A healthy outside starts from the inside.", author: "Robert Urich" },
  { text: "The first wealth is health.", author: "Ralph Waldo Emerson" },
  { text: "Happiness is nothing more than good health and a bad memory.", author: "Albert Schweitzer" },
  { text: "He who has health has hope; and he who has hope has everything.", author: "Thomas Carlyle" },
  { text: "To keep the body in good health is a duty, otherwise we shall not be able to keep our mind strong and clear.", author: "Buddha" },
  { text: "Let food be thy medicine and medicine be thy food.", author: "Hippocrates" },
  { text: "Good health is not something we can buy. However, it can be an extremely valuable savings account.", author: "Anne Wilson Schaef" },
  { text: "Your body hears everything your mind says.", author: "Naomi Judd" },
  { text: "Health is a state of complete harmony of the body, mind, and spirit.", author: "B.K.S. Iyengar" },
  { text: "The human body is the best picture of the human soul.", author: "Tony Robbins" },
  { text: "When the heart is at ease, the body is healthy.", author: "Chinese Proverb" },
  { text: "An ounce of prevention is worth a pound of cure.", author: "Benjamin Franklin" },
  { text: "Early to bed and early to rise makes a man healthy, wealthy, and wise.", author: "Benjamin Franklin" },
  { text: "Movement is a medicine for creating change in a person's physical, emotional, and mental states.", author: "Carol Welch" },
  { text: "Water is the driving force of all nature.", author: "Leonardo da Vinci" },
  { text: "Sleep is the best meditation.", author: "Dalai Lama" },
  { text: "The mind and body are not separate. What affects one, affects the other.", author: "Anonymous" },
];

function renderQuote() {
  const el = document.getElementById("dash-quote-text");
  const authorEl = document.getElementById("dash-quote-author");
  if (!el || !authorEl) return;
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const q = HEALTH_QUOTES[dayOfYear % HEALTH_QUOTES.length];
  el.textContent = `"${q.text}"`;
  authorEl.textContent = `— ${q.author}`;
}

function renderVitalsLog() {
  const vitals = getVitals().slice(-10).reverse();
  if (!vitals.length) return '<div class="empty-state" style="padding:20px"><p style="font-size:13px;color:var(--muted)">No vitals logged yet. Use the form above to start tracking.</p></div>';
  const icons = { heart_rate: IC.heart, bp_sys: IC.stethoscope, bp_dia: IC.stethoscope, weight: IC.scale, steps: IC.shoe, temperature: IC.thermometer };
  const iconColors = { heart_rate: "var(--danger)", bp_sys: "var(--accent)", bp_dia: "var(--accent)", weight: "var(--primary)", steps: "#8b5cf6", temperature: "#f59e0b" };
  const labels = { heart_rate: "Heart Rate", bp_sys: "BP Systolic", bp_dia: "BP Diastolic", weight: "Weight", steps: "Steps", temperature: "Temperature" };
  return vitals.map(v => `
    <div class="vital-log-item">
      <span style="color:${iconColors[v.type] || 'var(--muted)'}">${icons[v.type] || IC.activity}</span>
      <div><div class="vital-log-label">${labels[v.type] || v.type}</div><div class="vital-log-time">${new Date(v.ts).toLocaleString()}</div></div>
      <div class="vital-log-val">${v.value} ${v.unit}</div>
    </div>`).join("");
}

function logVital(type, inputId, unit) {
  const el = document.getElementById(inputId);
  if (!el) return;
  const val = parseFloat(el.value);
  const labels = { heart_rate: "Heart Rate", bp_sys: "Blood Pressure", temperature: "Temperature", weight: "Weight", steps: "Steps" };
  if (isNaN(val) || val <= 0) { el.focus(); showToast(`Please enter a valid ${labels[type] || "number"}`, "error"); return; }
  saveVital({ type, value: val, unit });
  el.value = "";
  showToast(`${labels[type] || "Value"} saved!`);
  renderDashboard();
  fetchLiveWeather();
}

function logBp() {
  const sys = document.getElementById("v-sys");
  const dia = document.getElementById("v-dia");
  if (!sys || !dia) return;
  const s = parseFloat(sys.value), d = parseFloat(dia.value);
  if (isNaN(s) || isNaN(d) || s <= 0 || d <= 0) { showToast("Please enter both systolic and diastolic values", "error"); return; }
  saveVital({ type: "bp_sys", value: s, unit: "mmHg" });
  saveVital({ type: "bp_dia", value: d, unit: "mmHg" });
  sys.value = ""; dia.value = "";
  showToast("Blood pressure saved!");
  renderDashboard();
  fetchLiveWeather();
}

/* ═══════════════════════════════════════════════════
   CHAT
════════════════════════════════════════════════════ */
let chatMsgs = [{ role: "bot", content: "Hi! I'm Elix, your personal health companion. Ask me anything about symptoms, medicines, or wellness — I'm here to help." }];
let chatLoading = false;
let chatFiles = [];

function resetChat() {
  chatMsgs = [{ role: "bot", content: "Hi! I'm Elix, your personal health companion. Ask me anything about symptoms, medicines, or wellness — I'm here to help." }];
  chatFiles = [];
  chatLoading = false;
}

async function clearChatHistory() {
  if (!confirm("Clear all messages in this chat? This cannot be undone.")) return;
  if (state.user && state.token) {
    try {
      await fetch(`${API}/chat/history`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${state.token}` },
      });
    } catch(e) { console.error("Failed to clear server history:", e); }
  }
  resetChat();
  renderChat();
}

const CHAT_PROMPTS = [
  "What are the side effects of lisinopril?",
  "Find a pharmacy near downtown",
  "What is the difference between ibuprofen and naproxen?",
  "Drug interactions with metformin and alcohol",
  "How should I store my blood pressure medication?",
  "What are the warning signs of dehydration?",
];

function renderChat() {
  const isGuest = !state.user;
  const guestBanner = isGuest ? `
    <div class="guest-banner">
      <span style="font-weight:600">You're chatting as a guest.</span>
      <button class="btn btn-primary btn-sm" onclick="openAuth('signup')">Create Account</button>
      <span style="color:var(--muted);font-size:12px">Sign up to save chats &amp; upload files</span>
    </div>` : "";

  const msgs = chatMsgs.map(m => `
    <div class="chat-msg ${m.role === "user" ? "chat-user" : "chat-bot"}">
      ${m.role === "bot" ? '<div class="chat-bot-label">Elix AI</div>' : ""}
      <div class="chat-msg-text">${m.role === "bot" ? renderMd(m.content) : nl2br(escapeHtml(m.content))}</div>
      ${m.files?.length ? `<div class="chat-files">${m.files.map(f => `<span class="chat-file-badge">📎 ${escapeHtml(f.name)}</span>`).join("")}</div>` : ""}
    </div>`).join("");

  const typing = chatLoading
    ? '<div class="chat-msg chat-bot"><div class="chat-bot-label">Elix AI</div><div class="typing-dots"><span></span><span></span><span></span></div><div class="thinking-text">Thinking...</div></div>'
    : "";

  const prompts = chatMsgs.length <= 1 && !chatLoading
    ? `<div class="chat-prompts">${CHAT_PROMPTS.map((p, i) =>
        `<button class="chat-prompt" onclick="setChatPrompt(${i})">${escapeHtml(p)}</button>`
      ).join("")}</div>`
    : "";

  const filePreview = chatFiles.length
    ? `<div class="chat-file-preview">${chatFiles.map((f, i) =>
        `<span class="chat-file-tag">📎 ${escapeHtml(f.name)} <button onclick="removeChatFile(${i})">✕</button></span>`
      ).join("")}</div>`
    : "";

  const chatEl = document.getElementById("view-chat");
  if (!chatEl) return;
  const prevText = document.getElementById("chat-input")?.value || "";
  chatEl.innerHTML = `
    <div class="chat-wrap">
      ${guestBanner}
      <div class="chat-header-bar">
        <div class="chat-header-left">
          <div class="chat-header-avatar">${IC.chat}</div>
          <div>
            <div class="chat-header-name">Elix AI</div>
            <div class="chat-header-status">${chatMsgs.length <= 1 ? "New conversation" : chatMsgs.length + " messages"}</div>
          </div>
        </div>
        <button class="chat-clear-btn" onclick="clearChatHistory()" title="Clear chat history">${IC.trash} Clear</button>
      </div>
      <div class="chat-msgs" id="chat-msgs" role="log" aria-live="polite" aria-label="Chat messages">${msgs}${typing}${prompts}</div>
      ${filePreview}
      <div class="chat-input-bar">
        <button class="chat-attach" onclick="triggerChatUpload()" title="Attach file" aria-label="Attach file" ${isGuest ? "disabled" : ""}>${IC.attach}</button>
        <input type="file" id="chat-file-input" multiple accept="image/*,.pdf,.txt,.doc,.docx" style="display:none" onchange="handleChatFiles(this.files)" />
        <textarea id="chat-input" class="chat-textarea" rows="1"
          placeholder="${isGuest ? "Ask Elix about your health, symptoms, or medications..." : "Ask about symptoms, medicines, drug interactions, and more..."}"
          oninput="autoResize(this)"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChat();}"
          ${chatLoading ? "disabled" : ""}></textarea>
        <button class="chat-send" id="chat-send" onclick="sendChat()" aria-label="Send message" ${chatLoading ? "disabled" : ""}>${IC.send}</button>
      </div>
    </div>`;

  const msgsEl = document.getElementById("chat-msgs");
  requestAnimationFrame(() => { if (msgsEl) msgsEl.scrollTo({ top: msgsEl.scrollHeight, behavior: "smooth" }); });
  const inp = document.getElementById("chat-input");
  if (inp) {
    if (prevText) { inp.value = prevText; autoResize(inp); }
    if (!chatLoading) inp.focus();
  }
}

function triggerChatUpload() {
  if (!state.user) { openAuth("signup"); return; }
  const fi = document.getElementById("chat-file-input");
  if (fi) fi.click();
}
function handleChatFiles(fileList) {
  if (!state.user) { openAuth("signup"); return; }
  for (const f of fileList) {
    if (f.size > 10 * 1024 * 1024) { showToast(`${f.name} is too large (max 10MB)`, "error"); continue; }
    chatFiles.push(f);
  }
  const fi = document.getElementById("chat-file-input");
  if (fi) fi.value = "";
  renderChat();
}
function removeChatFile(idx) { chatFiles.splice(idx, 1); renderChat(); }
function setChatPrompt(idx) {
  const inp = document.getElementById("chat-input");
  if (inp) { inp.value = CHAT_PROMPTS[idx] || ""; inp.focus(); autoResize(inp); }
}
function autoResize(el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; }

async function sendChat() {
  const inp = document.getElementById("chat-input");
  if (!inp) return;
  const text = inp.value.trim();
  if ((!text && !chatFiles.length) || chatLoading) return;
  const files = [...chatFiles];
  chatFiles = [];
  chatMsgs.push({ role: "user", content: text || "(file attached)", files: files.length ? files.map(f => ({ name: f.name })) : undefined });
  inp.value = ""; chatLoading = true; renderChat();
  let responded = false;
  const safetyTimer = setTimeout(() => { if (chatLoading && !responded) { responded = true; chatMsgs.push({ role: "bot", content: "The request is taking longer than expected. Please try again." }); chatLoading = false; renderChat(); } }, 60000);
  try {
    const history = chatMsgs.slice(-20).map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));
    if (files.length) {
      if (!state.user) { openAuth("signup"); chatLoading = false; chatFiles = files; renderChat(); clearTimeout(safetyTimer); return; }
      const fd = new FormData();
      fd.append("message", text || "Reviewing attached file.");
      fd.append("history", JSON.stringify(history));
      files.forEach(f => fd.append("files", f));
      const res = await fetch(`${API}/chat/upload`, {
        method: "POST",
        headers: state.token ? { Authorization: `Bearer ${state.token}` } : {},
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!responded) chatMsgs.push({ role: "bot", content: res.ok ? (data.response || data.reply || "I've processed your file. Here's what I found.") : (data.detail || "The file could not be processed. Please try a different format.") });
    } else {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}) },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!responded) chatMsgs.push({ role: "bot", content: res.ok ? (data.response || data.reply || "I'd like to help with that. Could you provide a bit more detail about what you're looking for?") : (data.detail || "I'm experiencing a brief service interruption. Please try once more.") });
    }
  } catch(e) { console.error("sendChat error:", e); if (!responded) chatMsgs.push({ role: "bot", content: "I'm having trouble connecting to my servers. Please check your connection and try again in a moment." }); }
  responded = true;
  clearTimeout(safetyTimer);
  chatLoading = false; renderChat();
}

/* ═══════════════════════════════════════════════════
   MEDICINES
════════════════════════════════════════════════════ */
function renderMedicines() {
  const el = document.getElementById("view-medicines");
  if (!el) return;
  el.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h2 class="page-title"><span class="page-title-icon" style="color:var(--accent)">${IC.pill}</span> Medicine Search</h2>
        <p class="page-sub">Search by medicine name (paracetamol) or condition (headache, diabetes, fever).</p>
      </div>
      <div class="search-row">
        <div class="search-icon-wrap">${IC.search}</div>
        <input id="med-search" class="search-input has-icon" placeholder="Search medicine or condition..." onkeydown="if(event.key==='Enter')searchMedicines()" />
        <button class="btn btn-primary" onclick="searchMedicines()">Search</button>
        <button class="btn btn-ghost" onclick="clearMedSearch()">Clear</button>
      </div>
      <div id="med-results" class="search-results" aria-live="polite">
        <div class="empty-state"><div class="empty-icon">${IC.search}</div><p>Search for a medicine to see results</p></div>
      </div>
    </div>`;
}

function clearMedSearch() {
  const el = document.getElementById("med-search"); if (el) el.value = "";
  const r = document.getElementById("med-results");
  if (r) r.innerHTML = `<div class="empty-state"><div class="empty-icon">${IC.search}</div><p>Search for a medicine to see results</p></div>`;
}

async function searchMedicines() {
  const q = document.getElementById("med-search")?.value.trim();
  if (!q) return;
  const el = document.getElementById("med-results");
  if (!el) return;
  const btn = document.querySelector('[onclick="searchMedicines()"]');
  if (btn?.disabled) return;
  if (btn) btn.disabled = true;
  el.innerHTML = '<div style="text-align:center;padding:32px 0"><div class="spinner"></div><p style="color:var(--muted);font-size:13px;margin-top:8px">Searching medicines database...</p></div>';
  try {
    const res = await fetch(`${API}/medicines/search`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">${IC.emergency}</div><p>${escapeHtml(data.detail || "Could not search medicines. Please try again.")}</p></div>`; return; }
    const items = data.results || data.medicines || [];
    if (items.length) {
      el.innerHTML = `<div class="search-count">${items.length} result${items.length !== 1 ? "s" : ""} found</div>` +
        items.map(i => renderMedicineCard(i)).join("");
    } else {
      el.innerHTML = `
        <div class="search-loading-ai">
          <div class="spinner"></div>
          <p>Not found in database. Asking Elix AI about "${escapeHtml(q)}"...</p>
        </div>`;
      await searchByDisease(q, el);
    }
  } catch(e) { console.error("searchMedicines error:", e); el.innerHTML = `<div class="empty-state"><div class="empty-icon">${IC.emergency}</div><p>Could not connect to server. Check your internet and try again.</p></div>`; }
  finally { if (btn) btn.disabled = false; }
}

async function searchByDisease(query, el) {
  try {
    const history = [{ role: "user", content: `List 5 common medicines used to treat "${query}". For each medicine, give me a JSON array with objects containing: name, uses (array of strings), how_to_use (string), side_effects_common (array of strings), side_effects_serious (array of strings), dosage_adult (string). Return ONLY the JSON array, no other text.` }];
    const res = await fetch(`${API}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}) },
      body: JSON.stringify({ message: history[0].content, history: [] }),
    });
    const data = await res.json().catch(() => ({}));
    const reply = data.response || data.reply || "";
    const jsonMatch = reply.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const meds = JSON.parse(jsonMatch[0]);
      if (meds.length) {
        el.innerHTML = `
          <div class="search-count" style="margin-bottom:4px">Medicines commonly used for "${escapeHtml(query)}" (AI-suggested)</div>
          <p style="font-size:12px;color:var(--muted-2);margin-bottom:14px">These are common treatments. Always consult a doctor before taking any medication.</p>
          ${meds.map(m => renderDiseaseMedCard(m)).join("")}
          <div style="text-align:center;margin-top:16px">
            <button class="btn btn-primary" data-ask="${escapeHtml(query)}" onclick="askElixAbout(this.dataset.ask)">
              <span style="display:flex;align-items:center;gap:6px">${IC.chat} Ask Elix for more details</span>
            </button>
          </div>`;
        return;
      }
    }
    el.innerHTML = `
      <div class="empty-state" style="padding:40px 24px">
        <div class="empty-icon">${IC.chat}</div>
        <p style="margin-bottom:6px">Could not find specific medicines for "${escapeHtml(query)}"</p>
        <p style="font-size:13px;color:var(--muted-2);margin-bottom:16px">Try asking Elix AI directly for personalized advice.</p>
        <button class="btn btn-primary" data-ask="${escapeHtml(query)}" onclick="askElixAbout(this.dataset.ask)">
          <span style="display:flex;align-items:center;gap:6px">${IC.chat} Ask Elix AI about "${escapeHtml(query)}"</span>
        </button>
      </div>`;
  } catch(e) {
    console.error("searchByDisease error:", e);
    el.innerHTML = `
      <div class="empty-state" style="padding:40px 24px">
        <div class="empty-icon">${IC.chat}</div>
        <p style="margin-bottom:6px">Could not find medicines for "${escapeHtml(query)}"</p>
        <button class="btn btn-primary" data-ask="${escapeHtml(query)}" onclick="askElixAbout(this.dataset.ask)">
          <span style="display:flex;align-items:center;gap:6px">${IC.chat} Ask Elix AI</span>
        </button>
      </div>`;
  }
}

function renderDiseaseMedCard(m) {
  const name = escapeHtml(m.name || "Unknown");
  const uses = m.uses || [];
  const howToUse = m.how_to_use || "";
  const dosage = m.dosage_adult || "";
  const commonSE = m.side_effects_common || [];
  const seriousSE = m.side_effects_serious || [];

  let html = `<div class="med-card" onclick="this.classList.toggle('med-card-open');this.setAttribute('aria-expanded',this.classList.contains('med-card-open'))" role="button" tabindex="0" aria-expanded="false" onkeydown="if(event.key==='Enter'||event.key===' '){this.classList.toggle('med-card-open');this.setAttribute('aria-expanded',this.classList.contains('med-card-open'));event.preventDefault()}">
    <div class="med-card-header">
      <div>
        <h3 class="med-card-name">${name}</h3>
        <div class="med-card-meta"><span class="med-badge med-badge-accent">AI-suggested</span></div>
      </div>
      <span class="med-card-chevron">${IC.chevron}</span>
    </div>
    <div class="med-card-body">`;

  if (uses.length) {
    html += `<div class="med-section">
      <div class="med-section-title"><span style="color:var(--primary)">${IC.heart}</span> Uses</div>
      <div class="med-tags">${uses.map(u => `<span class="med-tag">${escapeHtml(u)}</span>`).join("")}</div>
    </div>`;
  }
  if (dosage) {
    html += `<div class="med-section">
      <div class="med-section-title"><span style="color:#f59e0b">${IC.pill}</span> Adult Dosage</div>
      <p class="med-text">${escapeHtml(dosage)}</p>
    </div>`;
  }
  if (howToUse) {
    html += `<div class="med-section">
      <div class="med-section-title"><span style="color:var(--primary)">${IC.activity}</span> How to Use</div>
      <p class="med-text">${escapeHtml(howToUse)}</p>
    </div>`;
  }
  if (commonSE.length || seriousSE.length) {
    html += `<div class="med-section">
      <div class="med-section-title"><span style="color:var(--danger)">${IC.emergency}</span> Side Effects</div>
      ${commonSE.length ? `<div class="med-sublabel">Common</div><div class="med-tags">${commonSE.map(s => `<span class="med-tag med-tag-warn">${escapeHtml(s)}</span>`).join("")}</div>` : ""}
      ${seriousSE.length ? `<div class="med-sublabel" style="color:var(--danger)">Serious</div><div class="med-tags">${seriousSE.map(s => `<span class="med-tag med-tag-danger">${escapeHtml(s)}</span>`).join("")}</div>` : ""}
    </div>`;
  }

  html += `</div></div>`;
  return html;
}

function askElixAbout(query) {
  chatMsgs = [{ role: "bot", content: "Hi! I'm Elix, your personal health companion. I see you're looking for information about a medicine. What would you like to know?" }];
  navigate("chat");
  setTimeout(() => {
    const inp = document.getElementById("chat-input");
    if (inp) { inp.value = `Tell me about ${query} — uses, dosage, side effects, and precautions`; autoResize(inp); inp.focus(); }
  }, 200);
}

function renderMedicineCard(i) {
  const name = escapeHtml(i.name || i.brand_name || i.brand || "Unknown");
  const mfg = i.manufacturer_name || i.manufacturer;
  const cat = i.category;
  const uses = i.uses || [];
  const symptoms = i.symptoms_treated || [];
  const dosage = i.dosage || {};
  const howToUse = i.how_to_use || "";
  const sideEffects = i.side_effects || {};
  const precautions = i.precautions || [];
  const interactions = i.interactions || [];
  const pregnancy = i.pregnancy;
  const storage = i.storage;

  let html = `<div class="med-card" onclick="this.classList.toggle('med-card-open');this.setAttribute('aria-expanded',this.classList.contains('med-card-open'))" role="button" tabindex="0" aria-expanded="false" onkeydown="if(event.key==='Enter'||event.key===' '){this.classList.toggle('med-card-open');this.setAttribute('aria-expanded',this.classList.contains('med-card-open'));event.preventDefault()}">
    <div class="med-card-header">
      <div>
        <h3 class="med-card-name">${name}</h3>
        <div class="med-card-meta">
          ${mfg ? `<span class="med-badge">${escapeHtml(mfg)}</span>` : ""}
          ${cat ? `<span class="med-badge med-badge-accent">${escapeHtml(cat)}</span>` : ""}
        </div>
      </div>
      <span class="med-card-chevron">${IC.chevron}</span>
    </div>
    <div class="med-card-body">`;

  if (uses.length && uses[0] !== "See full label for indications") {
    html += `<div class="med-section">
      <div class="med-section-title"><span style="color:var(--primary)">${IC.heart}</span> Uses / Indications</div>
      <div class="med-tags">${uses.map(u => `<span class="med-tag">${escapeHtml(u)}</span>`).join("")}</div>
    </div>`;
  }

  if (symptoms.length && symptoms[0] !== "See full label for indications") {
    html += `<div class="med-section">
      <div class="med-section-title"><span style="color:var(--accent)">${IC.stethoscope}</span> Symptoms Treated</div>
      <div class="med-tags">${symptoms.map(s => `<span class="med-tag med-tag-symptom">${escapeHtml(s)}</span>`).join("")}</div>
    </div>`;
  }

  if (dosage.adult || dosage.child || dosage.elderly) {
    html += `<div class="med-section">
      <div class="med-section-title"><span style="color:#f59e0b">${IC.pill}</span> Dosage</div>
      <div class="med-dosage-grid">
        ${dosage.adult ? `<div class="med-dosage-item"><div class="med-dosage-label">Adult</div><div class="med-dosage-text">${escapeHtml(String(dosage.adult).substring(0, 200))}${String(dosage.adult).length > 200 ? "..." : ""}</div></div>` : ""}
        ${dosage.child ? `<div class="med-dosage-item"><div class="med-dosage-label">Children</div><div class="med-dosage-text">${escapeHtml(String(dosage.child).substring(0, 200))}${String(dosage.child).length > 200 ? "..." : ""}</div></div>` : ""}
        ${dosage.elderly ? `<div class="med-dosage-item"><div class="med-dosage-label">Elderly</div><div class="med-dosage-text">${escapeHtml(String(dosage.elderly).substring(0, 200))}${String(dosage.elderly).length > 200 ? "..." : ""}</div></div>` : ""}
      </div>
    </div>`;
  }

  if (howToUse) {
    html += `<div class="med-section">
      <div class="med-section-title"><span style="color:var(--primary)">${IC.activity}</span> How to Use</div>
      <p class="med-text">${escapeHtml(howToUse.substring(0, 300))}${howToUse.length > 300 ? "..." : ""}</p>
    </div>`;
  }

  const commonSE = sideEffects.common || [];
  const seriousSE = sideEffects.serious || [];
  if (commonSE.length || seriousSE.length) {
    html += `<div class="med-section">
      <div class="med-section-title"><span style="color:var(--danger)">${IC.emergency}</span> Side Effects</div>
      ${commonSE.length ? `<div class="med-sublabel">Common</div><div class="med-tags">${commonSE.map(s => `<span class="med-tag med-tag-warn">${escapeHtml(s)}</span>`).join("")}</div>` : ""}
      ${seriousSE.length ? `<div class="med-sublabel" style="color:var(--danger)">Serious — Seek medical help</div><div class="med-tags">${seriousSE.map(s => `<span class="med-tag med-tag-danger">${escapeHtml(s)}</span>`).join("")}</div>` : ""}
    </div>`;
  }

  if (precautions.length) {
    html += `<div class="med-section">
      <div class="med-section-title"><span style="color:#f59e0b">${IC.shield}</span> Precautions</div>
      <div class="med-tags">${precautions.map(p => `<span class="med-tag">${escapeHtml(p)}</span>`).join("")}</div>
    </div>`;
  }

  if (interactions.length && interactions[0] !== "No specific interactions listed in label") {
    html += `<div class="med-section">
      <div class="med-section-title"><span style="color:var(--danger)">${IC.pill}</span> Drug Interactions</div>
      <div class="med-tags">${interactions.map(x => `<span class="med-tag med-tag-danger">${escapeHtml(x)}</span>`).join("")}</div>
    </div>`;
  }

  if (pregnancy) {
    html += `<div class="med-section">
      <div class="med-section-title"><span style="color:#8b5cf6">${IC.heart}</span> Pregnancy &amp; Breastfeeding</div>
      <p class="med-text">${escapeHtml(pregnancy.substring(0, 250))}${pregnancy.length > 250 ? "..." : ""}</p>
    </div>`;
  }

  if (storage) {
    html += `<div class="med-section">
      <div class="med-section-title"><span style="color:var(--muted)">${IC.settings}</span> Storage</div>
      <p class="med-text">${escapeHtml(storage.substring(0, 200))}${storage.length > 200 ? "..." : ""}</p>
    </div>`;
  }

  html += `</div></div>`;
  return html;
}

/* ── Hospitals ── */
let userLat = null, userLng = null;

function renderHospitals() {
  const el = document.getElementById("view-hospitals");
  if (!el) return;
  el.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h2 class="page-title"><span class="page-title-icon" style="color:var(--primary)">${IC.hospital}</span> Nearby Hospitals &amp; Clinics</h2>
        <p class="page-sub">Find hospitals, clinics, and medical centers near you.</p>
      </div>
      <div class="location-bar" id="hosp-location-bar">
        <button class="btn btn-ghost btn-sm" onclick="detectLocation('hospital')" id="hosp-loc-btn">
          ${IC.search} <span>${userLat ? "Location detected" : "Use My Location"}</span>
        </button>
        ${userLat ? `<span class="location-status">${IC.info} Showing results near you</span>` : ""}
      </div>
      <div class="search-row">
        <input id="hosp-search" class="search-input" placeholder="Or search by city name..." onkeydown="if(event.key==='Enter')searchHospitals()" />
        <button class="btn btn-primary" onclick="searchHospitals()">Search</button>
        <button class="btn btn-ghost" onclick="clearHospSearch()">Clear</button>
      </div>
      <div id="hosp-results" class="search-results" aria-live="polite">
        <div class="empty-state"><div class="empty-icon">${IC.hospital}</div><p>${userLat ? "Tap Search to find nearby hospitals" : "Tap \"Use My Location\" to find hospitals near you"}</p></div>
      </div>
    </div>`;
  if (userLat) autoSearchNearby("hospital");
}
function clearHospSearch() {
  const el = document.getElementById("hosp-search"); if (el) el.value = "";
  const r = document.getElementById("hosp-results");
  if (r) r.innerHTML = `<div class="empty-state"><div class="empty-icon">${IC.hospital}</div><p>Search for hospitals, clinics, or medical centers near you</p></div>`;
}

async function searchHospitals() {
  const q = document.getElementById("hosp-search")?.value.trim() || "";
  const el = document.getElementById("hosp-results");
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:32px 0"><div class="spinner"></div><p style="color:var(--muted);font-size:13px;margin-top:8px">Finding nearby hospitals...</p></div>';
  if (!q && !userLat) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">' + IC.search + '</div><p>Use your location or type a city name</p></div>'; return; }
  const body = { lat: userLat ?? 0, lng: userLng ?? 0, query: q || null, radius: 50 };
  if (userLat === null && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => { body.lat = pos.coords.latitude; body.lng = pos.coords.longitude; userLat = body.lat; userLng = body.lng; fetchMedicalPlaces(body, el, "hospital"); },
      () => { el.innerHTML = '<div class="empty-state"><div class="empty-icon">' + IC.search + '</div><p>Could not detect your location. Please type a city name to search.</p></div>'; }, { timeout: 5000 }
    );
  } else { fetchMedicalPlaces(body, el, "hospital"); }
}

/* ── Pharmacies ── */
/* ── Location Detection ── */
function detectLocation(context) {
  const btn = document.getElementById(`${context === "hospital" ? "hosp" : "pharm"}-loc-btn`);
  if (btn) btn.innerHTML = `${IC.search} <span>Detecting...</span>`;

  if (!navigator.geolocation) {
    if (btn) btn.innerHTML = `${IC.search} <span>Geolocation not supported — search manually</span>`;
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;
      reverseGeocode(userLat, userLng, context);
    },
    err => {
      const msg = err.code === 1 ? "Location permission denied — enable in browser settings" : "Could not detect location — try searching manually";
      if (btn) btn.innerHTML = `${IC.search} <span>${msg}</span>`;
    },
    { timeout: 10000, maximumAge: 300000 }
  );
}

function reverseGeocode(lat, lng, context) {
  const bar = document.getElementById(`${context === "hospital" ? "hosp" : "pharm"}-location-bar`);
  if (bar) {
    bar.innerHTML = `
      <span class="location-status" style="color:var(--primary)">${IC.info} Location detected</span>
      <button class="btn btn-ghost btn-sm" onclick="detectLocation('${context}')">Update</button>`;
  }
  autoSearchNearby(context);
}

function autoSearchNearby(context) {
  if (userLat === null || userLng === null) return;
  const el = document.getElementById(`${context === "hospital" ? "hosp" : "pharm"}-results`);
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:32px 0"><div class="spinner"></div><p style="color:var(--muted);font-size:13px;margin-top:8px">Finding nearby facilities...</p></div>';
  const body = { lat: userLat, lng: userLng, query: null, radius: 50 };
  fetchMedicalPlaces(body, el, context);
}

function renderPharmacies() {
  const el = document.getElementById("view-pharmacies");
  if (!el) return;
  el.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h2 class="page-title"><span class="page-title-icon" style="color:var(--primary)">${IC.pharmacy}</span> Nearby Pharmacies</h2>
        <p class="page-sub">Find pharmacies, drugstores, and medical shops near you.</p>
      </div>
      <div class="location-bar" id="pharm-location-bar">
        <button class="btn btn-ghost btn-sm" onclick="detectLocation('pharmacy')" id="pharm-loc-btn">
          ${IC.search} <span>${userLat ? "Location detected" : "Use My Location"}</span>
        </button>
        ${userLat ? `<span class="location-status">${IC.info} Showing results near you</span>` : ""}
      </div>
      <div class="search-row">
        <input id="pharm-search" class="search-input" placeholder="Or search by city name..." onkeydown="if(event.key==='Enter')searchPharmacies()" />
        <button class="btn btn-primary" onclick="searchPharmacies()">Search</button>
        <button class="btn btn-ghost" onclick="clearPharmSearch()">Clear</button>
      </div>
      <div id="pharm-results" class="search-results" aria-live="polite">
        <div class="empty-state"><div class="empty-icon">${IC.pharmacy}</div><p>${userLat ? "Tap Search to find nearby pharmacies" : "Tap \"Use My Location\" to find pharmacies near you"}</p></div>
      </div>
    </div>`;
  if (userLat) autoSearchNearby("pharmacy");
}
function clearPharmSearch() {
  const el = document.getElementById("pharm-search"); if (el) el.value = "";
  const r = document.getElementById("pharm-results");
  if (r) r.innerHTML = `<div class="empty-state"><div class="empty-icon">${IC.pharmacy}</div><p>Search for pharmacies, drugstores, or medical shops near you</p></div>`;
}

async function searchPharmacies() {
  const q = document.getElementById("pharm-search")?.value.trim() || "";
  const el = document.getElementById("pharm-results");
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:32px 0"><div class="spinner"></div><p style="color:var(--muted);font-size:13px;margin-top:8px">Finding nearby pharmacies...</p></div>';
  if (!q && !userLat) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">' + IC.pharmacy + '</div><p>Use your location or type a city name</p></div>'; return; }
  const body = { lat: userLat ?? 0, lng: userLng ?? 0, query: q || null, radius: 50 };
  if (userLat === null && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => { body.lat = pos.coords.latitude; body.lng = pos.coords.longitude; userLat = body.lat; userLng = body.lng; fetchMedicalPlaces(body, el, "pharmacy"); },
      () => { el.innerHTML = '<div class="empty-state"><div class="empty-icon">' + IC.pharmacy + '</div><p>Could not detect your location. Please type a city name to search.</p></div>'; }, { timeout: 5000 }
    );
  } else { fetchMedicalPlaces(body, el, "pharmacy"); }
}

let activeMap = null;
function destroyMap() { if (activeMap) { activeMap.remove(); activeMap = null; } }

async function fetchMedicalPlaces(body, el, context) {
  destroyMap();
  try {
    const res = await fetch(`${API}/emergency/search`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">${IC.emergency}</div><p>${escapeHtml(data.detail || "Could not search nearby. Please try again.")}</p></div>`; return; }
    const items = data.results || data.places || data.hospitals || [];
    if (!items.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">' + IC.search + '</div><p>No medical facilities found nearby. Try enabling location or searching by city name.</p></div>';
      return;
    }
    const hasCoords = body.lat && body.lng && body.lat !== 0 && body.lng !== 0;
    let mapHtml = hasCoords ? `<div id="nearby-map" class="nearby-map"></div>` : "";
    const resultsHtml = `<div class="search-count">${items.length} result${items.length !== 1 ? "s" : ""} found — sorted by nearest</div>` +
       items.map((it, idx) => {
         const dist = it.distance != null ? formatDistance(it.distance) : "";
          const typeLabel = it.facility_type || (it.types?.length ? it.types[0] : (context === "hospital" ? "Hospital" : "Pharmacy"));
          const typeIcon = /pharmacy|chemist|drugstore/i.test(typeLabel) ? IC.pharmacy : /hospital|clinic/i.test(typeLabel) ? IC.hospital : IC.stethoscope;
          return `
          <div class="result-card result-card-clickable" ${it.lat && it.lng ? `data-lat="${it.lat}" data-lng="${it.lng}"` : ""}>
            <div class="result-card-header">
              <h3><span style="display:inline-flex;vertical-align:middle">${typeIcon}</span> ${escapeHtml(it.name)}</h3>
              ${dist ? `<span class="result-distance">${dist}</span>` : ""}
            </div>
            ${it.address ? `<p class="result-addr"><span style="display:inline-flex;vertical-align:middle">${IC.info}</span> ${escapeHtml(it.address)}</p>` : ""}
            ${it.phone ? `<p class="result-phone"><span style="display:inline-flex;vertical-align:middle">${IC.chat}</span> <a href="tel:${it.phone}">${escapeHtml(it.phone)}</a></p>` : ""}
           <div class="result-actions">
              ${it.lat && it.lng ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${it.lat},${it.lng}" target="_blank" rel="noopener" class="result-directions" onclick="event.stopPropagation()">${IC.directions} Directions</a>` : ""}
             ${it.lat && it.lng ? `<a href="https://www.google.com/maps/search/?api=1&query=${it.lat},${it.lng}" target="_blank" rel="noopener" class="result-map-link" onclick="event.stopPropagation()">View on Map →</a>` : ""}
           </div>
         </div>`;
       }).join("");
    el.innerHTML = mapHtml + resultsHtml;
    if (hasCoords && items.some(i => i.lat && i.lng)) {
      requestAnimationFrame(() => {
        const mapEl = document.getElementById("nearby-map");
        if (!mapEl) return;
        if (typeof L === "undefined") {
          mapEl.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted)"><p>Map could not load. Check your connection.</p></div>';
          return;
        }
        const map = L.map("nearby-map").setView([body.lat, body.lng], 13);
        activeMap = map;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        L.marker([body.lat, body.lng]).addTo(map).bindPopup("You are here").openPopup();
        const bounds = L.latLngBounds([body.lat, body.lng]);
        items.forEach((it) => {
          if (it.lat && it.lng) {
            const icon = L.divIcon({ className: "map-marker-wrap", html: `<div class="map-marker">${/pharmacy|chemist/i.test(it.name) ? IC.pharmacy : IC.hospital}</div>`, iconSize: [32, 32], iconAnchor: [16, 32] });
            L.marker([it.lat, it.lng], { icon }).addTo(map)
              .bindPopup(`<b>${escapeHtml(it.name)}</b><br>${escapeHtml(it.address || "")}<br>${it.distance != null ? "<i>" + formatDistance(it.distance) + " away</i><br>" : ""}<a href="https://www.google.com/maps/dir/?api=1&destination=${it.lat},${it.lng}" target="_blank" style="color:var(--primary)">Get Directions →</a>`);
            bounds.extend([it.lat, it.lng]);
          }
        });
        map.fitBounds(bounds, { padding: [40, 40] });
        el.querySelectorAll(".result-card-clickable[data-lat]").forEach(card => {
          card.addEventListener("click", () => {
            const lat = parseFloat(card.dataset.lat);
            const lng = parseFloat(card.dataset.lng);
            map.setView([lat, lng], 16);
            el.querySelectorAll(".result-card-clickable").forEach(c => c.classList.remove("result-highlight"));
            card.classList.add("result-highlight");
          });
        });
      });
    }
  } catch(e) { console.error("fetchMedicalPlaces error:", e); el.innerHTML = `<div class="empty-state"><div class="empty-icon">${IC.emergency}</div><p>Could not connect to server. Check your internet and try again.</p></div>`; }
}

/* ── Emergency ── */
function renderMore() {
  const list = [
    { country: "🇮🇳 India",     number: "112", label: "All Emergencies" },
    { country: "🇺🇸 USA",       number: "911", label: "All Emergencies" },
    { country: "🇬🇧 UK",        number: "999", label: "All Emergencies" },
    { country: "🇦🇺 Australia", number: "000", label: "All Emergencies" },
    { country: "🇨🇦 Canada",    number: "911", label: "All Emergencies" },
    { country: "🇩🇪 Germany",  number: "112", label: "All Emergencies" },
    { country: "🇯🇵 Japan",     number: "110", label: "Police" },
    { country: "🇯🇵 Japan",     number: "119", label: "Fire / Ambulance" },
  ];
  const moreEl = document.getElementById("view-more");
  if (!moreEl) return;
  moreEl.innerHTML = `
     <div class="page">
       <div class="page-header">
         <h2 class="page-title"><span class="page-title-icon" style="color:var(--danger)">${IC.emergency}</span> Emergency Contacts</h2>
         <p class="page-sub">Quick-dial emergency numbers organized by country. Save these in your phone for instant access during critical situations.</p>
       </div>
       <div class="emergency-list">${list.map(e => `
         <a class="emergency-card" href="tel:${e.number}">
           <div>
             <div class="emergency-country">${e.country}</div>
             <div class="emergency-label">${e.label}</div>
           </div>
           <div class="emergency-num">${e.number}</div>
         </a>`).join("")}
       </div>

       <div class="acct-card" style="margin-top:24px">
         <div class="acct-section-title">Find Nearby Care</div>
         <div style="display:flex;gap:12px;flex-wrap:wrap">
           <button class="btn btn-ghost" style="flex:1;min-width:140px" onclick="navigate('hospitals')"><span style="display:flex;align-items:center;gap:6px">${IC.hospital} Hospitals &amp; Clinics</span></button>
           <button class="btn btn-ghost" style="flex:1;min-width:140px" onclick="navigate('pharmacies')"><span style="display:flex;align-items:center;gap:6px">${IC.pharmacy} Pharmacies &amp; Drugstores</span></button>
         </div>
       </div>
     </div>`;
 }

/* ═══════════════════════════════════════════════════
   ACCOUNT
════════════════════════════════════════════════════ */
function renderAccount() {
  const u = state.user;
  const initials = (u?.name || u?.email || "U").charAt(0).toUpperCase();
  const memberSince = u?.created_at
    ? new Date(u.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "N/A";
  const vitalsCount = getVitals().length;

  const acctEl = document.getElementById("view-account");
  if (!acctEl) return;
  acctEl.innerHTML = `
    <div class="page" style="max-width:580px">
      <div class="page-header">
        <h2 class="page-title"><span class="page-title-icon" style="color:var(--primary)">${IC.settings}</span> Settings</h2>
      </div>

      <!-- Profile Card -->
      <div class="acct-card acct-profile">
        <div class="acct-avatar">${initials}</div>
        <div class="acct-name">${escapeHtml(u?.name || "User")}</div>
        <div class="acct-email">${escapeHtml(u?.email || "")}</div>
        <div class="acct-stats-row">
          <div class="acct-stat">
            <div class="acct-stat-val">${vitalsCount}</div>
            <div class="acct-stat-label">Vitals Logged</div>
          </div>
          <div class="acct-stat">
            <div class="acct-stat-val">${memberSince.split(" ")[0]}</div>
            <div class="acct-stat-label">Member Since</div>
          </div>
          <div class="acct-stat">
            <div class="acct-stat-val">${state.theme === "dark" ? "Dark" : "Light"}</div>
            <div class="acct-stat-label">Theme</div>
          </div>
        </div>
      </div>

      <!-- Appearance -->
      <div class="acct-card">
        <div class="acct-section-title"><span style="display:flex;align-items:center;gap:8px">${IC.sun} Appearance</span></div>
        <div class="setting-row">
          <div>
            <div class="setting-label">Dark Mode</div>
            <div class="setting-desc">Switch between light and dark themes</div>
          </div>
          <div class="toggle ${state.theme === "dark" ? "on" : "off"}" onclick="toggleTheme();renderAccount()" role="switch" aria-checked="${state.theme === "dark"}">
            <div class="toggle-knob"></div>
          </div>
        </div>
      </div>

      <!-- Account -->
      <div class="acct-card">
        <div class="acct-section-title"><span style="display:flex;align-items:center;gap:8px">${IC.shield} Account</span></div>
        <div class="setting-row" style="margin-bottom:16px">
          <div>
            <div class="setting-label">Change Password</div>
            <div class="setting-desc">Update your account password</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="showPasswordChange()">Update</button>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">Email</div>
            <div class="setting-desc">${escapeHtml(u?.email || "Not set")}</div>
          </div>
        </div>
      </div>

      <div id="pw-change-area"></div>

      <!-- Danger Zone -->
      <div class="acct-card acct-card-danger">
        <div class="acct-section-title" style="color:var(--danger)"><span style="display:flex;align-items:center;gap:8px">${IC.emergency} Danger Zone</span></div>
        <div style="margin-bottom:16px">
          <div class="setting-label" style="color:var(--danger)">Delete Account</div>
          <div class="setting-desc">Permanently delete your account and all associated data. This action cannot be undone.</div>
        </div>
        <button class="btn btn-danger" style="width:100%;justify-content:center" onclick="deleteAccount()">
          Delete My Account
        </button>
      </div>

      <button class="btn btn-ghost" style="width:100%;justify-content:center;margin-top:4px;border-color:var(--danger);color:var(--danger)"
        onclick="if(confirm('Log out of Mendly?')){logout();}">
        <span style="display:flex;align-items:center;gap:8px">${IC.logout} Log Out</span>
      </button>
    </div>`;
}

function showPasswordChange() {
  const area = document.getElementById("pw-change-area");
  if (!area) return;
  if (area.innerHTML) { area.innerHTML = ""; return; }
  area.innerHTML = `
    <div class="acct-card" style="margin-bottom:16px">
      <div class="acct-section-title">Change Password</div>
      <div class="form-group"><input id="pw-current" class="form-input" type="password" placeholder="Current password" autocomplete="current-password" /></div>
      <div class="form-group"><input id="pw-new" class="form-input" type="password" placeholder="New password (min 6 chars)" autocomplete="new-password" /></div>
      <div id="pw-error" class="form-error hidden"></div>
      <button class="btn btn-primary btn-sm" onclick="changePassword()">Save Password</button>
    </div>`;
}

async function changePassword() {
  const cur  = document.getElementById("pw-current")?.value;
  const nw   = document.getElementById("pw-new")?.value;
  const errEl = document.getElementById("pw-error");
  if (!errEl) return;
  if (!cur || !nw) { errEl.textContent = "Please fill in both fields."; errEl.classList.remove("hidden"); return; }
  if (nw.length < 6) { errEl.textContent = "New password needs at least 6 characters."; errEl.classList.remove("hidden"); return; }
  errEl.classList.add("hidden");
  try {
    const res = await authFetch("/profile/change-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: cur, new_password: nw }),
    });
    if (res.status === "error" || res.detail) { errEl.textContent = res.detail || "Could not update password. Try again."; errEl.classList.remove("hidden"); return; }
    showToast(res.message || "Password updated!");
    const area = document.getElementById("pw-change-area");
    if (area) area.innerHTML = "";
   } catch(e) { console.error("changePassword error:", e); errEl.textContent = "Could not connect to server. Try again."; errEl.classList.remove("hidden"); }
}

async function deleteAccount() {
  if (!confirm("This will permanently delete your account and all data. This cannot be undone.\n\nAre you sure?")) return;
  try {
    const res = await authFetch("/profile", { method: "DELETE" });
    if (res.status === "error" || res.detail) { showToast(res.detail || "Could not delete account. Try again.", "error"); return; }
    showToast(res.message || "Account deleted.");
    logout();
  } catch(e) { console.error("deleteAccount error:", e); showToast("Could not connect to server. Try again.", "error"); }
}

/* ═══════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════ */
loadState();
applyTheme();
document.addEventListener("DOMContentLoaded", () => render());
