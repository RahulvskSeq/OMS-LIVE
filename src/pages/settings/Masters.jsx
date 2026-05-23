import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { customerApi, supplierApi, productApi, transporterApi } from '../../api/master.api';
import Header from '../../components/layout/Header';
import Modal from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';
import { useForm } from 'react-hook-form';

const TABS = [
  { key:'customers',    label:'Customers',    icon:'👥', api: customerApi,    fields:[{n:'name',l:'Name',r:true},{n:'code',l:'Code'},{n:'phone',l:'Phone'},{n:'email',l:'Email'},{n:'city',l:'City'},{n:'state',l:'State'},{n:'gst',l:'GST'},{n:'type',l:'Type',type:'select',opts:['Dealer','Distributor','Retailer','Direct','Other']}] },
  { key:'suppliers',    label:'Suppliers',    icon:'🏭', api: supplierApi,    fields:[{n:'name',l:'Name',r:true},{n:'code',l:'Code'},{n:'phone',l:'Phone'},{n:'email',l:'Email'},{n:'city',l:'City'},{n:'leadTimeDays',l:'Lead Days',type:'number'}] },
  { key:'products',     label:'Products',     icon:'📦', api: productApi,     fields:[{n:'name',l:'Name',r:true},{n:'code',l:'Code'},{n:'category',l:'Category'},{n:'unit',l:'Unit'},{n:'hsn',l:'HSN'},{n:'purchaseRate',l:'Purchase Rate',type:'number'},{n:'sellingRate',l:'Selling Rate',type:'number'}] },
  { key:'transporters', label:'Transporters', icon:'🚛', api: transporterApi, fields:[{n:'name',l:'Name',r:true},{n:'phone',l:'Phone'},{n:'city',l:'City'},{n:'avgTransitDays',l:'Avg Transit Days',type:'number'}] },
];

export default function MastersSettings() {
  const [tab, setTab]         = useState('customers');
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [editItem, setEditItem] = useState(null);
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm();

  const current = TABS.find(t => t.key === tab);

  const load = async () => {
    try { setLoading(true); const r = await current.api.getAll(); setItems(r.data.data); }
    catch { toast.error('Failed'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [tab]);

  const openCreate = () => { setEditItem(null); reset(); setModal('form'); };
  const openEdit   = (i)  => { setEditItem(i); reset(i); setModal('form'); };

  const handleSave = async (data) => {
    try {
      if (editItem) { await current.api.update(editItem._id, data); toast.success('Updated'); }
      else          { await current.api.create(data); toast.success('Created'); }
      setModal(null); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
  };

  const handleDel = async (id) => {
    if (!confirm('Deactivate?')) return;
    try { await current.api.delete(id); toast.success('Done'); load(); } catch { toast.error('Error'); }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <Header title="🗂 Masters" actions={<button className="btn-primary btn-sm" onClick={openCreate}>+ Add {current?.label.slice(0,-1)}</button>} />
      <div className="px-6 pt-4 flex gap-2 border-b border-slate-100 bg-white">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${tab===t.key ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div className="p-6">
        {loading ? <PageSpinner /> : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {current.fields.slice(0,4).map(f => <th key={f.n} className="table-th">{f.l}</th>)}
                    <th className="table-th text-center">Status</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(i => (
                    <tr key={i._id} className="table-tr">
                      {current.fields.slice(0,4).map(f => <td key={f.n} className="table-td">{i[f.n] || '—'}</td>)}
                      <td className="table-td text-center">
                        <span className={`badge ${i.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{i.isActive ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="table-td">
                        <div className="flex gap-1">
                          <button className="btn-icon text-sm" onClick={() => openEdit(i)}>✏️</button>
                          <button className="btn-icon text-sm text-red-400" onClick={() => handleDel(i._id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!items.length && <tr><td colSpan={current.fields.length} className="table-td text-center text-slate-400 py-10">No records</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <Modal open={modal==='form'} onClose={() => setModal(null)} title={`${editItem ? 'Edit' : 'Add'} ${current?.label.slice(0,-1)}`}>
        <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {current?.fields.map(f => (
              <div key={f.n}>
                <label className="label">{f.l}{f.r && ' *'}</label>
                {f.type === 'select' ? (
                  <select className="input" {...register(f.n, { required: f.r })}>
                    {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type || 'text'} className="input" {...register(f.n, { required: f.r ? 'Required' : false })} />
                )}
                {errors[f.n] && <p className="text-red-500 text-xs mt-1">{errors[f.n].message}</p>}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary">{editItem ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
