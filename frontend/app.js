// ============================================================
// Mendly — App Controller
// ============================================================

const GUEST_CHAT_LIMIT = 5;

function isLoggedIn() {
    return !!getToken();
}

// XSS-safe JS string escaping for inline onclick handlers
function escapeJS(str) {
    if (!str) return "";
    return String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/</g, "\\x3c").replace(/>/g, "\\x3e").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}

let state = {
    medicines: [],
    renderedMedicines: [],
    currentFilter: "all",
    userLocation: null,
    savedSearches: [],
    lastViewedMedicine: null,
};

function debounce(fn, ms) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
}

let appInitialized = false;
function resetApp() { appInitialized = false; }

function initApp() {
    if (appInitialized) return;
    appInitialized = true;

    loadAllMedicines();
    loadDefaultEmergencyContacts();
    getUserLocation();
    loadChatStatus();
    loadDashboardStats();

    if (isLoggedIn()) {
        loadChatHistoryFromServer();
        loadSavedSearches();
        loadAccountStats();
        loadActivityLog();
    } else {
        renderWelcomeChat();
    }
}

// ------------------------------------------------------------
// Mobile menu toggle (dropdown)
// ------------------------------------------------------------
function toggleMobileMenu() {
    const overlay = document.getElementById("mobile-menu-overlay");
    const dropdown = document.getElementById("mobile-dropdown");
    overlay.classList.toggle("open");
    dropdown.classList.toggle("open");
}

// ------------------------------------------------------------
// Authenticated fetch wrapper
// ------------------------------------------------------------
async function authFetch(path, options = {}) {
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...authHeaders(),
                ...(options.headers || {}),
            },
        });
        if (res.status === 401) {
            throw new Error("Session expired. Please log in again.");
        }
        return res;
    } catch (e) {
        if (e.message === "Session expired. Please log in again.") throw e;
        if (!navigator.onLine) throw new Error("You are offline. Please check your internet connection.");
        if (e.name === "TypeError" || e.message.includes("fetch")) {
            throw new Error("Cannot reach server. Please try again later.");
        }
        throw e;
    }
}

// ============================================================
// VIEW ROUTING
// ============================================================
const VIEW_TITLES = {
    dashboard: "Dashboard",
    chatbot: "Elix",
    medicines: "Medicines",
    conditions: "Conditions",
    interactions: "Interactions",
    saved: "Saved Searches",
    emergency: "Emergency",
    hospitals: "Hospitals",
    pharmacies: "Pharmacies",
    activity: "Activity Log",
    account: "Account Settings",
};

function switchView(view) {
    if (["saved", "activity", "account"].includes(view) && !isLoggedIn()) {
        openAuthModal("login");
        return;
    }

    document.querySelectorAll(".view-section").forEach((s) => s.classList.remove("active"));
    document.querySelectorAll(".topnav-link, .mobile-dropdown-link, .mobile-nav-item").forEach((e) => e.classList.remove("active"));
    const viewEl = document.getElementById(`view-${view}`);
    if (viewEl) viewEl.classList.add("active");
    const nav = document.getElementById(`nav-${view}`);
    if (nav) nav.classList.add("active");
    const mob = document.getElementById(`mob-${view}`);
    if (mob) mob.classList.add("active");
    const mobBottom = document.getElementById(`mob-bottom-${view}`);
    if (mobBottom) mobBottom.classList.add("active");

    const title = document.getElementById("topbar-title");
    if (title) title.textContent = VIEW_TITLES[view] || "Mendly";

    if (view === "saved") renderSavedSearches();
    if (view === "account") { loadAccountStats(); updatePasswordForm(); }
    if (view === "activity") loadActivityLog();
    if (view === "hospitals") {
        if (state.userLocation) loadNearbyHospitals();
        else renderHospitals([], "Search by name above, or click <strong>Nearby</strong> to use your location.");
    }
    if (view === "pharmacies") {
        if (state.userLocation) loadNearbyPharmacies();
        else renderPharmacies([], "Search by name above, or click <strong>Nearby</strong> to use your location.");
    }
    if (view === "chatbot") {
        if (!isLoggedIn() && document.getElementById("chat-messages").children.length === 0) {
            renderWelcomeChat();
        }
    }

    // Close mobile menu if open
    const dropdown = document.getElementById("mobile-dropdown");
    if (dropdown && dropdown.classList.contains("open")) toggleMobileMenu();
}

// ============================================================
// LOCATION
// ============================================================
function getUserLocation() {
    const status = document.getElementById("location-status");
    if (!navigator.geolocation) {
        getLocationFromIP();
        return;
    }
    status.innerHTML = '<i class="fa-solid fa-location-dot"></i> Getting location...';
    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            await getAddress(pos.coords.latitude, pos.coords.longitude);
            loadNearbyHospitals();
            loadNearbyPharmacies();
        },
        (err) => {
            console.log("Geolocation failed:", err.message);
            getLocationFromIP();
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
}

