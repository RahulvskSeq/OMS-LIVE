/* Auth state (Redux Toolkit) for the React app.
 * Talks to POST /api/auth/login and persists the token + user in the same
 * localStorage keys the migration shares. */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { JWT_KEY } from './api';

const USR_KEY = 'stencil_user_v1';
const storedUser = (() => { try { return JSON.parse(localStorage.getItem(USR_KEY) || 'null'); } catch { return null; } })();

export const login = createAsyncThunk('auth/login', async (creds, { rejectWithValue }) => {
  try {
    const r = await api.post('/auth/login', creds);
    return r.data; // { token, user }
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Login failed. Please try again.');
  }
});

const slice = createSlice({
  name: 'auth',
  initialState: {
    user: storedUser,
    token: localStorage.getItem(JWT_KEY) || null,
    permissions: storedUser?.permissions || [],
    loading: false,
    error: null,
  },
  reducers: {
    logout(s) {
      s.user = null; s.token = null; s.permissions = [];
      localStorage.removeItem(JWT_KEY); localStorage.removeItem(USR_KEY);
    },
    clearError(s) { s.error = null; },
  },
  extraReducers: (b) => {
    b.addCase(login.pending,   (s) => { s.loading = true; s.error = null; });
    b.addCase(login.fulfilled, (s, a) => {
      s.loading = false;
      s.user = a.payload.user;
      s.token = a.payload.token;
      s.permissions = a.payload.user?.permissions || [];
      localStorage.setItem(JWT_KEY, a.payload.token);
      localStorage.setItem(USR_KEY, JSON.stringify(a.payload.user));
    });
    b.addCase(login.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export const { logout, clearError } = slice.actions;
export default slice.reducer;
