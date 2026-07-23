/* Orders screen (React port).
 * Loads real orders via the orders slice and renders the master table with
 * search, reusing the existing badge styles (.badge / .b-*) for identical
 * status pills. Cancelled orders are hidden by default (as in the vanilla app).
 * Advanced bits (inline status edit, split chips, column filters) come next. */
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders } from './ordersSlice';
import OrderModal from './OrderModal.jsx';

const STATUS_BADGE = {
  'Order': 'b-ordered', 'Approved': 'b-approved', 'PO Raised': 'b-po', 'In Transit': 'b-transit',
  'At Transporter': 'b-transporter', 'Warehouse': 'b-warehouse', 'GRN': 'b-grn', 'Purchased': 'b-purchased',
  'Billed': 'b-billed', 'Cancelled': 'b-cancelled',
};
function fmtDate(d) {
  if (!d) return '—';
  const p = String(d).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : d;
}
const th = { padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap' };
const td = { padding: '10px 14px', fontSize: 13, color: '#1e293b', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' };

export default function Orders() {
  const dispatch = useDispatch();
  const { list, loading, error, loaded } = useSelector((s) => s.orders);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(200);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { if (!loaded) dispatch(fetchOrders()); }, [loaded, dispatch]);

  const filtered = useMemo(() => {
    let d = statusFilter ? list.filter((o) => o.status === statusFilter) : list.filter((o) => o.status !== 'Cancelled');
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      d = d.filter((o) => [o.customer, o.product, o.orderedCode, o.vendor, o.poNum, o.vendorPoNum, 'DON-' + (o.groupDonId || o.id)]
        .some((x) => (x || '').toString().toLowerCase().includes(s)));
    }
    return d;
  }, [list, q, statusFilter]);

  const rows = filtered.slice(0, limit);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.1)', overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search DON / customer / product / supplier / PO…"
            style={{ flex: 1, maxWidth: 420, padding: '9px 14px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' }}
          />
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#64748b', fontWeight: 600 }}>
            {loading ? 'Loading…' : `${filtered.length} orders`}
          </span>
        </div>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['', 'Order', 'Approved', 'PO Raised', 'In Transit', 'At Transporter', 'Warehouse', 'GRN', 'Purchased', 'Billed', 'Cancelled'].map((s) => (
            <button key={s || 'all'} onClick={() => { setStatusFilter(s); setLimit(200); }}
              style={{ padding: '4px 11px', borderRadius: 20, border: '1.5px solid ' + (statusFilter === s ? '#1a73e8' : '#e2e8f0'), background: statusFilter === s ? '#1a73e8' : '#fff', color: statusFilter === s ? '#fff' : '#475569', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {s || 'All active'}
            </button>
          ))}
        </div>

        {error && <div style={{ padding: 16, color: '#b91c1c', background: '#fef2f2' }}>❌ {error}</div>}

        {loading && !list.length ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading orders…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={th}>DON #</th>
                  <th style={th}>Customer</th>
                  <th style={th}>SKU / Product</th>
                  <th style={{ ...th, textAlign: 'center' }}>Qty</th>
                  <th style={th}>Supplier</th>
                  <th style={th}>Status</th>
                  <th style={th}>Order Date</th>
                  <th style={th}>ETA</th>
                  <th style={th}>Biller</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o._id || o.id} onClick={() => setSelected(o)} style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                    <td style={{ ...td, fontWeight: 700, color: '#1a73e8', whiteSpace: 'nowrap' }}>DON-{o.groupDonId || o.id}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{o.customer || '—'}</td>
                    <td style={td}>{o.orderedCode || o.product || '—'}</td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{o.qty}</td>
                    <td style={td}>{o.vendor || '—'}</td>
                    <td style={td}><span className={'badge ' + (STATUS_BADGE[o.status] || '')}>{o.status}</span></td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDate(o.orderDate)}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDate(o.eta)}</td>
                    <td style={td}>{o.biller || '—'}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: 32 }}>No orders match your search.</td></tr>
                )}
              </tbody>
            </table>
            {filtered.length > rows.length && (
              <div style={{ padding: 14, textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
                <button onClick={() => setLimit((l) => l + 200)} className="btn btn-outline btn-sm">
                  Show more ({rows.length} of {filtered.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <OrderModal order={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