async function getLocationFromIP() {
    const status = document.getElementById("location-status");
    const apis = [
        { url: "https://ip-api.com/json/", parse: d => ({ lat: d.lat, lng: d.lon, city: d.city, country: d.country }) },
        { url: "https://ipapi.co/json/", parse: d => ({ lat: d.latitude, lng: d.longitude, city: d.city, country: d.country_name }) },
    ];
    for (const api of apis) {
        try {
            const res = await fetch(api.url, { signal: AbortSignal.timeout(5000) });
            const data = await res.json();
            const loc = api.parse(data);
            if (loc.lat && loc.lng) {
                state.userLocation = { lat: loc.lat, lng: loc.lng };
                const safeCity = escapeHtml(loc.city || "");
                const safeCountry = escapeHtml(loc.country || "");
                status.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${safeCity}${safeCity && safeCountry ? ", " : ""}${safeCountry}`;
                loadNearbyHospitals();
                loadNearbyPharmacies();
                return;
            }
        } catch (e) { /* try next API */ }
    }
    state.userLocation = null;
    status.innerHTML = '<i class="fa-solid fa-location-dot"></i> Location unavailable';
}

async function getAddress(lat, lng) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
        const data = await res.json();
        if (data.display_name) {
            const parts = data.display_name.split(",").slice(0, 3).map(p => escapeHtml(p.trim()));
            document.getElementById("location-status").innerHTML = `<i class="fa-solid fa-location-dot"></i> ${parts.join(", ")}`;
        }
    } catch (e) {
        console.log("Reverse geocoding failed");
    }
}

function openDirections(address) {
    if (!address) return;
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/${encodedAddress}`, "_blank");
}

// ============================================================
// CHATBOT
// ============================================================

const _chatMemory = [];
const MAX_HISTORY = 6;

async function sendChatMessage() {
    const input = document.getElementById("chat-input");
    const msg = input.value.trim();
    if (!msg) return;

    if (!isLoggedIn()) {
        const used = parseInt(localStorage.getItem("mendly_guest_chats") || "0", 10);
        if (used >= GUEST_CHAT_LIMIT) {
            addChatMessage("bot", `You've used all ${GUEST_CHAT_LIMIT} free messages. **Sign up for free** to continue chatting with Elix — no credit card needed.`);
            return;
        }
        localStorage.setItem("mendly_guest_chats", String(used + 1));
        const remaining = GUEST_CHAT_LIMIT - used - 1;
        if (remaining > 0 && remaining <= 2) {
            setTimeout(() => {
                addChatMessage("bot", `💡 You have **${remaining} free message${remaining > 1 ? "s" : ""}** left. Sign up to chat unlimited with Elix.`);
            }, 1500);
        }
    }

    _chatMemory.push({ role: "user", content: msg });
    if (_chatMemory.length > MAX_HISTORY * 2) _chatMemory.splice(0, 2);

    addChatMessage("user", msg);
    input.value = "";
    input.style.height = "auto";
    addTypingIndicator();

    try {
        const res = await authFetch("/chat", {
            method: "POST",
            body: JSON.stringify({
                message: msg,
                location: state.userLocation,
                history: _chatMemory.slice(-MAX_HISTORY),
            }),
        });
        const data = await res.json();
        removeTypingIndicator();
        const reply = data.reply || data.response || "I couldn't process that. Try asking about a specific disease, symptom, or medicine.";
        _chatMemory.push({ role: "bot", content: reply });
        addChatMessage("bot", reply);
    } catch (e) {
        removeTypingIndicator();
        if (String(e.message).includes("Session expired")) {
            addChatMessage("bot", "Please **sign up or log in** to continue chatting with Elix.");
        } else {
            const msg = String(e.message || "");
            if (msg.includes("offline")) {
                addChatMessage("bot", "You appear to be offline. Please check your internet connection and try again.");
            } else if (msg.includes("Cannot reach server")) {
                addChatMessage("bot", "Unable to reach the server. The service may be starting up — please try again in a moment.");
            } else {
                addChatMessage("bot", "Connection error. Please try again later.");
            }
        }
    }
}

function addChatMessage(sender, text, options = {}) {
    const container = document.getElementById("chat-messages");
    const wrap = document.createElement("div");
    wrap.className = `chat-bubble-wrap ${sender} ${options.animate !== false ? 'animate-in' : ''}`;
    if (options.prepend) {
        container.insertBefore(wrap, container.firstChild);
    } else {
        container.appendChild(wrap);
    }

    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${sender}`;

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (sender === "bot") {
        const html = renderMarkdown(text);
        bubble.innerHTML = `
            <span class="chat-orb"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
            <div class="bubble-content">
                <div class="bubble-text" id="${messageId}">${html}</div>
                <div class="bubble-meta">
                    <span class="bubble-time">${now}</span>
                    <button class="copy-btn" title="Copy" onclick="copyBubble('${messageId}')"><i class="fa-regular fa-copy"></i></button>
                    <button class="regenerate-btn" title="Regenerate" onclick="regenerateResponse(this)"><i class="fa-solid fa-rotate"></i></button>
                </div>
            </div>`;
    } else {
        bubble.innerHTML = `
            <div class="bubble-content">
                <div class="bubble-text">${escapeHtml(text)}</div>
                <span class="bubble-time">${now}</span>
            </div>`;
    }

    wrap.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    
    // Animate in
    requestAnimationFrame(() => {
        wrap.classList.add('visible');
    });
    
    return wrap;
}

function copyBubble(messageId) {
    const textEl = document.getElementById(messageId);
    if (!textEl) return;
    const text = textEl.innerText;
    navigator.clipboard.writeText(text).then(() => {
        const btn = textEl.closest('.bubble-content').querySelector('.copy-btn');
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => (btn.innerHTML = '<i class="fa-regular fa-copy"></i>'), 1500);
        }
    });
}

function regenerateResponse(btn) {
    const wrap = btn.closest('.chat-bubble-wrap');
    const userMsg = wrap.previousElementSibling;
    if (!userMsg || !userMsg.classList.contains('user')) return;
    
    const userText = userMsg.querySelector('.bubble-text').textContent;
    
    // Remove the bot response
    wrap.remove();
    
    // Resend
    _chatMemory.pop(); // Remove last bot message
    const input = document.getElementById("chat-input");
    input.value = userText;
    sendChatMessage();
}

function renderMarkdown(text) {
    if (!text) return "";
    let html = escapeHtml(text);

    // Headers
    html = html.replace(/^### (.+)$/gm, "<h4>$1</h4>");
    html = html.replace(/^## (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^# (.+)$/gm, "<h2>$1</h2>");

    // Bold/italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre class="md-code-block"><code class="language-${lang || ''}">${escapeHtml(code.trim())}</code></pre>`;
    });

    // Tables
    html = html.replace(/((?:\|.+\|\n?)+)/g, (tableBlock) => {
        const rows = tableBlock.trim().split("\n").filter(r => r.trim());
        if (rows.length < 2) return tableBlock;
        let tableHtml = "<table class='md-table'><thead><tr>";
        const headers = rows[0].split("|").filter((_, i, a) => i > 0 && i < a.length - 1);
        headers.forEach(h => tableHtml += `<th>${h.trim()}</th>`);
        tableHtml += "</tr></thead><tbody>";
        rows.slice(2).forEach(row => {
            const cells = row.split("|").filter((_, i, a) => i > 0 && i < a.length - 1);
            tableHtml += "<tr>" + cells.map(c => `<td>${c.trim()}</td>`).join("") + "</tr>";
        });
        tableHtml += "</tbody></table>";
        return tableHtml;
    });

    // Horizontal rule
    html = html.replace(/^---+$/gm, "<hr>");

    // Disclaimers
    html = html.replace(/\*(⚠️[^*]+)\*/g, "<span class='disclaimer'>$1</span>");

    // Bullet points
    html = html.replace(/^[•●][ \t](.+)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
    html = html.replace(/^\d+\.[ \t](.+)$/gm, "<li>$1</li>");

    // Paragraphs
    html = html.replace(/\n\n/g, "</p><p>");
    html = html.replace(/\n/g, "<br>");
    html = "<p>" + html + "</p>";

    // Cleanup
    html = html.replace(/<p>\s*<\/p>/g, "");
    html = html.replace(/<p>(<[hut])/g, "$1");
    html = html.replace(/(<\/[hut][^>]*>)<\/p>/g, "$1");

    return html;
}

function escapeHtml(str) {
    if (typeof str !== "string") return str;
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function addTypingIndicator() {
    const container = document.getElementById("chat-messages");
    const wrap = document.createElement("div");
    wrap.id = "typing-indicator";
    wrap.className = "chat-bubble-wrap bot";
    wrap.innerHTML = `
        <div class="chat-bubble bot">
            <span class="chat-orb"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
            <div class="bubble-content">
                <div class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>
            </div>
        </div>`;
    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
    const el = document.getElementById("typing-indicator");
    if (el) el.remove();
}

async function loadChatHistoryFromServer() {
    try {
        const res = await authFetch("/chat/history?limit=50");
        const messages = await res.json();
        const container = document.getElementById("chat-messages");
        container.innerHTML = "";
        if (messages.length === 0) {
            container.innerHTML = `
                <div class="chat-bubble-wrap bot welcome-message">
                    <div class="chat-bubble bot">
                        <span class="chat-orb"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
                        <div class="bubble-content">
                            <div class="bubble-text"><strong>Welcome to Elix! 👋</strong><br>
                            I can help you with disease information, medicine details, drug interactions, and finding nearby hospitals.<br><br>
                            <strong>Try asking:</strong><br>
                            "What are the symptoms of diabetes?"<br>
                            "Tell me about Atorvastatin"<br>
                            "How to treat a migraine?"</div>
                        </div>
                    </div>
                </div>`;
            return;
        }
        messages.forEach((m) => addChatMessage(m.role === "user" ? "user" : "bot", m.content, { animate: false }));
        messages.slice(-MAX_HISTORY).forEach(m => _chatMemory.push({ role: m.role === "user" ? "user" : "bot", content: m.content }));
    } catch (e) {
        console.error("Could not load chat history:", e);
    }
}

async function clearChat() {
    if (!isLoggedIn()) { openAuthModal("login"); return; }
    if (!confirm("Clear all chat history? This cannot be undone.")) return;
    try {
        await authFetch("/chat/history", { method: "DELETE" });
    } catch (e) {
        console.error(e);
    }
    _chatMemory.length = 0;
    document.getElementById("chat-messages").innerHTML = `
        <div class="chat-bubble-wrap bot welcome-message">
            <div class="chat-bubble bot">
                <span class="chat-orb"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
                <div class="bubble-content">
                    <div class="bubble-text"><strong>Chat cleared!</strong><br>How can I help you today?</div>
                </div>
            </div>
        </div>`;
}

function renderWelcomeChat() {
    const container = document.getElementById("chat-messages");
    if (!container) return;
    const used = parseInt(localStorage.getItem("mendly_guest_chats") || "0", 10);
    const remaining = GUEST_CHAT_LIMIT - used;
    container.innerHTML = `
        <div class="chat-bubble-wrap bot welcome-message">
            <div class="chat-bubble bot">
                <span class="chat-orb"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
                <div class="bubble-content">
                    <div class="bubble-text"><strong>Welcome to Elix! 👋</strong><br>
                    I can help you with disease information, medicine details, drug interactions, and finding nearby hospitals.<br><br>
                    ${remaining > 0 ? `<em>You have <strong>${remaining} free message${remaining > 1 ? "s" : ""}</strong> — sign up for unlimited access.</em><br><br>` : `<em>Sign up free to chat with Elix.</em><br><br>`}
                    <strong>Try asking:</strong><br>
                    "What are the symptoms of diabetes?"<br>
                    "Tell me about Atorvastatin"<br>
                    "How to treat a migraine?"</div>
                </div>
            </div>
        </div>`;
}

function suggestQuery(q) {
    document.getElementById("chat-input").value = q;
    sendChatMessage();
}

// Auto-resize textarea
document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("chat-input");
    if (input) {
        input.addEventListener("input", function() {
            this.style.height = "auto";
            this.style.height = Math.min(this.scrollHeight, 120) + "px";
        });
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
});

// ============================================================
// MEDICINES
// ============================================================
async function loadAllMedicines() {
    try {
        const res = await authFetch("/medicines");
        state.medicines = await res.json();
        renderMedicines(state.medicines);
    } catch (e) {
        console.error("Error loading medicines:", e);
        renderMedicines([]);
    }
}

function renderMedicines(medicines) {
    const container = document.getElementById("medicine-results");
    state.renderedMedicines = medicines || [];
    if (!medicines || medicines.length === 0) {
        const searchVal = document.getElementById("medicine-search") ? document.getElementById("medicine-search").value.trim() : "";
        const askText = searchVal ? `Tell me about ${searchVal}` : "Tell me about common medicines";
        container.innerHTML = `
            <div class="glass-card" style="grid-column:1/-1;text-align:center;padding:2rem;">
                <p style="color:var(--text-muted);margin-bottom:0.75rem;">No medicines found${searchVal ? ` for "${escapeHtml(searchVal)}"` : ""}.</p>
                <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem;">Try a different name or check the AI assistant.</p>
                <button onclick="askChatbot('${escapeJS(askText)}')" class="btn-primary" style="padding:0.5rem 1rem;">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Ask AI
                </button>
            </div>`;
        return;
    }
    container.innerHTML = medicines.map((m, i) => `
        <div class="medicine-card" onclick="showMedicineDetailIdx(${i})">
            <h4>${escapeHtml(m.name)}</h4>
            <p class="brand">${escapeHtml(m.brand || "")}</p>
            <span class="category">${escapeHtml(m.category || "General")}</span>
            <p class="uses">${(m.uses || []).slice(0, 2).map(escapeHtml).join(", ")}</p>
            ${m.source && m.source.includes("Verified") ? '<p style="color:var(--success);font-size:0.7rem;margin-top:0.3rem;"><i class="fa-solid fa-check-circle"></i> Verified data</p>' : ""}
        </div>
    `).join("");
}

function showMedicineDetailIdx(idx) {
    const med = (state.renderedMedicines || [])[idx];
    if (med) showMedicineDetailObj(med);
}

async function searchMedicines() {
    const q = document.getElementById("medicine-search").value.trim();
    if (!q) { loadAllMedicines(); return; }
    const container = document.getElementById("medicine-results");
    container.innerHTML = `<div class="glass-card" style="grid-column:1/-1;text-align:center;padding:2rem;"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem;color:var(--primary);"></i><p style="color:var(--text-muted);margin-top:0.5rem;">Searching...</p></div>`;
    try {
        const res = await authFetch("/medicines/search", { method: "POST", body: JSON.stringify({ query: q }) });
        const data = await res.json();
        state.medicines = data.results || [];
        renderMedicines(state.medicines);
    } catch (e) {
        console.error(e);
        renderMedicines([]);
    }
}

function filterMedicines(filter) {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.toggle("active", b.dataset.filter === filter));
    if (filter === "all") { renderMedicines(state.medicines); return; }
    renderMedicines(state.medicines.filter(m => m.category && m.category.toLowerCase().includes(filter.toLowerCase())));
}

