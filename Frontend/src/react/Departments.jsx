/* Departments (React port) — read view. */
import { useEffect, useState } from 'react';
import api from './api';

const th = { padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 };
const td = { padding: '10px 14px', fontSize: 13, color: '#1e293b', borderBottom: '1px solid #f1f5f9' };

export default function Departments() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try { const r = await api.get('/departments'); if (alive) setRows(r.data.data || []); }
      catch (e) { if (alive) setErr(e.response?.data?.message || 'Failed to load departments'); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.1)', overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>🏢 Departments</span>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{loading ? 'Loading…' : `${rows.length} departments`}</span>
        </div>
        {err && <div style={{ padding: 16, color: '#b91c1c', background: '#fef2f2' }}>❌ {err}</div>}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={th}>Name</th><th style={th}>Description</th><th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d._id}>
                <td style={{ ...td, fontWeight: 600 }}>{d.name || '—'}</td>
                <td style={td}>{d.description || '—'}</td>
                <td style={td}><span style={{ color: d.isActive === false ? '#dc2626' : '#16a34a', fontWeight: 700, fontSize: 12 }}>{d.isActive === false ? 'Inactive' : 'Active'}</span></td>
              </tr>
            ))}
            {!loading && !rows.length && <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: 32 }}>No departments.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
