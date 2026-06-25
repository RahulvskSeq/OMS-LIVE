import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardApi } from '../../api/dashboard.api';

export const fetchDashboard = createAsyncThunk('dashboard/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const [summary, pipeline, recent, due, purchased, lr, etaEdited, dealers, suppliers] = await Promise.all([
      dashboardApi.summary(),
      dashboardApi.pipeline(),
      dashboardApi.recentOrders(),
      dashboardApi.dueOrders(),
      dashboardApi.purchased(),
      dashboardApi.lrAtTransporter(),
      dashboardApi.etaEdited(),
      dashboardApi.dealerSummary(),
      dashboardApi.supplierSummary(),
    ]);
    return {
      summary:   summary.data.data,
      pipeline:  pipeline.data.data,
      recent:    recent.data.data,
      due:       due.data.data,
      purchased: purchased.data.data,
      lr:        lr.data.data,
      etaEdited: etaEdited.data.data,
      dealers:   dealers.data.data,
      suppliers: suppliers.data.data,
    };
  } catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    summary: {}, pipeline: [], recent: [], due: {},
    purchased: [], lr: [], etaEdited: [], dealers: [], suppliers: [],
    loading: false, error: null, lastFetched: null,
  },
  reducers: {
    clearError(s) { s.error = null; },
  },
  extraReducers: (b) => {
    b.addCase(fetchDashboard.pending,   (s)    => { s.loading = true; s.error = null; });
    b.addCase(fetchDashboard.fulfilled, (s, a) => {
      s.loading = false; s.lastFetched = Date.now();
      Object.assign(s, a.payload);
    });
    b.addCase(fetchDashboard.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export const { clearError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