function showMedicineDetailObj(med) {
    state.lastViewedMedicine = med;
    document.getElementById("detail-name").textContent = med.name;
    document.getElementById("detail-brand").textContent = med.brand || "";
    document.getElementById("detail-content").innerHTML = `
        <div class="detail-section"><h4>Uses</h4><ul>${(med.uses || []).map(u => `<li>${escapeHtml(u)}</li>`).join("")}</ul></div>
        <div class="detail-section"><h4>Dosage</h4>
            <p><strong>Adult:</strong> ${escapeHtml(med.dosage?.adult || "Consult doctor")}</p>
            <p><strong>Child:</strong> ${escapeHtml(med.dosage?.child || "Consult doctor")}</p>
            <p><strong>Elderly:</strong> ${escapeHtml(med.dosage?.elderly || "Consult doctor")}</p>
        </div>
        <div class="detail-section"><h4>Side Effects</h4>
            <p><strong>Common:</strong> ${(med.side_effects?.common || []).map(escapeHtml).join(", ")}</p>
            <p class="warning-text"><strong>Serious:</strong> ${(med.side_effects?.serious || []).map(escapeHtml).join(", ")}</p>
        </div>
        <div class="detail-section"><h4>Precautions</h4><ul>${(med.precautions || []).map(p => `<li>${escapeHtml(p)}</li>`).join("")}</ul></div>
        <div class="detail-section"><h4>Pregnancy</h4><p>${escapeHtml(med.pregnancy || "Consult doctor")}</p></div>
        ${med.source ? `<p style="color:var(--text-muted);font-size:0.75rem;margin-top:0.5rem;"><i class="fa-solid fa-circle-info"></i> Source: ${escapeHtml(med.source)}</p>` : ""}
        <div style="margin-top:1rem;">
            <button onclick="askChatbot('${escapeJS(med.name)}')" class="btn-secondary"><i class="fa-solid fa-wand-magic-sparkles"></i> Ask AI about ${escapeHtml(med.name)}</button>
        </div>
    `;
    document.getElementById("medicine-detail").style.display = "block";
    document.getElementById("medicine-detail").scrollIntoView({ behavior: "smooth" });
}

