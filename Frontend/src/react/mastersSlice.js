/* Masters data (customers + suppliers + transporters).
 * Small enough to load whole; used by both the order-form pickers (name) and
 * the Masters tables (fuller fields). Products are NOT loaded — searched
 * server-side on demand (searchProducts). */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from './api';

export const fetchMasters = createAsyncThunk('masters/fetch', async (_, { rejectWithValue }) => {
  try {
    const [c, s, t] = await Promise.all([api.get('/customers'), api.get('/suppliers'), api.get('/transporters')]);
    return {
      customers: (c.data.data || []).map((x) => ({ _id: x._id, name: x.name || '', code: x.code || '', phone: x.phone || '', city: x.city || '', gst: x.gst || '', type: x.type || '' })),
      suppliers: (s.data.data || []).map((x) => ({ _id: x._id, name: x.name || '', code: x.code || '', city: x.city || x.address || '', phone: x.phone || '', leadTimeDays: x.leadTimeDays || 7, category: x.category || '' })),
      transporters: (t.data.data || []).map((x) => ({ _id: x._id, name: x.name || '', code: x.code || '', contact: x.contact || '', avgTransitDays: x.avgTransitDays || 5, type: x.type || '' })),
    };
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed to load masters');
  }
});

// On-demand product search (server-side; matches name OR code once backend is deployed). No 32k upfront load.
export async function searchProducts(q) {
  const term = (q || '').trim();
  if (term.length < 2) return [];
  const r = await api.get(`/products?search=${encodeURIComponent(term)}&limit=50`);
  return (r.data.data || []).map((p) => ({
    _id: p._id, code: p.code || '', name: p.name || '',
    category: p.category || '', defaultVendor: p.defaultVendor || '', parentCode: p.parentCode || '',
  }));
}

const slice = createSlice({
  name: 'masters',
  initialState: { customers: [], suppliers: [], transporters: [], loaded: false, loading: false },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchMasters.pending, (s) => { s.loading = true; });
    b.addCase(fetchMasters.fulfilled, (s, a) => { s.loading = false; s.loaded = true; s.customers = a.payload.customers; s.suppliers = a.payload.suppliers; s.transporters = a.payload.transporters; });
    b.addCase(fetchMasters.rejected, (s) => { s.loading = false; });
  },
});

export default slice.reducer;
