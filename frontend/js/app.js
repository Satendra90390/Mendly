/* ═══════════════════════════════════════════════════
   MENDLY app.js — v2
════════════════════════════════════════════════════ */

const API = location.hostname === "localhost"
  ? "http://localhost:8002/api"
  : "https://mendly-backend-0vyg.onrender.com/api";

let state = { user: null, token: null, theme: "light" };

/* ── Helpers ── */
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function apiFetch(path, opts = {}) { return fetch(`${API}${path}`, opts).then(r => r.json()); }
function authFetch(path, opts = {}) {
  const h = new Headers(opts.headers);
  if (state.token) h.set("Authorization", `Bearer ${state.token}`);
  return fetch(`${API}${path}`, { ...opts, headers: h }).then(r => {
    if (r.status === 401) { logout(); throw new Error("Session expired"); }
    return r.json();
  });
}
function escapeHtml(t) {
  if (t == null) return "";
  return String(t)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/\n/g, "<br>");
}

/* ── Persist ── */
function saveState() {
  localStorage.setItem("mendly_token", state.token || "");
  localStorage.setItem("mendly_user", state.user ? JSON.stringify(state.user) : "");
  localStorage.setItem("mendly_theme", state.theme);
}
function loadState() {
  state.token = localStorage.getItem("mendly_token") || null;
  try { state.user = JSON.parse(localStorage.getItem("mendly_user")); } catch { state.user = null; }
  state.theme = localStorage.getItem("mendly_theme") || "light";
}
function login(token, user) { state.token = token; state.user = user; saveState(); }
function logout() { state.token = null; state.user = null; saveState(); navigate("landing"); }

/* ── Theme ── */
function applyTheme() { document.documentElement.classList.toggle("dark", state.theme === "dark"); }
function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  saveState(); applyTheme(); renderHeader();
}

/* ── Logo SVG (medical cross + leaf) ── */
function logoSvg(size = 22) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="url(#logoGrad)"/>
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stop-color="#1a8a7d"/>
        <stop offset="1" stop-color="#0ea5e9"/>
      </linearGradient>
    </defs>
    <path d="M20 9 L20 31" stroke="white" stroke-width="5" stroke-linecap="round"/>
    <path d="M9 20 L31 20" stroke="white" stroke-width="5" stroke-linecap="round"/>
    <circle cx="28" cy="14" r="4" fill="rgba(255,255,255,0.3)"/>
    <circle cx="28" cy="14" r="2" fill="white"/>
  </svg>`;
}

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

/* inject logo into footer on page load */
function injectStaticLogos() {
  document.querySelectorAll("#footer-logo-icon, .cta-logo .logo-icon-wrap").forEach(el => {
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
const GUEST_ALLOWED = new Set(["landing", "chat", "medicines", "hospitals", "more", "features", "about", "faq", "how"]);
const LANDING_SECTIONS = new Set(["features", "about", "faq", "how"]);

function navigate(hash) {
  const target = hash || location.hash.slice(1) || (state.user ? "dashboard" : "landing");
  if (!hash) history.replaceState(null, "", `#${target}`);
  else history.pushState(null, "", `#${target}`);
  render();
}

window.addEventListener("hashchange", render);
window.addEventListener("popstate", render);

function toggleFaq(btn) {
  const item = btn.closest(".faq-item");
  if (item) item.classList.toggle("open");
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
  applyTheme();
  const route = location.hash.slice(1) || (state.user ? "dashboard" : "landing");

  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));

  if (AUTH_REQUIRED.has(route) && !state.user) { openAuth("signup"); return; }
  if (!GUEST_ALLOWED.has(route) && !state.user) { navigate("landing"); return; }
  if (state.user && (LANDING_SECTIONS.has(route) || route === "landing")) { navigate("dashboard"); return; }

  /* sidebar body class */
  if (state.user) {
    document.body.classList.add("has-sidebar");
  } else {
    document.body.classList.remove("has-sidebar");
  }

  const targetView = LANDING_SECTIONS.has(route) ? "landing" : route;

  renderHeader();
  renderSidebar(targetView);

  const el = document.getElementById(`view-${targetView}`);
  if (el) el.classList.add("active");

  renderMobileNav(targetView);

  switch (targetView) {
    case "landing":   injectStaticLogos(); break;
    case "dashboard": renderDashboard(); break;
    case "chat":      renderChat(); break;
    case "medicines": renderMedicines(); break;
    case "hospitals": break;
    case "more":      renderMore(); break;
    case "account":   renderAccount(); break;
  }

  if (!state.user && LANDING_SECTIONS.has(route)) {
    setTimeout(() => {
      const sec = document.getElementById(route);
      if (sec) sec.scrollIntoView({ behavior: "smooth" });
    }, 60);
  }
}

