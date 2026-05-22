import { Link, useNavigate } from 'react-router-dom';

import { useCart, useUpdateCartItem, useRemoveCartItem, useClearCart } from '../../hooks/useCart';

function CartSkeleton(): React.ReactElement {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={`skeleton-${String(i)}`}
          className="flex gap-4 rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="h-24 w-24 flex-shrink-0 rounded-md bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-2/3 rounded bg-gray-200" />
            <div className="h-4 w-1/4 rounded bg-gray-200" />
            <div className="h-4 w-1/6 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyCart(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-16 text-center">
      <svg
        className="h-16 w-16 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
        />
      </svg>
      <h2 className="mt-4 text-lg font-semibold text-gray-900">Your cart is empty</h2>
      <p className="mt-1 text-sm text-gray-500">Browse products and add items to your cart.</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
      >
        Browse Products
      </Link>
    </div>
  );
}

export function Component(): React.ReactElement {
  const navigate = useNavigate();
  const { data: cart, isLoading, isError, error } = useCart();
  const updateCartItem = useUpdateCartItem();
  const removeCartItem = useRemoveCartItem();
  const clearCartMutation = useClearCart();

  function handleQuantityChange(productId: string, newQuantity: number): void {
    if (newQuantity <= 0) {
      removeCartItem.mutate(productId);
    } else {
      updateCartItem.mutate({ productId, quantity: newQuantity });
    }
  }

  function handleRemove(productId: string): void {
    removeCartItem.mutate(productId);
  }

  function handleClearCart(): void {
    clearCartMutation.mutate();
  }

  function handleProceedToCheckout(): void {
    void navigate('/checkout');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-2xl font-bold text-brand-blue-600">
            BlipZo
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li>
              <Link to="/" className="hover:text-brand-blue-600">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-gray-900">Cart</li>
          </ol>
        </nav>

        <h1 className="mb-6 text-2xl font-bold text-gray-900 sm:text-3xl">
          Shopping Cart
          {cart && cart.items.length > 0 && (
            <span className="ml-2 text-lg font-normal text-gray-500">
              ({String(cart.items.length)} {cart.items.length === 1 ? 'item' : 'items'})
            </span>
          )}
        </h1>

        {/* Loading */}
        {isLoading && <CartSkeleton />}

        {/* Error */}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">Failed to load your cart.</p>
            <p className="mt-1 text-xs text-red-600">
              {error instanceof Error ? error.message : 'Something went wrong.'}
            </p>
          </div>
        )}

        {/* Empty State */}
        {cart && cart.items.length === 0 && <EmptyCart />}

        {/* Cart Items */}
        {cart && cart.items.length > 0 && (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Items List */}
            <div className="lg:col-span-2">
              <ul className="space-y-4" aria-label="Cart items">
                {cart.items.map((item) => (
                  <li
                    key={item.productId}
                    className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row"
                  >
                    {/* Product Image */}
                    <Link to={`/products/${item.productId}`} className="flex-shrink-0">
                      <img
                        src={item.primaryImageUrl}
                        alt={item.name}
                        className="h-24 w-24 rounded-md object-cover"
                      />
                    </Link>

                    {/* Product Info */}
                    <div className="flex flex-1 flex-col gap-2">
                      <Link
                        to={`/products/${item.productId}`}
                        className="text-base font-semibold text-gray-900 hover:text-brand-blue-600"
                      >
                        {item.name}
                      </Link>

                      <p className="text-sm text-gray-500">
                        ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })} each
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <label htmlFor={`qty-${item.productId}`} className="text-sm text-gray-600">
                          Qty:
                        </label>
                        <div className="flex items-center rounded-md border border-gray-300">
                          <button
                            type="button"
                            onClick={() => {
                              handleQuantityChange(item.productId, item.quantity - 1);
                            }}
                            disabled={updateCartItem.isPending || removeCartItem.isPending}
                            aria-label={`Decrease quantity of ${item.name}`}
                            className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                          >
                            −
                          </button>
                          <span
                            id={`qty-${item.productId}`}
                            className="min-w-[2rem] px-2 py-1 text-center text-sm font-medium"
                          >
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              handleQuantityChange(item.productId, item.quantity + 1);
                            }}
                            disabled={updateCartItem.isPending || item.quantity >= 999}
                            aria-label={`Increase quantity of ${item.name}`}
                            className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Subtotal & Remove */}
                    <div className="flex flex-col items-end justify-between gap-2">
                      <p className="text-lg font-bold text-gray-900">
                        ₹{item.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          handleRemove(item.productId);
                        }}
                        disabled={removeCartItem.isPending}
                        aria-label={`Remove ${item.name} from cart`}
                        className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Clear Cart */}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleClearCart}
                  disabled={clearCartMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Clear Cart
                </button>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>

                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>
                      Subtotal ({String(cart.items.length)}{' '}
                      {cart.items.length === 1 ? 'item' : 'items'})
                    </span>
                    <span>₹{cart.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex justify-between text-base font-bold text-gray-900">
                    <span>Total</span>
                    <span>₹{cart.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleProceedToCheckout}
                  className="mt-6 w-full rounded-lg bg-brand-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2"
                >
                  Proceed to Checkout
                </button>

                <Link
                  to="/"
                  className="mt-3 block text-center text-sm text-brand-blue-600 hover:text-brand-blue-700"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Component;
