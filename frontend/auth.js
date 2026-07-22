// ============================================================
// Mendly — Auth Controller (Login / Signup / Google / Forgot Password)
// ============================================================

const AUTH_TOKEN_KEY = "mendly_token";
const AUTH_USER_KEY = "mendly_user";

let _currentEmail = "";
let _verifiedOtp = "";
let _otpTimerInterval = null;

// ——— XSS Protection ———
function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function escapeAttr(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/'/g, "&#39;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ——— Session ———
function getToken() { return localStorage.getItem(AUTH_TOKEN_KEY); }
function getStoredUser() { try { return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "null"); } catch { return null; } }
function setSession(token, user) { localStorage.setItem(AUTH_TOKEN_KEY, token); localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user)); }
function clearSession() { localStorage.removeItem(AUTH_TOKEN_KEY); localStorage.removeItem(AUTH_USER_KEY); }
function authHeaders() { const t = getToken(); return t ? { Authorization: `Bearer ${t}` } : {}; }

// ——— Terms of Service Modal ———
let _pendingTermsAction = null;

function openTermsModal() {
    const overlay = document.getElementById("terms-modal-overlay");
    const modalCheck = document.getElementById("terms-modal-check");
    const acceptBtn = document.getElementById("terms-accept-btn");
    if (overlay) overlay.classList.add("open");
    if (modalCheck) modalCheck.checked = false;
    if (acceptBtn) acceptBtn.disabled = true;
    document.body.style.overflow = "hidden";
}

function closeTermsModal() {
    const overlay = document.getElementById("terms-modal-overlay");
    if (overlay) overlay.classList.remove("open");
    _pendingTermsAction = null;
    document.body.style.overflow = "";
}

function acceptTermsAndContinue() {
    localStorage.setItem("mendly_terms_accepted", "true");
    closeTermsModal();
    if (_pendingTermsAction) {
        const action = _pendingTermsAction;
        _pendingTermsAction = null;
        action();
    }
}

function hasAcceptedTerms() {
    return localStorage.getItem("mendly_terms_accepted") === "true";
}

function requireTerms(action) {
    if (hasAcceptedTerms()) { action(); return; }
    _pendingTermsAction = action;
    openTermsModal();
}

// Attach modal checkbox listener
document.addEventListener("DOMContentLoaded", () => {
    const modalCheck = document.getElementById("terms-modal-check");
    const acceptBtn = document.getElementById("terms-accept-btn");
    if (modalCheck && acceptBtn) {
        modalCheck.addEventListener("change", () => { acceptBtn.disabled = !modalCheck.checked; });
    }
});

// ——— Cloudflare Turnstile ———
const TURNSTILE_SITE_KEY = "0x4AAAAAAD7cL9jURtSOUv7m";
const _turnstileWidgets = {};
let _turnstileLoaded = false;

function loadTurnstileScript() {
    return new Promise((resolve) => {
        if (_turnstileLoaded && typeof turnstile !== "undefined") { resolve(); return; }
        if (document.querySelector('script[src*="challenges.cloudflare.com"]')) {
            const wait = setInterval(() => {
                if (typeof turnstile !== "undefined") { clearInterval(wait); _turnstileLoaded = true; resolve(); }
            }, 50);
            setTimeout(() => { clearInterval(wait); resolve(); }, 5000);
            return;
        }
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = () => {
            const wait = setInterval(() => {
                if (typeof turnstile !== "undefined") { clearInterval(wait); _turnstileLoaded = true; resolve(); }
            }, 50);
            setTimeout(() => { clearInterval(wait); resolve(); }, 5000);
        };
        script.onerror = () => resolve();
        document.head.appendChild(script);
    });
}

function ensureTurnstileWidget(widgetId) {
    return new Promise(async (resolve) => {
        if (_turnstileWidgets[widgetId]) { resolve(); return; }
        await loadTurnstileScript();
        createTurnstileWidget(widgetId);
        resolve();
    });
}

