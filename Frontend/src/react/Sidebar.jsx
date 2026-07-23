/* Sidebar — faithful React port of buildSidebar().
 * Dark sidebar, grouped/collapsible nav, role gating, active states, and live
 * order-count badges (computed from the loaded orders), reusing the existing
 * CSS classes (.sidebar, .sb-nav, .nav-item, .nav-group-header, .nav-sub). */
import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from './authSlice';
import { fetchOrders } from './ordersSlice';
import { useCan } from './permissions';

const DASH = { id: 'dashboard', icon: '⚡', label: 'Dashboard' };

const GROUPS = [
  { key: 'pre', gIcon: '📋', gLabel: 'Orders', color: '#3b82f6', ph: 'ph1', items: [
    { id: 'orders', icon: '📋', label: 'Orders' },
    { id: 'vendorpo', icon: '📤', label: 'Supplier PO', role: 'raisePo' },
    { id: 'intransit', icon: '🚚', label: 'Mark In Transit', role: 'transitUpdate' },
  ]},
  { key: 'ship', gIcon: '🚚', gLabel: 'Shipments', color: '#8b5cf6', ph: 'ph2', anyRole: 'viewShipments', items: [
    { id: 'ship-intransit', icon: '🚚', label: 'In Transit', role: 'viewShipments' },
    { id: 'ship-transporter', icon: '🚛', label: 'At Transporter', role: 'viewShipments' },
    { id: 'ship-warehouse', icon: '🏭', label: 'Warehouse', role: 'viewShipments' },
  ]},
  { key: 'deliv', gIcon: '🎯', gLabel: 'Delivery', color: '#10b981', ph: 'ph3', anyRole: 'viewDelivery', items: [
    { id: 'deliv-grn', icon: '📋', label: 'GRN', role: 'viewDelivery' },
    { id: 'deliv-purchased', icon: '💰', label: 'Purchased', role: 'viewDelivery' },
    { id: 'deliv-billed', icon: '✅', label: 'Billed', role: 'viewDelivery' },
    { id: 'deliv-cancelled', icon: '🚫', label: 'Cancelled', role: 'viewDelivery' },
  ]},
  { key: 'pending', gIcon: '⏳', gLabel: 'Pending', color: '#1a73e8', ph: 'ph1', items: [
    { id: 'pending-don', icon: '📦', label: 'Pending DONs', role: 'viewPendingDon' },
    { id: 'pending-vpo', icon: '📄', label: 'Pending SPOs', role: 'viewPendingSpo' },
    { id: 'pending-supplier', icon: '🏭', label: 'By Supplier', role: 'viewPendingDon' },
  ]},
  { key: 'masters', gIcon: '📚', gLabel: 'Masters', color: '#94a3b8', ph: '', anyRole: 'editMaster', items: [
    { id: 'products', icon: '🗂', label: 'Products' },
    { id: 'customers', icon: '👥', label: 'Customers' },
    { id: 'vendors', icon: '🏭', label: 'Suppliers' },
    { id: 'transporters', icon: '🚛', label: 'Transporters' },
  ]},
];

const BOTTOM = [
  { id: 'reports', icon: '📈', label: 'Reports', role: 'viewReports' },
  { id: 'departments', icon: '🏢', label: 'Departments', superadmin: true },
  { id: 'roles', icon: '🔐', label: 'Role Management', role: 'manageRoles' },
  { id: 'users', icon: '👤', label: 'User Management', role: 'manageUsers' },
  { id: 'backend', icon: '⚙️', label: 'Backend / Settings', superadmin: true },
];

const BADGE_COLOR = {
  'vendorpo': '#f97316', 'intransit': '#f97316',
  'ship-intransit': '#8b5cf6', 'ship-transporter': '#8b5cf6', 'ship-warehouse': '#8b5cf6',
  'deliv-grn': '#d97706', 'deliv-purchased': '#06b6d4', 'deliv-billed': '#16a34a', 'deliv-cancelled': '#ef4444',
  'pending-don': '#1a73e8', 'pending-vpo': '#0d9488', 'pending-supplier': '#6366f1',
};

function NavItem({ item, ph, badges }) {
  const n = badges[item.id] || 0;
  return (
    <NavLink to={`/${item.id}`} className={({ isActive }) => `nav-item ${ph}${isActive ? ' active' : ''}`}>
      <span className="ni">{item.icon}</span>
      <span className="nl">{item.label}</span>
      {n > 0 && <span style={{ marginLeft: 'auto', background: BADGE_COLOR[item.id] || '#1a73e8', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 800 }}>{n}</span>}
    </NavLink>
  );
}

