import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  BatchGetCommand,
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { CartItemEnriched, CartResponse } from '@blipzo/shared';

import {
  createInsufficientStockError,
  createNotFoundError,
  createServiceUnavailableError,
} from './errors.js';

const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

function getCartsTableName(): string {
  return process.env['CARTS_TABLE_NAME'] ?? '';
}

function getProductsTableName(): string {
  return process.env['PRODUCTS_TABLE_NAME'] ?? '';
}

/**
 * Adds or updates a cart item. If quantity is 0, removes the item.
 * Verifies product exists and quantity ≤ stockQuantity.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.8
 */
export async function putCartItem(
  buyerId: string,
  productId: string,
  quantity: number,
): Promise<CartResponse> {
  const cartsTableName = getCartsTableName();
  const productsTableName = getProductsTableName();

  try {
    // If quantity is 0, remove the item (Requirement 8.3)
    if (quantity === 0) {
      const deleteCommand = new DeleteCommand({
        TableName: cartsTableName,
        Key: {
          PK: `BUYER#${buyerId}`,
          SK: `PRODUCT#${productId}`,
        },
      });

      await docClient.send(deleteCommand);
      return await getCart(buyerId);
    }

    // Step 1: Verify product exists and check stock (Requirements 8.4, 8.8)
    const getProductCommand = new GetCommand({
      TableName: productsTableName,
      Key: {
        PK: `PRODUCT#${productId}`,
        SK: 'METADATA',
      },
    });

    const productResult = await docClient.send(getProductCommand);

    if (!productResult.Item || productResult.Item['isDeleted'] === true) {
      createNotFoundError(`Product '${productId}' not found`);
    }

    const stockQuantity = productResult.Item['stockQuantity'] as number;

    if (quantity > stockQuantity) {
      createInsufficientStockError(productId, stockQuantity);
    }

    // Step 2: PutItem replacing existing entry (Requirement 8.2)
    const now = new Date().toISOString();

    const putCommand = new PutCommand({
      TableName: cartsTableName,
      Item: {
        PK: `BUYER#${buyerId}`,
        SK: `PRODUCT#${productId}`,
        productId,
        quantity,
        addedAt: now,
        updatedAt: now,
      },
    });

    await docClient.send(putCommand);

    // Step 3: Return updated cart
    return await getCart(buyerId);
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}

/**
 * Retrieves the buyer's cart with enriched product data, subtotals, and total.
 * Queries the carts table for all items, then batch-gets product details
 * from the products table to enrich each item.
 *
 * Requirements: 8.5
 */
export async function getCart(buyerId: string): Promise<CartResponse> {
  try {
    const cartsTableName = getCartsTableName();

    // Step 1: Query all cart items for the buyer
    const queryCommand = new QueryCommand({
      TableName: cartsTableName,
      KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :skPrefix)',
      ExpressionAttributeNames: {
        '#pk': 'PK',
        '#sk': 'SK',
      },
      ExpressionAttributeValues: {
        ':pk': `BUYER#${buyerId}`,
        ':skPrefix': 'PRODUCT#',
      },
    });

    const queryResult = await docClient.send(queryCommand);
    const cartItems = queryResult.Items ?? [];

    if (cartItems.length === 0) {
      return {
        buyerId,
        items: [],
        total: 0,
      };
    }

    // Step 2: Batch-get product details from the Products table
    const productIds = cartItems.map((item) => {
      const sk = item['SK'] as string;
      return sk.replace('PRODUCT#', '');
    });

    const enrichedItems = await enrichCartItems(cartItems, productIds);

    // Step 3: Compute total = round(sum(subtotals), 2)
    const total =
      Math.round(enrichedItems.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;

    return {
      buyerId,
      items: enrichedItems,
      total,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}

/**
 * Batch-gets product details and enriches cart items with name, price,
 * primaryImageUrl, quantity, and subtotal.
 *
 * Requirement 8.5
 */
async function enrichCartItems(
  cartItems: Record<string, unknown>[],
  productIds: string[],
): Promise<CartItemEnriched[]> {
  const productsTableName = getProductsTableName();

  // DynamoDB BatchGetItem supports max 100 items per request
  const productDetails = new Map<string, Record<string, unknown>>();
  const batchSize = 100;

  for (let i = 0; i < productIds.length; i += batchSize) {
    const batch = productIds.slice(i, i + batchSize);
    const keys = batch.map((productId) => ({
      PK: `PRODUCT#${productId}`,
      SK: 'METADATA',
    }));

    const batchGetCommand = new BatchGetCommand({
      RequestItems: {
        [productsTableName]: {
          Keys: keys,
        },
      },
    });

    const batchResult = await docClient.send(batchGetCommand);
    const responses = batchResult.Responses?.[productsTableName] ?? [];

    for (const item of responses) {
      const productId = item['productId'] as string;
      productDetails.set(productId, item as Record<string, unknown>);
    }
  }

  // Step 3: Enrich each cart item with product data
  const enrichedItems: CartItemEnriched[] = cartItems.map((cartItem) => {
    const sk = cartItem['SK'] as string;
    const productId = sk.replace('PRODUCT#', '');
    const quantity = cartItem['quantity'] as number;
    const product = productDetails.get(productId);

    if (!product) {
      // Product no longer exists — return with zero price
      const subtotal = 0;
      return {
        productId,
        name: 'Unknown Product',
        price: 0,
        primaryImageUrl: '',
        quantity,
        subtotal,
      };
    }

    const imageUrls = product['imageUrls'] as string[] | undefined;
    const primaryImageUrl = imageUrls?.[0] ?? '';
    const price = product['price'] as number;

    // subtotal = round(price * quantity, 2)
    const subtotal = Math.round(price * quantity * 100) / 100;

    return {
      productId,
      name: product['name'] as string,
      price,
      primaryImageUrl,
      quantity,
      subtotal,
    };
  });

  return enrichedItems;
}

/**
 * Removes a single item from the buyer's cart.
 * DeleteItem is idempotent — no error if not present.
 * Returns the updated cart.
 *
 * Requirement 8.3
 */
export async function removeCartItem(buyerId: string, productId: string): Promise<CartResponse> {
  const cartsTableName = getCartsTableName();

  try {
    const deleteCommand = new DeleteCommand({
      TableName: cartsTableName,
      Key: {
        PK: `BUYER#${buyerId}`,
        SK: `PRODUCT#${productId}`,
      },
    });

    await docClient.send(deleteCommand);

    return await getCart(buyerId);
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}

/**
 * Clears all items from the buyer's cart using BatchWriteItem.
 * Returns an empty cart response.
 *
 * Requirement 8.6
 */
export async function clearCart(buyerId: string): Promise<CartResponse> {
  const cartsTableName = getCartsTableName();

  try {
    // Step 1: Query all cart items for the buyer
    const queryCommand = new QueryCommand({
      TableName: cartsTableName,
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: {
        '#pk': 'PK',
      },
      ExpressionAttributeValues: {
        ':pk': `BUYER#${buyerId}`,
      },
    });

    const queryResult = await docClient.send(queryCommand);
    const cartItems = queryResult.Items ?? [];

    if (cartItems.length === 0) {
      return {
        buyerId,
        items: [],
        total: 0,
      };
    }

    // Step 2: BatchWriteItem to delete all items (max 25 per batch)
    const batchSize = 25;

    for (let i = 0; i < cartItems.length; i += batchSize) {
      const batch = cartItems.slice(i, i + batchSize);
      const deleteRequests = batch.map((item) => ({
        DeleteRequest: {
          Key: {
            PK: item['PK'] as string,
            SK: item['SK'] as string,
          },
        },
      }));

      const batchWriteCommand = new BatchWriteCommand({
        RequestItems: {
          [cartsTableName]: deleteRequests,
        },
      });

      await docClient.send(batchWriteCommand);
    }

    // Step 3: Return empty cart
    return {
      buyerId,
      items: [],
      total: 0,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}
