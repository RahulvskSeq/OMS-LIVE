/* ──────────────────────────────────────────────────────────────
 * React entry (Vite) — Stencil OMS client (the "R" in MERN).
 *
 * The live application UI lives in ../index.html: a self-contained
 * vanilla-JS app whose behaviour and design must not change. This React
 * shell boots alongside it through Vite so the project is a real MERN
 * (Mongo · Express · React · Node) client with a proper dev/build
 * pipeline — WITHOUT touching the existing screens or logic.
 *
 * React mounts into an out-of-flow container (display:contents) and
 * renders <App/>, which paints nothing. The vanilla UI stays identical.
 * As screens are ported, render their React components from <App/>.
 * ────────────────────────────────────────────────────────────── */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Out-of-flow host: `display:contents` means no box and no layout impact,
// so nothing on the existing page shifts by a single pixel.
const host = document.createElement('div');
host.id = 'react-shell-root';
host.style.display = 'contents';
document.body.appendChild(host);

createRoot(host).render(
  <StrictMode>
    <App />
  </StrictMode>
);
