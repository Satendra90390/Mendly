const API = location.hostname === "localhost"
  ? "http://localhost:8002/api"
  : "https://mendly-backend-0vyg.onrender.com/api";

let state = { user: null, token: null, theme: "light" };

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
function logout() { state.token = null; state.user = null; saveState(); navigate(); }

function applyTheme() {
  document.documentElement.classList.toggle("dark", state.theme === "dark");
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  saveState(); applyTheme(); renderHeader();
}

/* ── Router ── */
const AUTH_REQUIRED = new Set(["dashboard", "account"]);
const GUEST_ALLOWED = new Set(["landing", "chat", "medicines", "hospitals", "more"]);

function navigate(hash) {
  const target = hash || location.hash.slice(1) || (state.user ? "dashboard" : "landing");
  if (!hash) history.replaceState(null, "", `#${target}`);
  else history.pushState(null, "", `#${target}`);
  render();
}

window.addEventListener("hashchange", render);
window.addEventListener("popstate", render);

/* ── Render ── */
function render() {
  applyTheme();
  const route = location.hash.slice(1) || (state.user ? "dashboard" : "landing");
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));

  if (AUTH_REQUIRED.has(route) && !state.user) { openAuth("signup"); return; }
  if (!GUEST_ALLOWED.has(route) && !state.user) { navigate("landing"); return; }
  if (state.user && route === "landing") { navigate("dashboard"); return; }

  renderHeader();
  const el = document.getElementById(`view-${route}`);
  if (el) el.classList.add("active");
  renderMobileNav(route);

  switch (route) {
    case "landing": break;
    case "dashboard": renderDashboard(); break;
    case "chat": renderChat(); break;
    case "medicines": renderMedicines(); break;
    case "hospitals": break;
    case "more": renderMore(); break;
    case "account": renderAccount(); break;
  }
}

function logoSvg() {
  return '<svg viewBox="0 0 32 32" fill="none"><defs><linearGradient id="lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop stop-color="#1a8a7d"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#lg)"/><text x="16" y="22" text-anchor="middle" font-family="Georgia,serif" font-size="18" font-weight="700" fill="white">M</text></svg>';
}

/* ── Header ── */
function renderHeader() {
  const h = document.getElementById("header");
  if (!state.user) { h.innerHTML = `
    <div class="header-top"><div class="header-inner">
      <a href="#landing" class="logo"><div class="logo-icon">${logoSvg()}</div>Mendly</a>
      <div class="header-links"><a href="#landing">Home</a></div>
      <div class="header-actions">
        <button class="theme-btn" onclick="toggleTheme()">${state.theme === "dark" ? "☀️" : "🌙"}</button>
        <button class="btn btn-secondary btn-sm" onclick="openAuth('login')">Sign In</button>
        <button class="btn btn-primary btn-sm" onclick="openAuth('signup')">Get Started</button>
      </div>
    </div></div>`; return;
  }
  const init = (state.user.name || state.user.email || "U").charAt(0).toUpperCase();
  const links = [
    { h: "#dashboard", l: "Dashboard" }, { h: "#chat", l: "Elix" },
    { h: "#medicines", l: "Medicines" }, { h: "#hospitals", l: "Hospitals" },
    { h: "#more", l: "More" },
  ];
  const route = location.hash.slice(1) || "dashboard";
  h.innerHTML = `
    <div class="header-top"><div class="header-inner">
      <a href="#dashboard" class="logo"><div class="logo-icon">${logoSvg()}</div>Mendly</a>
      <div class="header-links">${links.map(l => `<a href="${l.h}" class="${route === l.h.slice(1) ? 'active' : ''}">${l.l}</a>`).join("")}</div>
      <div class="header-actions">
        <button class="theme-btn" onclick="toggleTheme()">${state.theme === "dark" ? "☀️" : "🌙"}</button>
        <div class="avatar" onclick="navigate('account')" style="cursor:pointer">${init}</div>
        <button class="btn-icon theme-btn" onclick="document.getElementById('mobile-menu').classList.toggle('hidden')" style="font-size:20px">☰</button>
      </div>
    </div></div>
    <div id="mobile-menu" class="mobile-menu hidden">
      ${links.map(l => `<a href="${l.h}">${l.l}</a>`).join("")}
      <a href="#account">Account</a>
      <a href="#" onclick="logout()" style="color:#ef4444">Log Out</a>
    </div>`;
}

