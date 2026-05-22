import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '../stores/auth.store';

/**
 * Route guard that requires the user to be authenticated with role === 'Seller'.
 * Redirects unauthenticated users to /login and non-seller users to /.
 */
export function SellerRoute(): React.ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const role = useAuthStore((state) => state.role);
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (role !== 'Seller') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default SellerRoute;