/* ═══════════════════════════════════════════════════
   HEADER
════════════════════════════════════════════════════ */
function renderHeader() {
  const h = document.getElementById("header");
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
          <button class="theme-btn" onclick="toggleTheme()" aria-label="Toggle theme">${state.theme==="dark" ? "☀️" : "🌙"}</button>
          <button class="btn btn-ghost btn-sm" onclick="openAuth('login')">Log In</button>
          <button class="btn btn-primary btn-sm" onclick="openAuth('signup')">Get Started Free</button>
          <button class="hamb-btn" onclick="toggleMobileDrawer()" aria-label="Menu">☰</button>
        </div>
      </div>
      <div id="mobile-drawer" class="mobile-drawer hidden">
        ${guestLinks.map(l => `<a href="#${l.h}" class="${route===l.h ? 'active' : ''}" onclick="closeMobileDrawer()">${l.l}</a>`).join("")}
        <div class="drawer-divider"></div>
        <a onclick="openAuth('login');closeMobileDrawer()">Log In</a>
        <a onclick="openAuth('signup');closeMobileDrawer()" style="color:var(--primary);font-weight:700">Get Started Free</a>
      </div>`;
    return;
  }

  const appLinks = [
    { h: "dashboard", l: "Dashboard" },
    { h: "chat",      l: "Elix AI" },
    { h: "medicines", l: "Medicines" },
    { h: "hospitals", l: "Hospitals" },
    { h: "more",      l: "Emergency" },
  ];
  const init = (state.user.name || state.user.email || "U").charAt(0).toUpperCase();
  const displayName = (state.user.name || state.user.email || "User").split(" ")[0];

  h.innerHTML = `
    <div class="header-inner">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="hamb-btn" onclick="openSidebar()" aria-label="Open menu" style="display:flex">☰</button>
        <a href="#dashboard" class="logo">${logoHtml(22)}<span>Mendly</span></a>
      </div>
      <nav class="header-nav">
        ${appLinks.map(l => `<a href="#${l.h}" class="${route===l.h ? 'active' : ''}">${l.l}</a>`).join("")}
      </nav>
      <div class="header-actions">
        <button class="theme-btn" onclick="toggleTheme()" aria-label="Toggle theme">${state.theme==="dark" ? "☀️" : "🌙"}</button>
        <div class="header-avatar" onclick="navigate('account')" title="Account">${init}</div>
      </div>
    </div>`;
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
  if (!state.user) {
    s.innerHTML = "";
    s.style.display = "none";
    return;
  }
  s.style.display = "";

  const items = [
    { h: "dashboard", icon: "🏠", l: "Home" },
    { h: "chat",      icon: "🤖", l: "Elix AI" },
    { h: "medicines", icon: "💊", l: "Medicines" },
    { h: "hospitals", icon: "🏥", l: "Hospitals" },
    { h: "more",      icon: "🆘", l: "Emergency" },
  ];
  const bottomItems = [
    { h: "account", icon: "⚙️", l: "Settings" },
  ];

  s.innerHTML = `
    <div style="flex:1">
      <div class="sidebar-label">Navigation</div>
      ${items.map(i => `
        <a class="sidebar-item ${route===i.h ? 'active' : ''}" href="#${i.h}" onclick="closeSidebar()">
          <span class="sidebar-icon">${i.icon}</span>${i.l}
        </a>`).join("")}
    </div>
    <div>
      <div class="sidebar-divider"></div>
      ${bottomItems.map(i => `
        <a class="sidebar-item ${route===i.h ? 'active' : ''}" href="#${i.h}" onclick="closeSidebar()">
          <span class="sidebar-icon">${i.icon}</span>${i.l}
        </a>`).join("")}
      <a class="sidebar-item sidebar-logout" href="#" onclick="if(confirm('Log out?')){logout();}">
        <span class="sidebar-icon">🚪</span>Log Out
      </a>
    </div>`;
}

/* ── Mobile Bottom Nav ── */
function renderMobileNav(route) {
  const m = document.getElementById("mobile-nav");
  if (!state.user) { m.innerHTML = ""; return; }
  const tabs = [
    { h: "dashboard", l: "Home",      i: "🏠" },
    { h: "chat",      l: "Activity",  i: "🤖" },
    { h: "medicines", l: "Vitals",    i: "💊" },
    { h: "account",   l: "Profile",   i: "👤" },
    { h: "more",      l: "Settings",  i: "⚙️" },
  ];
  m.innerHTML = tabs.map(t => `
    <a href="#${t.h}" class="${route===t.h ? 'active' : ''}">
      <span class="nav-icon">${t.i}</span>${t.l}
    </a>`).join("");
}

/* ═══════════════════════════════════════════════════
   AUTH MODAL
════════════════════════════════════════════════════ */
let authMode = "login";
function openAuth(mode) { authMode = mode; renderAuthModal(); }
function closeAuth() { document.getElementById("auth-modal").innerHTML = ""; }

function renderAuthModal() {
  document.getElementById("auth-modal").innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeAuth()">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2 class="modal-title">${authMode === "login" ? "Welcome Back 👋" : "Create Account"}</h2>
          <button class="modal-close" onclick="closeAuth()" aria-label="Close">✕</button>
        </div>
        <div id="auth-error" class="form-error hidden"></div>
        ${authMode === "signup" ? `<div class="form-group"><input id="auth-name" class="form-input" placeholder="Full Name" autocomplete="name" /></div>` : ""}
        <div class="form-group"><input id="auth-email" class="form-input" type="email" placeholder="Email address" autocomplete="email" /></div>
        <div class="form-group"><input id="auth-pass" class="form-input" type="password" placeholder="Password" autocomplete="${authMode==="login"?"current":"new"}-password" /></div>
        <button id="auth-submit" class="form-submit" onclick="submitAuth()">
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
  errEl.classList.add("hidden"); errEl.textContent = "";
  if (!email || !pass) { errEl.textContent = "Please fill in all fields."; errEl.classList.remove("hidden"); return; }
  const btn = document.getElementById("auth-submit");
  btn.disabled = true; btn.textContent = "Loading...";
  try {
    const body = authMode === "login"
      ? { email, password: pass }
      : { name: name || email.split("@")[0], email, password: pass };
    const res = await fetch(`${API}/auth/${authMode === "login" ? "login" : "signup"}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.detail || "Something went wrong."; errEl.classList.remove("hidden"); return; }
    login(data.access_token, data.user); closeAuth(); navigate("dashboard");
  } catch {
    errEl.textContent = "Network error. Please try again."; errEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btn.textContent = authMode === "login" ? "Sign In" : "Create Account";
  }
}