function closeDetail() { document.getElementById("medicine-detail").style.display = "none"; }

function askChatbot(medicine) {
    document.getElementById("chat-input").value = `Tell me about ${medicine}`;
    switchView("chatbot");
    sendChatMessage();
}

async function saveCurrentMedicine() {
    if (!state.lastViewedMedicine) return;
    await saveSearch("medicine", state.lastViewedMedicine.name);
}

// ============================================================
// CONDITIONS / DISEASES
// ============================================================
async function searchByCondition() {
    const q = document.getElementById("condition-search").value.trim();
    if (!q) { alert("Please enter a symptom or condition."); return; }
    try {
        const res = await authFetch("/medicines/conditions", { method: "POST", body: JSON.stringify({ query: q }) });
        const data = await res.json();
        const container = document.getElementById("condition-results");
        if (!data.possible_medicines || data.possible_medicines.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:1.5rem 0;">
                    <p style="color:var(--text-muted);margin-bottom:1rem;">No medicines found for "${escapeHtml(q)}".</p>
                    <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem;">Try a different name or ask the AI assistant.</p>
                    <button onclick="askChatbot('${escapeJS(q)}')" class="btn-primary" style="padding:0.6rem 1.2rem;">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Ask AI about ${escapeHtml(q)}
                    </button>
                </div>`;
            return;
        }
        container.innerHTML = `<h4 style="margin-bottom:0.75rem;">Medicines for "${escapeHtml(q)}":</h4>
            <div class="grid-3">${data.possible_medicines.map(m => `
                <div class="medicine-card" onclick="suggestQuery('Tell me about ${escapeJS(m.name)}'); switchView('chatbot');">
                    <h4>${escapeHtml(m.name)}</h4>
                    <p class="brand">${escapeHtml(m.brand)}</p>
                    <span class="category">${escapeHtml(m.category)}</span>
                    <p class="uses">Dosage: ${escapeHtml(m.dosage)}</p>
                </div>
            `).join("")}</div>`;
    } catch (e) { console.error(e); }
}

async function searchDiseaseProfiles() {
    const q = document.getElementById("condition-search").value.trim();
    if (!q) { alert("Please enter a disease name or symptom."); return; }
    try {
        const res = await authFetch("/diseases/search", { method: "POST", body: JSON.stringify({ query: q }) });
        const data = await res.json();
        const container = document.getElementById("condition-results");
        if (!data.results || data.results.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:1.5rem 0;">
                    <p style="color:var(--text-muted);margin-bottom:1rem;">No disease profile found for "${escapeHtml(q)}".</p>
                    <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem;">The AI assistant can help with any disease or condition.</p>
                    <button onclick="askChatbot('What are the symptoms and treatment of ${escapeJS(q)}?')" class="btn-primary" style="padding:0.6rem 1.2rem;">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Ask AI about ${escapeHtml(q)}
                    </button>
                </div>`;
            return;
        }
        container.innerHTML = data.results.map(d => `
            <div class="glass-card" style="margin-top:0.75rem;">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <h3 style="text-transform:capitalize;font-size:1.1rem;">${escapeHtml(d.name)}</h3>
                    <button onclick="saveSearch('disease', '${escapeJS(d.name)}')" class="btn-secondary" style="padding:0.25rem 0.6rem;"><i class="fa-solid fa-bookmark"></i></button>
                </div>
                <div class="detail-section"><h4>Symptoms</h4><ul>${(d.symptoms || []).map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ul></div>
                <div class="detail-section"><h4>Treatment</h4><ul>${(d.treatment || []).map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul></div>
                ${d.emergency_signs ? `<div class="detail-section warning-text"><h4>Emergency Signs</h4><ul>${d.emergency_signs.map(e => `<li>${escapeHtml(e)}</li>`).join("")}</ul></div>` : ""}
            </div>
        `).join("");
    } catch (e) { console.error(e); }
}