function createTurnstileWidget(widgetId) {
    if (_turnstileWidgets[widgetId]) return;
    const el = document.getElementById(widgetId);
    if (!el) return;
    try {
        _turnstileWidgets[widgetId] = turnstile.render(`#${widgetId}`, {
            sitekey: TURNSTILE_SITE_KEY,
            appearance: "execute",
            execution: "execute",
            callback: (token) => { el.dataset.token = token; },
            "error-callback": () => { el.dataset.token = ""; },
            "expired-callback": () => { el.dataset.token = ""; },
            theme: document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light",
            size: "invisible",
        });
    } catch (e) { console.warn("Turnstile widget creation failed:", e); }
}

function getTurnstileToken(widgetId) {
    const el = document.getElementById(widgetId);
    return el ? (el.dataset.token || "") : "";
}

function resetTurnstile(widgetId) {
    if (_turnstileWidgets[widgetId] && typeof turnstile !== "undefined") {
        try { turnstile.reset(_turnstileWidgets[widgetId]); } catch (e) {}
        const el = document.getElementById(widgetId);
        if (el) el.dataset.token = "";
    }
}

function executeTurnstile(widgetId) {
    return new Promise(async (resolve) => {
        const el = document.getElementById(widgetId);
        if (el && el.dataset.token) { resolve(el.dataset.token); return; }
        await ensureTurnstileWidget(widgetId);
        if (!_turnstileWidgets[widgetId] || typeof turnstile === "undefined") { resolve(""); return; }
        try {
            const handler = (token) => { resolve(token); };
            const origCb = _turnstileWidgets[widgetId];
            turnstile.execute(_turnstileWidgets[widgetId]);
            let resolved = false;
            const check = setInterval(() => {
                if (el && el.dataset.token && !resolved) { resolved = true; clearInterval(check); resolve(el.dataset.token); }
            }, 50);
            setTimeout(() => { if (!resolved) { resolved = true; clearInterval(check); resolve(""); } }, 5000);
        } catch (e) { resolve(""); }
    });
}

function handleLogoClick() {
    if (getToken()) {
        const appRoot = document.getElementById("app-root");
        const landingPage = document.getElementById("landing-page");
        const landingSidebar = document.getElementById("landing-sidebar");
        const sidebarOverlay = document.getElementById("landing-sidebar-overlay");
        if (landingPage) landingPage.style.display = "none";
        if (landingSidebar) landingSidebar.classList.remove("active");
        if (sidebarOverlay) sidebarOverlay.classList.remove("active");
        if (appRoot) appRoot.style.display = "flex";
        if (typeof switchView === "function") switchView("dashboard");
    } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

// ——— Step nav ———
function goToStep(step) {
    document.querySelectorAll(".auth-step").forEach(el => el.classList.remove("active"));
    const el = document.getElementById(`step-${step}`);
    if (el) el.classList.add("active");
    if (_otpTimerInterval) { clearInterval(_otpTimerInterval); _otpTimerInterval = null; }
    ["otp-timer", "phone-otp-timer", "forgot-otp-timer"].forEach(id => { const e = document.getElementById(id); if (e) e.textContent = ""; });
    hideAllErrors();
    if (step === "login") {
        resetTurnstile("login-turnstile");
        ensureTurnstileWidget("login-turnstile");
        document.getElementById("auth-subtitle").textContent = "Log in to your account";
    }
    if (step === "signup") {
        resetTurnstile("signup-turnstile");
        ensureTurnstileWidget("signup-turnstile");
        document.getElementById("auth-subtitle").textContent = "Create your account";
    }
    if (step === "upgrade") {
        document.getElementById("landing-page").style.display = "block";
        document.getElementById("app-root").style.display = "none";
        const landingNav = document.getElementById("landing-nav");
        const landingHero = document.querySelector(".landing-hero");
        if (landingNav) landingNav.style.display = "";
        if (landingHero) landingHero.style.display = "";
    }
}

function hideAllErrors() {
    ["login-error", "signup-error", "otp-error", "phone-error", "phone-otp-error", "phone-complete-error", "forgot-error", "forgot-otp-error", "reset-error", "upgrade-error"].forEach(id => {
        const el = document.getElementById(id); if (el) el.style.display = "none";
    });
}

function showStepError(stepId, msg) { const el = document.getElementById(`${stepId}-error`); if (el) { el.textContent = msg; el.style.display = "block"; } }

// ——— Password toggle ———
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId); const icon = btn.querySelector("i");
    if (input.type === "password") { input.type = "text"; icon.classList.replace("fa-eye", "fa-eye-slash"); }
    else { input.type = "password"; icon.classList.replace("fa-eye-slash", "fa-eye"); }
}

