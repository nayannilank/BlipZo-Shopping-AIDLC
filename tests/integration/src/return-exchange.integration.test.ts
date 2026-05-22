/**
 * Integration tests for Return/Exchange flow:
 * checkout → (simulate delivery) → submit return request → verify policy snapshot
 *
 * Validates: Requirements 13.1, 13.2, 13.3, 13.5, 14.4, 15.1, 15.2, 17.3
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

import { setupAllMocks, resetAllMocks } from './helpers/aws-mocks.js';
import { mockStore } from './helpers/dynamo-mock-store.js';
import { createPostEvent, createGetEvent, withAuth } from './helpers/event-factory.js';

let checkoutHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let returnExchangeHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let getReturnExchangeHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;

const BUYER_ID = 'buyer-return-123';

describe('Return/Exchange Integration Flow', () => {
  beforeAll(async () => {
    setupAllMocks();
    const orderModule = await import('../../../services/order-service/src/handler.js');
    checkoutHandler = orderModule.checkoutHandler as unknown as typeof checkoutHandler;
    returnExchangeHandler =
      orderModule.returnExchangeHandler as unknown as typeof returnExchangeHandler;
    getReturnExchangeHandler =
      orderModule.getReturnExchangeHandler as unknown as typeof getReturnExchangeHandler;
  });

  beforeEach(() => {
    setupAllMocks();
    seedReturnData();
  });

  afterEach(() => {
    resetAllMocks();
  });

  function seedReturnData(): void {
    const productsTable = 'blipzo-test-products';
    const cartsTable = 'blipzo-test-carts';
    const addressesTable = 'blipzo-test-addresses';

    // Seed product with return policy (7-day window)
    mockStore.putItem(productsTable, {
      PK: 'PRODUCT#return-prod-1',
      SK: 'METADATA',
      productId: 'return-prod-1',
      sellerId: 'seller-1',
      name: 'Returnable Product',
      description: 'A product with a 7-day return window',
      price: 100.0,
      stockQuantity: 20,
      categories: ['electronics'],
      imageUrls: ['https://s3.amazonaws.com/blipzo-test/return-1.jpg'],
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sellerPolicy: {
        returnWindowDays: 7,
        exchangeAllowed: true,
        conditions: 'Item must be in original packaging',
        policyVersion: 'policy-return-v1',
        createdAt: new Date().toISOString(),
      },
    });

    // Seed product with no-return policy (0-day window)
    mockStore.putItem(productsTable, {
      PK: 'PRODUCT#no-return-prod',
      SK: 'METADATA',
      productId: 'no-return-prod',
      sellerId: 'seller-2',
      name: 'Non-Returnable Product',
      description: 'A product with no return policy',
      price: 50.0,
      stockQuantity: 15,
      categories: ['clothing'],
      imageUrls: ['https://s3.amazonaws.com/blipzo-test/no-return.jpg'],
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sellerPolicy: {
        returnWindowDays: 0,
        exchangeAllowed: false,
        policyVersion: 'policy-no-return-v1',
        createdAt: new Date().toISOString(),
      },
    });

    // Seed cart with returnable product
    mockStore.putItem(cartsTable, {
      PK: `BUYER#${BUYER_ID}`,
      SK: 'PRODUCT#return-prod-1',
      productId: 'return-prod-1',
      quantity: 1,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed address
    mockStore.putItem(addressesTable, {
      PK: `BUYER#${BUYER_ID}`,
      SK: 'ADDRESS#addr-return-1',
      addressId: 'addr-return-1',
      buyerId: BUYER_ID,
      fullName: 'Return Buyer',
      phone: '+919876543210',
      line1: '101 Return Street',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'IN',
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Helper: Creates an order and simulates delivery by updating status to 'Delivered'.
   */
  async function createDeliveredOrder(): Promise<string> {
    const checkoutEvent = withAuth(
      createPostEvent('/orders/checkout', {
        addressId: 'addr-return-1',
        paymentMethod: 'UPI',
      }),
      { sub: BUYER_ID, 'custom:role': 'Buyer' },
    );
    const checkoutResponse = await checkoutHandler(checkoutEvent);
    const { orderId } = JSON.parse(checkoutResponse.body) as { orderId: string };

    // Simulate delivery by updating order status
    mockStore.updateItem(
      'blipzo-test-orders',
      { PK: `ORDER#${orderId}`, SK: 'METADATA' },
      { orderStatus: 'Delivered' },
    );

    return orderId;
  }

  describe('Checkout → Simulate Delivery → Return Request → Verify Policy Snapshot', () => {
    it('should submit a return request for a delivered order within return window', async () => {
      const orderId = await createDeliveredOrder();

      const event = withAuth(
        createPostEvent(
          `/orders/${orderId}/return-exchange`,
          {
            type: 'Return',
            reason: 'Product not as described',
          },
          {
            pathParameters: { orderId },
          },
        ),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );

      const response = await returnExchangeHandler(event);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as {
        requestId: string;
        orderId: string;
        buyerId: string;
        type: string;
        status: string;
        policyVersionAtRequest: string;
      };

      expect(body.requestId).toBeDefined();
      expect(body.orderId).toBe(orderId);
      expect(body.buyerId).toBe(BUYER_ID);
      expect(body.type).toBe('Return');
      expect(body.status).toBe('Pending');
      // Verify policy snapshot
      expect(body.policyVersionAtRequest).toBe('policy-return-v1');
    });

    it('should submit an exchange request for a delivered order', async () => {
      const orderId = await createDeliveredOrder();

      const event = withAuth(
        createPostEvent(
          `/orders/${orderId}/return-exchange`,
          {
            type: 'Exchange',
            reason: 'Wrong size',
          },
          {
            pathParameters: { orderId },
          },
        ),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );

      const response = await returnExchangeHandler(event);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as { type: string; status: string };
      expect(body.type).toBe('Exchange');
      expect(body.status).toBe('Pending');
    });

    it('should reject return request for non-delivered order', async () => {
      // Create order but don't simulate delivery (status remains 'Confirmed')
      const checkoutEvent = withAuth(
        createPostEvent('/orders/checkout', {
          addressId: 'addr-return-1',
          paymentMethod: 'UPI',
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );

      // Need to re-seed cart since checkout clears it
      mockStore.putItem('blipzo-test-carts', {
        PK: `BUYER#${BUYER_ID}`,
        SK: 'PRODUCT#return-prod-1',
        productId: 'return-prod-1',
        quantity: 1,
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const checkoutResponse = await checkoutHandler(checkoutEvent);
      const { orderId } = JSON.parse(checkoutResponse.body) as { orderId: string };

      // Try to return without delivery
      const event = withAuth(
        createPostEvent(
          `/orders/${orderId}/return-exchange`,
          {
            type: 'Return',
            reason: 'Changed my mind',
          },
          {
            pathParameters: { orderId },
          },
        ),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );

      const response = await returnExchangeHandler(event);

      expect(response.statusCode).toBe(400);
    });

    it('should reject return request for non-returnable product (0-day window)', async () => {
      // Seed cart with non-returnable product
      mockStore.putItem('blipzo-test-carts', {
        PK: `BUYER#${BUYER_ID}`,
        SK: 'PRODUCT#no-return-prod',
        productId: 'no-return-prod',
        quantity: 1,
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Checkout
      const checkoutEvent = withAuth(
        createPostEvent('/orders/checkout', {
          addressId: 'addr-return-1',
          paymentMethod: 'UPI',
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const checkoutResponse = await checkoutHandler(checkoutEvent);
      const { orderId } = JSON.parse(checkoutResponse.body) as { orderId: string };

      // Simulate delivery
      mockStore.updateItem(
        'blipzo-test-orders',
        { PK: `ORDER#${orderId}`, SK: 'METADATA' },
        { orderStatus: 'Delivered' },
      );

      // Try to return
      const event = withAuth(
        createPostEvent(
          `/orders/${orderId}/return-exchange`,
          {
            type: 'Return',
            reason: 'Not satisfied',
          },
          {
            pathParameters: { orderId },
          },
        ),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );

      const response = await returnExchangeHandler(event);

      expect(response.statusCode).toBe(400);
    });

    it('should retrieve return/exchange request status', async () => {
      const orderId = await createDeliveredOrder();

      // Submit return request
      const returnEvent = withAuth(
        createPostEvent(
          `/orders/${orderId}/return-exchange`,
          {
            type: 'Return',
            reason: 'Defective item',
          },
          {
            pathParameters: { orderId },
          },
        ),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const returnResponse = await returnExchangeHandler(returnEvent);
      const { requestId } = JSON.parse(returnResponse.body) as { requestId: string };

      // Get return request status
      const getEvent = withAuth(
        createGetEvent(`/orders/return-exchange/${requestId}`, {
          pathParameters: { requestId },
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const response = await getReturnExchangeHandler(getEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        requestId: string;
        status: string;
        type: string;
        policyVersionAtRequest: string;
      };
      expect(body.requestId).toBe(requestId);
      expect(body.status).toBe('Pending');
      expect(body.type).toBe('Return');
      expect(body.policyVersionAtRequest).toBe('policy-return-v1');
    });

    it('should preserve policy snapshot even if seller updates policy later', async () => {
      const orderId = await createDeliveredOrder();

      // Submit return request (captures policy-return-v1)
      const returnEvent = withAuth(
        createPostEvent(
          `/orders/${orderId}/return-exchange`,
          {
            type: 'Return',
            reason: 'Quality issue',
          },
          {
            pathParameters: { orderId },
          },
        ),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const returnResponse = await returnExchangeHandler(returnEvent);
      const { requestId, policyVersionAtRequest } = JSON.parse(returnResponse.body) as {
        requestId: string;
        policyVersionAtRequest: string;
      };

      // Simulate seller updating the policy
      mockStore.updateItem(
        'blipzo-test-products',
        { PK: 'PRODUCT#return-prod-1', SK: 'METADATA' },
        {
          sellerPolicy: {
            returnWindowDays: 3, // Reduced window
            exchangeAllowed: false,
            policyVersion: 'policy-return-v2', // New version
            createdAt: new Date().toISOString(),
          },
        },
      );

      // Verify the return request still has the original policy version
      const getEvent = withAuth(
        createGetEvent(`/orders/return-exchange/${requestId}`, {
          pathParameters: { requestId },
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const response = await getReturnExchangeHandler(getEvent);
      const body = JSON.parse(response.body) as { policyVersionAtRequest: string };

      expect(body.policyVersionAtRequest).toBe(policyVersionAtRequest);
      expect(body.policyVersionAtRequest).toBe('policy-return-v1');
    });
  });
});
