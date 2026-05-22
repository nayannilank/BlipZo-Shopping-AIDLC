import { jsx as _jsx } from 'react/jsx-runtime';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '../stores/auth.store';
/**
 * Protected route wrapper that redirects unauthenticated users to /login.
 * Preserves the intended destination so users can be redirected back after login.
 */
export function ProtectedRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const location = useLocation();
  if (!accessToken) {
    return _jsx(Navigate, { to: '/login', state: { from: location.pathname }, replace: true });
  }
  return _jsx(Outlet, {});
}
export default ProtectedRoute;