// ——— Password strength ———
function checkPasswordStrength(password, prefix) {
    prefix = prefix || "";
    const container = document.getElementById(prefix ? `${prefix}-password-strength` : "password-strength");
    const text = document.getElementById(prefix ? `${prefix}-strength-text` : "strength-text");
    const fill = document.getElementById(prefix ? `${prefix}-strength-fill` : "strength-fill");
    if (!container || !text) return;
    container.className = "password-strength";
    if (!password) { text.textContent = ""; return; }
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) { container.classList.add("strength-weak"); text.textContent = "Weak"; }
    else if (score <= 3) { container.classList.add("strength-fair"); text.textContent = "Fair"; }
    else { container.classList.add("strength-strong"); text.textContent = "Strong"; }
}

// ——— OTP input boxes (kept for phone/forgot password) ———
function setupOtpInputs(containerId) {
    const boxes = document.querySelectorAll(`#${containerId} .otp-box`);
    boxes.forEach((box, i) => {
        box.value = ""; box.classList.remove("filled");
        box.addEventListener("input", (e) => {
            const val = e.target.value.replace(/\D/g, ""); e.target.value = val; e.target.classList.toggle("filled", val.length === 1);
            if (val && i < boxes.length - 1) boxes[i + 1].focus();
        });
        box.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !e.target.value && i > 0) { boxes[i - 1].focus(); boxes[i - 1].value = ""; boxes[i - 1].classList.remove("filled"); }
            if (e.key === "Enter") box.closest("form").dispatchEvent(new Event("submit"));
        });
        box.addEventListener("paste", (e) => {
            e.preventDefault(); const text = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6);
            text.split("").forEach((ch, j) => { if (boxes[j]) { boxes[j].value = ch; boxes[j].classList.add("filled"); } });
            if (text.length > 0) boxes[Math.min(text.length, 5)].focus();
        });
    });
}

function getOtpValue(containerId) { return Array.from(document.querySelectorAll(`#${containerId} .otp-box`)).map(b => b.value).join(""); }

// ——— OTP timer ———
function startOtpTimer(seconds, timerId, btnId) {
    const el = document.getElementById(timerId); const btn = document.getElementById(btnId);
    if (btn) btn.disabled = true; let remaining = seconds;
    el.textContent = `Resend in ${remaining}s`;
    _otpTimerInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) { clearInterval(_otpTimerInterval); _otpTimerInterval = null; el.textContent = ""; if (btn) btn.disabled = false; }
        else el.textContent = `Resend in ${remaining}s`;
    }, 1000);
}

// ============================================================
// LOGIN
// ============================================================

async function handleLogin(e) {
    e.preventDefault(); hideAllErrors();
    const token = await executeTurnstile("login-turnstile");
    if (!token) { showStepError("login", "Verification failed. Please try again."); resetTurnstile("login-turnstile"); return; }
    requireTerms(async () => {
        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;
        const btn = document.getElementById("login-submit-btn");
        if (!email || !password) return;
        btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
        try {
            const res = await fetch(`${API_BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, turnstile_token: token }) });
            const data = await res.json();
            if (!res.ok) { showStepError("login", data.detail || "Incorrect email or password."); resetTurnstile("login-turnstile"); return; }
            setSession(data.access_token, data.user); enterApp(data.user);
        } catch (err) {
            if (!navigator.onLine) showStepError("login", "You are offline. Please check your internet connection.");
            else showStepError("login", "Couldn't reach the server. Please try again.");
        }
        finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Log In'; resetTurnstile("login-turnstile"); }
    });
}

// ============================================================
// SIGNUP
// ============================================================

async function handleSignup(e) {
    e.preventDefault(); hideAllErrors();
    const token = await executeTurnstile("signup-turnstile");
    if (!token) { showStepError("signup", "Verification failed. Please try again."); resetTurnstile("signup-turnstile"); return; }
    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirm = document.getElementById("signup-confirm").value;
    const btn = document.getElementById("signup-submit-btn");
    if (password.length < 6) { showStepError("signup", "Password must be at least 6 characters."); return; }
    if (password !== confirm) { showStepError("signup", "Passwords do not match."); return; }
    requireTerms(async () => {
        btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';
        try {
            const res = await fetch(`${API_BASE}/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, turnstile_token: token }) });
            const data = await res.json();
            if (!res.ok) { showStepError("signup", data.detail || "Signup failed."); resetTurnstile("signup-turnstile"); return; }
            setSession(data.access_token, data.user); enterApp(data.user, true);
        } catch (err) {
            if (!navigator.onLine) showStepError("signup", "You are offline. Please check your internet connection.");
            else showStepError("signup", "Couldn't reach the server. Please try again.");
        }
        finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account'; resetTurnstile("signup-turnstile"); }
    });
}

