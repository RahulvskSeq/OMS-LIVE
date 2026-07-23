/* Create Order modal (React).
 * Single-product create form: customer picker (from loaded customers),
 * product picker (server-side search — no 32k upfront load), supplier
 * (auto-filled from the product's default vendor), qty and dates.
 * Submits POST /orders. Multi-line + stock/split come in a later pass. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createOrder } from './ordersSlice';
import { fetchMasters, searchProducts } from './mastersSlice';

const inputStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 };

function todayISO() { return new Date().toISOString().slice(0, 10); }

function Dropdown({ items, onPick, render }) {
  if (!items.length) return null;
  return (
    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.12)', maxHeight: 240, overflowY: 'auto', marginTop: 2 }}>
      {items.map((it, i) => (
        <div key={it._id || i} onMouseDown={() => onPick(it)} style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
          {render(it)}
        </div>
      ))}
    </div>
  );
}

export default function OrderCreateModal({ open, onClose }) {
  const dispatch = useDispatch();
  const { customers, loaded } = useSelector((s) => s.masters);

  const [customer, setCustomer] = useState('');
  const [custOpen, setCustOpen] = useState(false);
  const [prodText, setProdText] = useState('');
  const [prodCode, setProdCode] = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [prodOpen, setProdOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [vendor, setVendor] = useState('');
  const [qty, setQty] = useState('');
  const [orderDate, setOrderDate] = useState(todayISO());
  const [eta, setEta] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const searchTimer = useRef(null);

  useEffect(() => { if (open && !loaded) dispatch(fetchMasters()); }, [open, loaded, dispatch]);
  useEffect(() => {
    if (open) { setCustomer(''); setProdText(''); setProdCode(''); setVendor(''); setQty(''); setOrderDate(todayISO()); setEta(''); setErr(''); setProdResults([]); }
  }, [open]);

  const custMatches = useMemo(() => {
    const q = customer.trim().toLowerCase();
    if (!q) return [];
    return customers.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 15);
  }, [customer, customers]);

  function onProdType(v) {
    setProdText(v); setProdCode(''); setProdOpen(true);
    clearTimeout(searchTimer.current);
    if (v.trim().length < 2) { setProdResults([]); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try { const res = await searchProducts(v); setProdResults(res); }
      catch { setProdResults([]); }
      finally { setSearching(false); }
    }, 250);
  }
  function pickProduct(p) {
    setProdText(`${p.code}${p.name && p.name !== p.code ? ' — ' + p.name : ''}`);
    setProdCode(p.code || p.name);
    if (p.defaultVendor) setVendor(p.defaultVendor);
    setProdOpen(false);
  }

  async function submit() {
    setErr('');
    const cust = customer.trim();
    const code = prodCode || prodText.trim();
    const q = parseInt(qty, 10) || 0;
    if (!cust) return setErr('Please select a customer');
    if (!code) return setErr('Please select a product');
    if (q < 1) return setErr('Please enter a quantity');
    if (!orderDate) return setErr('Please select an order date');

    setSaving(true);
    const res = await dispatch(createOrder({
      customer: cust, product: code, orderedCode: code, vendor: vendor.trim(),
      qty: q, unit: 'pcs', orderDate, eta: eta || '', status: 'Order',
    }));
    setSaving(false);
    if (res.meta.requestStatus === 'fulfilled') onClose(true);
    else setErr(res.payload || 'Failed to create order');
  }

  if (!open) return null;

  return (
    <div onClick={() => onClose(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, maxWidth: 560, width: '100%', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>➕ New Order</h2>
          <button onClick={() => onClose(false)} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 24, lineHeight: 1, cursor: 'pointer', color: '#64748b' }}>×</button>
        </div>

        <div style={{ padding: 24, display: 'grid', gap: 16 }}>
          {err && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>❌ {err}</div>}

          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>Customer</label>
            <input style={inputStyle} value={customer} placeholder="Search customer…"
              onChange={(e) => { setCustomer(e.target.value); setCustOpen(true); }}
              onFocus={() => setCustOpen(true)} onBlur={() => setTimeout(() => setCustOpen(false), 150)} />
            {custOpen && <Dropdown items={custMatches} onPick={(c) => { setCustomer(c.name); setCustOpen(false); }} render={(c) => c.name} />}
          </div>

          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>Product (SKU / name)</label>
            <input style={inputStyle} value={prodText} placeholder="Type at least 2 characters…"
              onChange={(e) => onProdType(e.target.value)} onFocus={() => setProdOpen(true)} onBlur={() => setTimeout(() => setProdOpen(false), 150)} />
            {prodOpen && (searching || prodResults.length > 0) && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.12)', maxHeight: 240, overflowY: 'auto', marginTop: 2 }}>
                {searching && <div style={{ padding: 8, color: '#94a3b8', fontSize: 12 }}>Searching…</div>}
                {prodResults.map((p) => (
                  <div key={p._id} onMouseDown={() => pickProduct(p)} style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                    <strong>{p.code}</strong>{p.name && p.name !== p.code ? ` — ${p.name}` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Supplier</label>
              <input style={inputStyle} value={vendor} placeholder="Supplier" onChange={(e) => setVendor(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Quantity</label>
              <input style={inputStyle} type="number" min="1" value={qty} placeholder="0" onChange={(e) => setQty(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Order Date</label>
              <input style={inputStyle} type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>ETA Bangalore</label>
              <input style={inputStyle} type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={() => onClose(false)}>Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={saving} onClick={submit}>{saving ? 'Creating…' : 'Create Order'}</button>
        </div>
      </div>
    </div>
  );
}