// ============================================================
// INTERACTIONS
// ============================================================
async function checkInteractions() {
    const medicine = document.getElementById("interaction-medicine").value.trim();
    const conditionsText = document.getElementById("interaction-conditions").value.trim();
    const container = document.getElementById("interaction-results");
    if (!medicine) { alert("Please enter a medicine name."); return; }
    const conditions = conditionsText.split(",").map(c => c.trim()).filter(Boolean);
    container.innerHTML = `<div style="text-align:center;padding:1rem 0;"><i class="fa-solid fa-spinner fa-spin" style="color:var(--primary);"></i></div>`;
    try {
        const res = await authFetch("/medicines/interactions", { method: "POST", body: JSON.stringify({ medication: medicine, conditions }) });
        const data = await res.json();
        if (data.error) { container.innerHTML = `<div class="interaction-result warning">${escapeHtml(data.error)}</div>`; return; }
        let html = `<div class="interaction-result info"><strong>${escapeHtml(data.medication)}</strong></div>`;
        const medCount = (data.medication || "").split(",").filter(Boolean).length;
        if (data.warnings?.length) {
            html += data.warnings.map(w => `<div class="interaction-result warning">${escapeHtml(w)}</div>`).join("");
        } else if (medCount < 2 && !conditions.length) {
            html += `<div class="interaction-result info">Enter multiple medicines separated by commas, or add your health conditions, to check for interactions.</div>`;
        } else {
            html += `<div class="interaction-result success">No significant interactions detected.</div>`;
        }
        if (data.recommendations?.length) html += data.recommendations.map(r => `<div class="interaction-result info">${escapeHtml(r)}</div>`).join("");
        container.innerHTML = html;
    } catch (e) {
        console.error(e);
        const msg = String(e.message || "");
        if (msg.includes("offline")) container.innerHTML = `<div class="interaction-result warning">You appear to be offline. Please check your internet connection.</div>`;
        else if (msg.includes("Cannot reach server") || msg.includes("Session expired")) container.innerHTML = `<div class="interaction-result warning">${escapeHtml(e.message)}</div>`;
        else container.innerHTML = `<div class="interaction-result warning">Could not check interactions. Please try again.</div>`;
    }
}

// ============================================================
// SAVED SEARCHES
// ============================================================
async function loadSavedSearches() {
    try {
        const res = await authFetch("/saved-searches");
        state.savedSearches = await res.json();
    } catch (e) { console.error(e); }
}

async function saveSearch(queryType, queryValue) {
    if (!isLoggedIn()) { openAuthModal("login"); return; }
    try {
        const res = await authFetch("/saved-searches", { method: "POST", body: JSON.stringify({ query_type: queryType, query_value: queryValue }) });
        if (res.ok) {
            const item = await res.json();
            state.savedSearches.unshift(item);
            alert(`Saved "${queryValue}" to bookmarks.`);
            renderSavedSearches();
        }
    } catch (e) { console.error(e); }
}

async function deleteSavedSearch(id) {
    try {
        await authFetch(`/saved-searches/${id}`, { method: "DELETE" });
        state.savedSearches = state.savedSearches.filter(s => s.id !== id);
        renderSavedSearches();
    } catch (e) { console.error(e); }
}

function renderSavedSearches() {
    const container = document.getElementById("saved-results");
    if (!state.savedSearches?.length) {
        container.innerHTML = `<div class="glass-card" style="grid-column:1/-1;text-align:center;padding:2rem;"><p style="color:var(--text-muted);">No saved searches yet.</p></div>`;
        return;
    }
    container.innerHTML = state.savedSearches.map(s => `
        <div class="medicine-card">
            <div style="display:flex;justify-content:space-between;align-items:start;">
                <div>
                    <h4>${escapeHtml(s.query_value)}</h4>
                    <span class="category">${s.query_type === "medicine" ? "Medicine" : "Disease"}</span>
                </div>
                <button onclick="deleteSavedSearch('${escapeJS(s.id)}')" class="btn-secondary" style="padding:0.2rem 0.5rem;"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <button onclick="suggestQuery('${s.query_type === "medicine" ? "Tell me about " : "What are the symptoms of "}${escapeJS(s.query_value)}'); switchView('chatbot');" class="btn-secondary" style="width:100%;margin-top:0.5rem;font-size:0.78rem;">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Ask AI
            </button>
        </div>
    `).join("");
}

// ============================================================
// EMERGENCY CONTACTS
// ============================================================
async function loadEmergencyContacts(country) {
    try {
        const res = await fetch(`${API_BASE}/emergency/contacts?country=${encodeURIComponent(country)}`);
        const data = await res.json();
        const contacts = Array.isArray(data) ? data[0] : data;
        const container = document.getElementById("emergency-contacts");
        const items = [
            ["Ambulance", contacts.ambulance],
            ["Police", contacts.police],
            ["Fire", contacts.fire],
            ["Emergency Medical", contacts.emergency_medical],
            ["Mental Health", contacts.mental_health_helpline],
            ["Poison Control", contacts.poison_control],
        ];
        container.innerHTML = `<h4 style="margin-bottom:0.5rem;">${escapeHtml(contacts.country || "Emergency")} Contacts</h4>
            ${items.filter(i => i[1]).map(i => `<div class="emergency-contact"><span>${i[0]}</span><span class="number">${escapeHtml(String(i[1]))}</span></div>`).join("")}`;
        container.closest(".glass-card").querySelectorAll(".filter-btn").forEach(btn => {
            btn.classList.toggle("active", btn.textContent.trim() === country);
        });
    } catch (e) { console.error(e); }
}

function loadDefaultEmergencyContacts() { loadEmergencyContacts("India"); }