// ============================================================
// GUEST LOGIN
// ============================================================

async function handleGuestLogin() {
    hideAllErrors();
    requireTerms(async () => {
        const btn = document.querySelector(".social-btn.social-google");
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Starting guest session...'; }
        try {
            const res = await fetch(`${API_BASE}/auth/guest`, { method: "POST", headers: { "Content-Type": "application/json" } });
            const data = await res.json();
            if (!res.ok) { alert(data.detail || "Guest login failed."); return; }
            setSession(data.access_token, data.user);
            enterApp(data.user, false);
            setTimeout(() => { const banner = document.getElementById("guest-banner"); if (banner) banner.style.display = "block"; }, 500);
        } catch (err) {
            if (!navigator.onLine) alert("You are offline. Please check your internet connection.");
            else alert("Couldn't reach the server. Please try again.");
        }
        finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-user-secret" style="font-size:18px;color:#6c63ff;"></i> <span>Continue as Guest</span>'; } }
    });
}

async function handleGuestUpgrade(e) {
    e.preventDefault(); hideAllErrors();
    const name = document.getElementById("upgrade-name").value.trim();
    const email = document.getElementById("upgrade-email").value.trim();
    const password = document.getElementById("upgrade-password").value;
    const btn = document.getElementById("upgrade-submit-btn");
    if (password.length < 6) { showStepError("upgrade", "Password must be at least 6 characters."); return; }
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    try {
        const res = await fetch(`${API_BASE}/auth/guest/upgrade`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (!res.ok) { showStepError("upgrade", data.detail || "Upgrade failed."); return; }
        setSession(data.access_token, data.user);
        updateUserUI(data.user);
        const banner = document.getElementById("guest-banner");
        if (banner) banner.style.display = "none";
        document.getElementById("landing-page").style.display = "none";
        document.getElementById("app-root").style.display = "flex";
        showWelcomeMessage(data.user.name);
    } catch (err) {
        if (!navigator.onLine) showStepError("upgrade", "You are offline. Please check your internet connection.");
        else showStepError("upgrade", "Couldn't reach the server. Please try again.");
    }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-rocket"></i> Save & Continue'; }
}

function skipUpgrade() {
    document.getElementById("guest-banner").style.display = "none";
    document.getElementById("landing-page").style.display = "none";
    document.getElementById("app-root").style.display = "flex";
    if (typeof initApp === "function") initApp();
}

// ============================================================
// FORGOT PASSWORD
// ============================================================

async function handleForgotSendOtp(e) {
    e.preventDefault(); hideAllErrors();
    const email = document.getElementById("forgot-email").value.trim();
    const btn = document.getElementById("forgot-submit-btn");
    if (!email) return;
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    try {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
        const data = await res.json();
        if (!res.ok) { showStepError("forgot", data.detail || "Could not send reset code."); return; }
        _currentEmail = email; document.getElementById("forgot-otp-label").textContent = email;
        setupOtpInputs("forgot-otp-inputs"); goToStep("forgot-otp"); startOtpTimer(60, "forgot-otp-timer", "forgot-otp-resend-btn");
    } catch (err) {
        if (!navigator.onLine) showStepError("forgot", "You are offline. Please check your internet connection.");
        else showStepError("forgot", "Couldn't reach the server. Please try again.");
    }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Reset Code'; }
}

async function handleForgotOtpVerify(e) {
    e.preventDefault(); hideAllErrors();
    const code = getOtpValue("forgot-otp-inputs"); const btn = document.getElementById("forgot-otp-submit-btn");
    if (code.length !== 6) { showStepError("forgot-otp", "Enter all 6 digits."); return; }
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
    try {
        const res = await fetch(`${API_BASE}/auth/forgot-password/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: _currentEmail, otp: code }) });
        const data = await res.json();
        if (!res.ok) { showStepError("forgot-otp", data.detail || "Invalid code."); return; }
        _verifiedOtp = code;
        goToStep("reset");
    } catch (err) {
        if (!navigator.onLine) showStepError("forgot-otp", "You are offline. Please check your internet connection.");
        else showStepError("forgot-otp", "Couldn't reach the server. Please try again.");
    }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> Verify'; }
}

async function handleForgotResendOtp() {
    hideAllErrors();
    try { await fetch(`${API_BASE}/auth/forgot-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: _currentEmail }) }); startOtpTimer(60, "forgot-otp-timer", "forgot-otp-resend-btn"); } catch { showStepError("forgot-otp", "Could not resend code. Please try again."); }
}

