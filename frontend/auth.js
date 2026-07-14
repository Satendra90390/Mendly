// ============================================================
// Mendly — Auth Controller (Email / Phone / Google / Forgot Password)
// ============================================================

const AUTH_TOKEN_KEY = "mendly_token";
const AUTH_USER_KEY = "mendly_user";

let _currentEmail = "";
let _currentPhone = "";
let _otpPurpose = "";
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

// ——— Math Captcha ———
let _captchaAnswer = {};
function generateCaptcha(prefix) {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    _captchaAnswer[prefix] = a + b;
    const aEl = document.getElementById(`${prefix}-captcha-a`);
    const bEl = document.getElementById(`${prefix}-captcha-b`);
    if (aEl) aEl.textContent = a;
    if (bEl) bEl.textContent = b;
}
function verifyCaptcha(prefix) {
    const input = document.getElementById(`${prefix}-captcha`);
    return input && parseInt(input.value) === _captchaAnswer[prefix];
}

function handleLogoClick() {
    if (getToken()) {
        const appRoot = document.getElementById("app-root");
        const landingNav = document.getElementById("landing-nav");
        const landingHero = document.querySelector(".landing-hero");
        const landingLogin = document.getElementById("landing-login");
        const landingFooter = document.getElementById("footer");
        if (appRoot) appRoot.style.display = "block";
        if (landingNav) landingNav.style.display = "none";
        if (landingHero) landingHero.style.display = "none";
        if (landingLogin) landingLogin.style.display = "none";
        if (landingFooter) landingFooter.style.display = "none";
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
    if (step === "login") { generateCaptcha("login"); document.getElementById("auth-subtitle").textContent = "Your intelligent health companion"; }
    if (step === "signup") { generateCaptcha("signup"); document.getElementById("auth-subtitle").textContent = "Create your account"; }
    if (step === "email") { document.getElementById("auth-subtitle").textContent = "Your intelligent health companion"; document.getElementById("auth-email").value = ""; }
}

function hideAllErrors() {
    ["login-error", "signup-error", "email-error", "password-error", "otp-error", "complete-error", "phone-error", "phone-otp-error", "phone-complete-error", "forgot-error", "forgot-otp-error", "reset-error"].forEach(id => {
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

// ——— OTP input boxes ———
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
// EMAIL FLOW
// ============================================================

async function handleEmailSubmit(e) {
    e.preventDefault(); hideAllErrors();
    const email = document.getElementById("auth-email").value.trim();
    const btn = document.getElementById("email-submit-btn");
    if (!email) return;
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';
    try {
        const res = await fetch(`${API_BASE}/auth/check-email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
        const data = await res.json();
        if (!res.ok) { showStepError("email", data.detail || "Something went wrong."); return; }
        _currentEmail = email; _otpPurpose = data.exists ? "login" : "signup";
        if (data.exists && data.auth_provider && data.auth_provider !== "email") {
            showStepError("email", `This email uses ${data.auth_provider} login. Please use that method.`); return;
        }
        if (data.exists) { document.getElementById("password-email-label").textContent = email; goToStep("password"); }
        else { document.getElementById("otp-email-label").textContent = email; setupOtpInputs("otp-inputs"); goToStep("otp"); startOtpTimer(60, "otp-timer", "otp-resend-btn"); }
    } catch (err) { showStepError("email", "Couldn't reach the server."); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-arrow-right"></i> Continue'; }
}

async function handlePasswordLogin(e) {
    e.preventDefault(); hideAllErrors();
    if (!verifyCaptcha("login")) { showStepError("login", "Incorrect captcha answer."); generateCaptcha("login"); return; }
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const btn = document.getElementById("login-submit-btn");
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
    try {
        const res = await fetch(`${API_BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if (!res.ok) { showStepError("login", data.detail || "Incorrect email or password."); return; }
        setSession(data.access_token, data.user); enterApp(data.user);
    } catch (err) { showStepError("login", "Couldn't reach the server."); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Log In'; generateCaptcha("login"); }
}

async function handleSendOtpForLogin() {
    hideAllErrors();
    try {
        const res = await fetch(`${API_BASE}/auth/login-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: _currentEmail }) });
        const data = await res.json();
        if (!res.ok) { showStepError("password", data.detail || "Could not send OTP."); return; }
        _otpPurpose = "login"; document.getElementById("otp-email-label").textContent = _currentEmail;
        setupOtpInputs("otp-inputs"); goToStep("otp"); startOtpTimer(60, "otp-timer", "otp-resend-btn");
    } catch (err) { showStepError("password", "Couldn't reach the server."); }
}

async function handleOtpVerify(e) {
    e.preventDefault(); hideAllErrors();
    const code = getOtpValue("otp-inputs"); const btn = document.getElementById("otp-submit-btn");
    if (code.length !== 6) { showStepError("otp", "Enter all 6 digits."); return; }
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
    try {
        const res = await fetch(`${API_BASE}/auth/verify-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: _currentEmail, otp: code }) });
        const data = await res.json();
        if (!res.ok) { showStepError("otp", data.detail || "Invalid code."); return; }
        if (data.access_token && data.user) { setSession(data.access_token, data.user); enterApp(data.user); }
        else { document.getElementById("complete-email-label").textContent = _currentEmail; goToStep("complete"); }
    } catch (err) { showStepError("otp", "Couldn't reach the server."); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> Verify'; }
}

async function handleResendOtp() {
    hideAllErrors();
    try { await fetch(`${API_BASE}/auth/check-email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: _currentEmail }) }); startOtpTimer(60, "otp-timer", "otp-resend-btn"); } catch {}
}

async function handleSignup(e) {
    e.preventDefault(); hideAllErrors();
    if (!verifyCaptcha("signup")) { showStepError("signup", "Incorrect captcha answer."); generateCaptcha("signup"); return; }
    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirm = document.getElementById("signup-confirm").value;
    const btn = document.getElementById("signup-submit-btn");
    if (password.length < 6) { showStepError("signup", "Password must be at least 6 characters."); return; }
    if (password !== confirm) { showStepError("signup", "Passwords do not match."); return; }
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';
    try {
        const res = await fetch(`${API_BASE}/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
        const data = await res.json();
        if (!res.ok) { showStepError("signup", data.detail || "Signup failed."); return; }
        setSession(data.access_token, data.user); enterApp(data.user, true);
    } catch (err) { showStepError("signup", "Couldn't reach the server."); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account'; generateCaptcha("signup"); }
}

async function handleCompleteSignup(e) {
    e.preventDefault(); hideAllErrors();
    const name = document.getElementById("signup-name").value.trim();
    const dob = document.getElementById("signup-dob").value;
    const password = document.getElementById("signup-password").value;
    const confirm = document.getElementById("signup-confirm").value;
    const btn = document.getElementById("complete-submit-btn");
    if (password.length < 6) { showStepError("complete", "Password must be at least 6 characters."); return; }
    if (password !== confirm) { showStepError("complete", "Passwords do not match."); return; }
    if (!dob) { showStepError("complete", "Please enter your date of birth."); return; }
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';
    try {
        const res = await fetch(`${API_BASE}/auth/complete-signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: _currentEmail, name, date_of_birth: dob, password }) });
        const data = await res.json();
        if (!res.ok) { showStepError("complete", data.detail || "Signup failed."); return; }
        setSession(data.access_token, data.user); enterApp(data.user);
    } catch (err) { showStepError("complete", "Couldn't reach the server."); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account'; }
}

// ============================================================
// PHONE FLOW
// ============================================================

async function handlePhoneSendOtp(e) {
    e.preventDefault(); hideAllErrors();
    const phone = document.getElementById("auth-phone").value.trim();
    const btn = document.getElementById("phone-submit-btn");
    if (!phone) return;
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    try {
        const res = await fetch(`${API_BASE}/auth/phone/send-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
        const data = await res.json();
        if (!res.ok) { showStepError("phone", data.detail || "Could not send OTP."); return; }
        _currentPhone = phone; document.getElementById("phone-otp-label").textContent = phone;
        setupOtpInputs("phone-otp-inputs"); goToStep("phone-otp"); startOtpTimer(60, "phone-otp-timer", "phone-otp-resend-btn");
        if (data.dev_code && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
            const hint = document.createElement("div");
            hint.className = "dev-otp-hint";
            hint.innerHTML = `<i class="fa-solid fa-code"></i> Dev mode — code: <strong>${escapeHtml(data.dev_code)}</strong>`;
            const form = document.getElementById("phone-otp-form");
            if (form && !form.querySelector(".dev-otp-hint")) form.parentNode.insertBefore(hint, form);
        }
    } catch (err) { showStepError("phone", "Couldn't reach the server."); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Code'; }
}

async function handlePhoneOtpVerify(e) {
    e.preventDefault(); hideAllErrors();
    const code = getOtpValue("phone-otp-inputs"); const btn = document.getElementById("phone-otp-submit-btn");
    if (code.length !== 6) { showStepError("phone-otp", "Enter all 6 digits."); return; }
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
    try {
        const res = await fetch(`${API_BASE}/auth/phone/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: _currentPhone, otp: code }) });
        const data = await res.json();
        if (!res.ok) { showStepError("phone-otp", data.detail || "Invalid code."); return; }
        if (data.access_token && data.user) { setSession(data.access_token, data.user); enterApp(data.user); }
        else { document.getElementById("phone-complete-label").textContent = _currentPhone; goToStep("phone-complete"); }
    } catch (err) { showStepError("phone-otp", "Couldn't reach the server."); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> Verify'; }
}

async function handlePhoneResendOtp() {
    hideAllErrors();
    try { await fetch(`${API_BASE}/auth/phone/send-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: _currentPhone }) }); startOtpTimer(60, "phone-otp-timer", "phone-otp-resend-btn"); } catch {}
}

async function handlePhoneCompleteSignup(e) {
    e.preventDefault(); hideAllErrors();
    const name = document.getElementById("phone-signup-name").value.trim();
    const email = document.getElementById("phone-signup-email").value.trim();
    const dob = document.getElementById("phone-signup-dob").value;
    const password = document.getElementById("phone-signup-password").value;
    const btn = document.getElementById("phone-complete-submit-btn");
    if (password.length < 6) { showStepError("phone-complete", "Password must be at least 6 characters."); return; }
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';
    try {
        const res = await fetch(`${API_BASE}/auth/phone/complete-signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: _currentPhone, name, email: email || undefined, date_of_birth: dob || undefined, password }) });
        const data = await res.json();
        if (!res.ok) { showStepError("phone-complete", data.detail || "Signup failed."); return; }
        setSession(data.access_token, data.user); enterApp(data.user);
    } catch (err) { showStepError("phone-complete", "Couldn't reach the server."); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account'; }
}

// ============================================================
// FORGOT PASSWORD FLOW
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
        _currentEmail = email; document.getElementById("forgot-otp-label").textContent = email;
        setupOtpInputs("forgot-otp-inputs"); goToStep("forgot-otp"); startOtpTimer(60, "forgot-otp-timer", "forgot-otp-resend-btn");
    } catch (err) { showStepError("forgot", "Couldn't reach the server."); }
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
        goToStep("reset");
    } catch (err) { showStepError("forgot-otp", "Couldn't reach the server."); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> Verify'; }
}

async function handleForgotResendOtp() {
    hideAllErrors();
    try { await fetch(`${API_BASE}/auth/forgot-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: _currentEmail }) }); startOtpTimer(60, "forgot-otp-timer", "forgot-otp-resend-btn"); } catch {}
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
        const res = await fetch(`${API_BASE}/auth/forgot-password/reset`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: _currentEmail, otp: "verified", new_password: password }) });
        const data = await res.json();
        if (!res.ok) { showStepError("reset", data.detail || "Reset failed."); return; }
        goToStep("login"); showStepError("login", "Password reset! You can now log in.");
        document.getElementById("login-error").style.color = "#10b981";
        document.getElementById("login-error").style.background = "rgba(16,185,129,0.08)";
        document.getElementById("login-error").style.borderColor = "rgba(16,185,129,0.2)";
    } catch (err) { showStepError("reset", "Couldn't reach the server."); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-key"></i> Reset Password'; }
}