// ============================================================
// HOSPITALS / PHARMACIES
// ============================================================
async function loadNearbyHospitals() {
    if (!state.userLocation) { renderHospitals([], "Click <strong>Nearby</strong> to allow location access, or search by name above."); return; }
    try {
        const res = await fetch(`${API_BASE}/emergency/hospitals/nearby`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat: state.userLocation.lat, lng: state.userLocation.lng, radius: 25 }) });
        const data = await res.json();
        renderHospitals(data.hospitals || data);
        document.getElementById("dash-hospital-count").textContent = (data.hospitals || data).length || 0;
    } catch (e) { console.error(e); renderHospitals([]); }
}

async function loadAllHospitals() {
    try {
        const res = await fetch(`${API_BASE}/emergency/hospitals`);
        const data = await res.json();
        renderHospitals(data);
    } catch (e) { console.error(e); }
}

function renderHospitals(hospitals, emptyMessage = "No hospitals found.") {
    const container = document.getElementById("hospital-results");
    if (!hospitals?.length) { container.innerHTML = `<div class="glass-card" style="grid-column:1/-1;text-align:center;padding:2rem;"><p style="color:var(--text-muted);">${emptyMessage}</p></div>`; return; }
    hospitals.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    container.innerHTML = hospitals.map(h => `
        <div class="location-card">
            <h4>${escapeHtml(h.name)}</h4>
            <p class="address">${escapeHtml(h.address || "Address not available")}</p>
            <p class="phone">${escapeHtml(h.phone || "N/A")}</p>
            ${h.distance ? `<p style="color:var(--text-muted);font-size:0.82rem;">${h.distance.toFixed(1)} km</p>` : ""}
            <div style="margin-top:0.4rem;"><span class="badge available">${h.available !== false ? "Available" : "Unavailable"}</span></div>
            <button onclick="openDirections('${escapeJS(h.address || h.name)}')" class="btn-primary" style="width:100%;margin-top:0.6rem;padding:0.5rem;font-size:0.85rem;justify-content:center;">
                <i class="fa-solid fa-map"></i> Directions
            </button>
        </div>
    `).join("");
}

async function searchHospitals() {
    const q = document.getElementById("hospital-search").value.trim();
    if (!q) {
        if (state.userLocation) loadNearbyHospitals();
        else renderHospitals([], "Type a hospital name to search, or click <strong>Nearby</strong> to use your location.");
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/emergency/hospitals/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q, lat: state.userLocation?.lat || 0, lng: state.userLocation?.lng || 0 }) });
        const data = await res.json();
        renderHospitals(data.hospitals || data, `No hospitals found for "${escapeHtml(q)}". Try a different name.`);
    } catch (e) { console.error(e); renderHospitals([]); }
}

async function loadNearbyPharmacies() {
    if (!state.userLocation) { renderPharmacies([], "Click <strong>Nearby</strong> to allow location access, or search by name above."); return; }
    try {
        const res = await fetch(`${API_BASE}/emergency/pharmacies/nearby`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat: state.userLocation.lat, lng: state.userLocation.lng, radius: 25 }) });
        const data = await res.json();
        renderPharmacies(data.pharmacies || data);
        document.getElementById("dash-pharmacy-count").textContent = (data.pharmacies || data).length || 0;
    } catch (e) { console.error(e); renderPharmacies([]); }
}

async function loadAllPharmacies() {
    try {
        const res = await fetch(`${API_BASE}/emergency/pharmacies`);
        const data = await res.json();
        renderPharmacies(data);
    } catch (e) { console.error(e); }
}

function renderPharmacies(pharmacies, emptyMessage = "No pharmacies found.") {
    const container = document.getElementById("pharmacy-results");
    if (!pharmacies?.length) { container.innerHTML = `<div class="glass-card" style="grid-column:1/-1;text-align:center;padding:2rem;"><p style="color:var(--text-muted);">${emptyMessage}</p></div>`; return; }
    pharmacies.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    container.innerHTML = pharmacies.map(p => `
        <div class="location-card">
            <h4>${escapeHtml(p.name)}</h4>
            <p class="address">${escapeHtml(p.address || "Address not available")}</p>
            <p class="phone">${escapeHtml(p.phone || "N/A")}</p>
            ${p.distance ? `<p style="color:var(--text-muted);font-size:0.82rem;">${p.distance.toFixed(1)} km</p>` : ""}
            <div style="margin-top:0.4rem;">${(p.services || []).map(s => `<span class="badge" style="background:var(--primary);color:white;">${escapeHtml(s)}</span> `).join("")}</div>
            <button onclick="openDirections('${escapeJS(p.address || p.name)}')" class="btn-primary" style="width:100%;margin-top:0.6rem;padding:0.5rem;font-size:0.85rem;justify-content:center;">
                <i class="fa-solid fa-map"></i> Directions
            </button>
        </div>
    `).join("");
}

async function searchPharmacies() {
    const q = document.getElementById("pharmacy-search").value.trim();
    if (!q) {
        if (state.userLocation) loadNearbyPharmacies();
        else renderPharmacies([], "Type a pharmacy name to search, or click <strong>Nearby</strong> to use your location.");
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/emergency/pharmacies/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q, lat: state.userLocation?.lat || 0, lng: state.userLocation?.lng || 0 }) });
        const data = await res.json();
        renderPharmacies(data.pharmacies || data, `No pharmacies found for "${escapeHtml(q)}". Try a different name.`);
    } catch (e) { console.error(e); renderPharmacies([]); }
}