async function handleResetPassword(e) {
    e.preventDefault(); hideAllErrors();
    const password = document.getElementById("reset-password").value;
    const confirm = document.getElementById("reset-confirm").value;
    const btn = document.getElementById("reset-submit-btn");
    if (password.length < 6) { showStepError("reset", "Password must be at least 6 characters."); return; }
    if (password !== confirm) { showStepError("reset", "Passwords do not match."); return; }
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resetting...';
    try {
        const res = await fetch(`${API_BASE}/auth/forgot-password/reset`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: _currentEmail, otp: _verifiedOtp, new_password: password }) });
        const data = await res.json();
        if (!res.ok) { showStepError("reset", data.detail || "Reset failed."); return; }
        goToStep("login");
        const loginErr = document.getElementById("login-error");
        if (loginErr) { loginErr.textContent = "Password reset! You can now log in."; loginErr.style.display = "block"; loginErr.style.color = "#10b981"; loginErr.style.background = "rgba(16,185,129,0.08)"; loginErr.style.borderColor = "rgba(16,185,129,0.2)"; }
    } catch (err) {
        if (!navigator.onLine) showStepError("reset", "You are offline. Please check your internet connection.");
        else showStepError("reset", "Couldn't reach the server. Please try again.");
    }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-key"></i> Reset Password'; }
}

// ============================================================
// SOCIAL LOGIN
// ============================================================
function handleSocialLogin(provider) { requireTerms(() => { window.location.href = `${API_BASE}/auth/${provider}`; }); }

