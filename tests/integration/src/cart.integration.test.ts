/**
 * Integration tests for Cart_Service flow:
 * add items → get cart with totals → clear cart
 *
 * Validates: Requirements 8.1, 8.2, 8.5, 8.6, 15.1, 15.2
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

import { setupAllMocks, resetAllMocks } from './helpers/aws-mocks.js';
import { mockStore } from './helpers/dynamo-mock-store.js';
import {
  createPutEvent,
  createGetEvent,
  createDeleteEvent,
  withAuth,
} from './helpers/event-factory.js';

let putCartItemHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let getCartHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let _removeCartItemHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let clearCartHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;

const BUYER_ID = 'buyer-cart-123';

describe('Cart Service Integration Flow', () => {
  beforeAll(async () => {
    setupAllMocks();
    const cartModule = await import('../../../services/cart-service/src/handler.js');
    putCartItemHandler = cartModule.putCartItemHandler as unknown as typeof putCartItemHandler;
    getCartHandler = cartModule.getCartHandler as unknown as typeof getCartHandler;
    _removeCartItemHandler =
      cartModule.removeCartItemHandler as unknown as typeof _removeCartItemHandler;
    clearCartHandler = cartModule.clearCartHandler as unknown as typeof clearCartHandler;
  });

  beforeEach(() => {
    setupAllMocks();
    seedProductData();
  });

  afterEach(() => {
    resetAllMocks();
  });

  function seedProductData(): void {
    const productsTable = 'blipzo-test-products';

    mockStore.putItem(productsTable, {
      PK: 'PRODUCT#cart-prod-1',
      SK: 'METADATA',
      productId: 'cart-prod-1',
      sellerId: 'seller-1',
      name: 'Cart Product One',
      description: 'First product for cart testing',
      price: 25.5,
      stockQuantity: 100,
      categories: ['electronics'],
      imageUrls: ['https://s3.amazonaws.com/blipzo-test/cart-1.jpg'],
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    mockStore.putItem(productsTable, {
      PK: 'PRODUCT#cart-prod-2',
      SK: 'METADATA',
      productId: 'cart-prod-2',
      sellerId: 'seller-1',
      name: 'Cart Product Two',
      description: 'Second product for cart testing',
      price: 15.75,
      stockQuantity: 50,
      categories: ['clothing'],
      imageUrls: ['https://s3.amazonaws.com/blipzo-test/cart-2.jpg'],
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    mockStore.putItem(productsTable, {
      PK: 'PRODUCT#cart-prod-low-stock',
      SK: 'METADATA',
      productId: 'cart-prod-low-stock',
      sellerId: 'seller-1',
      name: 'Low Stock Product',
      description: 'Product with very low stock',
      price: 99.99,
      stockQuantity: 2,
      categories: ['electronics'],
      imageUrls: ['https://s3.amazonaws.com/blipzo-test/low-stock.jpg'],
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  describe('Add Items → Get Cart with Totals → Clear Cart', () => {
    it('should add an item to the cart', async () => {
      const event = withAuth(
        createPutEvent('/cart/items', { productId: 'cart-prod-1', quantity: 2 }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );

      const response = await putCartItemHandler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        buyerId: string;
        items: Array<{ productId: string; quantity: number }>;
        total: number;
      };
      expect(body.buyerId).toBe(BUYER_ID);
      expect(body.items.length).toBe(1);
      expect(body.items[0]!.productId).toBe('cart-prod-1');
      expect(body.items[0]!.quantity).toBe(2);
    });

    it('should replace quantity on re-add (not accumulate)', async () => {
      // Add with quantity 2
      const event1 = withAuth(
        createPutEvent('/cart/items', { productId: 'cart-prod-1', quantity: 2 }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      await putCartItemHandler(event1);

      // Add again with quantity 5 — should replace, not add
      const event2 = withAuth(
        createPutEvent('/cart/items', { productId: 'cart-prod-1', quantity: 5 }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const response = await putCartItemHandler(event2);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        items: Array<{ productId: string; quantity: number }>;
      };
      const item = body.items.find((i) => i.productId === 'cart-prod-1');
      expect(item!.quantity).toBe(5);
    });

    it('should get cart with correct totals and enriched data', async () => {
      // Add two products
      const event1 = withAuth(
        createPutEvent('/cart/items', { productId: 'cart-prod-1', quantity: 3 }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      await putCartItemHandler(event1);

      const event2 = withAuth(
        createPutEvent('/cart/items', { productId: 'cart-prod-2', quantity: 2 }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      await putCartItemHandler(event2);

      // Get cart
      const getEvent = withAuth(createGetEvent('/cart'), { sub: BUYER_ID, 'custom:role': 'Buyer' });
      const response = await getCartHandler(getEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        buyerId: string;
        items: Array<{
          productId: string;
          name: string;
          price: number;
          quantity: number;
          subtotal: number;
        }>;
        total: number;
      };

      expect(body.buyerId).toBe(BUYER_ID);
      expect(body.items.length).toBe(2);

      // Verify enriched data
      const item1 = body.items.find((i) => i.productId === 'cart-prod-1');
      expect(item1).toBeDefined();
      expect(item1!.name).toBe('Cart Product One');
      expect(item1!.price).toBe(25.5);
      expect(item1!.quantity).toBe(3);
      expect(item1!.subtotal).toBe(76.5); // 25.50 * 3

      const item2 = body.items.find((i) => i.productId === 'cart-prod-2');
      expect(item2).toBeDefined();
      expect(item2!.name).toBe('Cart Product Two');
      expect(item2!.price).toBe(15.75);
      expect(item2!.quantity).toBe(2);
      expect(item2!.subtotal).toBe(31.5); // 15.75 * 2

      // Total = 76.50 + 31.50 = 108.00
      expect(body.total).toBe(108.0);
    });

    it('should remove item when quantity is set to 0', async () => {
      // Add item
      const addEvent = withAuth(
        createPutEvent('/cart/items', { productId: 'cart-prod-1', quantity: 2 }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      await putCartItemHandler(addEvent);

      // Set quantity to 0 (removes item)
      const removeEvent = withAuth(
        createPutEvent('/cart/items', { productId: 'cart-prod-1', quantity: 0 }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const response = await putCartItemHandler(removeEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        items: Array<{ productId: string }>;
        total: number;
      };
      expect(body.items.length).toBe(0);
      expect(body.total).toBe(0);
    });

    it('should reject quantity exceeding stock', async () => {
      const event = withAuth(
        createPutEvent('/cart/items', { productId: 'cart-prod-low-stock', quantity: 10 }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );

      const response = await putCartItemHandler(event);

      expect(response.statusCode).toBe(400);
    });

    it('should clear the entire cart', async () => {
      // Add items
      const event1 = withAuth(
        createPutEvent('/cart/items', { productId: 'cart-prod-1', quantity: 1 }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      await putCartItemHandler(event1);

      const event2 = withAuth(
        createPutEvent('/cart/items', { productId: 'cart-prod-2', quantity: 1 }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      await putCartItemHandler(event2);

      // Clear cart
      const clearEvent = withAuth(createDeleteEvent('/cart'), {
        sub: BUYER_ID,
        'custom:role': 'Buyer',
      });
      const response = await clearCartHandler(clearEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        items: unknown[];
        total: number;
      };
      expect(body.items).toHaveLength(0);
      expect(body.total).toBe(0);
    });

    it('should return 404 for non-existent product', async () => {
      const event = withAuth(
        createPutEvent('/cart/items', { productId: 'non-existent', quantity: 1 }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );

      const response = await putCartItemHandler(event);

      expect(response.statusCode).toBe(404);
    });
  });
});
