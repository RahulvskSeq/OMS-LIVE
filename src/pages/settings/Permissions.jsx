import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { permissionApi, userApi } from '../../api/master.api';
import Header from '../../components/layout/Header';
import { PageSpinner } from '../../components/ui/Spinner';
import { ROLES, ROLE_LABELS } from '../../utils/constants';

const PM_ACTIONS = ['View','Create','Edit','Delete','Export','Assign','Find'];
const ACTION_COLORS = { View:'#1a73e8', Create:'#16a34a', Edit:'#d97706', Delete:'#dc2626', Export:'#7c3aed', Assign:'#0891b2', Find:'#64748b' };

export default function PermissionsSettings() {
  const [matrix, setMatrix]   = useState([]);
  const [perms, setPerms]     = useState([]);
  const [role, setRole]       = useState('admin');
  const [users, setUsers]     = useState([]);
  const [userId, setUserId]   = useState('');
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [m, r, u] = await Promise.all([permissionApi.getMatrix(), permissionApi.getRole(role), userApi.getAll()]);
      setMatrix(m.data.data);
      setPerms(r.data.data?.permissions || []);
      setUsers(u.data.data);
    } catch { toast.error('Failed'); } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, [role]);

  const toggle = async (permKey) => {
    const enabled = !perms.includes(permKey);
    try {
      if (userId) {
        const user = users.find(u => u._id === userId);
        const current = user?.permissionOverrides?.length ? user.permissionOverrides : perms;
        const newPerms = enabled ? [...current, permKey] : current.filter(p => p !== permKey);
        await userApi.setPermissions(userId, { permissions: newPerms });
        setPerms(newPerms);
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, permissionOverrides: newPerms } : u));
      } else {
        await permissionApi.toggle(role, { permission: permKey, enabled });
        setPerms(prev => enabled ? [...prev, permKey] : prev.filter(p => p !== permKey));
      }
      toast.success('Permission updated');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
  };

  if (loading) return <><Header title="🔐 Permissions" /><PageSpinner /></>;

  return (
    <div className="flex-1 overflow-y-auto">
      <Header title="🔐 Permissions Manager" />
      <div className="p-6 space-y-4">
        {/* Controls */}
        <div className="card card-body flex flex-wrap gap-4 items-center">
          <div>
            <label className="label">Role</label>
            <select className="input w-40" value={role} onChange={e => { setRole(e.target.value); setUserId(''); }}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div>
            <label className="label">User Override (optional)</label>
            <select className="input w-56" value={userId} onChange={e => {
              setUserId(e.target.value);
              if (e.target.value) {
                const u = users.find(u => u._id === e.target.value);
                setPerms(u?.permissionOverrides?.length ? u.permissionOverrides : perms);
              }
            }}>
              <option value="">— Edit role defaults —</option>
              {users.filter(u => u.role === role).map(u => <option key={u._id} value={u._id}>{u.name} (@{u.username})</option>)}
            </select>
          </div>
          {userId && <div className="mt-5 text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-semibold">Editing overrides for selected user only</div>}
        </div>

        {/* Matrix */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr>
                  <th className="table-th w-40">Module</th>
                  {PM_ACTIONS.map(a => (
                    <th key={a} className="table-th text-center" style={{ color: ACTION_COLORS[a] }}>{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map(row => (
                  <tr key={row.module} className="table-tr">
                    <td className="table-td font-semibold">
                      <span className="mr-2">{row.icon}</span>{row.module}
                    </td>
                    {PM_ACTIONS.map(action => {
                      const key = row.cells?.[action];
                      const active = key && perms.includes(key);
                      return (
                        <td key={action} className="table-td text-center">
                          {key ? (
                            <button
                              onClick={() => toggle(key)}
                              className={`w-7 h-7 rounded-lg border-2 transition-all ${active ? 'border-transparent' : 'border-slate-200 bg-white'}`}
                              style={active ? { background: ACTION_COLORS[action] + '22', borderColor: ACTION_COLORS[action], color: ACTION_COLORS[action] } : {}}
                              title={`${active ? 'Revoke' : 'Grant'} ${action} on ${row.module} (${key})`}
                            >
                              {active ? '✓' : ''}
                            </button>
                          ) : <span className="text-slate-200">—</span>}
                        </td>
                      );
                    })}
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
