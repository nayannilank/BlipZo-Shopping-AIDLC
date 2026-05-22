/**
 * Integration tests for Checkout flow:
 * add to cart → checkout → verify order record → cancel → verify refund status
 *
 * Validates: Requirements 10.1, 10.2, 10.6, 12.4, 12.5, 15.1, 15.2, 17.3
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

import { setupAllMocks, resetAllMocks, setPaymentShouldFail } from './helpers/aws-mocks.js';
import { mockStore } from './helpers/dynamo-mock-store.js';
import { createPostEvent, createGetEvent, withAuth } from './helpers/event-factory.js';

let checkoutHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let getOrderDetailHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let cancelOrderHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let _getOrderHistoryHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;

const BUYER_ID = 'buyer-checkout-123';

describe('Checkout and Order Integration Flow', () => {
  beforeAll(async () => {
    setupAllMocks();
    const orderModule = await import('../../../services/order-service/src/handler.js');
    checkoutHandler = orderModule.checkoutHandler as unknown as typeof checkoutHandler;
    getOrderDetailHandler =
      orderModule.orderDetailHandler as unknown as typeof getOrderDetailHandler;
    cancelOrderHandler = orderModule.cancelOrderHandler as unknown as typeof cancelOrderHandler;
    _getOrderHistoryHandler =
      orderModule.orderHistoryHandler as unknown as typeof _getOrderHistoryHandler;
  });

  beforeEach(() => {
    setupAllMocks();
    seedCheckoutData();
  });

  afterEach(() => {
    resetAllMocks();
  });

  function seedCheckoutData(): void {
    const productsTable = 'blipzo-test-products';
    const cartsTable = 'blipzo-test-carts';
    const addressesTable = 'blipzo-test-addresses';

    // Seed products
    mockStore.putItem(productsTable, {
      PK: 'PRODUCT#checkout-prod-1',
      SK: 'METADATA',
      productId: 'checkout-prod-1',
      sellerId: 'seller-1',
      name: 'Checkout Product One',
      description: 'Product for checkout testing',
      price: 50.0,
      stockQuantity: 10,
      categories: ['electronics'],
      imageUrls: ['https://s3.amazonaws.com/blipzo-test/checkout-1.jpg'],
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sellerPolicy: {
        returnWindowDays: 7,
        exchangeAllowed: true,
        conditions: 'Item must be unused',
        policyVersion: 'policy-v1',
        createdAt: new Date().toISOString(),
      },
    });

    mockStore.putItem(productsTable, {
      PK: 'PRODUCT#checkout-prod-2',
      SK: 'METADATA',
      productId: 'checkout-prod-2',
      sellerId: 'seller-1',
      name: 'Checkout Product Two',
      description: 'Another product for checkout',
      price: 30.0,
      stockQuantity: 5,
      categories: ['clothing'],
      imageUrls: ['https://s3.amazonaws.com/blipzo-test/checkout-2.jpg'],
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sellerPolicy: {
        returnWindowDays: 14,
        exchangeAllowed: true,
        policyVersion: 'policy-v2',
        createdAt: new Date().toISOString(),
      },
    });

    // Seed cart items
    mockStore.putItem(cartsTable, {
      PK: `BUYER#${BUYER_ID}`,
      SK: 'PRODUCT#checkout-prod-1',
      productId: 'checkout-prod-1',
      quantity: 2,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    mockStore.putItem(cartsTable, {
      PK: `BUYER#${BUYER_ID}`,
      SK: 'PRODUCT#checkout-prod-2',
      productId: 'checkout-prod-2',
      quantity: 1,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed address
    mockStore.putItem(addressesTable, {
      PK: `BUYER#${BUYER_ID}`,
      SK: 'ADDRESS#addr-checkout-1',
      addressId: 'addr-checkout-1',
      buyerId: BUYER_ID,
      fullName: 'Checkout Buyer',
      phone: '+919876543210',
      line1: '789 Checkout Lane',
      city: 'Delhi',
      state: 'Delhi',
      postalCode: '110001',
      country: 'IN',
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  describe('Add to Cart → Checkout → Verify Order → Cancel → Verify Refund', () => {
    it('should checkout successfully with UPI payment', async () => {
      const event = withAuth(
        createPostEvent('/orders/checkout', {
          addressId: 'addr-checkout-1',
          paymentMethod: 'UPI',
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );

      const response = await checkoutHandler(event);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as {
        orderId: string;
        buyerId: string;
        orderStatus: string;
        paymentStatus: string;
        paymentMethod: string;
        totalAmount: number;
        items: Array<{ productId: string; quantity: number; priceAtPurchase: number }>;
        deliveryAddressSnapshot: { fullName: string; city: string };
        transactionId?: string;
      };

      expect(body.orderId).toBeDefined();
      expect(body.buyerId).toBe(BUYER_ID);
      expect(body.orderStatus).toBe('Confirmed');
      expect(body.paymentStatus).toBe('Paid');
      expect(body.paymentMethod).toBe('UPI');
      expect(body.totalAmount).toBe(130.0); // (50*2) + (30*1)
      expect(body.items).toHaveLength(2);
      expect(body.transactionId).toBeDefined();
      expect(body.deliveryAddressSnapshot.fullName).toBe('Checkout Buyer');
      expect(body.deliveryAddressSnapshot.city).toBe('Delhi');
    });

    it('should set paymentStatus to Pending for Cash on Delivery', async () => {
      const event = withAuth(
        createPostEvent('/orders/checkout', {
          addressId: 'addr-checkout-1',
          paymentMethod: 'CashOnDelivery',
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );

      const response = await checkoutHandler(event);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as {
        paymentStatus: string;
        transactionId?: string;
      };
      expect(body.paymentStatus).toBe('Pending');
    });

    it('should decrement stock after successful checkout', async () => {
      const event = withAuth(
        createPostEvent('/orders/checkout', {
          addressId: 'addr-checkout-1',
          paymentMethod: 'CreditCard',
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );

      await checkoutHandler(event);

      // Verify stock was decremented
      const prod1 = mockStore.getItem('blipzo-test-products', {
        PK: 'PRODUCT#checkout-prod-1',
        SK: 'METADATA',
      });
      expect(prod1!['stockQuantity']).toBe(8); // 10 - 2

      const prod2 = mockStore.getItem('blipzo-test-products', {
        PK: 'PRODUCT#checkout-prod-2',
        SK: 'METADATA',
      });
      expect(prod2!['stockQuantity']).toBe(4); // 5 - 1
    });

    it('should clear cart after successful checkout', async () => {
      const event = withAuth(
        createPostEvent('/orders/checkout', {
          addressId: 'addr-checkout-1',
          paymentMethod: 'UPI',
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );

      await checkoutHandler(event);

      // Verify cart is empty
      const cartItems = mockStore.query('blipzo-test-carts', `BUYER#${BUYER_ID}`, 'PRODUCT#');
      expect(cartItems.length).toBe(0);
    });

    it('should reject checkout with insufficient stock', async () => {
      // Set stock to 1 for prod-1 (cart has quantity 2)
      mockStore.updateItem(
        'blipzo-test-products',
        { PK: 'PRODUCT#checkout-prod-1', SK: 'METADATA' },
        { stockQuantity: 1 },
      );

      const event = withAuth(
        createPostEvent('/orders/checkout', {
          addressId: 'addr-checkout-1',
          paymentMethod: 'UPI',
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );

      const response = await checkoutHandler(event);

      expect(response.statusCode).toBe(400);
    });

    it('should reject checkout when payment fails', async () => {
      setPaymentShouldFail(true);

      const event = withAuth(
        createPostEvent('/orders/checkout', {
          addressId: 'addr-checkout-1',
          paymentMethod: 'UPI',
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );

      const response = await checkoutHandler(event);

      expect(response.statusCode).toBe(402);
    });

    it('should cancel a confirmed order and set refund status', async () => {
      // First checkout
      const checkoutEvent = withAuth(
        createPostEvent('/orders/checkout', {
          addressId: 'addr-checkout-1',
          paymentMethod: 'CreditCard',
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const checkoutResponse = await checkoutHandler(checkoutEvent);
      const { orderId } = JSON.parse(checkoutResponse.body) as { orderId: string };

      // Cancel the order
      const cancelEvent = withAuth(
        createPostEvent(
          `/orders/${orderId}/cancel`,
          {},
          {
            pathParameters: { orderId },
          },
        ),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const cancelResponse = await cancelOrderHandler(cancelEvent);

      expect(cancelResponse.statusCode).toBe(200);
      const body = JSON.parse(cancelResponse.body) as {
        orderId: string;
        orderStatus: string;
        refundStatus: string;
      };
      expect(body.orderStatus).toBe('Cancelled');
      expect(body.refundStatus).toBe('Completed');
    });

    it('should reject cancellation of non-cancellable order status', async () => {
      // Create an order and manually set it to 'Shipped'
      const checkoutEvent = withAuth(
        createPostEvent('/orders/checkout', {
          addressId: 'addr-checkout-1',
          paymentMethod: 'UPI',
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const checkoutResponse = await checkoutHandler(checkoutEvent);
      const { orderId } = JSON.parse(checkoutResponse.body) as { orderId: string };

      // Manually update order status to 'Shipped'
      mockStore.updateItem(
        'blipzo-test-orders',
        { PK: `ORDER#${orderId}`, SK: 'METADATA' },
        { orderStatus: 'Shipped' },
      );

      // Try to cancel
      const cancelEvent = withAuth(
        createPostEvent(
          `/orders/${orderId}/cancel`,
          {},
          {
            pathParameters: { orderId },
          },
        ),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const response = await cancelOrderHandler(cancelEvent);

      expect(response.statusCode).toBe(400);
    });

    it('should retrieve order detail after checkout', async () => {
      // Checkout
      const checkoutEvent = withAuth(
        createPostEvent('/orders/checkout', {
          addressId: 'addr-checkout-1',
          paymentMethod: 'DebitCard',
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const checkoutResponse = await checkoutHandler(checkoutEvent);
      const { orderId } = JSON.parse(checkoutResponse.body) as { orderId: string };

      // Get order detail
      const detailEvent = withAuth(
        createGetEvent(`/orders/${orderId}`, {
          pathParameters: { orderId },
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const response = await getOrderDetailHandler(detailEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        orderId: string;
        buyerId: string;
        orderStatus: string;
        items: Array<{ productId: string }>;
      };
      expect(body.orderId).toBe(orderId);
      expect(body.buyerId).toBe(BUYER_ID);
      expect(body.orderStatus).toBe('Confirmed');
      expect(body.items.length).toBe(2);
    });

    it('should return 404 when buyer tries to access another buyer order', async () => {
      // Checkout as BUYER_ID
      const checkoutEvent = withAuth(
        createPostEvent('/orders/checkout', {
          addressId: 'addr-checkout-1',
          paymentMethod: 'UPI',
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const checkoutResponse = await checkoutHandler(checkoutEvent);
      const { orderId } = JSON.parse(checkoutResponse.body) as { orderId: string };

      // Try to access as different buyer
      const detailEvent = withAuth(
        createGetEvent(`/orders/${orderId}`, {
          pathParameters: { orderId },
        }),
        { sub: 'other-buyer-456', 'custom:role': 'Buyer' },
      );
      const response = await getOrderDetailHandler(detailEvent);

      expect(response.statusCode).toBe(404);
    });
  });
});
