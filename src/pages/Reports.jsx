import { useState } from 'react';
import toast from 'react-hot-toast';
import { reportApi } from '../api/master.api';
import Header from '../components/layout/Header';
import { downloadBlob } from '../utils/helpers';
import Spinner from '../components/ui/Spinner';
import { ORDER_STATUSES } from '../utils/constants';

export default function Reports() {
  const [filters, setFilters] = useState({ from:'', to:'', status:'', customer:'' });
  const [loading, setLoading] = useState('');

  const download = async (type) => {
    try {
      setLoading(type);
      let res;
      if (type === 'orders')  res = await reportApi.exportOrders(filters);
      if (type === 'eta')     res = await reportApi.exportEta(filters);
      if (type === 'dealers') res = await reportApi.exportDealers(filters);
      downloadBlob(res.data, `${type}_${Date.now()}.xlsx`);
      toast.success('Downloaded!');
    } catch { toast.error('Export failed'); } finally { setLoading(''); }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <Header title="📈 Reports & Export" />
      <div className="p-6 space-y-6 max-w-2xl">
        {/* Filters */}
        <div className="card">
          <div className="card-header"><span className="font-bold text-slate-700">Filter Options</span></div>
          <div className="card-body grid grid-cols-2 gap-4">
            <div><label className="label">From Date</label><input type="date" className="input" value={filters.from} onChange={e => setFilters(f => ({...f, from: e.target.value}))} /></div>
            <div><label className="label">To Date</label><input type="date" className="input" value={filters.to} onChange={e => setFilters(f => ({...f, to: e.target.value}))} /></div>
            <div><label className="label">Status</label>
              <select className="input" value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))}>
                <option value="">All</option>
                {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="label">Customer</label><input className="input" placeholder="Filter by customer" value={filters.customer} onChange={e => setFilters(f => ({...f, customer: e.target.value}))} /></div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="card">
          <div className="card-header"><span className="font-bold text-slate-700">Export Reports</span></div>
          <div className="card-body space-y-3">
            {[
              { key:'orders',  icon:'📋', label:'All Orders Report',        desc:'Complete order list with all fields' },
              { key:'eta',     icon:'📅', label:'ETA Edited Orders Report', desc:'Orders where ETA was changed, with edit history' },
              { key:'dealers', icon:'🏪', label:'Dealer Summary Report',    desc:'Per-dealer order count and status breakdown' },
            ].map(r => (
              <div key={r.key} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                <span className="text-2xl">{r.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">{r.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{r.desc}</div>
                </div>
                <button className="btn-primary btn-sm" disabled={!!loading} onClick={() => download(r.key)}>
                  {loading === r.key ? <Spinner size="sm" /> : '⬇ Excel'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
