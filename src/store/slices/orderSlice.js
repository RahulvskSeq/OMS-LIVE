import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { orderApi } from '../../api/order.api';

export const fetchOrders = createAsyncThunk('orders/fetch', async (params, { rejectWithValue }) => {
  try { return (await orderApi.getAll(params)).data; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const createOrder = createAsyncThunk('orders/create', async (data, { rejectWithValue }) => {
  try { return (await orderApi.create(data)).data; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const updateOrder = createAsyncThunk('orders/update', async ({ id, data }, { rejectWithValue }) => {
  try { return (await orderApi.update(id, data)).data; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const updateStatus = createAsyncThunk('orders/status', async ({ id, data }, { rejectWithValue }) => {
  try { return (await orderApi.updateStatus(id, data)).data; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const updateEta = createAsyncThunk('orders/eta', async ({ id, data }, { rejectWithValue }) => {
  try { return (await orderApi.updateEta(id, data)).data; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const deleteOrder = createAsyncThunk('orders/delete', async (id, { rejectWithValue }) => {
  try { await orderApi.delete(id); return id; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

const orderSlice = createSlice({
  name: 'orders',
  initialState: {
    items:   [],
    total:   0,
    pages:   1,
    page:    1,
    loading: false,
    error:   null,
    filters: { status: '', search: '', from: '', to: '' },
  },
  reducers: {
    setFilters(s, a) { s.filters = { ...s.filters, ...a.payload }; s.page = 1; },
    setPage(s, a)    { s.page = a.payload; },
    clearError(s)    { s.error = null; },
  },
  extraReducers: (b) => {
    b.addCase(fetchOrders.pending,   (s)    => { s.loading = true; s.error = null; });
    b.addCase(fetchOrders.fulfilled, (s, a) => { s.loading = false; s.items = a.payload.data; s.total = a.payload.total; s.pages = a.payload.pages; });
    b.addCase(fetchOrders.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });

    const upsert = (s, a) => { const idx = s.items.findIndex(o => o._id === a.payload.data?._id); if (idx > -1) s.items[idx] = a.payload.data; };
    b.addCase(updateOrder.fulfilled,  upsert);
    b.addCase(updateStatus.fulfilled, upsert);
    b.addCase(updateEta.fulfilled,    upsert);
    b.addCase(createOrder.fulfilled,  (s, a) => { s.items.unshift(a.payload.data); s.total += 1; });
    b.addCase(deleteOrder.fulfilled,  (s, a) => { s.items = s.items.filter(o => o._id !== a.payload); });
  },
});

export const { setFilters, setPage, clearError } = orderSlice.actions;
export default orderSlice.reducer;
