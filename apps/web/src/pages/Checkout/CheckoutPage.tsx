import type { CheckoutRequest } from '@blipzo/shared';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAddresses } from '../../hooks/useAddress';
import { useCart } from '../../hooks/useCart';
import { useCheckout } from '../../hooks/useOrder';

type PaymentMethod = 'UPI' | 'CreditCard' | 'DebitCard' | 'CashOnDelivery';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'UPI', label: 'UPI' },
  { value: 'CreditCard', label: 'Credit Card' },
  { value: 'DebitCard', label: 'Debit Card' },
  { value: 'CashOnDelivery', label: 'Cash on Delivery' },
];

export function Component(): React.ReactElement {
  const navigate = useNavigate();
  const { data: cart, isLoading: isCartLoading } = useCart();
  const { data: addresses, isLoading: isAddressesLoading } = useAddresses();
  const checkoutMutation = useCheckout();

  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('UPI');

  // Auto-select default address when addresses load
  if (addresses && !selectedAddressId) {
    const defaultAddress = addresses.find((a) => a.isDefault);
    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.addressId);
    } else if (addresses.length > 0) {
      setSelectedAddressId(addresses[0].addressId);
    }
  }

  function handlePlaceOrder(): void {
    if (!selectedAddressId || !cart || cart.items.length === 0) return;

    const request: CheckoutRequest = {
      addressId: selectedAddressId,
      paymentMethod: selectedPaymentMethod,
    };

    checkoutMutation.mutate(request, {
      onSuccess: (order) => {
        void navigate(`/order-confirmation/${order.orderId}`, {
          state: { order },
        });
      },
    });
  }

  const isLoading = isCartLoading || isAddressesLoading;
  const canPlaceOrder =
    selectedAddressId && cart && cart.items.length > 0 && !checkoutMutation.isPending;

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
            <li>
              <Link to="/cart" className="hover:text-brand-blue-600">
                Cart
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-gray-900">Checkout</li>
          </ol>
        </nav>

        <h1 className="mb-8 text-2xl font-bold text-gray-900 sm:text-3xl">Checkout</h1>

        {isLoading && (
          <div className="animate-pulse space-y-6">
            <div className="h-40 rounded-lg bg-gray-200" />
            <div className="h-32 rounded-lg bg-gray-200" />
            <div className="h-48 rounded-lg bg-gray-200" />
          </div>
        )}

        {!isLoading && cart && cart.items.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-600">Your cart is empty.</p>
            <Link
              to="/"
              className="mt-4 inline-flex items-center rounded-lg bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-700"
            >
              Browse Products
            </Link>
          </div>
        )}

        {!isLoading && cart && cart.items.length > 0 && (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column - Address & Payment */}
            <div className="space-y-6 lg:col-span-2">
              {/* Delivery Address */}
              <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Delivery Address</h2>

                {addresses && addresses.length === 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">
                      No saved addresses found. Please add an address first.
                    </p>
                  </div>
                )}

                {addresses && addresses.length > 0 && (
                  <fieldset className="mt-4">
                    <legend className="sr-only">Select delivery address</legend>
                    <div className="space-y-3">
                      {addresses.map((address) => (
                        <label
                          key={address.addressId}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                            selectedAddressId === address.addressId
                              ? 'border-brand-blue-500 bg-brand-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="address"
                            value={address.addressId}
                            checked={selectedAddressId === address.addressId}
                            onChange={() => {
                              setSelectedAddressId(address.addressId);
                            }}
                            className="mt-1 h-4 w-4 text-brand-blue-600 focus:ring-brand-blue-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {address.fullName}
                              {address.isDefault && (
                                <span className="ml-2 inline-flex rounded-full bg-brand-blue-100 px-2 py-0.5 text-xs font-medium text-brand-blue-700">
                                  Default
                                </span>
                              )}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              {address.line1}
                              {address.line2 ? `, ${address.line2}` : ''}
                            </p>
                            <p className="text-sm text-gray-600">
                              {address.city}, {address.state} {address.postalCode}
                            </p>
                            <p className="text-sm text-gray-500">{address.phone}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
              </section>

              {/* Payment Method */}
              <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>

                <fieldset className="mt-4">
                  <legend className="sr-only">Select payment method</legend>
                  <div className="space-y-3">
                    {PAYMENT_METHODS.map((method) => (
                      <label
                        key={method.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                          selectedPaymentMethod === method.value
                            ? 'border-brand-blue-500 bg-brand-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.value}
                          checked={selectedPaymentMethod === method.value}
                          onChange={() => {
                            setSelectedPaymentMethod(method.value);
                          }}
                          className="h-4 w-4 text-brand-blue-600 focus:ring-brand-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-900">{method.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </section>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>

                <ul className="mt-4 divide-y divide-gray-100">
                  {cart.items.map((item) => (
                    <li key={item.productId} className="flex items-center gap-3 py-3">
                      <img
                        src={item.primaryImageUrl}
                        alt={item.name}
                        className="h-12 w-12 flex-shrink-0 rounded-md object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        ₹{item.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </li>
                  ))}
                </ul>

                <hr className="my-4 border-gray-200" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
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

                {/* Error Message */}
                {checkoutMutation.isError && (
                  <div className="mt-4 rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-800">
                      {checkoutMutation.error instanceof Error
                        ? checkoutMutation.error.message
                        : 'Failed to place order. Please try again.'}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={!canPlaceOrder}
                  className="mt-6 w-full rounded-lg bg-brand-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checkoutMutation.isPending ? 'Placing Order...' : 'Place Order'}
                </button>

                <Link
                  to="/cart"
                  className="mt-3 block text-center text-sm text-brand-blue-600 hover:text-brand-blue-700"
                >
                  Back to Cart
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
