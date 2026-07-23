/* Dashboard (React port) — full card set:
 * greeting + pipeline, Order Journey, Purchased, Due Orders, LR at Transporter,
 * Pending DONs, Pending SPOs, Dealer Summary, Supplier Summary, ETA-Edited
 * Orders, Recent Orders. Header/due/recent/eta come from the server; the
 * grouped cards are computed from the loaded orders (like the original). */
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchDashboard, fetchEtaEdited } from './dashboardSlice';
import { fetchOrders } from './ordersSlice';

const STAGES = ['Order', 'Approved', 'PO Raised', 'In Transit', 'At Transporter', 'Warehouse', 'GRN', 'Purchased', 'Billed'];
const HERO_STAGES = ['Order', 'Approved', 'PO Raised', 'In Transit', 'At Transporter', 'Warehouse', 'GRN', 'Purchased'];
const ORDER8 = ['Order', 'Approved', 'PO Raised', 'In Transit', 'At Transporter', 'Warehouse', 'GRN', 'Purchased'];
const COLORS = { 'Order': '#818cf8', 'Approved': '#38bdf8', 'PO Raised': '#fbbf24', 'In Transit': '#fb923c', 'At Transporter': '#a78bfa', 'Warehouse': '#34d399', 'GRN': '#fbbf24', 'Purchased': '#22d3ee', 'Billed': '#4ade80' };
const ICONS = { 'Order': '📝', 'Approved': '✅', 'PO Raised': '📄', 'In Transit': '🚚', 'At Transporter': '🚛', 'Warehouse': '🏭', 'GRN': '📋', 'Purchased': '💰', 'Billed': '🎉' };
const STATUS_BADGE = { 'Order': 'b-ordered', 'Approved': 'b-approved', 'PO Raised': 'b-po', 'In Transit': 'b-transit', 'At Transporter': 'b-transporter', 'Warehouse': 'b-warehouse', 'GRN': 'b-grn', 'Purchased': 'b-purchased', 'Billed': 'b-billed', 'Cancelled': 'b-cancelled' };

