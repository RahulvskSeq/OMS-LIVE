import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { shipmentApi } from '../api/master.api';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { PageSpinner } from '../components/ui/Spinner';
import { fmtDateShort } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';
import { useForm } from 'react-hook-form';

export default function Shipments() {
  const { can } = useAuth();
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [dispatchId, setDispatchId] = useState(null);
  const [arrivedId, setArrivedId]   = useState(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const load = async () => {
    try { setLoading(true); const r = await shipmentApi.getAll({ search }); setOrders(r.data.data); }
    catch { toast.error('Failed'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [search]);

  const handleDispatch = async (data) => {
    try { await shipmentApi.dispatch(dispatchId, data); toast.success('Marked In Transit'); setDispatchId(null); reset(); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Error'); }
  };
  const handleArrived = async (data) => {
    try { await shipmentApi.arrived(arrivedId, data); toast.success('Status updated'); setArrivedId(null); reset(); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Error'); }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <Header title="🚛 Shipments" actions={<span className="text-xs text-slate-400">{orders.length} shipments</span>} />
      <div className="px-6 py-3 bg-white border-b border-slate-100">
        <input className="input w-72" placeholder="Search by LR, transporter…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="p-6">
        {loading ? <PageSpinner /> : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr>
                    <th className="table-th">DON</th><th className="table-th">Customer</th>
                    <th className="table-th">Product</th><th className="table-th text-center">Qty</th>
                    <th className="table-th">LR No.</th><th className="table-th">Transporter</th>
                    <th className="table-th">ETA</th><th className="table-th">Status</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o._id} className="table-tr">
                      <td className="table-td font-bold text-blue-600">DON-{o.seqId}</td>
                      <td className="table-td font-semibold">{o.customer}</td>
                      <td className="table-td text-slate-500">{o.product}</td>
                      <td className="table-td text-center">{o.qty}</td>
                      <td className="table-td font-mono text-sm">{o.lr || '—'}</td>
                      <td className="table-td text-slate-500">{o.transporter || '—'}</td>
                      <td className="table-td">{fmtDateShort(o.eta) || '—'}</td>
                      <td className="table-td"><StatusBadge status={o.status} /></td>
                      <td className="table-td">
                        <div className="flex gap-1">
                          {can('logisticsUpdate') && o.status !== 'In Transit' && (
                            <button className="btn-secondary btn-sm" onClick={() => { setDispatchId(o._id); reset(); }}>Dispatch</button>
                          )}
                          {can('transitUpdate') && (
                            <button className="btn-secondary btn-sm" onClick={() => { setArrivedId(o._id); reset(); }}>Arrived</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!orders.length && <tr><td colSpan={9} className="table-td text-center text-slate-400 py-12">No active shipments</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <Modal open={!!dispatchId} onClose={() => setDispatchId(null)} title="Mark Dispatched">
        <form onSubmit={handleSubmit(handleDispatch)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">LR Number</label><input className="input" {...register('lr')} /></div>
            <div><label className="label">LR Date</label><input type="date" className="input" {...register('lrDate')} /></div>
            <div><label className="label">Transporter</label><input className="input" {...register('transporter')} /></div>
            <div><label className="label">Transit Mode</label>
              <select className="input" {...register('transitMode')}>
                {['Road','Rail','Air','Sea'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div><label className="label">ETA</label><input type="date" className="input" {...register('eta')} /></div>
            <div><label className="label">Vendor Invoice</label><input className="input" {...register('vendorInvoice')} /></div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary">Mark In Transit</button>
            <button type="button" onClick={() => setDispatchId(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
      <Modal open={!!arrivedId} onClose={() => setArrivedId(null)} title="Mark Arrived">
        <form onSubmit={handleSubmit(handleArrived)} className="space-y-4">
          <div><label className="label">Arrived At</label>
            <select className="input" {...register('status')}>
              <option value="At Transporter">At Transporter</option>
              <option value="Warehouse">Warehouse</option>
            </select>
          </div>
          <div><label className="label">Note</label><input className="input" {...register('note')} /></div>
          <div className="flex gap-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary">Confirm</button>
            <button type="button" onClick={() => setArrivedId(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