/* ═══════════════════════════════════════════════════
   DASHBOARD — Health Overview mockup
════════════════════════════════════════════════════ */
const HEALTH_TIPS = [
  { title: "Hydration",     text: "Staying hydrated helps maintain energy and supports cognitive function. Aim for 8 glasses daily." },
  { title: "Sleep",         text: "Adults need 7-9 hours of quality sleep per night. Consistent schedules improve overall health." },
  { title: "Movement",      text: "Just 30 minutes of moderate exercise daily can reduce heart disease risk and improve mood." },
  { title: "Nutrition",     text: "A balanced diet rich in fruits, vegetables, and whole grains supports long-term health and immunity." },
  { title: "Mental Health", text: "Short breaks throughout the day reduce stress and improve focus. Practice mindfulness when possible." },
];

/* SVG ring chart for activity */
function ringChartSvg(pct, color1 = "#1a8a7d", color2 = "#0ea5e9") {
  const r = 52, cx = 60, cy = 60, circ = 2 * Math.PI * r;
  const dashLen = (pct / 100) * circ;
  const id = "rg" + Math.random().toString(36).slice(2, 6);
  return `<svg width="120" height="120" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${color1}"/>
        <stop offset="100%" stop-color="${color2}"/>
      </linearGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="10"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
      stroke="url(#${id})" stroke-width="10" stroke-linecap="round"
      stroke-dasharray="${dashLen} ${circ}" stroke-dashoffset="0"
      transform="rotate(-90 ${cx} ${cy})"
      style="transition:stroke-dasharray 1s ease"/>
  </svg>`;
}

