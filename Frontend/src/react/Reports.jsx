/* Reports (React port — overview + Excel export).
 * KPI tiles + Orders-by-Status breakdown from the server aggregates, plus a
 * real Excel export via GET /reports/orders/export. */
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboard } from './dashboardSlice';
import api from './api';

const STAGES = ['Order', 'Approved', 'PO Raised', 'In Transit', 'At Transporter', 'Warehouse', 'GRN', 'Purchased', 'Billed'];
const COLORS = {
  'Order': '#6366f1', 'Approved': '#0ea5e9', 'PO Raised': '#f59e0b', 'In Transit': '#f97316',
  'At Transporter': '#8b5cf6', 'Warehouse': '#10b981', 'GRN': '#d97706', 'Purchased': '#06b6d4', 'Billed': '#16a34a',
};

function Tile({ label, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.1)', textAlign: 'center' }}>
      <div style={{ fontSize: 30, fontWeight: 800, color: color || '#1e293b' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function Reports() {
  const dispatch = useDispatch();
  const { pipeline, summary, loaded, loading } = useSelector((s) => s.dashboard);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { if (!loaded) dispatch(fetchDashboard()); }, [loaded, dispatch]);

  const counts = {};
  pipeline.forEach((p) => { counts[p.stage] = p.count; });
  const maxCount = Math.max(1, ...STAGES.map((s) => counts[s] || 0));
  const billed = counts['Billed'] || 0;
  const inPipeline = ['Order', 'Approved', 'PO Raised', 'In Transit', 'At Transporter', 'Warehouse', 'GRN', 'Purchased'].reduce((n, s) => n + (counts[s] || 0), 0);

  async function exportExcel() {
    setExporting(true); setMsg('');
    try {
      // Excel generation over all orders can take a while — allow up to 90s.
      const r = await api.get('/reports/orders/export', { responseType: 'blob', timeout: 90000 });
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url; a.download = 'orders-report.xlsx'; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setMsg('✓ Export downloaded');
    } catch (e) { setMsg('❌ ' + (e.response?.data?.message || 'Export failed')); }
    finally { setExporting(false); }
  }

  return (
    <div style={{ padding: 20, display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>📈 Reports Overview</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {msg && <span style={{ fontSize: 12, fontWeight: 600, color: msg[0] === '❌' ? '#b91c1c' : '#16a34a' }}>{msg}</span>}
          <button className="btn btn-success btn-sm" disabled={exporting} onClick={exportExcel}>{exporting ? 'Exporting…' : '📊 Export to Excel'}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        <Tile label="Active Orders" value={loading ? '…' : (summary.totalActive ?? 0)} color="#1a73e8" />
        <Tile label="In Pipeline" value={loading ? '…' : inPipeline} color="#f59e0b" />
        <Tile label="Billed" value={loading ? '…' : billed} color="#16a34a" />
        <Tile label="Overdue" value={loading ? '…' : (summary.overdueCount ?? 0)} color="#dc2626" />
        <Tile label="Pending DONs" value={loading ? '…' : (summary.pendingDons ?? 0)} color="#8b5cf6" />
        <Tile label="Pending SPOs" value={loading ? '…' : (summary.pendingSpos ?? 0)} color="#0d9488" />
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>Orders by Status</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {STAGES.map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 110, fontSize: 12, fontWeight: 700, color: '#475569' }}>{s}</div>
              <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 6, height: 22, position: 'relative', overflow: 'hidden' }}>
                <div style={{ width: `${((counts[s] || 0) / maxCount) * 100}%`, background: COLORS[s], height: '100%', borderRadius: 6, minWidth: (counts[s] ? 3 : 0) }} />
              </div>
              <div style={{ width: 50, textAlign: 'right', fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{counts[s] || 0}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