// ============================================================
// DASHBOARD
// ============================================================
async function loadDashboardStats() {
    const h = new Date().getHours();
    const g = h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
    document.getElementById("dash-greeting").textContent = g + "! 👋";

    const tips = [
        { icon: "fa-droplet", title: "Stay Hydrated", text: "Drink at least 8 glasses of water daily. Staying hydrated helps your body function properly and improves energy levels." },
        { icon: "fa-bed", title: "Get Enough Sleep", text: "Aim for 7-9 hours of quality sleep each night. Good sleep is essential for memory, immunity, and overall health." },
        { icon: "fa-person-walking", title: "Move More", text: "Walk at least 30 minutes a day. Regular physical activity reduces the risk of heart disease, diabetes, and stress." },
        { icon: "fa-apple-whole", title: "Eat Balanced Meals", text: "Include fruits, vegetables, whole grains, and protein in every meal. A balanced diet strengthens your immune system." },
        { icon: "fa-brain", title: "Manage Stress", text: "Practice deep breathing, meditation, or yoga. Chronic stress can weaken immunity and cause various health issues." },
        { icon: "fa-hand-holding-medical", title: "Wash Your Hands", text: "Wash hands frequently with soap for 20 seconds. This simple habit prevents the spread of infections significantly." },
    ];
    const tip = tips[new Date().getDay() % tips.length];
    document.getElementById("dash-health-tip").innerHTML = `
        <div class="dash-tip-icon"><i class="fa-solid ${tip.icon}"></i></div>
        <div><strong>${tip.title}</strong><p>${tip.text}</p></div>`;

    try {
        const res = await authFetch("/medicines");
        const meds = await res.json();
        document.getElementById("dash-medicine-count").textContent = meds.length || 0;
        const conditions = new Set();
        meds.forEach(m => (m.uses || []).forEach(u => conditions.add(u)));
        document.getElementById("dash-condition-count").textContent = conditions.size || 0;
    } catch (e) { console.error(e); }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const { latitude: lat, longitude: lon } = pos.coords;
                const hospRes = await authFetch(`/emergency/hospitals/nearby`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lat, lng: lon })
                });
                if (hospRes.ok) {
                    const data = await hospRes.json();
                    document.getElementById("dash-hospital-count").textContent = data.count || 0;
                }
            } catch (e) { document.getElementById("dash-hospital-count").textContent = "~"; }
        }, () => { document.getElementById("dash-hospital-count").textContent = "~"; }, { timeout: 5000 });
    }

    if (isLoggedIn()) {
        try {
            const res = await authFetch("/profile/stats");
            if (res.ok) {
                const data = await res.json();
                document.getElementById("dash-chat-count").textContent = data.total_messages || 0;
            }
        } catch (e) { console.error(e); }
    }
}

// ============================================================
// CHAT STATUS
// ============================================================
let chatStatus = { gemini_active: false };

async function loadChatStatus() {
    try {
        const res = await authFetch("/chat/status");
        if (res.ok) { chatStatus = await res.json(); updateChatStatusUI(); }
    } catch (e) { console.error(e); }
}

function updateChatStatusUI() {
    const badge = document.getElementById("chat-status-badge");
    if (!badge) return;
    if (chatStatus.provider === "nvidia") {
        badge.innerHTML = '<span class="status-dot online"></span> Elix (Online)';
        badge.className = "chat-status-badge online";
    } else if (chatStatus.gemini_active) {
        badge.innerHTML = '<span class="status-dot online"></span> Elix (Online)';
        badge.className = "chat-status-badge online";
    } else {
        badge.innerHTML = '<span class="status-dot offline"></span> Elix Offline';
        badge.className = "chat-status-badge offline";
    }
}

// ============================================================
// ACCOUNT / PROFILE
// ============================================================
async function loadAccountStats() {
    try {
        const res = await authFetch("/profile/stats");
        if (res.ok) {
            const data = await res.json();
            document.getElementById("stat-messages").textContent = data.total_messages || 0;
            document.getElementById("stat-searches").textContent = data.total_searches || 0;
            document.getElementById("stat-activities").textContent = data.total_activities || 0;
        }
    } catch (e) { console.error(e); }
}

let selectedProfilePhoto = null;

function handleProfilePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        const msg = document.getElementById("profile-update-msg");
        msg.textContent = "Photo must be under 2MB."; msg.style.display = "block"; msg.className = "auth-error";
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        selectedProfilePhoto = e.target.result;
        const avatar = document.getElementById("profile-avatar-large");
        avatar.innerHTML = `<img src="${selectedProfilePhoto}" alt="Profile" style="width:100%;height:100%;border-radius:14px;object-fit:cover;">`;
        document.getElementById("remove-photo-btn").style.display = "flex";
    };
    reader.readAsDataURL(file);
}

function removeProfilePhoto() {
    selectedProfilePhoto = "";
    const user = getStoredUser();
    const avatar = document.getElementById("profile-avatar-large");
    avatar.innerHTML = (user?.name || "U").charAt(0).toUpperCase();
    avatar.style.background = user?.avatar_color || "#0D9488";
    document.getElementById("remove-photo-btn").style.display = "none";
    document.getElementById("photo-upload-input").value = "";
}

