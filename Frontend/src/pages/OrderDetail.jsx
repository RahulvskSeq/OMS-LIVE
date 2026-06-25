import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { orderApi } from '../api/order.api';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { PageSpinner } from '../components/ui/Spinner';
import { fmtDate, fmtDateShort, fmtTs, fmtRelative } from '../utils/helpers';
import { ORDER_STATUSES } from '../utils/constants';
import { useAuth } from '../hooks/useAuth';
import { useForm } from 'react-hook-form';

const TRAIL_ICONS = { created:'🌱', status:'🔄', eta:'📅', comment:'💬', grn:'📝', billing:'💰', delivery:'📬', logistics:'🚛', po:'📄', edited:'✏️' };
const TRAIL_COLORS = { created:'#16a34a', status:'#2563eb', eta:'#d97706', comment:'#7c3aed', grn:'#0891b2', billing:'#c2410c', delivery:'#15803d', logistics:'#a16207', po:'#6d28d9', edited:'#64748b' };

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [order, setOrder]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const load = async () => {
    try { setLoading(true); const r = await orderApi.getOne(id); setOrder(r.data.data); }
    catch { toast.error('Order not found'); navigate('/orders'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleModalSubmit = async (data) => {
    try {
      if (modal === 'status')   await orderApi.updateStatus(id, data);
      if (modal === 'eta')      await orderApi.updateEta(id, data);
      if (modal === 'comment')  await orderApi.addComment(id, data);
      if (modal === 'grn')      await orderApi.raiseGrn(id, data);
      if (modal === 'billing')  await orderApi.addBilling(id, data);
      if (modal === 'delivery') await orderApi.markDelivered(id, data);
      toast.success('Updated!');
      setModal(null); reset();
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
  };

  if (loading) return <><Header title="Order Detail" /><PageSpinner /></>;
  if (!order)  return null;

  const donStr = `DON-${order.seqId}`;

  return (
    <div className="flex-1 overflow-y-auto">
      <Header title={donStr} actions={
        <button onClick={() => navigate('/orders')} className="btn-secondary btn-sm">← Back</button>
      } />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="card-header">
              <span className="font-bold text-slate-700">Order Information</span>
              <StatusBadge status={order.status} size="md" />
            </div>
            <div className="card-body grid grid-cols-2 gap-4 text-sm">
              {[
                ['DON', donStr], ['Customer', order.customer], ['Product', order.product],
                ['Code', order.orderedCode || '—'], ['Qty', order.qty], ['Vendor', order.vendor || '—'],
                ['Order Date', fmtDate(order.orderDate)], ['ETA', fmtDateShort(order.eta) || '—'],
                ['LR No.', order.lr || '—'], ['Transporter', order.transporter || '—'],
                ['Purchase Rate', order.purchaseRate ? `₹${order.purchaseRate}` : '—'],
                ['Selling Rate', order.sellingRate ? `₹${order.sellingRate}` : '—'],
              ].map(([l, v]) => (
                <div key={l}>
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{l}</div>
                  <div className="font-semibold text-slate-800 mt-0.5">{v}</div>
                </div>
              ))}
              {order.notes && (
                <div className="col-span-2">
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Notes</div>
                  <div className="text-slate-600 mt-0.5">{order.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="card card-body">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Quick Actions</div>
            <div className="flex flex-wrap gap-2">
              {can('logisticsUpdate') && <button className="btn-secondary btn-sm" onClick={() => { setModal('status'); reset(); }}>🔄 Update Status</button>}
              {can('editOrder')       && <button className="btn-secondary btn-sm" onClick={() => { setModal('eta');    reset(); }}>📅 Edit ETA</button>}
              {can('viewAllOrders')   && <button className="btn-secondary btn-sm" onClick={() => { setModal('comment');reset(); }}>💬 Add Comment</button>}
              {can('raiseGrn')        && <button className="btn-secondary btn-sm" onClick={() => { setModal('grn');    reset(); }}>📝 Raise GRN</button>}
              {can('purchaseOrder')   && <button className="btn-secondary btn-sm" onClick={() => { setModal('billing');reset(); }}>💰 Add Billing</button>}
              {can('deliver')         && <button className="btn-secondary btn-sm" onClick={() => { setModal('delivery');reset(); }}>📬 Mark Delivered</button>}
            </div>
          </div>

          {/* ETA History */}
          {order.etaHistory?.length > 0 && (
            <div className="card">
              <div className="card-header"><span className="font-bold text-slate-700">ETA History ({order.etaHistory.length} changes)</span></div>
              <div className="card-body space-y-2">
                {order.etaHistory.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-slate-400 font-bold w-5 text-center">{i+1}</span>
                    <span className="text-slate-400 line-through">{fmtDateShort(h.from)}</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-bold text-slate-700">{fmtDateShort(h.to)}</span>
                    <span className="text-slate-400 text-xs">by {h.changedBy}</span>
                    {h.reason && <span className="text-indigo-500 text-xs italic">"{h.reason}"</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Trail */}
        <div className="card flex flex-col" style={{ maxHeight: 700 }}>
          <div className="card-header shrink-0"><span className="font-bold text-slate-700">📜 Order Trail</span></div>
          <div className="overflow-y-auto flex-1 p-4">
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-slate-100" />
              {[...order.trail].reverse().map((t, i) => {
                const color = TRAIL_COLORS[t.type] || '#94a3b8';
                return (
                  <div key={i} className="relative">
                    <div className="absolute -left-[19px] top-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-xs" style={{ background: color }}>
                      <span style={{ fontSize: 8 }}>{TRAIL_ICONS[t.type] || '•'}</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color }}>{t.type}</span>
                        <span className="text-xs text-slate-400">{fmtRelative(t.at)}</span>
                      </div>
                      <div className="text-sm font-medium text-slate-700">{t.desc}</div>
                      {(t.from || t.to) && t.from !== t.to && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                          {t.from && <span className="line-through">{t.from}</span>}
                          {t.from && t.to && <span>→</span>}
                          {t.to && <span className="font-semibold text-slate-700">{t.to}</span>}
                        </div>
                      )}
                      {t.note && <div className="text-xs text-indigo-500 italic mt-1">"{t.note}"</div>}
                      <div className="text-xs text-slate-400 mt-1">by {t.by} · {fmtTs(t.at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Action Modals */}
      <Modal open={modal === 'status'} onClose={() => setModal(null)} title="Update Status">
        <form onSubmit={handleSubmit(handleModalSubmit)} className="space-y-4">
          <div><label className="label">New Status</label>
            <select className="input" {...register('status', { required: true })}>
              {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label className="label">Note</label><input className="input" {...register('note')} /></div>
          <div className="flex gap-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary">Update</button>
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === 'eta'} onClose={() => setModal(null)} title="Edit ETA">
        <form onSubmit={handleSubmit(handleModalSubmit)} className="space-y-4">
          <div><label className="label">New ETA</label><input type="date" className="input" {...register('eta', { required: true })} /></div>
          <div><label className="label">Reason</label><input className="input" {...register('reason')} /></div>
          <div className="flex gap-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary">Update ETA</button>
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === 'comment'} onClose={() => setModal(null)} title="Add Comment">
        <form onSubmit={handleSubmit(handleModalSubmit)} className="space-y-4">
          <div><label className="label">Comment</label><textarea className="input" rows={3} {...register('text', { required: true })} /></div>
          <div className="flex gap-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary">Add Comment</button>
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === 'grn'} onClose={() => setModal(null)} title="Raise GRN">
        <form onSubmit={handleSubmit(handleModalSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">GRN Number</label><input className="input" {...register('grnNumber')} /></div>
            <div><label className="label">Received Qty</label><input type="number" className="input" {...register('receivedQty')} /></div>
            <div><label className="label">Received Date</label><input type="date" className="input" {...register('receivedDate')} /></div>
            <div><label className="label">Condition</label>
              <select className="input" {...register('condition')}>
                {['Good','Damaged','Partial'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Notes</label><input className="input" {...register('notes')} /></div>
          <div className="flex gap-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary">Raise GRN</button>
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === 'billing'} onClose={() => setModal(null)} title="Add Billing">
        <form onSubmit={handleSubmit(handleModalSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Invoice Number</label><input className="input" {...register('invoiceNumber')} /></div>
            <div><label className="label">Invoice Date</label><input type="date" className="input" {...register('invoiceDate')} /></div>
            <div><label className="label">Amount</label><input type="number" className="input" {...register('amount')} /></div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary">Save Billing</button>
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal open>{modal === 'delivery'} onClose={() => setModal(null)} title="Mark Delivered">
        <form onSubmit={handleSubmit(handleModalSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Delivered Date</label><input type="date" className="input" {...register('deliveredDate')} /></div>
            <div><label className="label">Received By</label><input className="input" {...register('receivedBy')} /></div>
          </div>
          <div><label className="label">Notes</label><input className="input" {...register('notes')} /></div>
          <div className="flex gap-2">
            <button type="submit" disabled={isSubmitting} className="btn-success">Confirm Delivery</button>
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
