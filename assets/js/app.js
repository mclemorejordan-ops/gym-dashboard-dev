// ===========================
// Boot + Crash Overlay + Safe Init
// ===========================

// Holds the active Service Worker registration (if available)
window.__SW_REG__ = null;

// Show a readable crash screen on first runtime error
window.addEventListener("error", (e) => {
  const msg  = e?.message || String(e);
  const file = e?.filename || "";
  const line = e?.lineno || "";
  const col  = e?.colno || "";

  document.body.innerHTML = `
    <div style="font-family:system-ui;padding:16px;color:#fff;background:#111;min-height:100vh">
      <h2 style="margin:0 0 10px">App crashed ❌</h2>
      <div style="opacity:.8;margin-bottom:10px">Here’s the first error:</div>
      <pre style="white-space:pre-wrap;background:#000;padding:12px;border-radius:12px;border:1px solid #333">${msg}</pre>
      <div style="opacity:.8;margin-top:10px">File: ${file}<br/>Line: ${line} Col: ${col}</div>
    </div>
  `;
}, { once: true });

// Catch unhandled promise rejections too (Safari will often surface these)
window.addEventListener("unhandledrejection", (e) => {
  const msg = e?.reason?.message || String(e?.reason || e);

  document.body.innerHTML = `
    <div style="font-family:system-ui;padding:16px;color:#fff;background:#111;min-height:100vh">
      <h2 style="margin:0 0 10px">App crashed ❌</h2>
      <div style="opacity:.8;margin-bottom:10px">Unhandled promise rejection:</div>
      <pre style="white-space:pre-wrap;background:#000;padding:12px;border-radius:12px;border:1px solid #333">${msg}</pre>
    </div>
  `;
}, { once: true });

/* ---------------------------
   Global dependency check
   - Delay until DOM + scripts are loaded
---------------------------- */
let __booted = false;

function bootOnce() {
  if (__booted) return;
  __booted = true;

  // ✅ IMPORTANT:
  // Don't reference `defaultProfile()` or `profile` here — those are `let/const`
  // later in the file and will trigger "Cannot access 'profile' before initialization".

  const required = [
    "LS",
    "KEY_PROFILE",
    "KEY_ROUTINES",
    "KEY_ACTIVE_ROUTINE",
    "KEY_ACTIVE_SCREEN",
    "KEY_BW",
    "KEY_ATT",
    "KEY_PRO",
    "KEY_LIFTS"
  ];

  const missing = required.filter(k => !(k in window));
  if (missing.length) {
    throw new Error("Missing globals (check storage.js/dom.js/utils.js): " + missing.join(", "));
  }

  // ✅ Now it's safe to boot the app
  init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootOnce, { once: true });
} else {
  bootOnce();
}

// ===========================
// Global State (safe defaults)
// ===========================

// ✅ SAFEST default: do NOT call functions here.
// Calling `defaultProfile()` here can crash on Safari if the function is defined later.
let profile = null;          // will be set inside init() via loadProfile()
let routines = [];
let activeRoutineId = null;

let bwLogs = [];
let attendance = new Set();
let proteinMap = {};
let lifts = [];
