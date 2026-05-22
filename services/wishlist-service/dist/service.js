import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchGetCommand, DynamoDBDocumentClient, GetCommand, QueryCommand, TransactWriteCommand, } from '@aws-sdk/lib-dynamodb';
import { createCapacityExceededError, createNotFoundError, createServiceUnavailableError, } from './errors.js';
const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);
const MAX_WISHLIST_ITEMS = 200;
function getWishlistsTableName() {
    return process.env['WISHLISTS_TABLE_NAME'] ?? '';
}
function getProductsTableName() {
    return process.env['PRODUCTS_TABLE_NAME'] ?? '';
}
/**
 * Retrieves the buyer's wishlist with enriched product data.
 * Queries the wishlists table for all items, then batch-gets product details
 * from the products table to enrich each item with name, price, primaryImageUrl,
 * and isAvailable (false if product isDeleted = true).
 *
 * Requirements: 7.1, 7.7, 7.8
 */
export async function getWishlist(buyerId) {
    try {
        // Step 1: Query all wishlist items for the buyer (excluding the COUNT item)
        const queryCommand = new QueryCommand({
            TableName: getWishlistsTableName(),
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
        const wishlistItems = queryResult.Items ?? [];
        if (wishlistItems.length === 0) {
            return {
                buyerId,
                items: [],
                count: 0,
            };
        }
        // Step 2: Batch-get product details from the Products table
        const productIds = wishlistItems.map((item) => {
            const sk = item['SK'];
            return sk.replace('PRODUCT#', '');
        });
        const enrichedItems = await enrichWishlistItems(wishlistItems, productIds);
        return {
            buyerId,
            items: enrichedItems,
            count: enrichedItems.length,
        };
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
/**
 * Batch-gets product details and enriches wishlist items.
 * Products that are deleted are marked as isAvailable: false.
 *
 * Requirements: 7.7, 7.8
 */
async function enrichWishlistItems(wishlistItems, productIds) {
    const productsTableName = getProductsTableName();
    // DynamoDB BatchGetItem supports max 100 items per request
    const productDetails = new Map();
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
            const productId = item['productId'];
            productDetails.set(productId, item);
        }
    }
    // Step 3: Enrich each wishlist item with product data
    const enrichedItems = wishlistItems.map((wishlistItem) => {
        const sk = wishlistItem['SK'];
        const productId = sk.replace('PRODUCT#', '');
        const addedAt = wishlistItem['addedAt'];
        const product = productDetails.get(productId);
        if (!product) {
            // Product no longer exists in the table — mark as unavailable
            return {
                productId,
                name: 'Unknown Product',
                price: 0,
                primaryImageUrl: '',
                isAvailable: false,
                addedAt,
            };
        }
        const imageUrls = product['imageUrls'];
        const primaryImageUrl = imageUrls?.[0] ?? '';
        const isDeleted = product['isDeleted'];
        return {
            productId,
            name: product['name'],
            price: product['price'],
            primaryImageUrl,
            isAvailable: isDeleted !== true,
            addedAt,
        };
    });
    return enrichedItems;
}
/**
 * Adds a product to the buyer's wishlist.
 * Verifies the product exists in the Products table (else 404).
 * Uses TransactWriteItems to atomically check the counter item SK=COUNT < 200
 * and PutItem the wishlist entry.
 * If the product is already present, returns the current wishlist unchanged.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export async function addToWishlist(buyerId, productId) {
    const wishlistsTableName = getWishlistsTableName();
    const productsTableName = getProductsTableName();
    try {
        // Step 1: Verify product exists in Products table
        const getProductCommand = new GetCommand({
            TableName: productsTableName,
            Key: {
                PK: `PRODUCT#${productId}`,
                SK: 'METADATA',
            },
        });
        const productResult = await docClient.send(getProductCommand);
        if (!productResult.Item) {
            createNotFoundError(`Product '${productId}' not found`);
        }
        // Step 2: Check if product is already in the wishlist
        const existingItemCommand = new GetCommand({
            TableName: wishlistsTableName,
            Key: {
                PK: `BUYER#${buyerId}`,
                SK: `PRODUCT#${productId}`,
            },
        });
        const existingResult = await docClient.send(existingItemCommand);
        if (existingResult.Item) {
            // Product already in wishlist — return current wishlist unchanged (Requirement 7.3)
            return await getWishlist(buyerId);
        }
        // Step 3: Use TransactWriteItems to atomically check capacity and add item
        const now = new Date().toISOString();
        const transactCommand = new TransactWriteCommand({
            TransactItems: [
                {
                    // Update the counter item: increment count, with condition count < 200
                    Update: {
                        TableName: wishlistsTableName,
                        Key: {
                            PK: `BUYER#${buyerId}`,
                            SK: 'COUNT',
                        },
                        UpdateExpression: 'SET #count = if_not_exists(#count, :zero) + :one',
                        ConditionExpression: 'attribute_not_exists(#count) OR #count < :maxItems',
                        ExpressionAttributeNames: {
                            '#count': 'count',
                        },
                        ExpressionAttributeValues: {
                            ':zero': 0,
                            ':one': 1,
                            ':maxItems': MAX_WISHLIST_ITEMS,
                        },
                    },
                },
                {
                    // Put the wishlist entry
                    Put: {
                        TableName: wishlistsTableName,
                        Item: {
                            PK: `BUYER#${buyerId}`,
                            SK: `PRODUCT#${productId}`,
                            productId,
                            addedAt: now,
                        },
                        ConditionExpression: 'attribute_not_exists(PK)',
                    },
                },
            ],
        });
        await docClient.send(transactCommand);
        // Step 4: Return updated wishlist
        return await getWishlist(buyerId);
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        // Handle TransactionCanceledException for capacity exceeded
        if (error instanceof Error && error.name === 'TransactionCanceledException') {
            const message = error.message;
            // If the condition check on the counter failed, capacity is exceeded
            if (message.includes('ConditionalCheckFailed')) {
                // Check if it's the counter condition (first item) or the duplicate condition (second item)
                // If the second condition failed, the item already exists — return current wishlist
                const cancellationReasons = error['CancellationReasons'];
                if (cancellationReasons && cancellationReasons.length >= 2) {
                    if (cancellationReasons[0]?.Code === 'ConditionalCheckFailed') {
                        createCapacityExceededError();
                    }
                    if (cancellationReasons[1]?.Code === 'ConditionalCheckFailed') {
                        // Item already exists (race condition) — return current wishlist
                        return getWishlist(buyerId);
                    }
                }
                // Default: assume capacity exceeded
                createCapacityExceededError();
            }
        }
        createServiceUnavailableError();
    }
}
/**
 * Removes a product from the buyer's wishlist.
 * Uses DeleteItem (idempotent — no error if not present).
 * Decrements the counter if the item existed.
 * Returns the updated wishlist.
 *
 * Requirements: 7.5, 7.6
 */
export async function removeFromWishlist(buyerId, productId) {
    const wishlistsTableName = getWishlistsTableName();
    try {
        // Step 1: Check if the item exists before deleting (to know if we should decrement counter)
        const existingItemCommand = new GetCommand({
            TableName: wishlistsTableName,
            Key: {
                PK: `BUYER#${buyerId}`,
                SK: `PRODUCT#${productId}`,
            },
        });
        const existingResult = await docClient.send(existingItemCommand);
        if (!existingResult.Item) {
            // Item not in wishlist — return current wishlist unchanged (Requirement 7.6)
            return await getWishlist(buyerId);
        }
        // Step 2: Delete the item and decrement the counter atomically
        const transactCommand = new TransactWriteCommand({
            TransactItems: [
                {
                    // Decrement the counter
                    Update: {
                        TableName: wishlistsTableName,
                        Key: {
                            PK: `BUYER#${buyerId}`,
                            SK: 'COUNT',
                        },
                        UpdateExpression: 'SET #count = #count - :one',
                        ExpressionAttributeNames: {
                            '#count': 'count',
                        },
                        ExpressionAttributeValues: {
                            ':one': 1,
                        },
                    },
                },
                {
                    // Delete the wishlist entry
                    Delete: {
                        TableName: wishlistsTableName,
                        Key: {
                            PK: `BUYER#${buyerId}`,
                            SK: `PRODUCT#${productId}`,
                        },
                    },
                },
            ],
        });
        await docClient.send(transactCommand);
        // Step 3: Return updated wishlist
        return await getWishlist(buyerId);
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
//# sourceMappingURL=service.js.map