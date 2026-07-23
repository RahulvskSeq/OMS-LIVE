/* Axios client for the React app.
 * Resolves the backend base the same way the vanilla app does — from
 * config.js (window.__APP_CONFIG__.API_URL) — so both hit the same server.
 * Reuses the SAME JWT localStorage key as the vanilla app, so a login in
 * either one is recognized by the other during the migration. */
import axios from 'axios';

export const JWT_KEY = 'stencil_jwt_v1';

function apiBase() {
  const cfg = ((window.__APP_CONFIG__ && window.__APP_CONFIG__.API_URL) || '').trim().replace(/\/+$/, '');
  if (cfg) return cfg + '/api';
  const env = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (env) return env + '/api';
  return '/api'; // same-origin / Vite proxy fallback
}

const api = axios.create({ baseURL: apiBase(), timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(JWT_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
