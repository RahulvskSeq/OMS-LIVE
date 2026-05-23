import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';

export function useAuth() {
  const dispatch   = useDispatch();
  const user       = useSelector(s => s.auth.user);
  const token      = useSelector(s => s.auth.token);
  const permissions = useSelector(s => s.auth.permissions);

  return {
    user, token, permissions,
    isAuthenticated: !!token,
    can: (perm) => user?.role === 'superadmin' || permissions.includes(perm),
    logout: () => dispatch(logout()),
  };
}
