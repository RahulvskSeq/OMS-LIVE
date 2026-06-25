import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../../api/auth.api';

const stored = JSON.parse(localStorage.getItem('oms_auth') || 'null');

export const login = createAsyncThunk('auth/login', async (creds, { rejectWithValue }) => {
  try {
    const res = await authApi.login(creds);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const res = await authApi.me();
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:        stored?.user    || null,
    token:       stored?.token   || null,
    permissions: stored?.permissions || [],
    loading:     false,
    error:       null,
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.permissions = [];
      localStorage.removeItem('oms_auth');
    },
    clearError(state) { state.error = null; },
  },
  extraReducers: (b) => {
    b.addCase(login.pending,   (s) => { s.loading = true; s.error = null; });
    b.addCase(login.fulfilled, (s, a) => {
      s.loading     = false;
      s.user        = a.payload.user;
      s.token       = a.payload.token;
      s.permissions = a.payload.user.permissions || [];
      localStorage.setItem('oms_auth', JSON.stringify({ user: a.payload.user, token: a.payload.token, permissions: a.payload.user.permissions }));
    });
    b.addCase(login.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });
    b.addCase(fetchMe.fulfilled, (s, a) => {
      s.user = a.payload.user;
      s.permissions = a.payload.user.permissions || [];
    });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
