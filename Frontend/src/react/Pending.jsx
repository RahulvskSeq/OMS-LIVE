/* Pending screen (React port) — one component, three modes:
 *   don      → Pending DONs  (group by groupDonId)
 *   spo      → Pending SPOs  (group by vendorPoNum)
 *   supplier → By Supplier   (group by vendor)
 * Reuses the orders data layer. "Pending" = not Billed and not Cancelled. */
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders } from './ordersSlice';

const STATUS_BADGE = {
  'Order': 'b-ordered', 'Approved': 'b-approved', 'PO Raised': 'b-po', 'In Transit': 'b-transit',
  'At Transporter': 'b-transporter', 'Warehouse': 'b-warehouse', 'GRN': 'b-grn', 'Purchased': 'b-purchased',
  'Billed': 'b-billed', 'Cancelled': 'b-cancelled',
};
const ORDER = ['Order', 'Approved', 'PO Raised', 'In Transit', 'At Transporter', 'Warehouse', 'GRN', 'Purchased'];
function fmtDate(d) { if (!d) return '—'; const p = String(d).split('T')[0].split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : d; }

export default function Pending({ mode }) {
  const dispatch = useDispatch();
  const { list, loaded, loading } = useSelector((s) => s.orders);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(60);

  useEffect(() => { if (!loaded) dispatch(fetchOrders()); }, [loaded, dispatch]);
  useEffect(() => { setLimit(60); }, [mode]);

  const groups = useMemo(() => {
    const active = list.filter((o) => o.status !== 'Cancelled' && o.status !== 'Billed');
    const keyOf = mode === 'don'
      ? (o) => 'DON-' + (o.groupDonId || o.id)
      : mode === 'spo'
        ? (o) => o.vendorPoNum || ''
        : (o) => o.vendor || '(No Supplier)';
    const map = new Map();
    active.forEach((o) => { const k = keyOf(o); if (mode === 'spo' && !k) return; if (!map.has(k)) map.set(k, []); map.get(k).push(o); });
    return Array.from(map.entries()).map(([key, orders]) => {
      const counts = {};
      orders.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
      const qty = orders.reduce((n, o) => n + (Number(o.qty) || 0), 0);
      const etas = orders.map((o) => o.eta).filter(Boolean).sort();
      const customers = Array.from(new Set(orders.map((o) => o.customer).filter(Boolean)));
      return { key, orders, counts, qty, nextEta: etas[0] || '', customers };
    }).sort((a, b) => b.orders.length - a.orders.length);
  }, [list, mode]);

  const filtered = useMemo(() => {
    if (!q.trim()) return groups;
    const s = q.trim().toLowerCase();
    return groups.filter((g) => g.key.toLowerCase().includes(s) || g.customers.some((c) => c.toLowerCase().includes(s)));
  }, [groups, q]);

  const shown = filtered.slice(0, limit);
  const title = mode === 'don' ? 'Pending DONs' : mode === 'spo' ? 'Pending SPOs' : 'Pending by Supplier';

  return (
    <div style={{ padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.1)', overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`}
            style={{ flex: 1, maxWidth: 420, padding: '9px 14px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' }} />
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{loading && !list.length ? 'Loading…' : `${filtered.length} ${mode === 'supplier' ? 'suppliers' : mode === 'spo' ? 'SPOs' : 'DONs'}`}</span>
        </div>

        <div style={{ padding: 14, display: 'grid', gap: 10 }}>
          {loading && !list.length && <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>}
          {!loading && !shown.length && <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>Nothing pending here 🎉</div>}

          {shown.map((g) => (
            <div key={g.key} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, color: '#1a73e8', fontSize: 14 }}>{g.key}</span>
                <span style={{ color: '#1e293b', fontWeight: 600, fontSize: 13, flex: 1, minWidth: 120 }}>
                  {g.customers.slice(0, 2).join(', ')}{g.customers.length > 2 ? ` +${g.customers.length - 2}` : ''}
                </span>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>{g.qty} units</span>
                {g.nextEta && <span style={{ fontSize: 12, color: '#64748b' }}>ETA {fmtDate(g.nextEta)}</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {ORDER.filter((s) => g.counts[s]).map((s) => (
                  <span key={s} className={'badge ' + (STATUS_BADGE[s] || '')} style={{ fontSize: 10 }}>{s} ×{g.counts[s]}</span>
                ))}
              </div>
            </div>
          ))}

          {filtered.length > shown.length && (
            <div style={{ textAlign: 'center', paddingTop: 6 }}>
              <button onClick={() => setLimit((l) => l + 60)} className="btn btn-outline btn-sm">Show more ({shown.length} of {filtered.length})</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
