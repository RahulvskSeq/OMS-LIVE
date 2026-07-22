/* ──────────────────────────────────────────────────────────────
 * React shell — Stencil OMS client.
 *
 * Returns null on purpose. The existing vanilla-JS app in ../index.html
 * owns the DOM and stays 100% unchanged (same design, same logic). This
 * component is the migration seam: as each screen (Dashboard, Orders,
 * GRN, Shipments, Reports, Masters, Users, …) is rebuilt in React, render
 * it here. Until then, the shell simply co-exists with the live app.
 *
 * The earlier (unfinished) React router scaffold still lives under
 * src/pages and src/components as a reference for that migration.
 * ────────────────────────────────────────────────────────────── */
export default function App() {
  return null;
}
