/* Order detail modal — React port of the vanilla viewOrder + status change.
 * Read-only fields + a status stepper, plus an inline "Change status" control
 * (PATCH /orders/:_id/status). Reuses the .badge styles. */
import { Fragment, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { changeOrderStatus, updateOrderEta } from './ordersSlice';
import api from './api';

function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function initials(name) { return (name || '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2); }

const STATUSES = ['Order', 'Approved', 'PO Raised', 'In Transit', 'At Transporter', 'Warehouse', 'GRN', 'Purchased', 'Billed'];
const ALL_STATUSES = [...STATUSES, 'Cancelled'];
const STATUS_BADGE = {
  'Order': 'b-ordered', 'Approved': 'b-approved', 'PO Raised': 'b-po', 'In Transit': 'b-transit',
  'At Transporter': 'b-transporter', 'Warehouse': 'b-warehouse', 'GRN': 'b-grn', 'Purchased': 'b-purchased',
  'Billed': 'b-billed', 'Cancelled': 'b-cancelled',
};
function fmtDate(d) { if (!d) return '—'; const p = String(d).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : d; }

function Field({ label, children }) {
  return (
    <div>
      <span style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>{label}</span>
      <div style={{ marginTop: 2, fontWeight: 600, color: '#1e293b' }}>{children}</div>
    </div>
  );
}

export default function OrderModal({ order, onClose, canEdit = true }) {
  const dispatch = useDispatch();
  const [curStatus, setCurStatus] = useState(order?.status || 'Order');
  const [newStatus, setNewStatus] = useState(order?.status || 'Order');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [etaVal, setEtaVal] = useState(order?.eta || '');
  const [etaSaving, setEtaSaving] = useState(false);
  const [etaMsg, setEtaMsg] = useState('');
  const [comments, setComments] = useState([]);
  const [cmt, setCmt] = useState('');
  const [posting, setPosting] = useState(false);

  // Reset + fetch full detail (comments live in the order's trail) when opened
  useEffect(() => {
    setCurStatus(order?.status || 'Order');
    setNewStatus(order?.status || 'Order');
    setEtaVal(order?.eta || '');
    setMsg(''); setEtaMsg(''); setCmt(''); setComments([]);
    if (!order?._id) return;
    let alive = true;
    (async () => {
      try {
        const r = await api.get('/orders/' + order._id);
        if (!alive) return;
        const trail = (r.data.data && r.data.data.trail) || [];
        setComments(trail.filter((t) => t.type === 'comment'));
      } catch { /* leave comments empty */ }
    })();
    return () => { alive = false; };
  }, [order?._id]);

  async function postComment() {
    const text = cmt.trim();
    if (!text) return;
    setPosting(true);
    try {
      const r = await api.post('/orders/' + order._id + '/comment', { text });
      setComments((c) => [...c, r.data.data]);
      setCmt('');
    } catch { /* ignore */ }
    finally { setPosting(false); }
  }

  async function saveEta() {
    if (!etaVal || etaVal === (order.eta || '')) { setEtaMsg('No change'); return; }
    setEtaSaving(true); setEtaMsg('');
    const res = await dispatch(updateOrderEta({ _id: order._id, eta: etaVal }));
    setEtaSaving(false);
    setEtaMsg(res.meta.requestStatus === 'fulfilled' ? '✓ ETA updated' : '❌ ' + (res.payload || 'Failed'));
  }

  if (!order) return null;
  const curIdx = STATUSES.indexOf(curStatus);

  async function saveStatus() {
    if (newStatus === curStatus) { setMsg('Status is already ' + curStatus); return; }
    setSaving(true); setMsg('');
    const res = await dispatch(changeOrderStatus({ _id: order._id, status: newStatus }));
    setSaving(false);
    if (res.meta.requestStatus === 'fulfilled') { setCurStatus(newStatus); setMsg('✓ Status updated to ' + newStatus); }
    else { setMsg('❌ ' + (res.payload || 'Update failed')); }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, maxWidth: 660, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>
            Order #{order.id} <span style={{ color: '#1a73e8' }}>· DON-{order.groupDonId || order.id}</span>
          </h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 24, lineHeight: 1, cursor: 'pointer', color: '#64748b' }}>×</button>
        </div>

        <div style={{ padding: 24 }}>
          {curStatus !== 'Cancelled' && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {STATUSES.map((s, i) => (
                  <Fragment key={s}>
                    {i > 0 && <div style={{ flex: 1, height: 3, background: i <= curIdx ? '#1a73e8' : '#e2e8f0' }} />}
                    <div title={s} style={{
                      width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                      background: i <= curIdx ? '#1a73e8' : '#e2e8f0', color: i <= curIdx ? '#fff' : '#94a3b8',
                      boxShadow: i === curIdx ? '0 0 0 3px #bfdbfe' : 'none',
                    }}>{i < curIdx ? '✓' : i + 1}</div>
                  </Fragment>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, padding: '0 2px' }}>
                {STATUSES.map((s) => <span key={s} style={{ width: 10, textAlign: 'center', fontSize: 9, color: '#94a3b8', whiteSpace: 'nowrap' }}>{s}</span>)}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 13 }}>
            <Field label="Status"><span className={'badge ' + (STATUS_BADGE[curStatus] || '')}>{curStatus}</span></Field>
            <Field label="Customer">{order.customer || '—'}</Field>
            <Field label="Ordered As">{order.orderedCode || order.product || '—'}</Field>
            <Field label="Supplier">{order.vendor || '—'}</Field>
            <Field label="Quantity">{order.qty} {order.unit}</Field>
            <Field label="Order Date">{fmtDate(order.orderDate)}</Field>
            <Field label="ETA Bangalore">{fmtDate(order.eta)}</Field>
            <Field label="Customer Ref">{order.poNum || '—'}</Field>
            <Field label="Supplier PO">{order.vendorPoNum || '—'}</Field>
            <Field label="Assigned Biller">{order.biller || '—'}</Field>
            <Field label="Sales Exec">{order.salesExec || '—'}</Field>
          </div>

          {canEdit && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>Change status</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                  style={{ padding: '8px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 13, fontWeight: 600, outline: 'none', background: '#fff' }}>
                  {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" disabled={saving || newStatus === curStatus} onClick={saveStatus}>
                  {saving ? 'Saving…' : 'Update'}
                </button>
                {msg && <span style={{ fontSize: 12, fontWeight: 600, color: msg[0] === '❌' ? '#b91c1c' : '#16a34a' }}>{msg}</span>}
              </div>

              <div style={{ marginTop: 14 }}>
                <span style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>Change ETA</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                  <input type="date" value={etaVal} onChange={(e) => setEtaVal(e.target.value)}
                    style={{ padding: '7px 11px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 13, fontWeight: 600, outline: 'none' }} />
                  <button className="btn btn-primary btn-sm" disabled={etaSaving || !etaVal || etaVal === (order.eta || '')} onClick={saveEta}>{etaSaving ? 'Saving…' : 'Update ETA'}</button>
                  {etaMsg && <span style={{ fontSize: 12, fontWeight: 600, color: etaMsg[0] === '❌' ? '#b91c1c' : '#16a34a' }}>{etaMsg}</span>}
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: 10 }}>💬 Comments ({comments.length})</div>
            <div style={{ maxHeight: 180, overflowY: 'auto', display: 'grid', gap: 8, marginBottom: 10 }}>
              {comments.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>No comments yet.</div>}
              {comments.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#64748b', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(c.by)}</div>
                  <div>
                    <div style={{ background: '#f1f5f9', padding: '7px 11px', borderRadius: '4px 12px 12px 12px', fontSize: 12, color: '#1e293b', lineHeight: 1.45 }}>{c.desc || c.to}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}><strong style={{ color: '#64748b' }}>{c.by}</strong> · {fmtDateTime(c.at)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={cmt} onChange={(e) => setCmt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') postComment(); }} placeholder="Add a comment…" style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none' }} />
              <button className="btn btn-primary btn-sm" disabled={posting || !cmt.trim()} onClick={postComment}>{posting ? 'Posting…' : 'Post'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
