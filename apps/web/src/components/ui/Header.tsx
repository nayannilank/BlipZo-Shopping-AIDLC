import { Link } from 'react-router-dom';

import { useAuthStore } from '../../stores/auth.store';

/**
 * Application header with BlipZo logo and navigation.
 * Shows Login/Sign Up buttons when unauthenticated,
 * and user navigation links when authenticated.
 */
export function Header(): React.ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const role = useAuthStore((state) => state.role);
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = accessToken !== null;

  return (
    <header className="nav-bar justify-between">
      <div className="flex items-center gap-4">
        <Link to="/" aria-label="BlipZo Home">
          <img src="/logo.png" alt="BlipZo" className="h-8 w-auto object-contain sm:h-10 lg:h-12" />
        </Link>
        {isAuthenticated && (
          <nav className="hidden items-center gap-3 sm:flex">
            {role === 'Buyer' && (
              <>
                <Link to="/wishlist" className="text-sm">
                  Wishlist
                </Link>
                <Link to="/cart" className="text-sm">
                  Cart
                </Link>
                <Link to="/orders" className="text-sm">
                  Orders
                </Link>
              </>
            )}
            {role === 'Seller' && (
              <Link to="/seller/products" className="text-sm">
                My Products
              </Link>
            )}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            <span className="hidden text-sm text-white/80 sm:inline">{role}</span>
            <button
              onClick={logout}
              className="rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/30 transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/30 transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-brand-primary hover:bg-white/90 transition-colors"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