/* SVG line chart for heart rate */
function heartRateChartSvg() {
  const w = 420, h = 130;
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const line1 = [82, 90, 85, 100, 95, 108, 118]; // current week
  const line2 = [68, 75, 72, 82,  78,  88,  95];  // previous week
  const minV = 60, maxV = 140, range = maxV - minV;
  const pts = (arr) => arr.map((v, i) => {
    const x = (i / (arr.length - 1)) * (w - 40) + 20;
    const y = h - ((v - minV) / range) * (h - 20) - 10;
    return `${x},${y}`;
  }).join(" ");

  const yLabels = [140, 120, 100, 80, 60];
  const yLines = yLabels.map(v => {
    const y = h - ((v - minV) / range) * (h - 20) - 10;
    return `<line x1="20" y1="${y}" x2="${w-20}" y2="${y}" stroke="var(--border)" stroke-width="1" stroke-dasharray="4"/>
            <text x="14" y="${y+4}" font-size="9" fill="var(--muted)" text-anchor="end">${v}</text>`;
  }).join("");

  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="dash-chart-svg">
    <defs>
      <linearGradient id="chartGrad1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1a8a7d" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#1a8a7d" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${yLines}
    <polyline points="${pts(line2)}" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-dasharray="5 3" opacity="0.5"/>
    <polyline points="${pts(line1)}" fill="none" stroke="#1a8a7d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${line1.map((v, i) => {
      const x = (i / (line1.length - 1)) * (w - 40) + 20;
      const y = h - ((v - minV) / range) * (h - 20) - 10;
      return `<circle cx="${x}" cy="${y}" r="3.5" fill="#1a8a7d"/>`;
    }).join("")}
  </svg>
  <div class="chart-x-labels">${days.map(d => `<span>${d}</span>`).join("")}</div>`;
}

/* SVG weight sparkline */
function weightSparkSvg() {
  const w = 180, h = 55;
  const vals = [84, 83.5, 83, 82.8, 82.2, 81.9, 81.5];
  const min = Math.min(...vals) - 0.5, max = Math.max(...vals) + 0.5;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * (w - 20) + 10;
    const y = h - ((v - min) / (max - min)) * (h - 10) - 5;
    return `${x},${y}`;
  }).join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" class="weight-spark">
    <polyline points="${pts}" fill="none" stroke="#0ea5e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * (w - 20) + 10;
      const y = h - ((v - min) / (max - min)) * (h - 10) - 5;
      return i === vals.length - 1 ? `<circle cx="${x}" cy="${y}" r="4" fill="#0ea5e9"/>` : "";
    }).join("")}
  </svg>`;
}

/* Sleep bars */
function sleepBarsSvg() {
  const heights = [55, 80, 65, 90, 70, 85, 75]; // % of max height
  return heights.map(h =>
    `<div class="sleep-bar" style="height:${h}%;opacity:${0.5 + h/200}"></div>`
  ).join("");
}

