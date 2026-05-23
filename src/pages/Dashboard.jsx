import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboard } from '../store/slices/dashboardSlice';
import Header from '../components/layout/Header';
import { PageSpinner } from '../components/ui/Spinner';
import StatusBadge from '../components/ui/StatusBadge';
import { fmtDateShort, todayStr, daysBetween } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const StatCard = ({ icon, label, value, sub, color = 'blue' }) => {
  const colors = { blue:'from-blue-500 to-blue-600', red:'from-red-500 to-red-600', green:'from-emerald-500 to-emerald-600', amber:'from-amber-500 to-amber-600' };
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-2xl shrink-0 shadow-lg`}>{icon}</div>
      <div>
        <div className="text-2xl font-black text-slate-800">{value ?? '—'}</div>
        <div className="text-sm font-semibold text-slate-500">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
};

const STACE_COLORS = ['#1a73e8','#16a34a','#7c3aed','#c2410c','#a16207','#0f766e','#1e40af','#166534','#6b21a8','#14532d'];

export default function Dashboard() {
  const dispatch = useDispatch();
  const { summary, pipeline, recent, due, etaEdited, dealers, loading } = useSelector(s => s.dashboard);
  const today = todayStr();

  useEffect(() => { dispatch(fetchDashboard()); }, []);

  if (loading && !summary.totalActive) return (
    <><Header title="Dashboard" /><PageSpinner /></>
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <Header title="📊 Dashboard" actions={
        <button onClick={() => dispatch(fetchDashboard())} className="btn-secondary btn-sm">↻ Refresh</button>
      } />

      <div className="p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon="📋" label="Active Orders"     value={summary.totalActive}    color="blue" />
          <StatCard icon="⏳" label="Pending Approval"  value={summary.pendingApproval} color="amber" />
          <StatCard icon="🚛" label="In Transit"        value={summary.inTransit}       color="blue" />
          <StatCard icon="⚠️" label="Overdue"           value={summary.overdueCount}    color="red" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon="🏭" label="At Transporter"    value={summary.atTransporter}   color="amber" />
          <StatCard icon="🏬" label="In Warehouse"      value={summary.warehouse}       color="green" />
          <StatCard icon="💰" label="Purchased Today"   value={summary.purchasedToday}  color="green" />
          <StatCard icon="📦" label="Pending DONs"      value={summary.pendingDons}     color="blue" />
        </div>

        {/* Pipeline chart */}
        {pipeline.length > 0 && (
          <div className="card">
            <div className="card-header"><span className="font-bold text-slate-700">🗺️ Order Pipeline</span></div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={pipeline} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {pipeline.map((_, i) => <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Due Orders */}
          <div className="card flex flex-col" style={{ height: 380 }}>
            <div className="card-header shrink-0">
              <span className="font-bold text-slate-700">📅 Due Orders</span>
              <span className="text-xs text-slate-400">Overdue: {due?.overdue?.length || 0}</span>
            </div>
            <div className="overflow-y-auto flex-1">
              {[...(due?.overdue||[]), ...(due?.dueToday||[])].slice(0, 20).map(o => (
                <div key={o._id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 hover:bg-red-50/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600">DON-{o.seqId}</span>
                      <span className="text-xs text-slate-600 truncate font-medium">{o.customer}</span>
                    </div>
                    <div className="text-xs text-slate-400 truncate">{o.product}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-bold ${o.eta < today ? 'text-red-600' : 'text-amber-600'}`}>{fmtDateShort(o.eta)}</div>
                    {o.eta < today && <div className="text-xs text-red-500">{daysBetween(o.eta, today)}d late</div>}
                  </div>
                  <StatusBadge status={o.status} />
                </div>
              ))}
              {(!due?.overdue?.length && !due?.dueToday?.length) && (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">No due orders 🎉</div>
              )}
            </div>
          </div>

          {/* LR at Transporter */}
          <div className="card flex flex-col" style={{ height: 380 }}>
            <div className="card-header shrink-0">
              <span className="font-bold text-slate-700">🧾 LR at Transporter</span>
            </div>
            <div className="overflow-y-auto flex-1">
              {(summary.lrOrders || []).slice(0,20).map(o => (
                <div key={o._id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600">DON-{o.seqId}</span>
                      <span className="text-xs text-slate-600 truncate">{o.customer}</span>
                    </div>
                    <div className="text-xs text-slate-400">LR: {o.lr || '—'} · {o.transporter || '—'}</div>
                  </div>
                  <div className="text-xs text-slate-500 shrink-0">ETA {fmtDateShort(o.eta)}</div>
                  <StatusBadge status={o.status} />
                </div>
              ))}
            </div>
          </div>

          {/* ETA Edited */}
          <div className="card flex flex-col" style={{ height: 400 }}>
            <div className="card-header shrink-0">
              <span className="font-bold text-slate-700">📅 ETA Edited Orders</span>
              <div className="flex gap-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">
                  🔴 {etaEdited.filter(e => e.flag==='delayed').length} delayed
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-bold">
                  🟢 {etaEdited.filter(e => e.flag==='preponed').length} preponed
                </span>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {etaEdited.slice(0,20).map(o => (
                <div key={o._id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 border-l-4 ${o.flag==='delayed' ? 'border-l-red-400' : 'border-l-emerald-400'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-blue-600">DON-{o.seqId}</span>
                      <span className="text-xs font-semibold text-slate-700 truncate">{o.customer}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-400 line-through">{fmtDateShort(o.origEta)}</span>
                      <span className="text-xs text-slate-400">→</span>
                      <span className={`text-xs font-bold ${o.overdue > 0 ? 'text-red-600' : 'text-slate-700'}`}>{fmtDateShort(o.eta)}</span>
                      {o.slip > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">+{o.slip}d</span>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={o.status} />
                    <div className="text-xs text-slate-400 mt-0.5">{o.editCount} edit{o.editCount!==1?'s':''}</div>
                  </div>
                </div>
              ))}
              {!etaEdited.length && <div className="flex items-center justify-center h-full text-slate-400 text-sm">No ETA edits</div>}
            </div>
          </div>

          {/* Dealer Summary */}
          <div className="card flex flex-col" style={{ height: 400 }}>
            <div className="card-header shrink-0">
              <span className="font-bold text-slate-700">🏪 Dealer Summary</span>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Dealer</th>
                    <th className="table-th text-center">Orders</th>
                    <th className="table-th text-center">Pending</th>
                    <th className="table-th text-center">Done</th>
                  </tr>
                </thead>
                <tbody>
                  {dealers.slice(0,20).map((d,i) => (
                    <tr key={i} className="table-tr">
                      <td className="table-td font-semibold">{d._id || '—'}</td>
                      <td className="table-td text-center">{d.totalOrders}</td>
                      <td className="table-td text-center">
                        <span className="text-amber-600 font-bold">{d.pendingOrders}</span>
                      </td>
                      <td className="table-td text-center">
                        <span className="text-emerald-600 font-bold">{d.deliveredOrders}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card flex flex-col" style={{ height: 500 }}>
          <div className="card-header shrink-0">
            <span className="font-bold text-slate-700">📋 Recent Orders</span>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr>
                  <th className="table-th">DON</th>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Product</th>
                  <th className="table-th text-center">Qty</th>
                  <th className="table-th">ETA</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.slice(0,30).map(o => (
                  <tr key={o._id} className="table-tr">
                    <td className="table-td font-bold text-blue-600">DON-{o.seqId}</td>
                    <td className="table-td font-semibold">{o.customer}</td>
                    <td className="table-td text-slate-500">{o.product}</td>
                    <td className="table-td text-center">{o.qty}</td>
                    <td className="table-td">{fmtDateShort(o.eta)}</td>
                    <td className="table-td"><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
