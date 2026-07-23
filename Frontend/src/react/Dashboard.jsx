/* Dashboard (React port — first pass).
 * The greeting header + pipeline pills + Order Journey, driven by the
 * server-side dashboard aggregates. The list cards (Due Orders, Pending,
 * Dealer/Supplier summary, etc.) come in a later pass. */
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchDashboard } from './dashboardSlice';

const STATUS_BADGE = {
  'Order': 'b-ordered', 'Approved': 'b-approved', 'PO Raised': 'b-po', 'In Transit': 'b-transit',
  'At Transporter': 'b-transporter', 'Warehouse': 'b-warehouse', 'GRN': 'b-grn', 'Purchased': 'b-purchased',
  'Billed': 'b-billed', 'Cancelled': 'b-cancelled',
};
function fmtDate(d) { if (!d) return '—'; const p = String(d).split('T')[0].split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : d; }

function OrderRow({ o }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
      <span style={{ fontWeight: 700, color: '#1a73e8', whiteSpace: 'nowrap', minWidth: 78 }}>DON-{o.seqId}</span>
      <span style={{ flex: 1, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customer}</span>
      <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{o.qty} pcs</span>
      <span className={'badge ' + (STATUS_BADGE[o.status] || '')} style={{ fontSize: 10 }}>{o.status}</span>
      <span style={{ color: '#64748b', whiteSpace: 'nowrap', minWidth: 62, textAlign: 'right' }}>{fmtDate(o.eta || o.orderDate)}</span>
    </div>
  );
}

function Card({ title, children, right }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,.1)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{title}</div>
        {right}
      </div>
      <div style={{ overflowY: 'auto', maxHeight: 320 }}>{children}</div>
    </div>
  );
}

const STAGES = ['Order', 'Approved', 'PO Raised', 'In Transit', 'At Transporter', 'Warehouse', 'GRN', 'Purchased', 'Billed'];
// Hero pills/total cover the active pipeline (Billed is shown only in the Journey), matching the vanilla.
const HERO_STAGES = ['Order', 'Approved', 'PO Raised', 'In Transit', 'At Transporter', 'Warehouse', 'GRN', 'Purchased'];
const COLORS = {
  'Order': '#818cf8', 'Approved': '#38bdf8', 'PO Raised': '#fbbf24', 'In Transit': '#fb923c',
  'At Transporter': '#a78bfa', 'Warehouse': '#34d399', 'GRN': '#fbbf24', 'Purchased': '#22d3ee', 'Billed': '#4ade80',
};
const ICONS = { 'Order': '📝', 'Approved': '✅', 'PO Raised': '📄', 'In Transit': '🚚', 'At Transporter': '🚛', 'Warehouse': '🏭', 'GRN': '📋', 'Purchased': '💰', 'Billed': '🎉' };

function greeting(h) { return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening'; }

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const { pipeline, due, recent, loading, error, loaded } = useSelector((s) => s.dashboard);
  const [now, setNow] = useState(new Date());
  const [dueTab, setDueTab] = useState('overdue');

  useEffect(() => { if (!loaded) dispatch(fetchDashboard()); }, [loaded, dispatch]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  // Hero pills show UNITS (qty); the Order Journey shows order COUNT — matching the vanilla dashboard.
  const units = {};
  const counts = {};
  pipeline.forEach((p) => { units[p.stage] = p.qty; counts[p.stage] = p.count; });
  const totalUnits = HERO_STAGES.reduce((n, s) => n + (units[s] || 0), 0);

  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div style={{ padding: 20, display: 'grid', gap: 18 }}>
      {/* Greeting + pipeline header */}
      <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius: 16, padding: 24, color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{greeting(now.getHours())} 🌤 {user?.name || user?.username}</h1>
            <p style={{ color: '#94a3b8', marginTop: 6, fontSize: 14 }}>Here's your order pipeline at a glance</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#93c5fd', fontSize: 13, fontWeight: 600 }}>{dateStr}</div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 1 }}>{timeStr}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
          {HERO_STAGES.map((s) => (
            <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 20, padding: '6px 13px', fontSize: 13, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[s] }} />
              {s} <strong style={{ color: COLORS[s] }}>{loading ? '…' : (units[s] || 0)}</strong>
            </span>
          ))}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.14)', borderRadius: 20, padding: '6px 15px', fontSize: 13, fontWeight: 700 }}>
            Total <strong>{loading ? '…' : totalUnits}</strong>
          </span>
        </div>
      </div>

      {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: 14, borderRadius: 12 }}>❌ {error}</div>}

      {/* Order Journey */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 18 }}>🗺️ Order Journey</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, overflowX: 'auto' }}>
          {STAGES.map((s) => (
            <div key={s} style={{ textAlign: 'center', minWidth: 78, flex: 1 }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{ fontSize: 30 }}>{ICONS[s]}</div>
                <span style={{ position: 'absolute', top: -6, right: -12, background: COLORS[s], color: '#0f172a', fontSize: 11, fontWeight: 800, borderRadius: 12, padding: '1px 7px' }}>{loading ? '…' : (counts[s] || 0)}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 8 }}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* List cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18 }}>
        <Card title="📅 Due Orders" right={
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {[['overdue', 'Overdue', due.overdue.length], ['dueToday', 'Today', due.dueToday.length], ['dueThisWeek', 'Week', due.dueThisWeek.length]].map(([k, label, n]) => (
              <button key={k} onClick={() => setDueTab(k)} style={{ padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: dueTab === k ? '#dc2626' : '#f1f5f9', color: dueTab === k ? '#fff' : '#64748b' }}>{label} {n}</button>
            ))}
          </div>
        }>
          {(() => {
            const list = dueTab === 'overdue' ? due.overdue : dueTab === 'dueToday' ? due.dueToday : due.dueThisWeek;
            if (loading) return <div style={{ padding: 20, color: '#94a3b8', textAlign: 'center' }}>Loading…</div>;
            if (!list.length) return <div style={{ padding: 20, color: '#94a3b8', textAlign: 'center' }}>Nothing due here 🎉</div>;
            return list.map((o) => <OrderRow key={o._id} o={o} />);
          })()}
        </Card>

        <Card title="📋 Recent Orders" right={<button onClick={() => navigate('/orders')} className="btn btn-outline btn-xs" style={{ marginLeft: 'auto' }}>View all</button>}>
          {loading ? <div style={{ padding: 20, color: '#94a3b8', textAlign: 'center' }}>Loading…</div>
            : !recent.length ? <div style={{ padding: 20, color: '#94a3b8', textAlign: 'center' }}>No recent orders</div>
              : recent.map((o) => <OrderRow key={o._id} o={o} />)}
        </Card>
      </div>
    </div>
  );
}
