import axios from 'axios';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';

// In production (Vercel), VITE_API_URL is your Railway backend URL
// In local dev, falls back to Vite proxy (/api → localhost:5000)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      store.dispatch(logout());
    }
    return Promise.reject(err);
  }
);

export default api;
