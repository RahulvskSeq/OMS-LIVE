/* ──────────────────────────────────────────────────────────────
 * React entry (Vite) — Stencil OMS client (the "R" in MERN).
 *
 * The live application UI lives in ../index.html (a self-contained
 * vanilla-JS app served by legacy/*.js). React boots alongside it via
 * Vite so the project is a real MERN client with a proper dev/build
 * pipeline — WITHOUT altering the existing screens or logic.
 *
 * IMPORTANT: the app is ALSO served "raw" (backend one-server mode, or a
 * static host without a build). In that mode this JSX module can't run,
 * so React must never be REQUIRED to render any screen — the vanilla app
 * must work on its own. React therefore mounts out-of-flow and renders
 * nothing here. A React-driven screen (e.g. src/pages/Login.jsx) can only
 * be wired in once the BUILT app (vite build → dist) is what gets served.
 * ────────────────────────────────────────────────────────────── */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Out-of-flow host: `display:contents` means no box and no layout impact.
const host = document.createElement('div');
host.id = 'react-shell-root';
host.style.display = 'contents';
document.body.appendChild(host);

createRoot(host).render(
  <StrictMode>
    <App />
  </StrictMode>
);