function renderMobileNav(route) {
  const m = document.getElementById("mobile-nav");
  if (!state.user) { m.innerHTML = ""; return; }
  const tabs = [
    { h: "#dashboard", l: "Home", i: "📊" }, { h: "#chat", l: "Elix", i: "🤖" },
    { h: "#medicines", l: "Medicines", i: "💊" }, { h: "#hospitals", l: "Hospitals", i: "🏥" },
    { h: "#more", l: "More", i: "⋯" },
  ];
  m.innerHTML = tabs.map(t =>
    `<a href="${t.h}" class="${route === t.h.slice(1) ? 'active' : ''}"><span>${t.i}</span>${t.l}</a>`
  ).join("");
}

/* ── Auth Modal ── */
let authMode = "login";
function openAuth(mode) { authMode = mode; renderAuthModal(); }
function closeAuth() { document.getElementById("auth-modal").innerHTML = ""; }
async function submitAuth() {
  const email = document.getElementById("auth-email").value;
  const pass = document.getElementById("auth-pass").value;
  const name = document.getElementById("auth-name")?.value;
  if (!email || !pass) { document.getElementById("auth-error").textContent = "Please fill in all fields"; return; }
  document.getElementById("auth-error").textContent = "";
  const btn = document.getElementById("auth-submit"); btn.disabled = true; btn.textContent = "Loading...";
  try {
    const body = authMode === "login" ? { email, password: pass } : { name: name || email.split("@")[0], email, password: pass };
    const res = await fetch(`${API}/auth/${authMode === "login" ? "login" : "signup"}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { document.getElementById("auth-error").textContent = data.detail || "Something went wrong"; return; }
    login(data.access_token, data.user); closeAuth(); navigate("dashboard");
  } catch { document.getElementById("auth-error").textContent = "Network error. Try again."; }
  finally { btn.disabled = false; btn.textContent = authMode === "login" ? "Sign In" : "Create Account"; }
}

function renderAuthModal() {
  document.getElementById("auth-modal").innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeAuth()">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">${authMode === "login" ? "Welcome Back" : "Create Account"}</h2>
          <button class="modal-close" onclick="closeAuth()">✕</button>
        </div>
        <div id="auth-error" class="form-error hidden"></div>
        ${authMode === "signup" ? '<div class="form-group"><input id="auth-name" class="form-input" placeholder="Full Name" /></div>' : ""}
        <div class="form-group"><input id="auth-email" class="form-input" type="email" placeholder="Email" autocomplete="email" /></div>
        <div class="form-group"><div class="form-row"><input id="auth-pass" class="form-input" type="password" placeholder="Password" autocomplete="current-password" /></div></div>
        <button id="auth-submit" class="btn btn-primary form-submit" onclick="submitAuth()">${authMode === "login" ? "Sign In" : "Create Account"}</button>
        <div class="form-switch">${authMode === "login" ? 'Don\'t have an account? <a onclick="authMode=\'signup\';renderAuthModal()">Sign up</a>' : 'Already have an account? <a onclick="authMode=\'login\';renderAuthModal()">Sign in</a>'}</div>
      </div>
    </div>`;
}

/* ── Dashboard ── */
const HEALTH_TIPS = [
  { title: "Hydration", text: "Staying hydrated helps maintain energy levels and supports cognitive function. Aim for 8 glasses of water daily." },
  { title: "Sleep", text: "Adults need 7-9 hours of quality sleep per night. Consistent sleep schedules improve overall health." },
  { title: "Movement", text: "Just 30 minutes of moderate exercise daily can reduce the risk of heart disease and improve mood." },
  { title: "Nutrition", text: "A balanced diet rich in fruits, vegetables, and whole grains supports long-term health and immunity." },
  { title: "Mental Health", text: "Taking short breaks throughout the day can reduce stress and improve focus. Practice mindfulness when possible." },
];

function renderDashboard() {
  const cards = [
    { icon: "🤖", label: "Chat with Elix", color: "#1a8a7d", hash: "chat" },
    { icon: "💊", label: "Search Medicines", color: "#0ea5e9", hash: "medicines" },
    { icon: "🏥", label: "Nearby Hospitals", color: "#f59e0b", hash: "hospitals" },
    { icon: "🆘", label: "Emergency", color: "#ef4444", hash: "more" },
  ];
  const name = state.user?.name || "there";
  const tip = HEALTH_TIPS[new Date().getDay() % HEALTH_TIPS.length];
  const memberSince = state.user?.created_at
    ? new Date(state.user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "Recent";
  document.getElementById("view-dashboard").innerHTML = `
    <div class="page">
      <div class="dash-welcome">
        <div>
          <h1 class="dash-greeting">Hello, ${escapeHtml(name)} 👋</h1>
          <p class="dash-sub">What would you like to do today?</p>
        </div>
        <div class="dash-badge">Member since ${memberSince}</div>
      </div>
      <div class="dash-grid">${cards.map(c => `
        <div class="dash-card" onclick="navigate('${c.hash}')">
          <div class="dash-card-icon" style="background:${c.color}20">${c.icon}</div>
          <h3>${c.label}</h3>
        </div>`).join("")}
      </div>
      <div class="tip-card">
        <div class="tip-header">
          <span class="tip-icon">💡</span>
          <h3>Daily Tip — ${tip.title}</h3>
        </div>
        <p>${tip.text}</p>
      </div>
    </div>`;
}

/* ── Chat ── */
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
  const guestBanner = isGuest
    ? `<div class="guest-banner">
        <span>You're chatting as a guest.</span>
        <button class="btn btn-primary btn-sm" onclick="openAuth('signup')">Create Account</button>
        <span class="guest-banner-hint">Sign up to save chats & upload files</span>
       </div>`
    : "";
  const msgs = chatMsgs.map((m) => `
    <div class="chat-msg ${m.role === "user" ? "chat-user" : "chat-bot"}">
      ${m.role === "bot" ? '<div class="chat-bot-label">Elix</div>' : ""}
      <div class="chat-msg-text">${escapeHtml(m.content)}</div>
      ${m.files && m.files.length ? `<div class="chat-files">${m.files.map(f => `<span class="chat-file-badge">📎 ${escapeHtml(f.name)}</span>`).join("")}</div>` : ""}
    </div>`).join("");
  const typingHtml = chatLoading
    ? '<div class="chat-msg chat-bot"><div class="typing-dots"><span></span><span></span><span></span></div></div>'
    : "";
  const promptsHtml = chatMsgs.length <= 1 && !chatLoading
    ? `<div class="chat-prompts">${CHAT_PROMPTS.map(p =>
        `<button class="chat-prompt" onclick="document.getElementById('chat-input').value='${p}';sendChat()">${escapeHtml(p)}</button>`
      ).join("")}</div>`
    : "";
  const filePreview = chatFiles.length
    ? `<div class="chat-file-preview">${chatFiles.map((f, i) =>
        `<span class="chat-file-tag">📎 ${escapeHtml(f.name)} <button onclick="removeChatFile(${i})">✕</button></span>`
      ).join("")}</div>`
    : "";
  document.getElementById("view-chat").innerHTML = `
    <div class="chat-container">
      ${guestBanner}
      <div class="chat-msgs" id="chat-msgs">${msgs}${typingHtml}${promptsHtml}</div>
      ${filePreview}
      <div class="chat-input-wrap">
        <button class="chat-attach" onclick="triggerChatFileUpload()" title="Attach file" ${isGuest ? 'disabled' : ''}>📎</button>
        <input type="file" id="chat-file-input" multiple accept="image/*,.pdf,.txt,.doc,.docx" style="display:none" onchange="handleChatFiles(this.files)" />
        <textarea id="chat-input" class="chat-input" rows="1" placeholder="${isGuest ? 'Sign up to upload files...' : 'Ask about symptoms, medicines...'}" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChat()}" ${chatLoading ? "disabled" : ""}></textarea>
        <button class="chat-send" id="chat-send" onclick="sendChat()" ${chatLoading ? "disabled" : ""}>➤</button>
      </div>
    </div>`;
  const msgsEl = document.getElementById("chat-msgs");
  if (msgsEl) msgsEl.scrollTo({ top: msgsEl.scrollHeight, behavior: "smooth" });
  const inputEl = document.getElementById("chat-input");
  if (inputEl && !chatLoading) inputEl.focus();
}

function triggerChatFileUpload() {
  if (!state.user) { openAuth("signup"); return; }
  document.getElementById("chat-file-input").click();
}

function handleChatFiles(fileList) {
  if (!state.user) { openAuth("signup"); return; }
  for (const f of fileList) {
    if (f.size > 10 * 1024 * 1024) { alert(`${f.name} is too large (max 10MB)`); continue; }
    chatFiles.push(f);
  }
  renderChat();
}

function removeChatFile(idx) {
  chatFiles.splice(idx, 1);
  renderChat();
}

function escapeHtml(t) {
  return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;").replace(/\n/g,"<br>");
}

async function sendChat() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if ((!text && !chatFiles.length) || chatLoading) return;
  const files = [...chatFiles];
  chatFiles = [];
  const userMsg = { role: "user", content: text || "(file attached)", files: files.length ? files.map(f => ({ name: f.name, type: f.type, size: f.size })) : undefined };
  chatMsgs.push(userMsg);
  input.value = ""; chatLoading = true; renderChat();
  try {
    const history = chatMsgs.slice(-20).map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));
    const body = { message: text || "I've attached a file for you to review.", history };
    if (files.length) {
      if (!state.user) { openAuth("signup"); chatLoading = false; chatFiles = files; renderChat(); return; }
      const formData = new FormData();
      formData.append("message", body.message);
      formData.append("history", JSON.stringify(body.history));
      files.forEach(f => formData.append("files", f));
      const res = await fetch(`${API}/chat/upload`, {
        method: "POST",
        headers: state.token ? { Authorization: `Bearer ${state.token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        chatMsgs.push({ role: "bot", content: err.detail || "Upload failed. Please try again." });
      } else {
        const data = await res.json();
        chatMsgs.push({ role: "bot", content: data.response || data.message || "I'm not sure how to respond." });
      }
    } else {
      const res = await fetch(`${API}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json", ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}) },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      chatMsgs.push({ role: "bot", content: data.response || data.message || "I'm not sure how to respond." });
    }
  } catch { chatMsgs.push({ role: "bot", content: "Sorry, I'm having trouble connecting." }); }
  chatLoading = false; renderChat();
}

/* ── Medicines ── */
function renderMedicines() {
  document.getElementById("view-medicines").innerHTML = `
    <div class="page">
      <h2 style="font-size:22px;font-weight:700;margin-bottom:4px">💊 Medicine Search</h2>
      <p class="text-muted" style="margin-bottom:20px">Search medications by name, ingredient, or use.</p>
      <div class="search-row">
        <input id="med-search" class="search-input" placeholder="e.g. paracetamol, painkiller..." onkeydown="if(event.key==='Enter')searchMedicines()" />
        <button class="btn btn-primary" onclick="searchMedicines()">Search</button>
        <button class="btn btn-secondary" onclick="clearMedSearch()">Clear</button>
      </div>
      <div id="med-results" class="search-results"><div class="empty">🔍 Search for a medicine to see results</div></div>
    </div>`;
}

function clearMedSearch() {
  document.getElementById("med-search").value = "";
  document.getElementById("med-results").innerHTML = '<div class="empty">🔍 Search for a medicine to see results</div>';
}

async function searchMedicines() {
  const q = document.getElementById("med-search").value.trim();
  if (!q) return;
  const el = document.getElementById("med-results"); el.innerHTML = '<div class="spinner"></div>';
  try {
    const res = await fetch(`${API}/medicines/search`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    });
    const data = await res.json();
    const items = data.results || data.medicines || [];
    if (!items.length) { el.innerHTML = '<div class="empty">No results found for "' + escapeHtml(q) + '"</div>'; return; }
    el.innerHTML = `<div class="search-count">${items.length} result${items.length > 1 ? "s" : ""} found</div>` +
      items.map(i => `
      <div class="result-card">
        <h3>${escapeHtml(i.name || i.brand_name || "Unknown")}</h3>
        ${i.manufacturer_name ? `<p style="margin-bottom:2px">${escapeHtml(i.manufacturer_name)}</p>` : ""}
        ${i.active_ingredients ? `<p>Ingredients: ${escapeHtml(i.active_ingredients)}</p>` : ""}
        ${i.dosage_form ? `<p>Form: ${escapeHtml(i.dosage_form)}</p>` : ""}
        ${i.uses && i.uses.length ? `<p>Uses: ${i.uses.slice(0,3).map(u => escapeHtml(u)).join(", ")}${i.uses.length > 3 ? "..." : ""}</p>` : ""}
      </div>`).join("");
  } catch { el.innerHTML = '<div class="empty">Error fetching results</div>'; }
}

/* ── Hospitals ── */
function clearHospSearch() {
  document.getElementById("hosp-search").value = "";
  document.getElementById("hosp-results").innerHTML = '<div class="empty">🔍 Search for hospitals in your area</div>';
}

async function searchHospitals() {
  const q = document.getElementById("hosp-search").value.trim();
  const el = document.getElementById("hosp-results"); el.innerHTML = '<div class="spinner"></div>';
  try {
    const body = { lat: 0, lng: 0, query: q || null };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { body.lat = pos.coords.latitude; body.lng = pos.coords.longitude; fetchHospitals(body, el); },
        () => fetchHospitals(body, el), { timeout: 5000 }
      );
    } else { fetchHospitals(body, el); }
  } catch { el.innerHTML = '<div class="empty">Error fetching results</div>'; }
}