// ============================================================
// LOGOUT
// ============================================================
function handleLogout() {
    clearSession();
    if (typeof resetApp === "function") resetApp();
    document.getElementById("app-root").style.display = "none";
    const landingPage = document.getElementById("landing-page");
    const landingNav = document.getElementById("landing-nav");
    const landingHero = document.querySelector(".landing-hero");
    const landingLogin = document.getElementById("landing-login");
    const landingFooter = document.getElementById("footer");
    if (landingPage) landingPage.style.display = "block";
    if (landingNav) landingNav.style.display = "";
    if (landingHero) landingHero.style.display = "";
    if (landingLogin) landingLogin.style.display = "";
    if (landingFooter) landingFooter.style.display = "";
    goToStep("login");
    ["signup-name", "signup-email", "signup-password", "signup-confirm", "login-email", "login-password", "forgot-email", "reset-password", "reset-confirm"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    window.scrollTo(0, 0);
}

// ============================================================
// ENTER APP / UPDATE UI
// ============================================================
function enterApp(user, isNew) {
    document.getElementById("landing-page").style.display = "none";
    document.getElementById("app-root").style.display = "flex";
    updateUserUI(user);
    if (isNew) showWelcomeMessage(user.name);
    if (user.auth_provider === "guest") {
        const banner = document.getElementById("guest-banner");
        if (banner) banner.style.display = "block";
    } else {
        const banner = document.getElementById("guest-banner");
        if (banner) banner.style.display = "none";
    }
    if (typeof initApp === "function") initApp();
    if (typeof updatePasswordForm === "function") updatePasswordForm();
}

function showWelcomeMessage(name) {
    const safeName = escapeHtml(name.split(" ")[0]);
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;";
    overlay.innerHTML = `
        <div style="background:white;border-radius:16px;padding:40px;text-align:center;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:popIn 0.3s ease;">
            <div style="font-size:48px;margin-bottom:16px;">&#x1F44B;</div>
            <h2 style="color:#1e293b;margin:0 0 8px;">Welcome to Mendly!</h2>
            <p style="color:#64748b;font-size:16px;margin:0 0 24px;">Hi <strong>${safeName}</strong>, great to have you here.</p>
            <button onclick="this.closest('div[style]').parentElement.remove()" style="background:#4f46e5;color:white;border:none;padding:12px 32px;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">Get Started</button>
        </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
}

function updateUserUI(user) {
    const initial = (user.name || "U").charAt(0).toUpperCase();
    const color = user.avatar_color || "#4f46e5";
    const uname = document.getElementById("sidebar-username"); if (uname) uname.textContent = user.name;
    const avatar = document.getElementById("sidebar-avatar"); if (avatar) { avatar.textContent = initial; avatar.style.background = color; }
    const mobileName = document.getElementById("mobile-username"); if (mobileName) mobileName.textContent = user.name;
    const mobileEmail = document.getElementById("mobile-email"); if (mobileEmail) mobileEmail.textContent = user.email;
    const mobileAvatar = document.getElementById("mobile-avatar"); if (mobileAvatar) { mobileAvatar.textContent = initial; mobileAvatar.style.background = color; }
    const greeting = document.getElementById("dash-greeting"); if (greeting) greeting.textContent = `Welcome back, ${user.name.split(" ")[0]}`;
    const profileHeader = document.getElementById("profile-header-name"); if (profileHeader) profileHeader.textContent = user.name;
    if (document.getElementById("profile-name")) {
        document.getElementById("profile-name").value = user.name;
        document.getElementById("profile-email").value = user.email;
        document.getElementById("profile-dob").value = user.date_of_birth || "";
        document.getElementById("profile-blood").value = user.blood_type || "";
        const profileAvatar = document.getElementById("profile-avatar-large");
        if (user.profile_photo) {
            const safePhotoUrl = escapeAttr(user.profile_photo);
            profileAvatar.innerHTML = `<img src="${safePhotoUrl}" alt="Profile" style="width:100%;height:100%;border-radius:14px;object-fit:cover;">`;
            profileAvatar.style.background = "transparent";
            document.getElementById("remove-photo-btn").style.display = "flex";
        } else {
            profileAvatar.textContent = initial;
            profileAvatar.style.background = color;
            profileAvatar.innerHTML = initial;
            document.getElementById("remove-photo-btn").style.display = "none";
        }
        selectedProfilePhoto = null;
    }
}

// ============================================================
// ON LOAD
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
    let token = null;
    let authError = null;

    const params = new URLSearchParams(window.location.search);
    token = params.get("token");
    authError = params.get("auth_error");

    if (!token && window.location.hash) {
        const hash = new URLSearchParams(window.location.hash.substring(1));
        token = hash.get("access_token");
        authError = hash.get("error_description") || (hash.get("error") ? hash.get("error") : null);
    }

    if (token || authError) window.history.replaceState({}, document.title, window.location.pathname);

    if (authError) { alert(`Social login failed: ${authError}`); return; }
    if (token) {
        setSession(token, null);
        try { const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) { const user = await res.json(); setSession(token, user); enterApp(user); return; } } catch {}
        clearSession(); return;
    }
    const storedToken = getToken(); const user = getStoredUser();
    if (!storedToken || !user) return;
    try { const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() }); if (res.ok) { const u = await res.json(); setSession(storedToken, u); enterApp(u); } else { clearSession(); } } catch { enterApp(user); }
});