async function updateProfile() {
    const name = document.getElementById("profile-name").value.trim();
    const email = document.getElementById("profile-email").value.trim();
    const dob = document.getElementById("profile-dob").value;
    const blood = document.getElementById("profile-blood").value;
    const msgEl = document.getElementById("profile-update-msg");
    const btn = document.getElementById("profile-save-btn");

    if (!name || !email) { msgEl.textContent = "Name and email are required."; msgEl.style.display = "block"; msgEl.className = "auth-error"; return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        const body = { name, email };
        if (dob) body.date_of_birth = dob;
        if (blood) body.blood_type = blood;
        if (selectedProfilePhoto !== null) body.profile_photo = selectedProfilePhoto;

        const res = await authFetch("/profile", { method: "PUT", body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) { msgEl.textContent = data.detail || "Update failed."; msgEl.style.display = "block"; msgEl.className = "auth-error"; return; }

        const token = getToken();
        setSession(token, data);
        updateUserUI(data);

        msgEl.textContent = "Profile updated successfully.";
        msgEl.style.display = "block";
        msgEl.className = "auth-success";
        setTimeout(() => { msgEl.style.display = "none"; }, 3000);
    } catch (e) {
        msgEl.textContent = "Connection error."; msgEl.style.display = "block"; msgEl.className = "auth-error";
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Changes';
    }
}

function updatePasswordForm() {
    const user = getStoredUser();
    const isGuest = user && user.auth_provider === "guest";
    const currentPwGroup = document.getElementById("current-password")?.closest(".form-group");
    const btn = document.getElementById("password-save-btn");
    const guestNote = document.getElementById("guest-password-note");
    const securityCards = document.querySelectorAll("#view-account .glass-card");
    const title = securityCards.length > 1 ? securityCards[1].querySelector(".glass-card-title span") : null;

    if (isGuest) {
        if (currentPwGroup) currentPwGroup.style.display = "none";
        if (btn) btn.innerHTML = '<i class="fa-solid fa-key"></i> <span>Set Password</span>';
        if (guestNote) guestNote.style.display = "block";
        if (title) title.textContent = "Set Password";
    } else {
        if (currentPwGroup) currentPwGroup.style.display = "block";
        if (btn) btn.innerHTML = '<i class="fa-solid fa-key"></i> <span>Change Password</span>';
        if (guestNote) guestNote.style.display = "none";
        if (title) title.textContent = "Security";
    }
}

async function changePassword() {
    const user = getStoredUser();
    const isGuest = user && user.auth_provider === "guest";
    const current = document.getElementById("current-password").value;
    const newPw = document.getElementById("new-password").value;
    const confirm = document.getElementById("confirm-password").value;
    const msgEl = document.getElementById("password-msg");
    const btn = document.getElementById("password-save-btn");

    if (!isGuest && !current) { msgEl.textContent = "Please enter your current password."; msgEl.style.display = "block"; msgEl.className = "auth-error"; return; }
    if (!newPw) { msgEl.textContent = "Please enter a new password."; msgEl.style.display = "block"; msgEl.className = "auth-error"; return; }
    if (newPw !== confirm) { msgEl.textContent = "New passwords do not match."; msgEl.style.display = "block"; msgEl.className = "auth-error"; return; }
    if (newPw.length < 6) { msgEl.textContent = "Password must be at least 6 characters."; msgEl.style.display = "block"; msgEl.className = "auth-error"; return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + (isGuest ? 'Setting...' : 'Changing...');

    try {
        const res = await authFetch("/profile/change-password", { method: "POST", body: JSON.stringify({ current_password: current || "", new_password: newPw }) });
        const data = await res.json();
        if (!res.ok) { msgEl.textContent = data.detail || "Failed."; msgEl.style.display = "block"; msgEl.className = "auth-error"; return; }

        msgEl.textContent = isGuest ? "Password set successfully! You can now log in with your email and password." : "Password changed successfully.";
        msgEl.style.display = "block";
        msgEl.className = "auth-success";
        document.getElementById("current-password").value = "";
        document.getElementById("new-password").value = "";
        document.getElementById("confirm-password").value = "";

        // If guest just set password, update stored user so UI reflects the change
        if (isGuest) {
            const updatedUser = { ...user, auth_provider: "email" };
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
            updatePasswordForm();
        }

        setTimeout(() => { msgEl.style.display = "none"; }, 4000);
    } catch (e) {
        msgEl.textContent = "Connection error."; msgEl.style.display = "block"; msgEl.className = "auth-error";
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-key"></i> <span>${isGuest ? 'Set Password' : 'Change Password'}</span>`;
    }
}

function confirmDeleteAccount() {
    document.getElementById("delete-modal").style.display = "flex";
}

function closeDeleteModal() {
    document.getElementById("delete-modal").style.display = "none";
}

async function deleteAccount() {
    const btn = document.getElementById("delete-confirm-btn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

    try {
        await authFetch("/profile", { method: "DELETE" });
        closeDeleteModal();
        clearSession();
        resetApp();
        document.getElementById("app-root").style.display = "none";
        const landingPage = document.getElementById("landing-page");
        const landingNav = document.getElementById("landing-nav");
        const landingHero = document.querySelector(".landing-hero");
        const landingFooter = document.getElementById("footer");
        if (landingPage) landingPage.style.display = "block";
        if (landingNav) landingNav.style.display = "";
        if (landingHero) landingHero.style.display = "";
        if (landingFooter) landingFooter.style.display = "";
        goToStep("login");
        alert("Your account has been permanently deleted.");
    } catch (e) {
        alert("Failed to delete account. Please try again.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Yes, Delete';
    }
}

// ============================================================
// ACTIVITY LOG
// ============================================================
async function loadActivityLog() {
    try {
        const res = await authFetch("/activity?limit=30");
        if (!res.ok) return;
        const logs = await res.json();
        const container = document.getElementById("activity-list");
        if (!logs?.length) {
            container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-clock-rotate-left"></i><p>No activity recorded yet.</p></div>`;
            return;
        }

        const ACTION_META = {
            chat_message: { icon: "fa-wand-magic-sparkles", cls: "chat", label: "Chat" },
            logged_in: { icon: "fa-right-to-bracket", cls: "auth", label: "Login" },
            account_created: { icon: "fa-user-plus", cls: "auth", label: "Account Created" },
            profile_updated: { icon: "fa-user-pen", cls: "profile", label: "Profile Updated" },
            password_changed: { icon: "fa-key", cls: "profile", label: "Password Changed" },
            bookmark_added: { icon: "fa-bookmark", cls: "bookmark", label: "Bookmark Added" },
            account_deleted: { icon: "fa-trash-can", cls: "system", label: "Account Deleted" },
            admin_block_user: { icon: "fa-ban", cls: "system", label: "Admin: Block User" },
            admin_unblock_user: { icon: "fa-unlock", cls: "system", label: "Admin: Unblock User" },
        };

        container.innerHTML = logs.map(log => {
            const meta = ACTION_META[log.action] || { icon: "fa-circle-info", cls: "system", label: log.action };
            const time = log.created_at ? new Date(log.created_at).toLocaleString() : "";
            return `
                <div class="activity-item">
                    <div class="activity-icon ${meta.cls}"><i class="fa-solid ${meta.icon}"></i></div>
                    <div class="activity-info">
                        <div class="activity-action">${meta.label}</div>
                        <div class="activity-detail">${escapeHtml(log.detail || "")}</div>
                    </div>
                    <div class="activity-time">${time}</div>
                </div>`;
        }).join("");
    } catch (e) { console.error(e); }
}

async function clearActivity() {
    if (!confirm("Clear all activity logs?")) return;
    try {
        await authFetch("/activity", { method: "DELETE" });
        loadActivityLog();
    } catch (e) { console.error(e); }
}

// ============================================================
// THEME (light / dark / system)
// ============================================================
function initTheme() {
    setTheme(localStorage.getItem("theme") || "dark");
}

function setTheme(theme) {
    if (theme !== "dark" && theme !== "light") theme = "dark";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    updateThemeButtons(theme);
}

function updateThemeButtons(theme) {
    const isDark = theme === "dark";
    const iconClass = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
    const title = isDark ? "Switch to light mode" : "Switch to dark mode";

    document.querySelectorAll(".theme-toggle-btn, .landing-sidebar-theme, .mobile-dropdown-theme").forEach(btn => {
        const icon = btn.querySelector("i");
        const lbl = btn.querySelector("span");
        if (icon) icon.className = iconClass;
        if (lbl) lbl.textContent = isDark ? "Light" : "Dark";
        btn.title = title;
    });
}

function toggleTheme() {
    const current = localStorage.getItem("theme") || "dark";
    setTheme(current === "dark" ? "light" : "dark");
}

document.addEventListener("DOMContentLoaded", initTheme);