function renderDashboard() {
  const name = state.user?.name?.split(" ")[0] || "there";
  const tip  = HEALTH_TIPS[new Date().getDay() % HEALTH_TIPS.length];
  const memberSince = state.user?.created_at
    ? new Date(state.user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "Recent";
  const initials = (state.user?.name || state.user?.email || "U").charAt(0).toUpperCase();
  const displayName = (state.user?.name || "User").split(" ").slice(0, 2).join(" ");

  const quickActions = [
    { icon: "🤖", label: "Elix AI",    hash: "chat",      color: "rgba(26,138,125,0.12)" },
    { icon: "💊", label: "Medicines",  hash: "medicines", color: "rgba(14,165,233,0.12)" },
    { icon: "🏥", label: "Hospitals",  hash: "hospitals", color: "rgba(245,158,11,0.12)" },
    { icon: "🆘", label: "Emergency",  hash: "more",      color: "rgba(239,68,68,0.12)"  },
  ];

  document.getElementById("view-dashboard").innerHTML = `
  <div class="dash-layout">

    <!-- Icon sidebar -->
    <div class="dash-sidebar">
      <div class="dash-sidebar-btn active" onclick="navigate('dashboard')" title="Home">🏠</div>
      <div class="dash-sidebar-btn" onclick="navigate('chat')" title="Activity">📊</div>
      <div class="dash-sidebar-btn" onclick="navigate('medicines')" title="Medicines">💊</div>
      <div class="dash-sidebar-btn" onclick="navigate('account')" title="Settings">⚙️</div>
      <div style="margin-top:auto">
        <div class="dash-sidebar-btn" onclick="navigate('account')" title="Info">ℹ️</div>
      </div>
    </div>

    <!-- Main content -->
    <div class="dash-main">

      <!-- Top bar -->
      <div class="dash-topbar">
        <div class="dash-search">
          <input type="text" placeholder="Search..." onkeydown="if(event.key==='Enter')navigate('medicines')" />
        </div>
        <div class="dash-topbar-right">
          <div class="dash-notif"><span>🔔</span><div class="dash-notif-dot"></div></div>
          <div class="dash-user-chip" onclick="navigate('account')">
            <div class="chip-avatar">${initials}</div>
            <span>${escapeHtml(displayName)}</span>
            <span class="chip-caret">▾</span>
          </div>
        </div>
      </div>

      <!-- Quick action cards -->
      <div class="dash-quick-grid">
        ${quickActions.map(c => `
          <div class="dash-quick-card" onclick="navigate('${c.hash}')">
            <div class="dash-quick-icon" style="background:${c.color}">${c.icon}</div>
            <div class="dash-quick-label">${c.label}</div>
          </div>`).join("")}
      </div>

      <!-- Main 3-col grid -->
      <div class="dash-grid">

        <!-- Left column -->
        <div class="dash-left-col">
          <!-- Daily Activity -->
          <div class="dash-stat-card" style="margin-bottom:20px">
            <div class="dash-stat-title">Daily Activity</div>
            <div class="dash-ring-wrap">
              <div class="dash-ring">${ringChartSvg(75)}<div class="dash-ring-label"><div class="dash-ring-pct">75%</div><div class="dash-ring-sub">Complete</div></div></div>
              <div class="dash-ring-steps">7,500 <span>Steps</span></div>
            </div>
            <div class="dash-steps-row">
              <div class="dash-steps-item">
                <span>🔥</span>
                <div><div class="dash-steps-val">7,500</div><div class="dash-steps-lbl">Burnt</div></div>
              </div>
              <div class="dash-steps-item">
                <span>👟</span>
                <div><div class="dash-steps-val">7,500</div><div class="dash-steps-lbl">Steps</div></div>
              </div>
            </div>
          </div>

          <!-- Sleep Quality -->
          <div class="dash-stat-card">
            <div class="dash-stat-title">Sleep Quality <span>🌙</span></div>
            <div class="dash-sleep-chart">${sleepBarsSvg()}</div>
            <div class="dash-sleep-time">7h 20m</div>
          </div>
        </div>

        <!-- Center column -->
        <div class="dash-center">
          <!-- Health Overview chart -->
          <div class="dash-overview-card">
            <div class="dash-overview-header">
              <div class="dash-overview-title">Your Health Overview</div>
              <div class="dash-period-select">Last 7 Days ▾</div>
            </div>
            <div style="font-size:13px;font-weight:600;color:var(--muted);margin-bottom:10px">Heart Rate (bpm)</div>
            <div class="dash-chart-area">${heartRateChartSvg()}</div>
          </div>

          <!-- Blood Pressure + Weight -->
          <div class="dash-sub-row">
            <div class="dash-bp-card">
              <div class="dash-bp-title">Blood Pressure</div>
              <div class="bp-bar-wrap">
                <div class="bp-bar-track"><div class="bp-bar-fill bp-bar-sys"></div></div>
                <div class="bp-bar-track"><div class="bp-bar-fill bp-bar-dia"></div></div>
              </div>
              <div class="bp-value">120/80</div>
            </div>
            <div class="dash-weight-card">
              <div class="dash-weight-title">Weight Tracker</div>
              ${weightSparkSvg()}
              <div style="font-size:20px;font-weight:800;font-family:var(--font-display);color:var(--fg);margin-top:6px">81.5 <span style="font-size:13px;color:var(--muted);font-weight:500">kg</span></div>
            </div>
          </div>

          <!-- Daily Tip -->
          <div class="dash-tip-card">
            <div class="dash-tip-head"><span>💡</span><h4>Daily Tip — ${tip.title}</h4></div>
            <p>${tip.text}</p>
          </div>
        </div>

        <!-- Right column -->
        <div class="dash-right-col">
          <!-- Upcoming Appointments -->
          <div class="dash-appt-card">
            <div class="dash-section-title">Upcoming Appointments</div>
            <div class="appt-item">
              <div class="appt-icon">📅</div>
              <div><div class="appt-day">Monday 11:30 am</div><div class="appt-time">8:00 AM – 2:00 pm</div></div>
            </div>
            <div class="appt-item">
              <div class="appt-icon">📅</div>
              <div><div class="appt-day">Friday – 3:30 pm</div><div class="appt-time">8:00 AM – 7:00 pm</div></div>
            </div>
          </div>

          <!-- Hydration Goal -->
          <div class="dash-hydration-card">
            <div class="dash-section-title">💧 Hydration Goal</div>
            <div class="hydration-bar-wrap">
              <div class="hydration-track"><div class="hydration-fill"></div></div>
              <div class="hydration-label"><span>1.6L / 2.5L</span><span>65%</span></div>
            </div>
          </div>

          <!-- Community Challenges -->
          <div class="dash-community-card">
            <div class="dash-section-title">👥 Community Challenges</div>
            <p class="community-desc">Join our consumers to community challenges to get in touch.</p>
            <button class="community-join-btn" onclick="navigate('chat')">Join Challenge</button>
          </div>

          <!-- Member badge -->
          <div style="background:var(--primary-light);border:1px solid var(--primary-mid);border-radius:var(--radius);padding:14px 16px;text-align:center">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--primary);margin-bottom:4px">Member Since</div>
            <div style="font-size:16px;font-weight:800;font-family:var(--font-display);color:var(--fg)">${memberSince}</div>
          </div>
        </div>

      </div><!-- end dash-grid -->
    </div><!-- end dash-main -->
  </div><!-- end dash-layout -->`;
}

/* ═══════════════════════════════════════════════════
   CHAT
════════════════════════════════════════════════════ */
let chatMsgs = [{ role: "bot", content: "Hi! I'm Elix, your AI health companion. How can I help you today?" }];
let chatLoading = false;
let chatFiles = [];

const CHAT_PROMPTS = [
  "What are the side effects of ibuprofen?",
  "Find hospitals near me",
  "What is paracetamol used for?",
  "Check drug interactions",
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
      <div class="chat-msg-text">${escapeHtml(m.content)}</div>
      ${m.files?.length ? `<div class="chat-files">${m.files.map(f => `<span class="chat-file-badge">📎 ${escapeHtml(f.name)}</span>`).join("")}</div>` : ""}
    </div>`).join("");

  const typing = chatLoading
    ? '<div class="chat-msg chat-bot"><div class="chat-bot-label">Elix AI</div><div class="typing-dots"><span></span><span></span><span></span></div></div>'
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

  document.getElementById("view-chat").innerHTML = `
    <div class="chat-wrap">
      ${guestBanner}
      <div class="chat-msgs" id="chat-msgs">${msgs}${typing}${prompts}</div>
      ${filePreview}
      <div class="chat-input-bar">
        <button class="chat-attach" onclick="triggerChatUpload()" title="Attach file" ${isGuest ? "disabled" : ""}>📎</button>
        <input type="file" id="chat-file-input" multiple accept="image/*,.pdf,.txt,.doc,.docx" style="display:none" onchange="handleChatFiles(this.files)" />
        <textarea id="chat-input" class="chat-textarea" rows="1"
          placeholder="${isGuest ? "Ask a health question..." : "Ask about symptoms, medicines..."}"
          oninput="autoResize(this)"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChat();}"
          ${chatLoading ? "disabled" : ""}></textarea>
        <button class="chat-send" id="chat-send" onclick="sendChat()" ${chatLoading ? "disabled" : ""}>➤</button>
      </div>
    </div>`;

  const msgsEl = document.getElementById("chat-msgs");
  if (msgsEl) msgsEl.scrollTo({ top: msgsEl.scrollHeight, behavior: "smooth" });
  const inp = document.getElementById("chat-input");
  if (inp && !chatLoading) inp.focus();
}

function triggerChatUpload() {
  if (!state.user) { openAuth("signup"); return; }
  document.getElementById("chat-file-input").click();
}
function handleChatFiles(fileList) {
  if (!state.user) { openAuth("signup"); return; }
  for (const f of fileList) {
    if (f.size > 10 * 1024 * 1024) { alert(`${f.name} is too large (max 10MB)`); continue; }
    chatFiles.push(f);
  }
  document.getElementById("chat-file-input").value = "";
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
  const text = inp.value.trim();
  if ((!text && !chatFiles.length) || chatLoading) return;
  const files = [...chatFiles];
  chatFiles = [];
  chatMsgs.push({ role: "user", content: text || "(file attached)", files: files.length ? files.map(f => ({ name: f.name })) : undefined });
  inp.value = ""; chatLoading = true; renderChat();
  const safetyTimer = setTimeout(() => { if (chatLoading) { chatLoading = false; renderChat(); } }, 60000);
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
      chatMsgs.push({ role: "bot", content: res.ok ? (data.response || data.reply || "Done!") : (data.detail || "Upload failed.") });
    } else {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}) },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json().catch(() => ({}));
      chatMsgs.push({ role: "bot", content: res.ok ? (data.response || data.reply || "I'm not sure.") : (data.detail || "Failed. Please try again.") });
    }
  } catch { chatMsgs.push({ role: "bot", content: "Sorry, I'm having trouble connecting." }); }
  clearTimeout(safetyTimer);
  chatLoading = false; renderChat();
}

/* ═══════════════════════════════════════════════════
   MEDICINES
════════════════════════════════════════════════════ */
function renderMedicines() {
  document.getElementById("view-medicines").innerHTML = `
    <div class="page">
      <div class="page-header">
        <h2 class="page-title"><span class="page-title-icon">💊</span> Medicine Search</h2>
        <p class="page-sub">Search medications by name, ingredient, or use.</p>
      </div>
      <div class="search-row">
        <input id="med-search" class="search-input" placeholder="e.g. paracetamol, painkiller..." onkeydown="if(event.key==='Enter')searchMedicines()" />
        <button class="btn btn-primary" onclick="searchMedicines()">Search</button>
        <button class="btn btn-ghost" onclick="clearMedSearch()">Clear</button>
      </div>
      <div id="med-results" class="search-results">
        <div class="empty-state"><div class="empty-icon">🔍</div><p>Search for a medicine to see results</p></div>
      </div>
    </div>`;
}

function clearMedSearch() {
  const el = document.getElementById("med-search"); if (el) el.value = "";
  document.getElementById("med-results").innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>Search for a medicine to see results</p></div>';
}

async function searchMedicines() {
  const q = document.getElementById("med-search")?.value.trim();
  if (!q) return;
  const el = document.getElementById("med-results"); el.innerHTML = '<div class="spinner"></div>';
  try {
    const res = await fetch(`${API}/medicines/search`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }),
    });
    const data = await res.json();
    const items = data.results || data.medicines || [];
    if (!items.length) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">😔</div><p>No results for "${escapeHtml(q)}"</p></div>`; return; }
    el.innerHTML = `<div class="search-count">${items.length} result${items.length !== 1 ? "s" : ""} found</div>` +
      items.map(i => `
        <div class="result-card">
          <h3>${escapeHtml(i.name || i.brand_name || "Unknown")}</h3>
          ${i.manufacturer_name ? `<p>🏭 ${escapeHtml(i.manufacturer_name)}</p>` : ""}
          ${i.active_ingredients ? `<p>🧪 Ingredients: ${escapeHtml(i.active_ingredients)}</p>` : ""}
          ${i.dosage_form ? `<p>💊 Form: ${escapeHtml(i.dosage_form)}</p>` : ""}
          ${i.uses?.length ? `<p>✅ Uses: ${i.uses.slice(0, 3).map(u => escapeHtml(u)).join(", ")}${i.uses.length > 3 ? "…" : ""}</p>` : ""}
        </div>`).join("");
  } catch { el.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error fetching results</p></div>'; }
}

