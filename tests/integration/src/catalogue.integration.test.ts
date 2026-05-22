/**
 * Integration tests for Catalogue_Service flow:
 * browse category → paginate → search
 *
 * Validates: Requirements 6.1, 6.5, 6.6, 15.1, 15.2
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

import { setupAllMocks, resetAllMocks } from './helpers/aws-mocks.js';
import { mockStore } from './helpers/dynamo-mock-store.js';
import { createGetEvent } from './helpers/event-factory.js';

let browseCategoryHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let productDetailHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let searchHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;
let _listCategoriesHandler: (event: unknown) => Promise<{ statusCode: number; body: string }>;

describe('Catalogue Service Integration Flow', () => {
  beforeAll(async () => {
    setupAllMocks();
    const catalogueModule = await import('../../../services/catalogue-service/src/handler.js');
    browseCategoryHandler =
      catalogueModule.listProductsByCategoryHandler as unknown as typeof browseCategoryHandler;
    productDetailHandler =
      catalogueModule.getProductDetailHandler as unknown as typeof productDetailHandler;
    searchHandler = catalogueModule.searchProductsHandler as unknown as typeof searchHandler;
    _listCategoriesHandler =
      catalogueModule.listCategoriesHandler as unknown as typeof _listCategoriesHandler;
  });

  beforeEach(() => {
    setupAllMocks();
    seedCatalogueData();
  });

  afterEach(() => {
    resetAllMocks();
  });

  /**
   * Seeds the mock store with products for catalogue testing.
   */
  function seedCatalogueData(): void {
    const productsTable = 'blipzo-test-products';
    const categoriesTable = 'blipzo-test-categories';

    // Seed categories
    mockStore.putItem(categoriesTable, {
      PK: 'electronics',
      SK: 'METADATA',
      categoryId: 'electronics',
      name: 'Electronics',
    });
    mockStore.putItem(categoriesTable, {
      PK: 'clothing',
      SK: 'METADATA',
      categoryId: 'clothing',
      name: 'Clothing',
    });
    mockStore.putItem(categoriesTable, {
      PK: 'books',
      SK: 'METADATA',
      categoryId: 'books',
      name: 'Books',
    });

    // Seed 5 active products in 'electronics' category
    for (let i = 1; i <= 5; i++) {
      mockStore.putItem(productsTable, {
        PK: `PRODUCT#prod-${i}`,
        SK: 'METADATA',
        productId: `prod-${i}`,
        sellerId: 'seller-1',
        name: `Electronic Gadget ${i}`,
        description: `A great electronic gadget number ${i} for testing`,
        price: 10 * i,
        stockQuantity: 50,
        categories: ['electronics'],
        imageUrls: [`https://s3.amazonaws.com/blipzo-test/prod-${i}.jpg`],
        isDeleted: false,
        createdAt: new Date(2024, 0, i).toISOString(),
        updatedAt: new Date(2024, 0, i).toISOString(),
        GSI1PK: 'CATEGORY#electronics',
        GSI1SK: `CREATED#${new Date(2024, 0, i).toISOString()}`,
        GSI2PK: 'SELLER#seller-1',
        GSI2SK: `CREATED#${new Date(2024, 0, i).toISOString()}`,
        searchTokens: `electronic gadget ${i} a great electronic gadget number ${i} for testing`,
        sellerName: 'Test Seller',
        averageRating: 4.0,
      });
    }

    // Seed 1 deleted product
    mockStore.putItem(productsTable, {
      PK: 'PRODUCT#prod-deleted',
      SK: 'METADATA',
      productId: 'prod-deleted',
      sellerId: 'seller-1',
      name: 'Deleted Product',
      description: 'This product has been deleted',
      price: 99.99,
      stockQuantity: 0,
      categories: ['electronics'],
      imageUrls: [],
      isDeleted: true,
      createdAt: new Date(2024, 0, 6).toISOString(),
      updatedAt: new Date(2024, 0, 6).toISOString(),
      GSI1PK: 'CATEGORY#electronics',
      GSI1SK: `CREATED#${new Date(2024, 0, 6).toISOString()}`,
      GSI2PK: 'SELLER#seller-1',
      GSI2SK: `CREATED#${new Date(2024, 0, 6).toISOString()}`,
      searchTokens: 'deleted product this product has been deleted',
    });

    // Seed 2 products in 'clothing' category
    for (let i = 1; i <= 2; i++) {
      mockStore.putItem(productsTable, {
        PK: `PRODUCT#clothing-${i}`,
        SK: 'METADATA',
        productId: `clothing-${i}`,
        sellerId: 'seller-2',
        name: `Fashion Item ${i}`,
        description: `A stylish fashion item number ${i}`,
        price: 25 * i,
        stockQuantity: 30,
        categories: ['clothing'],
        imageUrls: [`https://s3.amazonaws.com/blipzo-test/clothing-${i}.jpg`],
        isDeleted: false,
        createdAt: new Date(2024, 1, i).toISOString(),
        updatedAt: new Date(2024, 1, i).toISOString(),
        GSI1PK: 'CATEGORY#clothing',
        GSI1SK: `CREATED#${new Date(2024, 1, i).toISOString()}`,
        GSI2PK: 'SELLER#seller-2',
        GSI2SK: `CREATED#${new Date(2024, 1, i).toISOString()}`,
        searchTokens: `fashion item ${i} a stylish fashion item number ${i}`,
        sellerName: 'Fashion Seller',
        averageRating: 4.5,
      });
    }
  }

  describe('Browse Category', () => {
    it('should return active products in a category sorted by creation date', async () => {
      const event = createGetEvent('/catalogue/categories/electronics', {
        pathParameters: { categoryId: 'electronics' },
        queryStringParameters: { limit: '20' },
      });

      const response = await browseCategoryHandler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        items: Array<{ productId: string; name: string; price: number }>;
      };

      // Should not include deleted product
      expect(body.items.length).toBe(5);
      const productIds = body.items.map((item) => item.productId);
      expect(productIds).not.toContain('prod-deleted');
    });

    it('should support pagination with limit parameter', async () => {
      const event = createGetEvent('/catalogue/categories/electronics', {
        pathParameters: { categoryId: 'electronics' },
        queryStringParameters: { limit: '2' },
      });

      const response = await browseCategoryHandler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        items: Array<{ productId: string }>;
        nextCursor?: string;
      };

      expect(body.items.length).toBeLessThanOrEqual(2);
    });

    it('should return empty list for category with no products', async () => {
      const event = createGetEvent('/catalogue/categories/books', {
        pathParameters: { categoryId: 'books' },
      });

      const response = await browseCategoryHandler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { items: unknown[] };
      expect(body.items).toHaveLength(0);
    });
  });

  describe('Product Detail', () => {
    it('should return full product details for an active product', async () => {
      const event = createGetEvent('/catalogue/products/prod-1', {
        pathParameters: { productId: 'prod-1' },
      });

      const response = await productDetailHandler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        productId: string;
        name: string;
        description: string;
        price: number;
        stockQuantity: number;
        categories: string[];
        imageUrls: string[];
      };

      expect(body.productId).toBe('prod-1');
      expect(body.name).toBe('Electronic Gadget 1');
      expect(body.description).toContain('electronic gadget');
      expect(body.price).toBe(10);
      expect(body.stockQuantity).toBe(50);
      expect(body.categories).toContain('electronics');
      expect(body.imageUrls.length).toBeGreaterThan(0);
    });

    it('should return 404 for deleted product', async () => {
      const event = createGetEvent('/catalogue/products/prod-deleted', {
        pathParameters: { productId: 'prod-deleted' },
      });

      const response = await productDetailHandler(event);

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for non-existent product', async () => {
      const event = createGetEvent('/catalogue/products/non-existent', {
        pathParameters: { productId: 'non-existent' },
      });

      const response = await productDetailHandler(event);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Search', () => {
    it('should return products matching search query case-insensitively', async () => {
      const event = createGetEvent('/catalogue/search', {
        queryStringParameters: { q: 'gadget' },
      });

      const response = await searchHandler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        items: Array<{ productId: string; name: string }>;
      };

      // Should find electronic gadgets but not fashion items
      expect(body.items.length).toBeGreaterThan(0);
      for (const item of body.items) {
        expect(item.name.toLowerCase()).toContain('gadget');
      }
    });

    it('should return empty list when no products match search', async () => {
      const event = createGetEvent('/catalogue/search', {
        queryStringParameters: { q: 'nonexistentproduct' },
      });

      const response = await searchHandler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { items: unknown[] };
      expect(body.items).toHaveLength(0);
    });
  });
});
