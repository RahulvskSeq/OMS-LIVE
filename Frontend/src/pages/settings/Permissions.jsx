import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { permissionApi } from '../../api/master.api';
import Header from '../../components/layout/Header';
import { PageSpinner } from '../../components/ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../utils/constants';

/* ─── Dependency map: key → permissions that must be ON ─────────────────── */
const PERM_DEPS = {
  createOrder:        ['viewAllOrders'],
  editOrder:          ['viewAllOrders'],
  updateOrderStatus:  ['viewAllOrders'],
  deleteOrder:        ['viewAllOrders', 'editOrder'],
  exportOrders:       ['viewAllOrders'],
  approve:            ['viewAllOrders'],
  editPendingDon:     ['viewPendingDon'],
  raisePo:            ['viewPendingSpo'],
  editPendingSpo:     ['viewPendingSpo'],
  logisticsUpdate:    ['viewShipments'],
  transitUpdate:      ['viewShipments'],
  deliver:            ['viewDelivery'],
  editSupplierPo:     ['viewSupplierPo'],
  raiseGrn:           ['viewAllOrders'],
  purchaseOrder:      ['viewAllOrders'],
  editMaster:         ['viewMaster'],
  exportReports:      ['viewReports'],
  manageUsers:        ['viewBackend'],
  manageRoles:        ['viewBackend'],
};

const REVERSE_DEPS = {};
Object.entries(PERM_DEPS).forEach(([perm, deps]) => {
  deps.forEach(dep => {
    if (!REVERSE_DEPS[dep]) REVERSE_DEPS[dep] = [];
    REVERSE_DEPS[dep].push(perm);
  });
});

const GROUPS = [
  {
    id: 'orders', icon: '📋', label: 'Orders', color: '#1a73e8',
    permissions: [
      { key: 'viewAllOrders',     label: 'View Orders',           desc: 'See the orders list and order details' },
      { key: 'createOrder',       label: 'Create Order',          desc: 'Add new orders to the system' },
      { key: 'editOrder',         label: 'Edit Order',            desc: 'Modify existing order details and fields' },
      { key: 'updateOrderStatus', label: 'Update Status',         desc: 'Change order status at any stage of the workflow' },
      { key: 'approve',           label: 'Approve Order',         desc: 'Approve orders from pending state' },
      { key: 'deleteOrder',       label: 'Delete Order',          desc: 'Soft-delete / deactivate orders' },
      { key: 'exportOrders',      label: 'Export Orders',         desc: 'Download orders as CSV / Excel' },
    ],
  },
  {
    id: 'dons', icon: '📦', label: 'Pending DONs', color: '#7c3aed',
    permissions: [
      { key: 'viewPendingDon', label: 'View Pending DONs', desc: 'Access the Pending DONs section' },
      { key: 'editPendingDon', label: 'Edit Pending DON',  desc: 'Update DON details and take action on them' },
    ],
  },
  {
    id: 'spos', icon: '📄', label: 'Pending SPOs', color: '#0891b2',
    permissions: [
      { key: 'viewPendingSpo', label: 'View Pending SPOs',    desc: 'Access the Pending SPOs section' },
      { key: 'raisePo',        label: 'Raise Purchase Order', desc: 'Create a Purchase Order from an SPO' },
      { key: 'editPendingSpo', label: 'Edit Pending SPO',     desc: 'Modify SPO details' },
    ],
  },
  {
    id: 'shipments', icon: '🚛', label: 'Shipments', color: '#d97706',
    subGroups: [
      {
        id: 'ship_dispatch', label: 'Dispatching', icon: '📤',
        desc: 'Manage orders being prepared and sent for dispatch',
        permissions: [
          { key: 'viewShipments',   label: 'View Shipments',  desc: 'Access the Shipments section / dispatching tab' },
          { key: 'logisticsUpdate', label: 'Dispatch Order',  desc: 'Mark an order as dispatched and enter LR details' },
        ],
      },
      {
        id: 'ship_transit', label: 'In Transit', icon: '🚛',
        desc: 'Track and update orders currently in transit',
        permissions: [
          { key: 'viewShipments', label: 'View In Transit',  desc: 'See orders in transit (shared with Dispatching)' },
          { key: 'transitUpdate', label: 'Update Arrival',   desc: 'Mark order arrived at transporter / warehouse' },
        ],
      },
      {
        id: 'ship_delivery', label: 'Delivery', icon: '📬',
        desc: 'Confirm final delivery of orders to customers',
        permissions: [
          { key: 'viewDelivery', label: 'View Deliveries', desc: 'See delivery status and delivery history' },
          { key: 'deliver',      label: 'Mark Delivered',  desc: 'Confirm an order has been delivered to the customer' },
        ],
      },
    ],
  },
  {
    id: 'supplier_po', icon: '🧾', label: 'Supplier PO', color: '#16a34a',
    permissions: [
      { key: 'viewSupplierPo', label: 'View Supplier PO', desc: 'Access Supplier Purchase Orders' },
      { key: 'editSupplierPo', label: 'Edit Supplier PO', desc: 'Modify Supplier PO details and records' },
    ],
  },
  {
    id: 'grn', icon: '📝', label: 'GRN / Purchase', color: '#059669',
    permissions: [
      { key: 'raiseGrn',      label: 'Raise GRN',      desc: 'Create Goods Receipt Notes against orders' },
      { key: 'purchaseOrder', label: 'Purchase Order',  desc: 'Process purchase orders and record billing' },
    ],
  },
  {
    id: 'visibility', icon: '👁️', label: 'Pricing Visibility', color: '#6b7280',
    permissions: [
      { key: 'viewVendor', label: 'View Vendor Pricing', desc: 'See purchase / vendor rates on orders' },
      { key: 'viewBiller', label: 'View Biller Info',    desc: 'See billing amounts and invoice details' },
    ],
  },
  {
    id: 'masters', icon: '🗂️', label: 'Masters', color: '#475569',
    permissions: [
      { key: 'viewMaster', label: 'View Masters', desc: 'View customers, products, suppliers and transporters' },
      { key: 'editMaster', label: 'Edit Masters', desc: 'Add and edit master data entries' },
    ],
  },
  {
    id: 'reports', icon: '📈', label: 'Reports', color: '#0f766e',
    permissions: [
      { key: 'viewReports',   label: 'View Reports',   desc: 'Access the Reports section' },
      { key: 'exportReports', label: 'Export Reports', desc: 'Download report data as files' },
    ],
  },
  {
    id: 'admin', icon: '⚙️', label: 'Administration', color: '#dc2626',
    adminOnly: true,
    permissions: [
      { key: 'viewBackend',  label: 'Access Backend / Settings',  desc: 'View the Settings and Backend section' },
      { key: 'manageUsers',  label: 'Manage Users',               desc: 'Add, edit and deactivate user accounts' },
      { key: 'manageRoles',  label: 'Manage Roles & Permissions', desc: 'Edit role permissions (Admin+ only)' },
    ],
  },
];