async function fetchHospitals(body, el) {
  try {
    const res = await fetch(`${API}/emergency/hospitals/search`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    const items = data.results || data.hospitals || [];
    if (!items.length) { el.innerHTML = '<div class="empty">No hospitals found</div>'; return; }
    el.innerHTML = `<div class="search-count">${items.length} hospital${items.length > 1 ? "s" : ""} found</div>` +
      items.map(i =>
      `<div class="result-card">
        <h3>${escapeHtml(i.name)}</h3>
        ${i.address ? `<p>${escapeHtml(i.address)}</p>` : ""}
        ${i.phone ? `<p>Phone: <a href="tel:${i.phone}" style="color:var(--primary)">${escapeHtml(i.phone)}</a></p>` : ""}
        ${i.rating ? `<p>Rating: ${i.rating}/5</p>` : ""}
      </div>`
    ).join("");
  } catch { el.innerHTML = '<div class="empty">Error fetching results</div>'; }
}

/* ── More (Emergency + links) ── */
function renderMore() {
  const emergencies = [
    { country: "India", number: "112", label: "All Emergencies" },
    { country: "USA", number: "911", label: "All Emergencies" },
    { country: "UK", number: "999", label: "All Emergencies" },
    { country: "Australia", number: "000", label: "All Emergencies" },
    { country: "Canada", number: "911", label: "All Emergencies" },
    { country: "Germany", number: "112", label: "All Emergencies" },
    { country: "Japan", number: "110", label: "Police" },
    { country: "Japan", number: "119", label: "Fire / Ambulance" },
  ];
  document.getElementById("view-more").innerHTML = `
    <div class="page">
      <h2 style="font-size:22px;font-weight:700;margin-bottom:4px">🚨 Emergency Contacts</h2>
      <p class="text-muted" style="margin-bottom:20px">Tap a number to call directly.</p>
      <div class="emergency-list">${emergencies.map(e =>
        `<a class="emergency-card" href="tel:${e.number}">
          <div class="emergency-info">
            <span class="emergency-country">${e.country}</span>
            <span class="emergency-label">${e.label}</span>
          </div>
          <span class="emergency-num">${e.number}</span>
        </a>`
      ).join("")}</div>
    </div>`;
}

/* ── Account ── */
function renderAccount() {
  const u = state.user;
  const init = (u?.name || u?.email || "U").charAt(0).toUpperCase();
  const bg = u?.avatar_color || "#1a8a7d";
  const memberSince = u?.created_at
    ? new Date(u.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "N/A";
  document.getElementById("view-account").innerHTML = `
    <div class="page" style="max-width:560px">
      <div class="account-profile">
        <div class="account-avatar" style="background:${bg}">${init}</div>
        <div class="account-name">${escapeHtml(u?.name || "User")}</div>
        <div class="account-email">${escapeHtml(u?.email || "")}</div>
        <div class="account-meta">Member since ${memberSince}</div>
      </div>
      <div class="account-section">
        <h3>Preferences</h3>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Dark Mode</span>
            <span class="setting-desc">Switch between light and dark themes</span>
          </div>
          <div class="toggle ${state.theme === "dark" ? "on" : "off"}" onclick="toggleTheme();renderAccount()">
            <div class="toggle-knob"></div>
          </div>
        </div>
      </div>
      <div class="account-section">
        <h3>Security</h3>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Change Password</span>
            <span class="setting-desc">Update your account password</span>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="showPasswordChange()">Update</button>
        </div>
      </div>
      <div id="pw-change-area"></div>
      <button class="btn btn-secondary" style="width:100%;border-color:#ef4444;color:#ef4444" onclick="if(confirm('Log out?')){logout();}">Log Out</button>
    </div>`;
}

function showPasswordChange() {
  const area = document.getElementById("pw-change-area");
  if (area.innerHTML) { area.innerHTML = ""; return; }
  area.innerHTML = `
    <div class="account-section" style="margin-top:16px">
      <div class="form-group">
        <input id="pw-current" class="form-input" type="password" placeholder="Current password" autocomplete="current-password" />
      </div>
      <div class="form-group">
        <input id="pw-new" class="form-input" type="password" placeholder="New password (min 6 chars)" autocomplete="new-password" />
      </div>
      <div id="pw-error" class="form-error hidden"></div>
      <button class="btn btn-primary btn-sm" onclick="changePassword()">Save Password</button>
    </div>`;
}

async function changePassword() {
  const cur = document.getElementById("pw-current").value;
  const nw = document.getElementById("pw-new").value;
  const errEl = document.getElementById("pw-error");
  if (!cur || !nw) { errEl.textContent = "Please fill in both fields"; errEl.classList.remove("hidden"); return; }
  if (nw.length < 6) { errEl.textContent = "Password must be at least 6 characters"; errEl.classList.remove("hidden"); return; }
  errEl.classList.add("hidden");
  try {
    const res = await authFetch("/profile/change-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: cur, new_password: nw }),
    });
    if (!res.ok) { errEl.textContent = res.detail || "Failed to update password"; errEl.classList.remove("hidden"); return; }
    alert("Password updated successfully");
    document.getElementById("pw-change-area").innerHTML = "";
  } catch { errEl.textContent = "Network error"; errEl.classList.remove("hidden"); }
}

/* ── Init ── */
loadState(); applyTheme();
document.addEventListener("DOMContentLoaded", () => render());