/* ── Hospitals ── */
function clearHospSearch() {
  const el = document.getElementById("hosp-search"); if (el) el.value = "";
  document.getElementById("hosp-results").innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>Search for hospitals in your area</p></div>';
}

async function searchHospitals() {
  const q = document.getElementById("hosp-search")?.value.trim() || "";
  const el = document.getElementById("hosp-results"); el.innerHTML = '<div class="spinner"></div>';
  const body = { lat: 0, lng: 0, query: q || null };
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => { body.lat = pos.coords.latitude; body.lng = pos.coords.longitude; fetchHospitals(body, el); },
      ()  => fetchHospitals(body, el), { timeout: 5000 }
    );
  } else { fetchHospitals(body, el); }
}

async function fetchHospitals(body, el) {
  try {
    const res = await fetch(`${API}/emergency/hospitals/search`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    const items = data.results || data.hospitals || [];
    if (!items.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">🏥</div><p>No hospitals found</p></div>'; return; }
    el.innerHTML = `<div class="search-count">${items.length} hospital${items.length !== 1 ? "s" : ""} found</div>` +
      items.map(i => `
        <div class="result-card">
          <h3>${escapeHtml(i.name)}</h3>
          ${i.address ? `<p>📍 ${escapeHtml(i.address)}</p>` : ""}
          ${i.phone   ? `<p>📞 <a href="tel:${i.phone}" style="color:var(--primary);font-weight:600">${escapeHtml(i.phone)}</a></p>` : ""}
          ${i.rating  ? `<p>⭐ ${i.rating}/5</p>` : ""}
        </div>`).join("");
  } catch { el.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error fetching results</p></div>'; }
}

/* ── Emergency ── */
function renderMore() {
  const list = [
    { country: "India",     number: "112", label: "All Emergencies" },
    { country: "USA",       number: "911", label: "All Emergencies" },
    { country: "UK",        number: "999", label: "All Emergencies" },
    { country: "Australia", number: "000", label: "All Emergencies" },
    { country: "Canada",    number: "911", label: "All Emergencies" },
    { country: "Germany",   number: "112", label: "All Emergencies" },
    { country: "Japan",     number: "110", label: "Police" },
    { country: "Japan",     number: "119", label: "Fire / Ambulance" },
  ];
  document.getElementById("view-more").innerHTML = `
    <div class="page">
      <div class="page-header">
        <h2 class="page-title"><span class="page-title-icon">🚨</span> Emergency Contacts</h2>
        <p class="page-sub">Tap a number to call directly.</p>
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

  document.getElementById("view-account").innerHTML = `
    <div class="page" style="max-width:580px">
      <div class="page-header">
        <h2 class="page-title">Account</h2>
      </div>

      <div class="acct-card acct-profile" style="margin-bottom:16px">
        <div class="acct-avatar">${initials}</div>
        <div class="acct-name">${escapeHtml(u?.name || "User")}</div>
        <div class="acct-email">${escapeHtml(u?.email || "")}</div>
        <div class="acct-meta">Member since ${memberSince}</div>
      </div>

      <div class="acct-card" style="margin-bottom:16px">
        <div class="acct-section-title">Preferences</div>
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

      <div class="acct-card" style="margin-bottom:16px">
        <div class="acct-section-title">Security</div>
        <div class="setting-row">
          <div>
            <div class="setting-label">Change Password</div>
            <div class="setting-desc">Update your account password</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="showPasswordChange()">Update</button>
        </div>
      </div>

      <div id="pw-change-area"></div>

      <button class="btn btn-danger" style="width:100%;justify-content:center;margin-top:4px"
        onclick="if(confirm('Log out of Mendly?')){logout();}">
        🚪 Log Out
      </button>
    </div>`;
}

function showPasswordChange() {
  const area = document.getElementById("pw-change-area");
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
  if (!cur || !nw) { errEl.textContent = "Please fill in both fields."; errEl.classList.remove("hidden"); return; }
  if (nw.length < 6) { errEl.textContent = "Password must be at least 6 characters."; errEl.classList.remove("hidden"); return; }
  errEl.classList.add("hidden");
  try {
    const res = await authFetch("/profile/change-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: cur, new_password: nw }),
    });
    if (res.status === "error" || res.detail) { errEl.textContent = res.detail || "Failed to update password."; errEl.classList.remove("hidden"); return; }
    alert(res.message || "Password updated successfully.");
    document.getElementById("pw-change-area").innerHTML = "";
  } catch { errEl.textContent = "Network error."; errEl.classList.remove("hidden"); }
}

/* ═══════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════ */
loadState();
applyTheme();
document.addEventListener("DOMContentLoaded", () => render());
