/* Dashboard aggregates (server-side counts + card lists). */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from './api';

export const fetchDashboard = createAsyncThunk('dashboard/fetch', async (_, { rejectWithValue }) => {
  try {
    const [pipe, sum, due, recent] = await Promise.all([
      api.get('/dashboard/pipeline'),
      api.get('/dashboard/summary'),
      api.get('/dashboard/due-orders'),
      api.get('/dashboard/recent-orders?limit=10'),
    ]);
    return {
      pipeline: pipe.data.data || [],
      summary: sum.data.data || {},
      due: due.data.data || { overdue: [], dueToday: [], dueThisWeek: [] },
      recent: recent.data.data || [],
    };
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed to load dashboard');
  }
});

const slice = createSlice({
  name: 'dashboard',
  initialState: { pipeline: [], summary: {}, due: { overdue: [], dueToday: [], dueThisWeek: [] }, recent: [], loading: false, error: null, loaded: false },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchDashboard.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchDashboard.fulfilled, (s, a) => {
      s.loading = false; s.loaded = true;
      s.pipeline = a.payload.pipeline; s.summary = a.payload.summary;
      s.due = a.payload.due; s.recent = a.payload.recent;
    });
    b.addCase(fetchDashboard.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export default slice.reducer;
