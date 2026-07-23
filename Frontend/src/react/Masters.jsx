/* Masters screens (React port) — one component, four types:
 *   customers / vendors (suppliers) / transporters → loaded from mastersSlice.
 *   products → server-side search (no 32k upfront load).
 * Read views with search for now; add/edit CRUD comes in a later pass. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMasters, searchProducts } from './mastersSlice';

const th = { padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap' };
const td = { padding: '10px 14px', fontSize: 13, color: '#1e293b', borderBottom: '1px solid #f1f5f9' };

const COLUMNS = {
  customers: [['name', 'Name'], ['code', 'Code'], ['city', 'City'], ['phone', 'Phone'], ['gst', 'GST'], ['type', 'Type']],
  vendors: [['name', 'Name'], ['code', 'Code'], ['city', 'City'], ['phone', 'Phone'], ['leadTimeDays', 'Lead (d)'], ['category', 'Category']],
  transporters: [['name', 'Name'], ['code', 'Code'], ['contact', 'Contact'], ['avgTransitDays', 'Transit (d)'], ['type', 'Type']],
  products: [['code', 'Code'], ['name', 'Name'], ['category', 'Category'], ['defaultVendor', 'Default Supplier']],
};
const SLICE_KEY = { customers: 'customers', vendors: 'suppliers', transporters: 'transporters' };
const TITLES = { customers: 'Customer Master', vendors: 'Supplier Master', transporters: 'Transporter Master', products: 'Product Master' };

export default function Masters({ type }) {
  const dispatch = useDispatch();
  const masters = useSelector((s) => s.masters);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(100);
  const [prodResults, setProdResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);

  const isProducts = type === 'products';
  const cols = COLUMNS[type];

  useEffect(() => { if (!isProducts && !masters.loaded) dispatch(fetchMasters()); }, [isProducts, masters.loaded, dispatch]);
  useEffect(() => { setQ(''); setLimit(100); setProdResults([]); }, [type]);

  // Products: debounced server-side search
  useEffect(() => {
    if (!isProducts) return;
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setProdResults([]); return; }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try { setProdResults(await searchProducts(q)); } catch { setProdResults([]); } finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(timer.current);
  }, [q, isProducts]);

  const rows = useMemo(() => {
    if (isProducts) return prodResults;
    const all = masters[SLICE_KEY[type]] || [];
    if (!q.trim()) return all;
    const s = q.trim().toLowerCase();
    return all.filter((r) => cols.some(([k]) => (r[k] || '').toString().toLowerCase().includes(s)));
  }, [isProducts, prodResults, masters, type, q, cols]);

  const shown = rows.slice(0, limit);
  const loading = isProducts ? searching : masters.loading;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.1)', overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={isProducts ? 'Search products (type at least 2 characters)…' : `Search ${TITLES[type].toLowerCase()}…`}
            style={{ flex: 1, maxWidth: 440, padding: '9px 14px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' }} />
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#64748b', fontWeight: 600 }}>
            {loading ? 'Loading…' : isProducts ? `${rows.length} matches` : `${rows.length} records`}
          </span>
        </div>

        {isProducts && q.trim().length < 2 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Type at least 2 characters to search the product catalog.</div>
        ) : loading && !shown.length ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {cols.map(([, label]) => <th key={label} style={th}>{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r._id}>
                    {cols.map(([k], i) => (
                      <td key={k} style={{ ...td, fontWeight: i === 0 ? 600 : 400 }}>{r[k] !== '' && r[k] != null ? r[k] : '—'}</td>
                    ))}
                  </tr>
                ))}
                {!shown.length && <tr><td colSpan={cols.length} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: 32 }}>No records.</td></tr>}
              </tbody>
            </table>
            {rows.length > shown.length && (
              <div style={{ padding: 14, textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
                <button onClick={() => setLimit((l) => l + 100)} className="btn btn-outline btn-sm">Show more ({shown.length} of {rows.length})</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
