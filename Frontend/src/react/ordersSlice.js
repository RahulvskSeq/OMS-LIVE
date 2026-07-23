/* Orders data layer (Redux Toolkit).
 * Mirrors the vanilla _loadAll orders logic: fetch page 1 (which returns the
 * page count), fetch the rest in parallel, dedup by the same key, and map each
 * order to the local shape the UI uses. */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from './api';

// Backend order → local shape (subset of the vanilla _toLocal, extended as needed)
export function toLocalOrder(o) {
  return {
    id: o.seqId || 0,
    _id: o._id,
    groupDonId: o.groupDonId || null,
    customer: o.customer || '',
    product: o.product || '',
    orderedCode: o.orderedCode || '',
    vendor: o.vendor || '',
    qty: o.qty || 0,
    unit: o.unit || 'pcs',
    orderDate: o.orderDate ? String(o.orderDate).split('T')[0] : '',
    eta: o.eta || '',
    status: (o.status === 'Cancel' ? 'Cancelled' : o.status) || 'Order',
    lr: o.lr || '',
    lrDate: o.lrDate || '',
    transporter: o.transporter || '',
    poNum: o.poNum || '',
    vendorPoNum: o.vendorPoNum || '',
    biller: o.biller || '',
    salesExec: o.salesExec || '',
    createdBy: o.createdBy || '',
    updatedAt: o.updatedAt || '',
  };
}

const SORD = ['Order', 'Approved', 'PO Raised', 'In Transit', 'At Transporter', 'Warehouse', 'GRN', 'Purchased', 'Billed', 'Cancelled'];
const sp = (s) => { const i = SORD.indexOf(s); return i >= 0 ? i : -1; };

export const fetchOrders = createAsyncThunk('orders/fetch', async (_, { rejectWithValue }) => {
  try {
    const first = await api.get('/orders?page=1&limit=200');
    let all = first.data.data || [];
    const pages = Math.min(first.data.pages || 1, 50);
    if (pages > 1) {
      const reqs = [];
      for (let p = 2; p <= pages; p++) reqs.push(api.get(`/orders?page=${p}&limit=200`));
      (await Promise.all(reqs)).forEach((r) => { all = all.concat(r.data.data || []); });
    }
    // Dedup: same key keeps the most-advanced status (then highest seqId)
    const seen = new Map();
    const dd = [];
    for (const o of all) {
      const key = (o.customer || '') + '|' + (o.product || o.orderedCode || '') + '|' + (o.qty || 0) + '|' + (o.orderDate || '') + '|' + (o.biller || '') + '|' + (o.createdBy || '');
      if (!seen.has(key)) { seen.set(key, { o, sp: sp(o.status), sq: o.seqId || 0 }); dd.push(o); }
      else {
        const pr = seen.get(key); const cs = sp(o.status); const cq = o.seqId || 0;
        if (cs > pr.sp || (cs === pr.sp && cq > pr.sq)) { const pi = dd.indexOf(pr.o); if (pi >= 0) dd[pi] = o; seen.set(key, { o, sp: cs, sq: cq }); }
      }
    }
    return dd.map(toLocalOrder);
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed to load orders');
  }
});

// Create a new order. POST /orders → prepend the mapped order to the list.
export const createOrder = createAsyncThunk('orders/create', async (payload, { rejectWithValue }) => {
  try {
    const r = await api.post('/orders', payload);
    return toLocalOrder(r.data.data);
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed to create order');
  }
});

// Update an order's ETA. PATCH /orders/:_id/eta (records ETA history server-side).
export const updateOrderEta = createAsyncThunk('orders/updateEta', async ({ _id, eta }, { rejectWithValue }) => {
  try {
    await api.patch(`/orders/${_id}/eta`, { eta });
    return { _id, eta };
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed to update ETA');
  }
});

// Change an order's status. Hits PATCH /orders/:_id/status (sets status + trail).
export const changeOrderStatus = createAsyncThunk('orders/changeStatus', async ({ _id, status }, { rejectWithValue }) => {
  try {
    await api.patch(`/orders/${_id}/status`, { status });
    return { _id, status };
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed to update status');
  }
});

const slice = createSlice({
  name: 'orders',
  initialState: { list: [], loading: false, error: null, loaded: false },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchOrders.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchOrders.fulfilled, (s, a) => { s.loading = false; s.loaded = true; s.list = a.payload; });
    b.addCase(fetchOrders.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
    b.addCase(changeOrderStatus.fulfilled, (s, a) => {
      const o = s.list.find((x) => x._id === a.payload._id);
      if (o) o.status = a.payload.status;
    });
    b.addCase(createOrder.fulfilled, (s, a) => { s.list.unshift(a.payload); });
    b.addCase(updateOrderEta.fulfilled, (s, a) => {
      const o = s.list.find((x) => x._id === a.payload._id);
      if (o) o.eta = a.payload.eta;
    });
  },
});

export default slice.reducer;