const ROLE_META = {
  superadmin: { icon: '👑', desc: 'Full system access. All permissions always granted — cannot be edited.' },
  admin:      { icon: '🛡️', desc: 'Senior administrator. Can manage users, permissions, and all operations.' },
  manager:    { icon: '💼', desc: 'Operations manager. Manages orders, shipments and can view reports.' },
  logistics:  { icon: '🚛', desc: 'Handles dispatching, transit tracking and delivery confirmation.' },
  purchase:   { icon: '🛒', desc: 'Manages purchase orders, GRN and supplier communications.' },
  biller:     { icon: '💰', desc: 'Processes billing, invoices and purchase reconciliation.' },
  salesman:   { icon: '🤝', desc: 'Creates orders and tracks deliveries for customers.' },
};

function addWithDeps(key, current) {
  const result = new Set(current);
  const queue = [key];
  while (queue.length) {
    const k = queue.shift();
    if (!result.has(k)) {
      result.add(k);
      (PERM_DEPS[k] || []).forEach(dep => { if (!result.has(dep)) queue.push(dep); });
    }
  }
  return result;
}

function removeWithDependents(key, current) {
  const result = new Set(current);
  const queue = [key];
  while (queue.length) {
    const k = queue.shift();
    result.delete(k);
    (REVERSE_DEPS[k] || []).forEach(dep => { if (result.has(dep)) queue.push(dep); });
  }
  return result;
}

