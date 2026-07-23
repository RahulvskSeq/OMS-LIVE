/* Role Management (React port) — read view of roles + their permissions. */
import { useEffect, useState } from 'react';
import api from './api';

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [allKeys, setAllKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [r, k] = await Promise.all([api.get('/permissions/roles'), api.get('/permissions/all-keys')]);
        if (!alive) return;
        setRoles(r.data.data || []);
        setAllKeys(k.data.data || []);
      } catch (e) { if (alive) setErr(e.response?.data?.message || 'Failed to load roles'); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      {err && <div style={{ background: '#fef2f2', color: '#991b1b', padding: 14, borderRadius: 12, marginBottom: 14 }}>❌ {err}</div>}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading roles…</div>
      ) : !roles.length ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 30, textAlign: 'center', color: '#94a3b8', boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
          No custom roles defined — the app uses the built-in role defaults.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {roles.map((role) => (
            <div key={role._id || role.name} style={{ background: '#fff', borderRadius: 14, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{role.label || role.name}</span>
                {role.isBuiltIn && <span style={{ background: '#eff6ff', color: '#1a73e8', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>Built-in</span>}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{role.description || role.name}</div>
              <div style={{ marginTop: 12, fontSize: 12, color: '#334155' }}>
                <strong>{(role.permissions || []).length}</strong> of {allKeys.length} permissions
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10, maxHeight: 120, overflowY: 'auto' }}>
                {(role.permissions || []).slice(0, 30).map((p) => (
                  <span key={p} style={{ background: '#f1f5f9', color: '#475569', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6 }}>{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