function greeting(h) { return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening'; }
function fmtDate(d) { if (!d) return '—'; const p = String(d).split('T')[0].split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : d; }

function Card({ title, right, children, maxH = 300 }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,.1)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{title}</div>
        {right}
      </div>
      <div style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: maxH }}>{children}</div>
    </div>
  );
}
function StatusChips({ counts }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
      {STAGES.filter((s) => counts[s]).map((s) => <span key={s} className={'badge ' + STATUS_BADGE[s]} style={{ fontSize: 10 }}>{s} ×{counts[s]}</span>)}
    </div>
  );
}
function OrderRow({ o }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 2px', borderBottom: '1px solid #f1f5f9', fontSize: 12.5 }}>
      <span style={{ fontWeight: 700, color: '#1a73e8', whiteSpace: 'nowrap', minWidth: 74 }}>DON-{o.seqId || o.id}</span>
      <span style={{ flex: 1, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customer}</span>
      <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{o.qty}</span>
      <span className={'badge ' + (STATUS_BADGE[o.status] || '')} style={{ fontSize: 10 }}>{o.status}</span>
      <span style={{ color: '#64748b', whiteSpace: 'nowrap', minWidth: 58, textAlign: 'right' }}>{fmtDate(o.eta || o.orderDate)}</span>
    </div>
  );
}
function empty(t) { return <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{t}</div>; }

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const { pipeline, summary, due, recent, etaEdited, loading, loaded } = useSelector((s) => s.dashboard);
  const orders = useSelector((s) => s.orders.list);
  const ordersLoaded = useSelector((s) => s.orders.loaded);
  const [now, setNow] = useState(new Date());
  const [dueTab, setDueTab] = useState('overdue');

  useEffect(() => { if (!loaded) dispatch(fetchDashboard()); }, [loaded, dispatch]);
  useEffect(() => { dispatch(fetchEtaEdited()); }, [dispatch]);
  useEffect(() => { if (!ordersLoaded) dispatch(fetchOrders()); }, [ordersLoaded, dispatch]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const units = {}, counts = {};
  pipeline.forEach((p) => { units[p.stage] = p.qty; counts[p.stage] = p.count; });
  const totalUnits = HERO_STAGES.reduce((n, s) => n + (units[s] || 0), 0);

  // Cards derived from the loaded orders (subset, like the original app)
  const derived = useMemo(() => {
    const noCancel = orders.filter((o) => o.status !== 'Cancelled');
    // Purchased
    const purchased = orders.filter((o) => o.status === 'Purchased').sort((a, b) => (b.orderDate || '').localeCompare(a.orderDate || ''));
    // LR at Transporter — group by lr
    const lrMap = {};
    orders.filter((o) => ['In Transit', 'At Transporter'].includes(o.status) && o.lr).forEach((o) => { (lrMap[o.lr] = lrMap[o.lr] || []).push(o); });
    const lrGroups = Object.entries(lrMap).map(([lr, os]) => ({ lr, transporter: os[0].transporter || '—', suppliers: Array.from(new Set(os.map((o) => o.vendor).filter(Boolean))), count: os.length, lrDate: os[0].lrDate, stage: os[0].status }));
    // Pending DONs / SPOs
    const group = (keyFn) => {
      const m = {};
      noCancel.filter((o) => o.status !== 'Billed').forEach((o) => { const k = keyFn(o); if (!k) return; (m[k] = m[k] || []).push(o); });
      return Object.entries(m).map(([key, os]) => {
        const c = {}; os.forEach((o) => { c[o.status] = (c[o.status] || 0) + 1; });
        return { key, counts: c, qty: os.reduce((n, o) => n + (Number(o.qty) || 0), 0), customers: Array.from(new Set(os.map((o) => o.customer).filter(Boolean))), nextEta: os.map((o) => o.eta).filter(Boolean).sort()[0] || '' };
      }).sort((a, b) => Object.values(b.counts).reduce((x, y) => x + y, 0) - Object.values(a.counts).reduce((x, y) => x + y, 0));
    };
    const pendingDons = group((o) => 'DON-' + (o.groupDonId || o.id));
    const pendingSpos = group((o) => o.vendorPoNum);
    // Dealer / Supplier summary — group by customer / vendor with status breakdown
    const summarize = (keyFn) => {
      const m = {};
      noCancel.forEach((o) => { const k = keyFn(o) || '(None)'; if (!m[k]) m[k] = { name: k, qty: 0, counts: {} }; m[k].qty += Number(o.qty) || 0; m[k].counts[o.status] = (m[k].counts[o.status] || 0) + 1; });
      return Object.values(m).sort((a, b) => b.qty - a.qty);
    };
    return { purchased, lrGroups, pendingDons, pendingSpos, dealers: summarize((o) => o.customer), suppliers: summarize((o) => o.vendor) };
  }, [orders]);

  const dueList = dueTab === 'overdue' ? due.overdue : dueTab === 'dueToday' ? due.dueToday : due.dueThisWeek;
  const etaStats = useMemo(() => {
    const delayed = etaEdited.filter((o) => o.overdue > 0).length;
    const early = etaEdited.filter((o) => o.flag === 'preponed').length;
    return { total: etaEdited.length, delayed, early, onTime: etaEdited.length - delayed - early };
  }, [etaEdited]);

  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div style={{ padding: 20, display: 'grid', gap: 16 }}>
      {/* Greeting + pipeline */}
      <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius: 16, padding: 22, color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800, margin: 0 }}>{greeting(now.getHours())} 🌤 {user?.name || user?.username}</h1>
            <p style={{ color: '#94a3b8', marginTop: 6, fontSize: 14 }}>Here's your order pipeline at a glance</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#93c5fd', fontSize: 13, fontWeight: 600 }}>{dateStr}</div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 1 }}>{timeStr}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
          {HERO_STAGES.map((s) => (
            <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 20, padding: '6px 13px', fontSize: 13, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[s] }} />{s} <strong style={{ color: COLORS[s] }}>{loading ? '…' : (units[s] || 0)}</strong>
            </span>
          ))}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.14)', borderRadius: 20, padding: '6px 15px', fontSize: 13, fontWeight: 700 }}>Total <strong>{loading ? '…' : totalUnits}</strong></span>
        </div>
      </div>

      {/* Order Journey */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>🗺️ Order Journey</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, overflowX: 'auto' }}>
          {STAGES.map((s) => (
            <div key={s} style={{ textAlign: 'center', minWidth: 74, flex: 1 }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{ fontSize: 28 }}>{ICONS[s]}</div>
                <span style={{ position: 'absolute', top: -6, right: -12, background: COLORS[s], color: '#0f172a', fontSize: 11, fontWeight: 800, borderRadius: 12, padding: '1px 7px' }}>{loading ? '…' : (counts[s] || 0)}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 8 }}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        <Card title="💰 Purchased" right={<span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', fontWeight: 600 }}>{derived.purchased.length} orders</span>}>
          {derived.purchased.length === 0 ? empty('None') : derived.purchased.slice(0, 40).map((o) => <OrderRow key={o._id || o.id} o={o} />)}
        </Card>

        <Card title="📅 Due Orders" right={
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {[['overdue', 'Overdue', due.overdue.length], ['dueToday', 'Today', due.dueToday.length], ['dueThisWeek', 'Week', due.dueThisWeek.length]].map(([k, l, n]) => (
              <button key={k} onClick={() => setDueTab(k)} style={{ padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: dueTab === k ? '#dc2626' : '#f1f5f9', color: dueTab === k ? '#fff' : '#64748b' }}>{l} {n}</button>
            ))}
          </div>
        }>
          {loading ? empty('Loading…') : !dueList.length ? empty('Nothing due 🎉') : dueList.map((o) => <OrderRow key={o._id} o={o} />)}
        </Card>

        <Card title="🧾 LR at Transporter" right={<span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', fontWeight: 600 }}>{derived.lrGroups.length} LRs</span>}>
          {derived.lrGroups.length === 0 ? empty('None') : derived.lrGroups.slice(0, 30).map((g) => (
            <div key={g.lr} style={{ padding: '8px 2px', borderBottom: '1px solid #f1f5f9', fontSize: 12.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, color: '#7c3aed' }}>{g.lr}</span>
                <span style={{ flex: 1, color: '#1e293b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.transporter}</span>
                <span style={{ color: '#64748b' }}>{g.count} ord</span>
                <span className={'badge ' + (STATUS_BADGE[g.stage] || '')} style={{ fontSize: 10 }}>{g.stage}</span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{g.suppliers.slice(0, 2).join(', ')}{g.lrDate ? ' · ' + fmtDate(g.lrDate) : ''}</div>
            </div>
          ))}
        </Card>

        <Card title="📦 Pending DONs" right={<span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', fontWeight: 600 }}>{derived.pendingDons.length}</span>}>
          {derived.pendingDons.length === 0 ? empty('None') : derived.pendingDons.slice(0, 20).map((g) => (
            <div key={g.key} style={{ padding: '8px 2px', borderBottom: '1px solid #f1f5f9', fontSize: 12.5 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#1a73e8' }}>{g.key}</span>
                <span style={{ flex: 1, color: '#1e293b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.customers.slice(0, 2).join(', ')}</span>
                <span style={{ color: '#64748b' }}>{g.qty} u</span>
              </div>
              <StatusChips counts={g.counts} />
            </div>
          ))}
        </Card>

        <Card title="📄 Pending SPOs" right={<span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', fontWeight: 600 }}>{derived.pendingSpos.length}</span>}>
          {derived.pendingSpos.length === 0 ? empty('None') : derived.pendingSpos.slice(0, 20).map((g) => (
            <div key={g.key} style={{ padding: '8px 2px', borderBottom: '1px solid #f1f5f9', fontSize: 12.5 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#0d9488' }}>{g.key}</span>
                <span style={{ flex: 1, color: '#1e293b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.customers.slice(0, 2).join(', ')}</span>
                <span style={{ color: '#64748b' }}>{g.qty} u</span>
              </div>
              <StatusChips counts={g.counts} />
            </div>
          ))}
        </Card>

        <Card title="🏪 Dealer Summary" right={<span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', fontWeight: 600 }}>{derived.dealers.length}</span>}>
          {derived.dealers.slice(0, 30).map((d) => (
            <div key={d.name} style={{ padding: '8px 2px', borderBottom: '1px solid #f1f5f9', fontSize: 12.5 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ flex: 1, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                <span style={{ color: '#1a73e8', fontWeight: 800 }}>{d.qty}</span>
              </div>
              <StatusChips counts={d.counts} />
            </div>
          ))}
        </Card>
      </div>

      {/* Supplier Summary (full width) */}
      <Card title="🏭 Supplier Summary" maxH={280} right={<span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', fontWeight: 600 }}>{derived.suppliers.length} suppliers</span>}>
        {derived.suppliers.slice(0, 40).map((d) => (
          <div key={d.name} style={{ padding: '9px 2px', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ flex: 1, fontWeight: 700, color: '#1e293b' }}>🏭 {d.name}</span>
              <span style={{ color: '#1a73e8', fontWeight: 800 }}>{d.qty} units</span>
            </div>
            <StatusChips counts={d.counts} />
          </div>
        ))}
      </Card>

      {/* ETA Edited Orders (full width) */}
      <Card title="📅 ETA Edited Orders" maxH={320} right={
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, fontSize: 11, fontWeight: 700 }}>
          <span style={{ color: '#64748b' }}>{etaStats.total} total</span>
          <span style={{ color: '#dc2626' }}>🔴 {etaStats.delayed} delayed</span>
          <span style={{ color: '#16a34a' }}>🟢 {etaStats.early} early</span>
        </div>
      }>
        {loading ? empty('Loading…') : etaEdited.length === 0 ? empty('No ETA edits') : etaEdited.slice(0, 60).map((o) => (
          <div key={o._id} style={{ padding: '8px 2px', borderBottom: '1px solid #f1f5f9', fontSize: 12.5, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {o.overdue > 0 && <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10 }}>Delayed</span>}
            <span style={{ fontWeight: 700, color: '#1a73e8' }}>DON-{o.seqId}</span>
            <span style={{ flex: 1, fontWeight: 600, color: '#1e293b', minWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customer}</span>
            {o.origEta && <span style={{ color: '#94a3b8', textDecoration: 'line-through' }}>{fmtDate(o.origEta)}</span>}
            <span style={{ color: '#64748b' }}>→ {fmtDate(o.eta)}</span>
            {o.overdue > 0 && <span style={{ color: '#dc2626', fontWeight: 700 }}>{o.overdue}d overdue</span>}
            <span style={{ color: '#94a3b8' }}>{o.editCount} edit{o.editCount === 1 ? '' : 's'}</span>
            <span className={'badge ' + (STATUS_BADGE[o.status] || '')} style={{ fontSize: 10 }}>{o.status}</span>
          </div>
        ))}
      </Card>

      {/* Recent Orders (full width) */}
      <Card title="📋 Recent Orders" maxH={320} right={<button onClick={() => navigate('/orders')} className="btn btn-outline btn-xs" style={{ marginLeft: 'auto' }}>View all</button>}>
        {loading ? empty('Loading…') : !recent.length ? empty('None') : recent.map((o) => <OrderRow key={o._id} o={o} />)}
      </Card>
    </div>
  );
}
