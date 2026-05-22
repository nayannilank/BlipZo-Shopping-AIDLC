/**
 * Integration tests for Wishlist_Service flow:
 * add → get (enriched) → remove → verify idempotent remove
 *
 * Validates: Requirements 7.2, 7.3, 7.5, 7.6, 7.7, 15.1, 15.2
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

import { setupAllMocks, resetAllMocks } from './helpers/aws-mocks.js';
import { mockStore } from './helpers/dynamo-mock-store.js';
import {
  createPostEvent,
  createGetEvent,
  createDeleteEvent,
  withAuth,
} from './helpers/event-factory.js';

let getWishlistHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let addToWishlistHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let removeFromWishlistHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;

const BUYER_ID = 'buyer-wishlist-123';

describe('Wishlist Service Integration Flow', () => {
  beforeAll(async () => {
    setupAllMocks();
    const wishlistModule = await import('../../../services/wishlist-service/src/handler.js');
    getWishlistHandler = wishlistModule.getWishlistHandler as unknown as typeof getWishlistHandler;
    addToWishlistHandler =
      wishlistModule.addToWishlistHandler as unknown as typeof addToWishlistHandler;
    removeFromWishlistHandler =
      wishlistModule.removeFromWishlistHandler as unknown as typeof removeFromWishlistHandler;
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

    // Active product
    mockStore.putItem(productsTable, {
      PK: 'PRODUCT#prod-wish-1',
      SK: 'METADATA',
      productId: 'prod-wish-1',
      sellerId: 'seller-1',
      name: 'Wishlist Test Product',
      description: 'A product for wishlist testing',
      price: 49.99,
      stockQuantity: 20,
      categories: ['electronics'],
      imageUrls: ['https://s3.amazonaws.com/blipzo-test/wish-1.jpg'],
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Another active product
    mockStore.putItem(productsTable, {
      PK: 'PRODUCT#prod-wish-2',
      SK: 'METADATA',
      productId: 'prod-wish-2',
      sellerId: 'seller-1',
      name: 'Another Wishlist Product',
      description: 'Another product for testing',
      price: 79.99,
      stockQuantity: 10,
      categories: ['clothing'],
      imageUrls: ['https://s3.amazonaws.com/blipzo-test/wish-2.jpg'],
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Deleted product (should show as unavailable in wishlist)
    mockStore.putItem(productsTable, {
      PK: 'PRODUCT#prod-wish-deleted',
      SK: 'METADATA',
      productId: 'prod-wish-deleted',
      sellerId: 'seller-1',
      name: 'Deleted Wishlist Product',
      description: 'This product was deleted',
      price: 19.99,
      stockQuantity: 0,
      categories: ['electronics'],
      imageUrls: [],
      isDeleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed wishlist counter item
    mockStore.putItem('blipzo-test-wishlists', {
      PK: `BUYER#${BUYER_ID}`,
      SK: 'COUNT',
      count: 0,
    });
  }

  describe('Add → Get (Enriched) → Remove → Idempotent Remove', () => {
    it('should add a product to the wishlist', async () => {
      const event = withAuth(createPostEvent('/wishlist/items', { productId: 'prod-wish-1' }), {
        sub: BUYER_ID,
        'custom:role': 'Buyer',
      });

      const response = await addToWishlistHandler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        items: Array<{ productId: string }>;
        count: number;
      };
      expect(body.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should return enriched wishlist with product details', async () => {
      // Add product to wishlist
      const addEvent = withAuth(createPostEvent('/wishlist/items', { productId: 'prod-wish-1' }), {
        sub: BUYER_ID,
        'custom:role': 'Buyer',
      });
      await addToWishlistHandler(addEvent);

      // Get wishlist
      const getEvent = withAuth(createGetEvent('/wishlist'), {
        sub: BUYER_ID,
        'custom:role': 'Buyer',
      });
      const response = await getWishlistHandler(getEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        buyerId: string;
        items: Array<{
          productId: string;
          name: string;
          price: number;
          primaryImageUrl: string;
          isAvailable: boolean;
        }>;
        count: number;
      };

      expect(body.buyerId).toBe(BUYER_ID);
      expect(body.items.length).toBeGreaterThanOrEqual(1);

      const item = body.items.find((i) => i.productId === 'prod-wish-1');
      expect(item).toBeDefined();
      expect(item!.name).toBe('Wishlist Test Product');
      expect(item!.price).toBe(49.99);
      expect(item!.isAvailable).toBe(true);
    });

    it('should handle idempotent add (no duplicates)', async () => {
      // Add same product twice (fresh events each time)
      const addEvent1 = withAuth(createPostEvent('/wishlist/items', { productId: 'prod-wish-1' }), {
        sub: BUYER_ID,
        'custom:role': 'Buyer',
      });
      await addToWishlistHandler(addEvent1);

      const addEvent2 = withAuth(createPostEvent('/wishlist/items', { productId: 'prod-wish-1' }), {
        sub: BUYER_ID,
        'custom:role': 'Buyer',
      });
      const response = await addToWishlistHandler(addEvent2);

      expect(response.statusCode).toBe(200);

      // Get wishlist and verify no duplicates
      const getEvent = withAuth(createGetEvent('/wishlist'), {
        sub: BUYER_ID,
        'custom:role': 'Buyer',
      });
      const getResponse = await getWishlistHandler(getEvent);
      const body = JSON.parse(getResponse.body) as {
        items: Array<{ productId: string }>;
      };

      const matchingItems = body.items.filter((i) => i.productId === 'prod-wish-1');
      expect(matchingItems.length).toBe(1);
    });

    it('should remove a product from the wishlist', async () => {
      // Add product
      const addEvent = withAuth(createPostEvent('/wishlist/items', { productId: 'prod-wish-1' }), {
        sub: BUYER_ID,
        'custom:role': 'Buyer',
      });
      await addToWishlistHandler(addEvent);

      // Remove product
      const removeEvent = withAuth(
        createDeleteEvent('/wishlist/items/prod-wish-1', {
          pathParameters: { productId: 'prod-wish-1' },
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const response = await removeFromWishlistHandler(removeEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        items: Array<{ productId: string }>;
      };
      const removedItem = body.items.find((i) => i.productId === 'prod-wish-1');
      expect(removedItem).toBeUndefined();
    });

    it('should handle idempotent remove (no error for non-existent item)', async () => {
      // Remove a product that's not in the wishlist
      const removeEvent = withAuth(
        createDeleteEvent('/wishlist/items/prod-wish-2', {
          pathParameters: { productId: 'prod-wish-2' },
        }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );
      const response = await removeFromWishlistHandler(removeEvent);

      // Should succeed without error (idempotent)
      expect(response.statusCode).toBe(200);
    });

    it('should return 404 when adding non-existent product', async () => {
      const event = withAuth(
        createPostEvent('/wishlist/items', { productId: 'non-existent-product' }),
        { sub: BUYER_ID, 'custom:role': 'Buyer' },
      );

      const response = await addToWishlistHandler(event);

      expect(response.statusCode).toBe(404);
    });

    it('should mark deleted products as unavailable in wishlist', async () => {
      // Manually add a deleted product to the wishlist (simulating it was added before deletion)
      mockStore.putItem('blipzo-test-wishlists', {
        PK: `BUYER#${BUYER_ID}`,
        SK: 'PRODUCT#prod-wish-deleted',
        productId: 'prod-wish-deleted',
        addedAt: new Date().toISOString(),
      });

      // Get wishlist
      const getEvent = withAuth(createGetEvent('/wishlist'), {
        sub: BUYER_ID,
        'custom:role': 'Buyer',
      });
      const response = await getWishlistHandler(getEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        items: Array<{ productId: string; isAvailable: boolean }>;
      };

      const deletedItem = body.items.find((i) => i.productId === 'prod-wish-deleted');
      expect(deletedItem).toBeDefined();
      expect(deletedItem!.isAvailable).toBe(false);
    });
  });
});