export default function Sidebar({ onNewOrder }) {
  const dispatch = useDispatch();
  const can = useCan();
  const user = useSelector((s) => s.auth.user);
  const orders = useSelector((s) => s.orders.list);
  const ordersLoaded = useSelector((s) => s.orders.loaded);
  const [open, setOpen] = useState({ pre: true, ship: true, deliv: true, pending: true, masters: true });
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  // Load orders once so the badges have data (independent of which screen loads first).
  useEffect(() => { if (!ordersLoaded) dispatch(fetchOrders()); }, [ordersLoaded, dispatch]);

  const badges = useMemo(() => {
    const byStatus = (s) => orders.reduce((n, o) => n + (o.status === s ? 1 : 0), 0);
    const noCancel = orders.filter((o) => o.status !== 'Cancelled');
    const donMap = {}; noCancel.forEach((o) => { const k = String(o.groupDonId || o.id); (donMap[k] = donMap[k] || []).push(o); });
    const pendDon = Object.values(donMap).filter((arr) => arr.some((o) => o.status !== 'Billed')).length;
    const vpoMap = {}; noCancel.filter((o) => o.vendorPoNum).forEach((o) => { (vpoMap[o.vendorPoNum] = vpoMap[o.vendorPoNum] || []).push(o); });
    const pendVpo = Object.values(vpoMap).filter((arr) => arr.some((o) => o.status !== 'Billed')).length;
    const supSet = new Set(noCancel.filter((o) => o.status !== 'Billed').map((o) => o.vendor || '(No Supplier)'));
    return {
      vendorpo: byStatus('Approved'), intransit: byStatus('PO Raised'),
      'ship-intransit': byStatus('In Transit'), 'ship-transporter': byStatus('At Transporter'), 'ship-warehouse': byStatus('Warehouse'),
      'deliv-grn': byStatus('GRN'), 'deliv-purchased': byStatus('Purchased'), 'deliv-billed': byStatus('Billed'), 'deliv-cancelled': byStatus('Cancelled'),
      'pending-don': pendDon, 'pending-vpo': pendVpo, 'pending-supplier': supSet.size,
    };
  }, [orders]);

  const isSuper = user?.role === 'superadmin';

  return (
    <div className="sidebar" id="sidebar">
      <div className="sb-logo">
        <h2>📦 <span>Order Management</span></h2>
        <p>Pending Stock Tracker</p>
      </div>
      <div className="sb-user">
        <div className="avatar">{(user?.name || user?.username || '?').charAt(0).toUpperCase()}</div>
        <div className="sb-user-info">
          <h4>{user?.name || user?.username || '—'}</h4>
          <p>{user?.role || ''}</p>
        </div>
      </div>

      <nav className="sb-nav">
        {can('createOrder') && (
          <div style={{ padding: '10px 14px 6px' }}>
            <button className="sb-new-order-btn" onClick={onNewOrder}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: '0 3px 12px rgba(249,115,22,.45)' }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span>
              <span className="nl">New Order</span>
            </button>
          </div>
        )}

        <NavItem item={DASH} ph="ph1" badges={badges} />

        {GROUPS.map((g) => {
          const items = g.items.filter((i) => !i.role || can(i.role));
          if (g.anyRole && !can(g.anyRole)) return null;
          if (!items.length) return null;
          const isOpen = open[g.key];
          return (
            <div key={g.key}>
              <div className={`nav-group-header${isOpen ? ' open' : ''}`} onClick={() => toggle(g.key)} style={{ borderTop: '1px solid rgba(255,255,255,.06)', marginTop: 2 }}>
                <span className="ni">{g.gIcon}</span>
                <span className="nl" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: `${g.color}99` }}>{g.gLabel}</span>
                <span className="nav-group-arrow" style={{ color: `${g.color}99` }}>▶</span>
              </div>
              <div className={`nav-sub${isOpen ? ' open' : ''}`}>
                {items.map((i) => <NavItem key={i.id} item={i} ph={g.ph} badges={badges} />)}
              </div>
            </div>
          );
        })}

        <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '8px 16px 4px' }} />
        {BOTTOM.filter((i) => (i.role && can(i.role)) || (i.superadmin && isSuper)).map((i) => (
          <NavItem key={i.id} item={i} ph="" badges={badges} />
        ))}
      </nav>

      <div className="sb-footer">
        <button className="btn btn-outline btn-sm" onClick={() => dispatch(logout())} style={{ width: '100%', justifyContent: 'center' }}>
          🚪 <span className="logout-txt">Logout</span>
        </button>
      </div>
    </div>
  );
}
