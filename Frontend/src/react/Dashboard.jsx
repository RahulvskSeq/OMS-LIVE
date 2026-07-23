/* Dashboard (React port) — matches the original layout: greeting + pipeline,
 * Order Journey (with connector), Purchased & Due Orders tables, LR at
 * Transporter table, Pending DONs/SPOs, Dealer & Supplier Summary, ETA-Edited
 * Orders and Recent Orders. Header/due/recent/eta from the server; the grouped
 * cards computed from the loaded orders. */
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchDashboard, fetchEtaEdited } from './dashboardSlice';
import { fetchOrders } from './ordersSlice';

const STAGES = ['Order', 'Approved', 'PO Raised', 'In Transit', 'At Transporter', 'Warehouse', 'GRN', 'Purchased', 'Billed'];
const HERO_STAGES = ['Order', 'Approved', 'PO Raised', 'In Transit', 'At Transporter', 'Warehouse', 'GRN', 'Purchased'];
const COLORS = { 'Order': '#818cf8', 'Approved': '#38bdf8', 'PO Raised': '#fbbf24', 'In Transit': '#fb923c', 'At Transporter': '#a78bfa', 'Warehouse': '#34d399', 'GRN': '#fbbf24', 'Purchased': '#22d3ee', 'Billed': '#4ade80' };
const ICONS = { 'Order': '📝', 'Approved': '✅', 'PO Raised': '📄', 'In Transit': '🚚', 'At Transporter': '🚛', 'Warehouse': '🏭', 'GRN': '📋', 'Purchased': '💰', 'Billed': '🎉' };
const STATUS_BADGE = { 'Order': 'b-ordered', 'Approved': 'b-approved', 'PO Raised': 'b-po', 'In Transit': 'b-transit', 'At Transporter': 'b-transporter', 'Warehouse': 'b-warehouse', 'GRN': 'b-grn', 'Purchased': 'b-purchased', 'Billed': 'b-billed', 'Cancelled': 'b-cancelled' };

const TODAY = new Date().toISOString().slice(0, 10);
function greeting(h) { return h < 12 ? 'Good Morning ☀️' : h < 17 ? 'Good Afternoon ⛅' : 'Good Evening 🌙'; }
function fmtDate(d) { if (!d) return '—'; const p = String(d).split('T')[0].split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : d; }
function daysLate(eta) { if (!eta || eta >= TODAY) return 0; return Math.round((new Date(TODAY) - new Date(eta)) / 86400000); }
function fmtTime(iso) { if (!iso) return '—'; return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); }

