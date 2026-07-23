/* App shell layout — sidebar + topbar + routed content (<Outlet/>).
 * Reuses the existing #app / .layout / .main / .topbar CSS. */
import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSelector, useDispatch, useStore } from 'react-redux';
import OrderCreateModal from './OrderCreateModal.jsx';
import { fetchOrders } from './ordersSlice';
import { fetchDashboard } from './dashboardSlice';

const TITLES = {
  dashboard: '⚡ Dashboard', orders: '📋 Orders', vendorpo: '📤 Supplier PO',
  intransit: '🚚 Mark In Transit', 'pending-don': '📦 Pending DONs',
  'pending-vpo': '📄 Pending SPOs', 'pending-supplier': '🏭 Pending by Supplier',
  'ship-intransit': '🚚 In Transit', 'ship-transporter': '🚛 At Transporter',
  'ship-warehouse': '🏭 Warehouse', 'deliv-grn': '📋 GRN', 'deliv-purchased': '💰 Purchased',
  'deliv-billed': '✅ Billed', 'deliv-cancelled': '🚫 Cancelled',
  products: '🗂 Product Master', customers: '👥 Customer Master',
  vendors: '🏭 Supplier Master', transporters: '🚛 Transporter Master',
  reports: '📈 Reports', departments: '🏢 Departments', roles: '🔐 Role Management',
  users: '👤 User Management', backend: '⚙️ Backend / Settings',
};

export default function Layout() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const store = useStore();
  const loc = useLocation();
  const key = loc.pathname.replace(/^\//, '');
  const title = TITLES[key] || 'Order Management System';
  const [showCreate, setShowCreate] = useState(false);
  const [live, setLive] = useState(false);

  // ── Live auto-refresh: SSE push + a 45s fallback poll (mirrors the vanilla app).
  useEffect(() => {
    let debounce;
    const refresh = () => {
      const st = store.getState();
      if (!st.orders.loading) dispatch(fetchOrders());
      if (!st.dashboard.loading) dispatch(fetchDashboard());
    };
    const base = ((window.__APP_CONFIG__ && window.__APP_CONFIG__.API_URL) || window.__API__ || '').replace(/\/+$/, '');
    let es;
    try {
      es = new EventSource(base + '/api/stream');
      es.onopen = () => setLive(true);
      es.onerror = () => setLive(false);
      es.addEventListener('order', () => { clearTimeout(debounce); debounce = setTimeout(refresh, 500); });
    } catch { /* SSE unavailable — the poll below still keeps things fresh */ }
    const poll = setInterval(refresh, 45000);
    return () => { clearInterval(poll); clearTimeout(debounce); if (es) es.close(); };
  }, [dispatch, store]);

  return (
    <div id="app" style={{ display: 'block' }}>
      <div className="layout">
        <Sidebar onNewOrder={() => setShowCreate(true)} />
        <div className="main" style={{ marginLeft: 250 }}>
          <div className="topbar">
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>{title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
              <span title={live ? 'Live updates connected' : 'Auto-refresh (polling)'} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: live ? '#16a34a' : '#94a3b8' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: live ? '#16a34a' : '#cbd5e1' }} /> {live ? 'Live' : 'Auto'}
              </span>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                {user?.name || user?.username}{user?.role ? ` · ${user.role}` : ''}
              </span>
            </div>
          </div>
          <Outlet />
        </div>
      </div>
      <OrderCreateModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
