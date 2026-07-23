/* Permission helper mirroring the vanilla app's can():
 * superadmin can do everything; otherwise the permission must be in the
 * user's effective permissions list (returned by the backend at login). */
import { useSelector } from 'react-redux';

export function useCan() {
  const user = useSelector((s) => s.auth.user);
  const permissions = useSelector((s) => s.auth.permissions);
  return (perm) => {
    if (user?.role === 'superadmin') return true;
    if (!perm) return true;
    return (permissions || []).includes(perm);
  };
}