const th = { padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0 };
const td = { padding: '7px 10px', fontSize: 12, color: '#1e293b', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' };

function Card({ title, right, children, footer, maxH = 300 }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,.1)', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 10px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{title}</div>{right}
      </div>
      <div style={{ overflowY: 'auto', overflowX: 'auto', maxHeight: maxH, padding: '0 4px' }}>{children}</div>
      {footer && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 16px', borderTop: '1px solid #f1f5f9', fontSize: 12, fontWeight: 700, color: '#64748b' }}>{footer}</div>}
    </div>
  );
}
function Chips({ counts }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>{STAGES.filter((s) => counts[s]).map((s) => <span key={s} className={'badge ' + STATUS_BADGE[s]} style={{ fontSize: 10 }}>{s} ×{counts[s]}</span>)}</div>;
}
function Tabs({ tab, set, items }) {
  return <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>{items.map(([k, l, n, c]) => <button key={k} onClick={() => set(k)} style={{ padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: tab === k ? (c || '#1a73e8') : '#f1f5f9', color: tab === k ? '#fff' : '#64748b' }}>{l} {n}</button>)}</div>;
}
function empty(t) { return <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{t}</div>; }
function DON({ o }) { return <span style={{ fontWeight: 700, color: '#1a73e8' }}>DON-{o.seqId || o.id}</span>; }

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const { pipeline, summary, due, recent, etaEdited, loading, loaded } = useSelector((s) => s.dashboard);
  const orders = useSelector((s) => s.orders.list);
  const ordersLoaded = useSelector((s) => s.orders.loaded);
  const [now, setNow] = useState(new Date());
  const [dueTab, setDueTab] = useState('overdue');
  const [purTab, setPurTab] = useState('today');
  const [etaFilter, setEtaFilter] = useState('all');

  useEffect(() => { if (!loaded) dispatch(fetchDashboard()); }, [loaded, dispatch]);
  useEffect(() => { dispatch(fetchEtaEdited()); }, [dispatch]);
  useEffect(() => { if (!ordersLoaded) dispatch(fetchOrders()); }, [ordersLoaded, dispatch]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  // Pipeline pills + journey computed from the loaded orders (same as the original app).
  const { units, counts } = useMemo(() => {
    const u = {}, c = {};
    orders.forEach((o) => { if (o.status === 'Cancelled') return; u[o.status] = (u[o.status] || 0) + (+o.qty || 0); c[o.status] = (c[o.status] || 0) + 1; });
    return { units: u, counts: c };
  }, [orders]);
  const curIdx = STAGES.reduce((mx, s, i) => (counts[s] ? i : mx), -1);
  const totalUnits = HERO_STAGES.reduce((n, s) => n + (units[s] || 0), 0);

  const derived = useMemo(() => {
    const noCancel = orders.filter((o) => o.status !== 'Cancelled');
    const purchased = orders.filter((o) => o.status === 'Purchased').sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    const lrMap = {};
    orders.filter((o) => ['In Transit', 'At Transporter'].includes(o.status) && o.lr).forEach((o) => { (lrMap[o.lr] = lrMap[o.lr] || []).push(o); });
    const lrGroups = Object.entries(lrMap).map(([lr, os]) => ({ lr, transporter: os[0].transporter || '—', suppliers: Array.from(new Set(os.map((o) => o.vendor).filter(Boolean))), count: os.length, lrDate: os[0].lrDate, stage: os[0].status }));
    const group = (keyFn) => {
      const m = {};
      noCancel.filter((o) => o.status !== 'Billed').forEach((o) => { const k = keyFn(o); if (!k) return; (m[k] = m[k] || []).push(o); });
      return Object.entries(m).map(([key, os]) => { const c = {}; os.forEach((o) => { c[o.status] = (c[o.status] || 0) + 1; }); return { key, counts: c, qty: os.reduce((n, o) => n + (+o.qty || 0), 0), customers: Array.from(new Set(os.map((o) => o.customer).filter(Boolean))), nextEta: os.map((o) => o.eta).filter(Boolean).sort()[0] || '' }; })
        .sort((a, b) => Object.values(b.counts).reduce((x, y) => x + y, 0) - Object.values(a.counts).reduce((x, y) => x + y, 0));
    };
    const summarize = (keyFn) => { const m = {}; noCancel.forEach((o) => { const k = keyFn(o) || '(None)'; if (!m[k]) m[k] = { name: k, qty: 0, counts: {} }; m[k].qty += +o.qty || 0; m[k].counts[o.status] = (m[k].counts[o.status] || 0) + 1; }); return Object.values(m).sort((a, b) => b.qty - a.qty); };
    return { purchased, lrGroups, pendingDons: group((o) => 'DON-' + (o.groupDonId || o.id)), pendingSpos: group((o) => o.vendorPoNum), dealers: summarize((o) => o.customer), suppliers: summarize((o) => o.vendor) };
  }, [orders]);

  const dueList = dueTab === 'overdue' ? due.overdue : dueTab === 'dueToday' ? due.dueToday : due.dueThisWeek;
  const dueUnits = dueList.reduce((n, o) => n + (+o.qty || 0), 0);
  const purList = derived.purchased;
  const purUnits = purList.reduce((n, o) => n + (+o.qty || 0), 0);
  const lrOrders = derived.lrGroups.reduce((n, g) => n + g.count, 0);

  const etaStats = useMemo(() => {
    const delayed = etaEdited.filter((o) => o.overdue > 0).length;
    const early = etaEdited.filter((o) => o.flag === 'preponed').length;
    return { total: etaEdited.length, delayed, early, onTime: etaEdited.length - delayed - early };
  }, [etaEdited]);
  const etaList = etaFilter === 'delayed' ? etaEdited.filter((o) => o.overdue > 0) : etaFilter === 'early' ? etaEdited.filter((o) => o.flag === 'preponed') : etaFilter === 'ontime' ? etaEdited.filter((o) => !o.overdue && o.flag !== 'preponed') : etaEdited;

  return (
    <div style={{ padding: 20, display: 'grid', gap: 16 }}>
      {/* Greeting + pipeline */}
      <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e3a8a)', borderRadius: 16, padding: 22, color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{greeting(now.getHours())}, {user?.name || user?.username}</h1>
            <p style={{ color: '#cbd5e1', marginTop: 6, fontSize: 14 }}>Here's your order pipeline at a glance</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#bfdbfe', fontSize: 13, fontWeight: 600 }}>{now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 1 }}>{now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
          {HERO_STAGES.filter((s) => units[s]).map((s) => (
            <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 20, padding: '6px 13px', fontSize: 13, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[s] }} />{s} <strong style={{ color: COLORS[s] }}>{units[s] || 0}</strong>
            </span>
          ))}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.18)', borderRadius: 20, padding: '6px 15px', fontSize: 13, fontWeight: 700 }}>Total <strong>{loading ? '…' : totalUnits}</strong></span>
        </div>
      </div>

      {/* Order Journey with connector line */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>🗺️ Order Journey</div>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 4, overflowX: 'auto' }}>
          <div style={{ position: 'absolute', top: 22, left: '6%', right: '6%', height: 3, background: '#e2e8f0', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: 22, left: '6%', width: curIdx > 0 ? `${(curIdx / (STAGES.length - 1)) * 88}%` : 0, height: 3, background: '#1a73e8', zIndex: 0 }} />
          {STAGES.map((s) => (
            <div key={s} style={{ textAlign: 'center', minWidth: 72, flex: 1, position: 'relative', zIndex: 1 }}>
              <div style={{ position: 'relative', display: 'inline-block', background: '#fff', borderRadius: '50%', padding: 2 }}>
                <div style={{ fontSize: 30 }}>{ICONS[s]}</div>
                <span style={{ position: 'absolute', top: -6, right: -12, background: COLORS[s], color: '#0f172a', fontSize: 11, fontWeight: 800, borderRadius: 12, padding: '1px 7px' }}>{loading ? '…' : (counts[s] || 0)}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 8 }}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Purchased | Due Orders */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
        <Card title="💰 Purchased" right={<Tabs tab={purTab} set={setPurTab} items={[['today', 'Today', ''], ['yesterday', 'Yesterday', '']]} />}
          footer={<><span>{purList.length} orders</span><span>{purUnits} units</span></>} maxH={280}>
          {purList.length === 0 ? empty('No purchased orders') : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>DON</th><th style={th}>Customer</th><th style={th}>Product</th><th style={{ ...th, textAlign: 'center' }}>Qty</th><th style={th}>Voucher</th><th style={th}>By</th><th style={th}>Time</th></tr></thead>
              <tbody>{purList.slice(0, 60).map((o) => (
                <tr key={o._id || o.id}><td style={td}><DON o={o} /> <span style={{ color: '#94a3b8' }}>{fmtDate(o.orderDate)}</span></td>
                  <td style={{ ...td, fontWeight: 600 }}>{o.customer}</td><td style={td}>{o.orderedCode || o.product2}</td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>{o.qty}</td><td style={td}>{o.purchVoucherNo || '—'}</td>
                  <td style={td}>{o.grnBy || o.biller || '—'}</td><td style={td}>{fmtTime(o.updatedAt)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Card>

        <Card title="📅 Due Orders" right={<Tabs tab={dueTab} set={setDueTab} items={[['overdue', 'Overdue', due.overdue.length, '#dc2626'], ['dueToday', 'Today', due.dueToday.length, '#d97706'], ['dueThisWeek', 'Week', due.dueThisWeek.length, '#1a73e8']]} />}
          footer={<><span>{dueList.length} orders</span><span>{dueUnits} units</span></>} maxH={280}>
          {loading ? empty('Loading…') : !dueList.length ? empty('Nothing due 🎉') : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>DON</th><th style={th}>Customer</th><th style={th}>Product</th><th style={{ ...th, textAlign: 'center' }}>Qty</th><th style={th}>ETA</th><th style={th}>Stage</th></tr></thead>
              <tbody>{dueList.map((o) => { const late = daysLate(o.eta); return (
                <tr key={o._id}><td style={td}><DON o={o} /></td><td style={{ ...td, fontWeight: 600 }}>{o.customer}</td><td style={td}>{o.product}</td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{o.qty}</td>
                  <td style={td}>{fmtDate(o.eta)} {late > 0 && <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 11 }}>{late}d late</span>}</td>
                  <td style={td}><span className={'badge ' + (STATUS_BADGE[o.status] || '')} style={{ fontSize: 10 }}>{o.status}</span></td></tr>
              ); })}</tbody>
            </table>
          )}
        </Card>

        {/* LR at Transporter | Pending DONs */}
        <Card title="🧾 LR at Transporter" right={<span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b', fontWeight: 600 }}>{derived.lrGroups.length} LRs at transporter</span>}
          footer={<><span>{derived.lrGroups.length} LRs</span><span>{lrOrders} orders</span></>} maxH={280}>
          {derived.lrGroups.length === 0 ? empty('No LRs') : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>LR No</th><th style={th}>Transporter</th><th style={th}>Supplier(s)</th><th style={{ ...th, textAlign: 'center' }}>Orders</th><th style={th}>LR Date</th><th style={th}>Stage</th></tr></thead>
              <tbody>{derived.lrGroups.slice(0, 40).map((g) => (
                <tr key={g.lr}><td style={{ ...td, fontWeight: 700, color: '#7c3aed' }}>{g.lr}</td><td style={td}>{g.transporter}</td>
                  <td style={td}>{g.suppliers.slice(0, 1).join(', ')}{g.suppliers.length > 1 ? ` +${g.suppliers.length - 1}` : ''}</td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{g.count}</td><td style={td}>{fmtDate(g.lrDate)}</td>
                  <td style={td}><span className={'badge ' + (STATUS_BADGE[g.stage] || '')} style={{ fontSize: 10 }}>{g.stage}</span></td></tr>
              ))}</tbody>
            </table>
          )}
        </Card>

        <Card title="📦 Pending DONs" right={<span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b', fontWeight: 600 }}>{derived.pendingDons.length} pending DONs</span>} maxH={280}>
          {derived.pendingDons.length === 0 ? empty('None') : derived.pendingDons.slice(0, 25).map((g) => (
            <div key={g.key} style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 12.5 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ fontWeight: 700, color: '#1a73e8' }}>{g.key}</span>
                <span style={{ flex: 1, color: '#1e293b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.customers.slice(0, 2).join(', ')}</span>
                <span style={{ color: '#64748b' }}>{g.qty} units</span></div>
              <Chips counts={g.counts} />
              {g.nextEta && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>🗓 ETA: {fmtDate(g.nextEta)}</div>}
            </div>
          ))}
        </Card>

        {/* Pending SPOs | Dealer Summary */}
        <Card title="📄 Pending SPOs" right={<span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b', fontWeight: 600 }}>{derived.pendingSpos.length} pending SPOs</span>} maxH={280}>
          {derived.pendingSpos.length === 0 ? empty('None') : derived.pendingSpos.slice(0, 25).map((g) => (
            <div key={g.key} style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 12.5 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ fontWeight: 700, color: '#0d9488' }}>{g.key}</span>
                <span style={{ flex: 1, color: '#1e293b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.customers.slice(0, 2).join(', ')}</span>
                <span style={{ color: '#64748b' }}>{g.qty} units</span></div>
              <Chips counts={g.counts} />
            </div>
          ))}
        </Card>

        <Card title="🏪 Dealer Summary" right={<span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b', fontWeight: 600 }}>({derived.dealers.length} dealers)</span>} maxH={280}>
          {derived.dealers.slice(0, 40).map((d) => (
            <div key={d.name} style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 12.5 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ flex: 1, fontWeight: 800, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span><span style={{ color: '#1a73e8', fontWeight: 800 }}>{d.qty}</span></div>
              <Chips counts={d.counts} />
            </div>
          ))}
        </Card>
      </div>

      {/* Supplier Summary */}
      <Card title="🏭 Supplier Summary" right={<span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b', fontWeight: 600 }}>({derived.suppliers.length} suppliers)</span>} maxH={300}>
        {derived.suppliers.slice(0, 40).map((d) => (
          <div key={d.name} style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ flex: 1, fontWeight: 700, color: '#1e293b' }}>🏭 {d.name}</span><span style={{ color: '#1a73e8', fontWeight: 800 }}>{d.qty} units</span></div>
            <Chips counts={d.counts} />
          </div>
        ))}
      </Card>

      {/* ETA Edited Orders */}
      <Card title="📅 ETA Edited Orders" maxH={340} right={
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {[['all', 'All ' + etaStats.total, '#0f172a'], ['delayed', '🔴 ' + etaStats.delayed + ' delayed', '#dc2626'], ['ontime', '🔵 ' + etaStats.onTime + ' on time', '#1a73e8'], ['early', '🟢 ' + etaStats.early + ' early', '#16a34a']].map(([k, l, c]) => (
            <button key={k} onClick={() => setEtaFilter(k)} style={{ padding: '3px 9px', borderRadius: 16, border: '1px solid ' + (etaFilter === k ? c : '#e2e8f0'), background: etaFilter === k ? c : '#fff', color: etaFilter === k ? '#fff' : '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
      }>
        {etaEdited.length === 0 ? empty('No ETA edits yet') : etaList.slice(0, 80).map((o) => {
          const lastEdit = (o.trail || []).filter((t) => t.type === 'eta').slice(-1)[0];
          return (
            <div key={o._id} style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 12.5, borderLeft: '3px solid ' + (o.overdue > 0 ? '#dc2626' : o.flag === 'preponed' ? '#16a34a' : '#94a3b8') }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {o.overdue > 0 && <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10 }}>Delayed</span>}
                <span style={{ fontWeight: 700, color: '#1a73e8' }}>DON-{o.seqId}</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{o.customer}</span>
                {o.origEta && <span style={{ color: '#94a3b8', textDecoration: 'line-through' }}>{fmtDate(o.origEta)}</span>}
                <span style={{ color: '#64748b' }}>→ {fmtDate(o.eta)}</span>
                {o.overdue > 0 && <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠️ {o.overdue}d overdue</span>}
                <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10 }}>{o.editCount} edit{o.editCount === 1 ? '' : 's'}</span>
                <span className={'badge ' + (STATUS_BADGE[o.status] || '')} style={{ fontSize: 10, marginLeft: 'auto' }}>{o.status}</span>
              </div>
              {lastEdit && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>Last edit by <strong style={{ color: '#64748b' }}>{lastEdit.by}</strong>{lastEdit.note ? ` · "${lastEdit.note}"` : ''}</div>}
            </div>
          );
        })}
      </Card>

      {/* Recent Orders */}
      <Card title="📋 Recent Orders" maxH={320} right={<button onClick={() => navigate('/orders')} className="btn btn-outline btn-xs" style={{ marginLeft: 'auto' }}>View all</button>}>
        {loading ? empty('Loading…') : !recent.length ? empty('None') : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>DON</th><th style={th}>Customer</th><th style={th}>Product</th><th style={{ ...th, textAlign: 'center' }}>Qty</th><th style={th}>Stage</th><th style={th}>ETA</th></tr></thead>
            <tbody>{recent.map((o) => (
              <tr key={o._id}><td style={td}><DON o={o} /></td><td style={{ ...td, fontWeight: 600 }}>{o.customer}</td><td style={td}>{o.product}</td>
                <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{o.qty}</td>
                <td style={td}><span className={'badge ' + (STATUS_BADGE[o.status] || '')} style={{ fontSize: 10 }}>{o.status}</span></td><td style={td}>{fmtDate(o.eta)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
