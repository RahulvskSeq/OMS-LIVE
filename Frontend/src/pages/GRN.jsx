import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { grnApi } from '../api/master.api';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { PageSpinner } from '../components/ui/Spinner';
import { fmtDate } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';
import { useForm } from 'react-hook-form';

export default function GRN() {
  const { can } = useAuth();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [grnId, setGrnId]     = useState(null);
  const [purchId, setPurchId] = useState(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const load = async () => {
    try { setLoading(true); const r = await grnApi.getAll(); setOrders(r.data.data); }
    catch { toast.error('Failed'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleGrn = async (data) => {
    try { await grnApi.raiseGrn(grnId, data); toast.success('GRN raised'); setGrnId(null); reset(); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Error'); }
  };
  const handlePurch = async (data) => {
    try { await grnApi.purchase(purchId, data); toast.success('Marked Purchased'); setPurchId(null); reset(); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Error'); }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <Header title="📝 GRN / Purchase" actions={<span className="text-xs text-slate-400">{orders.length} records</span>} />
      <div className="p-6">
        {loading ? <PageSpinner /> : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr>
                    <th className="table-th">DON</th><th className="table-th">Customer</th>
                    <th className="table-th">Product</th><th className="table-th text-center">Qty</th>
                    <th className="table-th">GRN No.</th><th className="table-th">Received</th>
                    <th className="table-th">Status</th><th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o._id} className="table-tr">
                      <td className="table-td font-bold text-blue-600">DON-{o.seqId}</td>
                      <td className="table-td font-semibold">{o.customer}</td>
                      <td className="table-td text-slate-500">{o.product}</td>
                      <td className="table-td text-center">{o.qty}</td>
                      <td className="table-td font-mono text-sm">{o.grn?.grnNumber || '—'}</td>
                      <td className="table-td">{o.grn?.receivedDate ? fmtDate(o.grn.receivedDate) : '—'}</td>
                      <td className="table-td"><StatusBadge status={o.status} /></td>
                      <td className="table-td">
                        <div className="flex gap-1">
                          {can('raiseGrn') && o.status !== 'Purchased' && o.status !== 'Billed' && o.status !== 'Delivered' && (
                            <button className="btn-secondary btn-sm" onClick={() => { setGrnId(o._id); reset(); }}>GRN</button>
                          )}
                          {can('purchaseOrder') && o.status === 'GRN' && (
                            <button className="btn-success btn-sm" onClick={() => { setPurchId(o._id); reset(); }}>Purchase</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!orders.length && <tr><td colSpan={8} className="table-td text-center text-slate-400 py-12">No GRN records</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <Modal open={!!grnId} onClose={() => setGrnId(null)} title="Raise GRN">
        <form onSubmit={handleSubmit(handleGrn)} className="space-y-4">
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
            <button type="button" onClick={() => setGrnId(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
      <Modal open={!!purchId} onClose={() => setPurchId(null)} title="Mark as Purchased">
        <form onSubmit={handleSubmit(handlePurch)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Purchase Rate</label><input type="number" className="input" {...register('purchaseRate')} /></div>
            <div><label className="label">Selling Rate</label><input type="number" className="input" {...register('sellingRate')} /></div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isSubmitting} className="btn-success">Confirm Purchase</button>
            <button type="button" onClick={() => setPurchId(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
