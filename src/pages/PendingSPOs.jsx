import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { spoApi } from '../api/master.api';
import Header from '../components/layout/Header';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { PageSpinner } from '../components/ui/Spinner';
import { fmtDate, fmtDateShort } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';
import { useForm } from 'react-hook-form';

export default function PendingSPOs() {
  const { can } = useAuth();
  const [orders, setOrders]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [poId, setPoId]       = useState(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const load = async () => {
    try { setLoading(true); const r = await spoApi.getAll({ search }); setOrders(r.data.data); setTotal(r.data.total); }
    catch { toast.error('Failed to load SPOs'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [search]);

  const handleRaisePo = async (data) => {
    try { await spoApi.raisePo(poId, data); toast.success('PO Raised!'); setPoId(null); reset(); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Error'); }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <Header title="📄 Pending SPOs" actions={<span className="text-xs text-slate-400">{total} pending</span>} />
      <div className="px-6 py-3 bg-white border-b border-slate-100">
        <input className="input w-72" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="p-6">
        {loading ? <PageSpinner /> : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr>
                    <th className="table-th">DON</th><th className="table-th">Customer</th>
                    <th className="table-th">Product</th><th className="table-th text-center">Qty</th>
                    <th className="table-th">ETA</th><th className="table-th">Vendor</th>
                    <th className="table-th">Status</th><th className="table-th">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o._id} className="table-tr">
                      <td className="table-td font-bold text-blue-600">DON-{o.seqId}</td>
                      <td className="table-td font-semibold">{o.customer}</td>
                      <td className="table-td text-slate-500">{o.product}</td>
                      <td className="table-td text-center">{o.qty}</td>
                      <td className="table-td">{fmtDateShort(o.eta) || '—'}</td>
                      <td className="table-td text-slate-500">{o.vendor || '—'}</td>
                      <td className="table-td"><StatusBadge status={o.status} /></td>
                      <td className="table-td">
                        {can('raisePo') && (
                          <button className="btn-primary btn-sm" onClick={() => { setPoId(o._id); reset(); }}>📄 Raise PO</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!orders.length && <tr><td colSpan={8} className="table-td text-center text-slate-400 py-12">No pending SPOs</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <Modal open={!!poId} onClose={() => setPoId(null)} title="Raise PO">
        <form onSubmit={handleSubmit(handleRaisePo)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Vendor</label><input className="input" {...register('vendor')} /></div>
            <div><label className="label">ETA</label><input type="date" className="input" {...register('eta')} /></div>
          </div>
          <div><label className="label">Note</label><input className="input" {...register('note')} /></div>
          <div className="flex gap-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary">Raise PO</button>
            <button type="button" onClick={() => setPoId(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
