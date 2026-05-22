import { jsx as _jsx } from 'react/jsx-runtime';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '../stores/auth.store';
/**
 * Route guard that requires the user to be authenticated with role === 'Seller'.
 * Redirects unauthenticated users to /login and non-seller users to /.
 */
export function SellerRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const role = useAuthStore((state) => state.role);
  const location = useLocation();
  if (!accessToken) {
    return _jsx(Navigate, { to: '/login', state: { from: location.pathname }, replace: true });
  }
  if (role !== 'Seller') {
    return _jsx(Navigate, { to: '/', replace: true });
  }
  return _jsx(Outlet, {});
}
export default SellerRoute;
