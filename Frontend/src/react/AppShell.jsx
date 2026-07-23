/* Protected app shell (placeholder).
 * Screens (Dashboard, Orders, GRN, Shipments, Reports, Masters, Users, …)
 * will be ported into this shell one at a time. For now it confirms auth
 * works and gives a place to land after login. */
import { useSelector, useDispatch } from 'react-redux';
import { logout } from './authSlice';

export default function AppShell() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  return (
    <div style={{ padding: 40, maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>React app shell</h1>
      <p style={{ color: '#64748b', marginTop: 8 }}>
        Signed in as <strong>{user?.name || user?.username || '—'}</strong>
        {user?.role ? ` (${user.role})` : ''}.
      </p>
      <p style={{ color: '#94a3b8', marginTop: 6, fontSize: 13, lineHeight: 1.5 }}>
        This is the true React app (rendered into <code>#root</code>). Screens are
        being ported here one at a time; until then the live app keeps running
        from <code>index.html</code>.
      </p>
      <button className="btn btn-outline btn-sm" style={{ marginTop: 18 }} onClick={() => dispatch(logout())}>
        Log out
      </button>
    </div>
  );
}
