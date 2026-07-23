/* Shipments screen (React port) — one component, filtered by transit status:
 *   In Transit / At Transporter / Warehouse.
 * Reuses the orders data layer; shows logistics info (LR, transporter, ETA). */
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders } from './ordersSlice';

function fmtDate(d) { if (!d) return '—'; const p = String(d).split('T')[0].split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : d; }
const th = { padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap' };
const td = { padding: '10px 14px', fontSize: 13, color: '#1e293b', borderBottom: '1px solid #f1f5f9' };

export default function Shipments({ status }) {
  const dispatch = useDispatch();
  const { list, loaded, loading } = useSelector((s) => s.orders);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(200);

  useEffect(() => { if (!loaded) dispatch(fetchOrders()); }, [loaded, dispatch]);
  useEffect(() => { setLimit(200); setQ(''); }, [status]);

  const filtered = useMemo(() => {
    let d = list.filter((o) => o.status === status);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      d = d.filter((o) => [o.customer, o.product, o.orderedCode, o.vendor, o.lr, o.transporter, 'DON-' + (o.groupDonId || o.id)]
        .some((x) => (x || '').toString().toLowerCase().includes(s)));
    }
    return d;
  }, [list, status, q]);

  const rows = filtered.slice(0, limit);
  const totalUnits = filtered.reduce((n, o) => n + (Number(o.qty) || 0), 0);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.1)', overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search DON / customer / product / LR / transporter…"
            style={{ flex: 1, maxWidth: 440, padding: '9px 14px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' }} />
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#64748b', fontWeight: 600 }}>
            {loading && !list.length ? 'Loading…' : `${filtered.length} orders · ${totalUnits} units`}
          </span>
        </div>

        {loading && !list.length ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
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
                  <th style={th}>LR</th>
                  <th style={th}>Transporter</th>
                  <th style={th}>ETA</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o._id || o.id}>
                    <td style={{ ...td, fontWeight: 700, color: '#1a73e8', whiteSpace: 'nowrap' }}>DON-{o.groupDonId || o.id}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{o.customer || '—'}</td>
                    <td style={td}>{o.orderedCode || o.product || '—'}</td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{o.qty}</td>
                    <td style={td}>{o.vendor || '—'}</td>
                    <td style={{ ...td, fontWeight: 600, color: o.lr ? '#7c3aed' : '#94a3b8' }}>{o.lr || '—'}</td>
                    <td style={td}>{o.transporter || '—'}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDate(o.eta)}</td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: 32 }}>No shipments here.</td></tr>}
              </tbody>
            </table>
            {filtered.length > rows.length && (
              <div style={{ padding: 14, textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
                <button onClick={() => setLimit((l) => l + 200)} className="btn btn-outline btn-sm">Show more ({rows.length} of {filtered.length})</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
