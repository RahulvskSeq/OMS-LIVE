import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { userApi } from '../../api/master.api';
import Header from '../../components/layout/Header';
import Modal from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';
import { ROLES, ROLE_LABELS, ROLE_COLORS } from '../../utils/constants';
import { useForm } from 'react-hook-form';
import { fmtDate } from '../../utils/helpers';

export default function UsersSettings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm();

  const load = async () => {
    try { setLoading(true); const r = await userApi.getAll(); setUsers(r.data.data); }
    catch { toast.error('Failed'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditUser(null); reset({ role: 'salesman' }); setModal('form'); };
  const openEdit   = (u)  => { setEditUser(u); reset({ name: u.name, email: u.email, role: u.role, phone: u.phone }); setModal('form'); };

  const handleSave = async (data) => {
    try {
      if (editUser) { await userApi.update(editUser._id, data); toast.success('User updated'); }
      else          { await userApi.create(data); toast.success('User created'); }
      setModal(null); reset(); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this user?')) return;
    try { await userApi.delete(id); toast.success('User deactivated'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Error'); }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <Header title="👥 Users" actions={<button className="btn-primary btn-sm" onClick={openCreate}>+ New User</button>} />
      <div className="p-6">
        {loading ? <PageSpinner /> : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr>
                    <th className="table-th">Name</th><th className="table-th">Username</th>
                    <th className="table-th">Email</th><th className="table-th">Role</th>
                    <th className="table-th">Status</th><th className="table-th">Last Login</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className="table-tr">
                      <td className="table-td font-semibold">{u.name}</td>
                      <td className="table-td font-mono text-sm text-slate-500">{u.username}</td>
                      <td className="table-td text-slate-500">{u.email}</td>
                      <td className="table-td">
                        <span className={`badge ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}`}>{ROLE_LABELS[u.role] || u.role}</span>
                      </td>
                      <td className="table-td">
                        <span className={`badge ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="table-td text-slate-400 text-xs">{u.lastLogin ? fmtDate(u.lastLogin) : 'Never'}</td>
                      <td className="table-td">
                        <div className="flex gap-1">
                          <button className="btn-icon text-sm" title="Edit" onClick={() => openEdit(u)}>✏️</button>
                          <button className="btn-icon text-sm text-red-400" title="Deactivate" onClick={() => handleDeactivate(u._id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <Modal open={modal === 'form'} onClose={() => setModal(null)} title={editUser ? 'Edit User' : 'New User'}>
        <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Full Name *</label><input className="input" {...register('name', { required: 'Required' })} />{errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}</div>
            {!editUser && <div><label className="label">Username *</label><input className="input" {...register('username', { required: 'Required' })} /></div>}
            <div><label className="label">Email *</label><input type="email" className="input" {...register('email', { required: 'Required' })} /></div>
            {!editUser && <div><label className="label">Password *</label><input type="password" className="input" {...register('password', { required: 'Required', minLength: { value: 6, message: 'Min 6 chars' } })} /></div>}
            <div><label className="label">Role</label>
              <select className="input" {...register('role')}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div><label className="label">Phone</label><input className="input" {...register('phone')} /></div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary">{editUser ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