function Toggle({ on, onChange, disabled, isAuto }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      title={disabled ? 'Cannot edit' : on ? 'Click to revoke' : 'Click to grant'}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all',
        'focus:outline-none focus:ring-2 focus:ring-offset-1',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
        on ? (isAuto ? 'bg-indigo-400 focus:ring-indigo-300' : 'bg-blue-600 focus:ring-blue-400') : 'bg-slate-200 focus:ring-slate-300',
      ].join(' ')}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function PermRow({ perm, enabled, isAuto, locked, onChange }) {
  const deps = PERM_DEPS[perm.key] || [];
  return (
    <div className={['flex items-start gap-4 px-4 py-3 rounded-xl transition-colors', enabled ? 'bg-blue-50 border border-blue-100' : 'border border-transparent hover:bg-slate-50'].join(' ')}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${enabled ? 'text-blue-900' : 'text-slate-700'}`}>{perm.label}</span>
          {isAuto && enabled && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-bold tracking-wide">AUTO</span>}
        </div>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{perm.desc}</p>
        {deps.length > 0 && <p className="text-[11px] text-amber-500 mt-1 font-medium">↳ Requires: {deps.join(', ')}</p>}
      </div>
      <div className="pt-0.5"><Toggle on={enabled} onChange={onChange} disabled={locked} isAuto={isAuto} /></div>
    </div>
  );
}

function GroupCard({ group, perms, autoDepKeys, locked, onToggle, shipTab, onShipTabChange }) {
  const allKeys = group.subGroups ? [...new Set(group.subGroups.flatMap(sg => sg.permissions.map(p => p.key)))] : group.permissions.map(p => p.key);
  const grantedCount = allKeys.filter(k => perms.has(k)).length;
  const totalCount = allKeys.length;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3" style={{ background: group.color + '0d' }}>
        <span className="text-lg">{group.icon}</span>
        <span className="font-bold text-slate-800 flex-1">{group.label}</span>
        {group.adminOnly && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold tracking-wide uppercase mr-2">Admin Only</span>}
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: grantedCount > 0 ? group.color + '22' : '#f1f5f9', color: grantedCount > 0 ? group.color : '#94a3b8' }}>
          {grantedCount}/{totalCount}
        </span>
      </div>
      {group.subGroups ? (
        <div>
          <div className="flex border-b border-slate-100 bg-slate-50/40">
            {group.subGroups.map(sg => {
              const sgCount = sg.permissions.filter(p => perms.has(p.key)).length;
              const isActive = shipTab === sg.id;
              return (
                <button key={sg.id} onClick={() => onShipTabChange(sg.id)}
                  className={['flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all', isActive ? 'border-amber-500 text-amber-700 bg-amber-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white'].join(' ')}>
                  <span>{sg.icon}</span><span>{sg.label}</span>
                  {sgCount > 0 && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>{sgCount}</span>}
                </button>
              );
            })}
          </div>
          {group.subGroups.filter(sg => sg.id === shipTab).map(sg => (
            <div key={sg.id}>
              <p className="text-[11px] text-slate-400 font-medium px-5 py-2 bg-slate-50/60 border-b border-slate-100">{sg.desc}</p>
              <div className="p-3 space-y-1.5">
                {sg.permissions.map(perm => (
                  <PermRow key={perm.key} perm={perm} enabled={perms.has(perm.key)} isAuto={autoDepKeys.has(perm.key)} locked={locked} onChange={() => onToggle(perm.key)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3 space-y-1.5">
          {group.permissions.map(perm => (
            <PermRow key={perm.key} perm={perm} enabled={perms.has(perm.key)} isAuto={autoDepKeys.has(perm.key)} locked={locked} onChange={() => onToggle(perm.key)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PermissionsSettings() {
  const { user } = useAuth();
  const editableRoles = user?.role === 'superadmin'
    ? ['admin', 'manager', 'logistics', 'purchase', 'biller', 'salesman']
    : user?.role === 'admin'
    ? ['manager', 'logistics', 'purchase', 'biller', 'salesman']
    : [];

  const [selectedRole, setSelectedRole] = useState(editableRoles[0] || '');
  const [perms, setPerms]       = useState(new Set());
  const [original, setOriginal] = useState(new Set());
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [shipTab, setShipTab]   = useState('ship_dispatch');

  const loadRole = useCallback(async (roleName) => {
    if (!roleName) return;
    setLoading(true);
    try {
      const r = await permissionApi.getRole(roleName);
      const s = new Set(r.data.data?.permissions || []);
      setPerms(s); setOriginal(new Set(s));
    } catch { toast.error('Failed to load permissions'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRole(selectedRole); }, [selectedRole, loadRole]);

  const toggle = useCallback((key) => {
    setPerms(prev => prev.has(key) ? removeWithDependents(key, prev) : addWithDeps(key, prev));
  }, []);

  const autoDepKeys = new Set();
  [...perms].forEach(k => {
    if (!original.has(k)) {
      Object.entries(PERM_DEPS).forEach(([perm, deps]) => {
        if (perms.has(perm) && !original.has(perm) && deps.includes(k)) autoDepKeys.add(k);
      });
    }
  });

  const hasChanges   = [...perms].sort().join(',') !== [...original].sort().join(',');
  const addedCount   = [...perms].filter(p => !original.has(p)).length;
  const removedCount = [...original].filter(p => !perms.has(p)).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      await permissionApi.updateRole(selectedRole, { permissions: [...perms] });
      setOriginal(new Set(perms));
      toast.success(`${ROLE_LABELS[selectedRole]} permissions saved`);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDiscard = () => setPerms(new Set(original));

  const handleSelectAll = () => {
    let result = new Set();
    GROUPS.filter(g => !(g.adminOnly && selectedRole !== 'admin'))
      .flatMap(g => g.subGroups ? g.subGroups.flatMap(sg => sg.permissions.map(p => p.key)) : g.permissions.map(p => p.key))
      .forEach(k => { result = addWithDeps(k, result); });
    setPerms(result);
  };

  if (!['superadmin', 'admin'].includes(user?.role)) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center p-12">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-slate-700">Access Restricted</h2>
          <p className="text-slate-400 mt-2">Only Super Admin and Admin can manage permissions.</p>
        </div>
      </div>
    );
  }

  const visibleGroups = GROUPS.filter(g => !(g.adminOnly && selectedRole !== 'admin'));
  const meta = ROLE_META[selectedRole] || {};

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      <Header title="🔐 Permissions Manager"
        actions={hasChanges ? <span className="inline-flex items-center gap-1.5 text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" /> Unsaved changes</span> : null}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-52 bg-white border-r border-slate-100 flex flex-col shrink-0 overflow-y-auto">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Edit Permissions For</p>
          </div>
          <nav className="flex-1 py-2">
            {editableRoles.map(r => {
              const m = ROLE_META[r] || {};
              const sel = selectedRole === r;
              return (
                <button key={r} onClick={() => { setSelectedRole(r); setShipTab('ship_dispatch'); }}
                  className={['w-full flex items-center gap-3 px-4 py-3 text-left border-l-[3px] transition-all', sel ? 'border-blue-600 bg-blue-50' : 'border-transparent hover:bg-slate-50'].join(' ')}>
                  <span className="text-xl leading-none">{m.icon}</span>
                  <span className={`text-sm font-semibold truncate ${sel ? 'text-blue-700' : 'text-slate-700'}`}>{ROLE_LABELS[r]}</span>
                </button>
              );
            })}
          </nav>
          <div className="px-4 py-4 border-t border-slate-100 space-y-2.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Legend</p>
            <div className="flex items-center gap-2.5 text-xs text-slate-500">
              <div className="w-9 h-5 bg-blue-600 rounded-full flex items-center justify-end pr-1"><div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm" /></div>Granted
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-500">
              <div className="w-9 h-5 bg-indigo-400 rounded-full flex items-center justify-end pr-1"><div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm" /></div>Auto (dep)
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-500">
              <div className="w-9 h-5 bg-slate-200 rounded-full flex items-center justify-start pl-1"><div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm" /></div>Not granted
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 shrink-0">
            <span className="text-3xl leading-none">{meta.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-base font-bold text-slate-800">{ROLE_LABELS[selectedRole]}</h2>
                {hasChanges && (
                  <>
                    {addedCount > 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">+{addedCount} added</span>}
                    {removedCount > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-semibold">-{removedCount} removed</span>}
                  </>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{meta.desc}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-sm">
              <span className="text-slate-400 font-medium">{perms.size} granted</span>
              <div className="h-4 w-px bg-slate-200" />
              <button onClick={handleSelectAll} className="text-blue-600 hover:text-blue-800 font-semibold text-xs">Grant All</button>
              <span className="text-slate-300 text-xs">·</span>
              <button onClick={handleDiscard} className="text-slate-500 hover:text-slate-700 font-semibold text-xs">Reset</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 pb-24">
            {loading ? <PageSpinner /> : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {visibleGroups.map(group => (
                  <GroupCard key={group.id} group={group} perms={perms} autoDepKeys={autoDepKeys} locked={false} onToggle={toggle} shipTab={shipTab} onShipTabChange={setShipTab} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {hasChanges && (
        <div className="fixed bottom-0 left-52 right-0 bg-white/95 backdrop-blur border-t border-slate-200 px-6 py-3.5 flex items-center justify-between z-20 shadow-xl">
          <p className="text-sm font-semibold text-amber-700">
            Editing <span className="text-amber-900 font-bold">{ROLE_LABELS[selectedRole]}</span>
            {addedCount > 0 && <span className="text-green-700">  +{addedCount} added</span>}
            {removedCount > 0 && <span className="text-red-600">  -{removedCount} removed</span>}
          </p>
          <div className="flex gap-3">
            <button onClick={handleDiscard} disabled={saving} className="btn-secondary text-sm px-4 py-2">Discard</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-5 py-2">{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