// ============================================================
// SOCIAL LOGIN
// ============================================================
function handleSocialLogin(provider) { window.location.href = `${API_BASE}/auth/${provider}`; }

// ============================================================
// LOGOUT
// ============================================================
function handleLogout() {
    clearSession();
    document.getElementById("app-root").style.display = "none";
    document.getElementById("landing-page").style.display = "block";
    goToStep("login");
    ["signup-name", "signup-email", "signup-password", "signup-confirm", "login-email", "login-password", "auth-email", "auth-phone", "phone-signup-name", "phone-signup-email", "phone-signup-dob", "phone-signup-password", "forgot-email", "reset-password", "reset-confirm"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
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
    if (typeof initApp === "function") initApp();
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
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token"); const authError = params.get("auth_error");
    if (token || authError) window.history.replaceState({}, document.title, window.location.pathname);
    if (authError) { alert(`Social login failed: ${authError}`); return; }
    if (token) {
        setSession(token, null);
        try { const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) { const user = await res.json(); setSession(token, user); enterApp(user); return; } } catch {}
        clearSession(); return;
    }
    const storedToken = getToken(); const user = getStoredUser();
    if (!storedToken || !user) return;
    try { const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() }); if (res.ok) { const u = await res.json(); setSession(storedToken, u); enterApp(u); } else clearSession(); } catch { enterApp(user); }
    goToStep("login");
});
