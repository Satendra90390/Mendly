// ============================================================
// Mendly — In-App Update System
// ============================================================
const APP_VERSION = { code: 3, name: "1.2" };

function isRunningInApp() {
    return window.location.protocol === "capacitor:" || window.Capacitor?.isNativePlatform?.();
}

function compareVersions(a, b) {
    if (a.code !== b.code) return a.code - b.code;
    const pa = a.name.split(".").map(Number);
    const pb = b.name.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const x = pa[i] || 0, y = pb[i] || 0;
        if (x !== y) return x - y;
    }
    return 0;
}

function getBackendUrl() {
    if (window.location.protocol === "capacitor:") {
        return "https://mendly-backend-0vyg.onrender.com";
    }
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return "http://localhost:8002";
    }
    return "https://mendly-backend-0vyg.onrender.com";
}

async function checkForUpdate() {
    if (!isRunningInApp()) return;

    try {
        const res = await fetch(`${getBackendUrl()}/api/app/version`);
        if (!res.ok) return;
        const data = await res.json();
        const latest = data.android;
        if (!latest) return;

        if (compareVersions(latest, APP_VERSION) > 0) {
            showUpdateDialog(latest);
        }
    } catch (e) {
        console.log("[Update] Check failed:", e.message);
    }
}

function showUpdateDialog(info) {
    const overlay = document.createElement("div");
    overlay.id = "update-overlay";
    overlay.innerHTML = `
        <div class="update-dialog">
            <div class="update-icon"><i class="fa-solid fa-circle-arrow-up"></i></div>
            <h2>Update Available</h2>
            <p class="update-version">v${info.version_name}</p>
            <p class="update-notes">${escapeHtml(info.release_notes || "Bug fixes and improvements.")}</p>
            <div class="update-actions">
                <button class="btn-primary update-btn" onclick="downloadUpdate('${info.download_url}')">
                    <i class="fa-solid fa-download"></i> Update Now
                </button>
                ${info.force_update
                    ? ""
                    : `<button class="btn-secondary update-btn" onclick="dismissUpdate()">
                        <i class="fa-solid fa-clock"></i> Later
                    </button>`}
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));
}

function downloadUpdate(url) {
    if (window.Capacitor?.Plugins?.Browser) {
        window.Capacitor.Plugins.Browser.open({ url });
    } else {
        window.open(url, "_blank");
    }
    dismissUpdate();
}

function dismissUpdate() {
    const el = document.getElementById("update-overlay");
    if (el) {
        el.classList.remove("show");
        setTimeout(() => el.remove(), 300);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(checkForUpdate, 2000);
});
