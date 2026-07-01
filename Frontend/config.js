/* ──────────────────────────────────────────────────────────────
 * Runtime configuration for the Order Management System frontend.
 *
 * Loaded as-is (no build step) before the app boots, so you can point the
 * frontend at a different backend WITHOUT editing index.html or rebuilding —
 * just change API_URL below and refresh the page.
 *
 *   API_URL — backend ORIGIN only (NO trailing /api; the app appends it).
 *             Leave "" (empty) to auto-resolve:
 *               • same-origin when opened on localhost
 *               • the deployed backend otherwise
 *
 *   Examples:
 *     API_URL: "http://localhost:5000"
 *     API_URL: "https://web-production-3ead93.up.railway.app"
 * ────────────────────────────────────────────────────────────── */
window.__APP_CONFIG__ = {
  API_URL: "http://localhost:5003"
};
