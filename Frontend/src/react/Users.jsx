/* User Management (React port) — read view of all users. */
import { useEffect, useMemo, useState } from 'react';
import api from './api';

const th = { padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap' };
const td = { padding: '10px 14px', fontSize: 13, color: '#1e293b', borderBottom: '1px solid #f1f5f9' };
const ROLE_COLOR = { superadmin: '#dc2626', admin: '#ea580c', manager: '#7c3aed', teamlead: '#0891b2', logistics: '#f97316', purchase: '#0ea5e9', biller: '#16a34a', salesman: '#64748b' };

export default function Users() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try { const r = await api.get('/users'); if (alive) setRows(r.data.data || []); }
      catch (e) { if (alive) setErr(e.response?.data?.message || 'Failed to load users'); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const s = q.trim().toLowerCase();
    return rows.filter((u) => [u.name, u.username, u.email, u.role, u.departmentName].some((x) => (x || '').toString().toLowerCase().includes(s)));
  }, [rows, q]);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.1)', overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…"
            style={{ flex: 1, maxWidth: 380, padding: '9px 14px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' }} />
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{loading ? 'Loading…' : `${filtered.length} users`}</span>
        </div>
        {err && <div style={{ padding: 16, color: '#b91c1c', background: '#fef2f2' }}>❌ {err}</div>}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={th}>Name</th><th style={th}>Username</th><th style={th}>Email</th><th style={th}>Role</th><th style={th}>Department</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id}>
                  <td style={{ ...td, fontWeight: 600 }}>{u.name || '—'}</td>
                  <td style={td}>{u.username || '—'}</td>
                  <td style={td}>{u.email || '—'}</td>
                  <td style={td}><span style={{ background: (ROLE_COLOR[u.role] || '#64748b') + '22', color: ROLE_COLOR[u.role] || '#64748b', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{u.role}</span></td>
                  <td style={td}>{u.departmentName || '—'}</td>
                </tr>
              ))}
              {!loading && !filtered.length && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: 32 }}>No users.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
