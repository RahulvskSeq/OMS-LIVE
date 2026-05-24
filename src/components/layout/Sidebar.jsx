import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS, ROLE_COLORS } from '../../utils/constants';

const NAV = [
  { to: '/dashboard',            icon: '📊', label: 'Dashboard',       perm: null },
  { to: '/orders',               icon: '📋', label: 'Orders',          perm: 'viewAllOrders' },
  { to: '/dons',                 icon: '📦', label: 'Pending DONs',    perm: 'viewPendingDon' },
  { to: '/spos',                 icon: '📄', label: 'Pending SPOs',    perm: 'viewPendingSpo' },
  { to: '/shipments',            icon: '🚛', label: 'Shipments',       perm: 'viewShipments' },
  { to: '/grn',                  icon: '📝', label: 'GRN / Purchase',  perm: 'raiseGrn' },
  { to: '/reports',              icon: '📈', label: 'Reports',         perm: 'viewReports' },
];

const SETTINGS_NAV = [
  { to: '/settings/users',       icon: '👥', label: 'Users',       perm: 'manageUsers' },
  { to: '/settings/permissions', icon: '🔐', label: 'Permissions', perm: 'manageRoles', roles: ['superadmin','admin'] },
  { to: '/settings/masters',     icon: '🗂', label: 'Masters',     perm: 'viewMaster' },
];

export default function Sidebar() {
  const { user, can } = useAuth();
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const open      = useSelector(s => s.ui.sidebarOpen);

  const handleLogout = () => { dispatch(logout()); navigate('/login'); };

  if (!open) return null;

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-slate-100 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg">S</div>
          <div>
            <div className="font-black text-slate-800 text-base leading-tight">Stencil OMS</div>
            <div className="text-xs text-slate-400 font-medium">Order Management</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.filter(n => !n.perm || can(n.perm)).map(n => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) =>
            `sidebar-item ${isActive ? 'sidebar-active' : ''}`
          }>
            <span className="text-base">{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}

        {SETTINGS_NAV.some(n => (!n.perm || can(n.perm)) && (!n.roles || n.roles.includes(user?.role))) && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Settings</span>
            </div>
            {SETTINGS_NAV
              .filter(n => (!n.perm || can(n.perm)) && (!n.roles || n.roles.includes(user?.role)))
              .map(n => (
                <NavLink key={n.to} to={n.to} className={({ isActive }) =>
                  `sidebar-item ${isActive ? 'sidebar-active' : ''}`
                }>
                  <span className="text-base">{n.icon}</span>
                  <span>{n.label}</span>
                </NavLink>
              ))}
          </>
        )}
      </nav>

      {/* User card */}
      <div className="px-3 py-3 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">{user?.name}</div>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${ROLE_COLORS[user?.role] || 'bg-slate-100 text-slate-600'}`}>
              {ROLE_LABELS[user?.role] || user?.role}
            </span>
          </div>
          <button onClick={handleLogout} title="Logout" className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50">
            ⏏
          </button>
        </div>
      </div>
    </aside>
  );
}
