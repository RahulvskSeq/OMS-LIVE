/* Backend / Settings (React port — system overview). */
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api from './api';

function Card({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}
function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
      <span style={{ color: '#64748b', fontWeight: 600 }}>{label}</span>
      <span style={{ color: '#1e293b', fontWeight: 600, textAlign: 'right', wordBreak: 'break-all', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

export default function Settings() {
  const user = useSelector((s) => s.auth.user);
  const permCount = useSelector((s) => (s.auth.permissions || []).length);
  const orders = useSelector((s) => s.orders.list.length);
  const masters = useSelector((s) => s.masters);
  const summary = useSelector((s) => s.dashboard.summary);
  const [health, setHealth] = useState(null);
  const [busy, setBusy] = useState(false);
  const [bmsg, setBmsg] = useState('');

  const apiBase = ((window.__APP_CONFIG__ && window.__APP_CONFIG__.API_URL) || window.__API__ || '(same origin)');

  async function fetchAllOrders() {
    const first = await api.get('/orders?page=1&limit=200');
    let all = first.data.data || [];
    const pages = Math.min(first.data.pages || 1, 50);
    const reqs = [];
    for (let p = 2; p <= pages; p++) reqs.push(api.get(`/orders?page=${p}&limit=200`));
    (await Promise.all(reqs)).forEach((r) => { all = all.concat(r.data.data || []); });
    return all;
  }

  async function backup() {
    setBusy(true); setBmsg('Gathering data…');
    try {
      const [ord, c, s, t, u] = await Promise.all([
        fetchAllOrders(), api.get('/customers'), api.get('/suppliers'), api.get('/transporters'), api.get('/users'),
      ]);
      const data = {
        app: 'Stencil OMS', exportedAt: new Date().toISOString(),
        counts: { orders: ord.length, customers: c.data.data.length, suppliers: s.data.data.length, transporters: t.data.data.length, users: u.data.data.length },
        orders: ord, customers: c.data.data, suppliers: s.data.data, transporters: t.data.data, users: u.data.data,
        note: 'Products (catalog) are excluded from this quick backup due to size.',
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `oms-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      setBmsg(`✓ Downloaded (${data.counts.orders} orders, ${data.counts.customers} customers)`);
    } catch (e) { setBmsg('❌ ' + (e.response?.data?.message || 'Backup failed')); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try { const r = await api.get('/health'); if (alive) setHealth({ ok: true, ...r.data }); }
      catch { if (alive) setHealth({ ok: false }); }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
      <Card title="🔌 Connection">
        <Row label="API base" value={apiBase} />
        <Row label="Health" value={health == null ? 'Checking…' : health.ok ? '🟢 Online' : '🔴 Unreachable'} />
        <Row label="Environment" value={health?.env || '—'} />
      </Card>

      <Card title="👤 Account">
        <Row label="Name" value={user?.name || user?.username || '—'} />
        <Row label="Username" value={user?.username || '—'} />
        <Row label="Role" value={user?.role || '—'} />
        <Row label="Permissions" value={`${permCount} granted`} />
      </Card>

      <Card title="📊 Data Summary">
        <Row label="Orders (loaded)" value={orders} />
        <Row label="Active orders" value={summary?.totalActive ?? '—'} />
        <Row label="Customers" value={masters.customers.length || '—'} />
        <Row label="Suppliers" value={masters.suppliers.length || '—'} />
        <Row label="Transporters" value={masters.transporters.length || '—'} />
      </Card>

      <Card title="💾 Backup & Data">
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>
          Download a JSON snapshot of your orders, customers, suppliers, transporters and users. (Restore and the destructive data-wipe tools are intentionally not wired in this build.)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-success btn-sm" disabled={busy} onClick={backup}>{busy ? 'Working…' : '💾 Download Backup'}</button>
          {bmsg && <span style={{ fontSize: 12, fontWeight: 600, color: bmsg[0] === '❌' ? '#b91c1c' : '#16a34a' }}>{bmsg}</span>}
        </div>
      </Card>
    </div>
  );
}
