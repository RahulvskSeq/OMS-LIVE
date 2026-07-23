/* Dashboard aggregates. The fast header/due/recent load first; the heavy
 * ETA-edited feed is fetched separately so it never blocks the rest. The
 * dealer/supplier/pending/LR/purchased cards are computed from the loaded
 * orders in the component (like the original). */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from './api';

export const fetchDashboard = createAsyncThunk('dashboard/fetch', async () => {
  // Resilient: one failing endpoint must not zero out the rest.
  const results = await Promise.allSettled([
    api.get('/dashboard/pipeline'),
    api.get('/dashboard/summary'),
    api.get('/dashboard/due-orders'),
    api.get('/dashboard/recent-orders?limit=12'),
  ]);
  const val = (i, def) => (results[i].status === 'fulfilled' ? (results[i].value.data.data ?? def) : def);
  return {
    pipeline: val(0, []),
    summary: val(1, {}),
    due: val(2, { overdue: [], dueToday: [], dueThisWeek: [] }),
    recent: val(3, []),
  };
});

// Heavy feed (all ETA-edited orders w/ history) — fetched on its own, non-blocking.
export const fetchEtaEdited = createAsyncThunk('dashboard/etaEdited', async () => {
  const r = await api.get('/dashboard/eta-edited', { timeout: 90000 });
  return r.data.data || [];
});

const slice = createSlice({
  name: 'dashboard',
  initialState: { pipeline: [], summary: {}, due: { overdue: [], dueToday: [], dueThisWeek: [] }, recent: [], etaEdited: [], loading: false, error: null, loaded: false },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchDashboard.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchDashboard.fulfilled, (s, a) => {
      s.loading = false; s.loaded = true;
      s.pipeline = a.payload.pipeline; s.summary = a.payload.summary;
      s.due = a.payload.due; s.recent = a.payload.recent;
    });
    b.addCase(fetchDashboard.rejected, (s, a) => { s.loading = false; s.error = a.error?.message; });
    b.addCase(fetchEtaEdited.fulfilled, (s, a) => { s.etaEdited = a.payload; });
  },
});

export default slice.reducer;
