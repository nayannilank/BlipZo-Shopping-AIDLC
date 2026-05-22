/**
 * Integration tests for Product_Service flow:
 * create product → update product → delete product → verify soft-delete
 *
 * Validates: Requirements 5.1, 5.3, 5.5, 15.1, 15.2
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

import { setupAllMocks, resetAllMocks } from './helpers/aws-mocks.js';
import { mockStore } from './helpers/dynamo-mock-store.js';
import {
  createPostEvent,
  createPatchEvent,
  createDeleteEvent,
  withAuth,
} from './helpers/event-factory.js';

let createProductHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let updateProductHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let deleteProductHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let _listSellerProductsHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let setSellerPolicyHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;

const SELLER_ID = 'seller-123';
const OTHER_SELLER_ID = 'seller-456';

describe('Product Service Integration Flow', () => {
  beforeAll(async () => {
    setupAllMocks();
    const productModule = await import('../../../services/product-service/src/handler.js');
    createProductHandler =
      productModule.createProductHandler as unknown as typeof createProductHandler;
    updateProductHandler =
      productModule.updateProductHandler as unknown as typeof updateProductHandler;
    deleteProductHandler =
      productModule.deleteProductHandler as unknown as typeof deleteProductHandler;
    _listSellerProductsHandler =
      productModule.listSellerProductsHandler as unknown as typeof _listSellerProductsHandler;
    setSellerPolicyHandler =
      productModule.setSellerPolicyHandler as unknown as typeof setSellerPolicyHandler;
  });

  beforeEach(() => {
    setupAllMocks();
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Create → Update → Delete → Verify Soft-Delete', () => {
    const validProduct = {
      name: 'Test Product',
      description: 'A high-quality test product for integration testing',
      price: 29.99,
      stockQuantity: 100,
      categories: ['electronics'],
      images: [
        {
          filename: 'product1.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 1024000,
        },
      ],
    };

    it('should create a product with all required fields', async () => {
      const event = withAuth(
        createPostEvent('/products', validProduct, {
          headers: { 'x-user-role': 'Seller' },
        }),
        { sub: SELLER_ID, 'custom:role': 'Seller' },
      );

      const response = await createProductHandler(event);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as {
        productId: string;
        name: string;
        price: number;
        sellerId: string;
        uploadUrls: Array<{ filename: string; uploadUrl: string }>;
      };

      expect(body.productId).toBeDefined();
      expect(body.name).toBe('Test Product');
      expect(body.price).toBe(29.99);
      expect(body.sellerId).toBe(SELLER_ID);
      expect(body.uploadUrls).toHaveLength(1);
    });

    it('should update a product with partial fields', async () => {
      // Create product first
      const createEvent = withAuth(createPostEvent('/products', validProduct), {
        sub: SELLER_ID,
        'custom:role': 'Seller',
      });
      const createResponse = await createProductHandler(createEvent);
      const product = JSON.parse(createResponse.body) as {
        productId: string;
      };

      // Update only the price
      const updateEvent = withAuth(
        createPatchEvent(
          `/products/${product.productId}`,
          { price: 39.99 },
          {
            pathParameters: { productId: product.productId },
          },
        ),
        { sub: SELLER_ID, 'custom:role': 'Seller' },
      );
      const response = await updateProductHandler(updateEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { price: number; name: string };
      expect(body.price).toBe(39.99);
      expect(body.name).toBe('Test Product'); // Unchanged
    });

    it('should reject update from non-owner seller', async () => {
      // Create product as SELLER_ID
      const createEvent = withAuth(createPostEvent('/products', validProduct), {
        sub: SELLER_ID,
        'custom:role': 'Seller',
      });
      const createResponse = await createProductHandler(createEvent);
      const product = JSON.parse(createResponse.body) as {
        productId: string;
      };

      // Try to update as OTHER_SELLER_ID
      const updateEvent = withAuth(
        createPatchEvent(
          `/products/${product.productId}`,
          { price: 99.99 },
          {
            pathParameters: { productId: product.productId },
          },
        ),
        { sub: OTHER_SELLER_ID, 'custom:role': 'Seller' },
      );
      const response = await updateProductHandler(updateEvent);

      expect(response.statusCode).toBe(403);
    });

    it('should soft-delete a product (isDeleted = true)', async () => {
      // Create product
      const createEvent = withAuth(createPostEvent('/products', validProduct), {
        sub: SELLER_ID,
        'custom:role': 'Seller',
      });
      const createResponse = await createProductHandler(createEvent);
      const product = JSON.parse(createResponse.body) as {
        productId: string;
      };

      // Delete product
      const deleteEvent = withAuth(
        createDeleteEvent(`/products/${product.productId}`, {
          pathParameters: { productId: product.productId },
        }),
        { sub: SELLER_ID, 'custom:role': 'Seller' },
      );
      const response = await deleteProductHandler(deleteEvent);

      expect(response.statusCode).toBe(200);

      // Verify soft-delete: item still exists in DynamoDB with isDeleted = true
      const item = mockStore.getItem('blipzo-test-products', {
        PK: `PRODUCT#${product.productId}`,
        SK: 'METADATA',
      });

      expect(item).toBeDefined();
      expect(item!['isDeleted']).toBe(true);
    });

    it('should reject delete from non-owner seller', async () => {
      // Create product as SELLER_ID
      const createEvent = withAuth(createPostEvent('/products', validProduct), {
        sub: SELLER_ID,
        'custom:role': 'Seller',
      });
      const createResponse = await createProductHandler(createEvent);
      const product = JSON.parse(createResponse.body) as {
        productId: string;
      };

      // Try to delete as OTHER_SELLER_ID
      const deleteEvent = withAuth(
        createDeleteEvent(`/products/${product.productId}`, {
          pathParameters: { productId: product.productId },
        }),
        { sub: OTHER_SELLER_ID, 'custom:role': 'Seller' },
      );
      const response = await deleteProductHandler(deleteEvent);

      expect(response.statusCode).toBe(403);
    });

    it('should set seller policy on a product', async () => {
      // Create product
      const createEvent = withAuth(createPostEvent('/products', validProduct), {
        sub: SELLER_ID,
        'custom:role': 'Seller',
      });
      const createResponse = await createProductHandler(createEvent);
      const product = JSON.parse(createResponse.body) as {
        productId: string;
      };

      // Set policy
      const policyEvent = withAuth(
        createPostEvent(
          `/products/${product.productId}/policy`,
          {
            returnWindowDays: 7,
            exchangeAllowed: true,
            conditions: 'Item must be unused',
          },
          {
            pathParameters: { productId: product.productId },
          },
        ),
        { sub: SELLER_ID, 'custom:role': 'Seller' },
      );
      const response = await setSellerPolicyHandler(policyEvent);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        sellerPolicy: {
          returnWindowDays: number;
          exchangeAllowed: boolean;
          policyVersion: string;
        };
      };
      expect(body.sellerPolicy.returnWindowDays).toBe(7);
      expect(body.sellerPolicy.exchangeAllowed).toBe(true);
      expect(body.sellerPolicy.policyVersion).toBeDefined();
    });
  });
});
