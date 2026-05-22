import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand, } from '@aws-sdk/lib-dynamodb';
import { createNotFoundError, createServiceUnavailableError } from './errors.js';
const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);
function getProductsTableName() {
    return process.env['PRODUCTS_TABLE_NAME'] ?? '';
}
function getCategoriesTableName() {
    return process.env['CATEGORIES_TABLE_NAME'] ?? '';
}
/**
 * Retrieves all categories from the Categories table.
 * Returns an array of category IDs and names.
 *
 * Requirement 6.1
 */
export async function listCategories() {
    try {
        const command = new ScanCommand({
            TableName: getCategoriesTableName(),
        });
        const result = await docClient.send(command);
        return (result.Items ?? []).map((item) => ({
            categoryId: item['categoryId'],
            name: item['name'],
        }));
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
/**
 * Validates that a category exists in the Categories table.
 * Throws 404 if the category does not exist.
 *
 * Requirement 6.4
 */
export async function validateCategoryExists(categoryId) {
    try {
        const command = new GetCommand({
            TableName: getCategoriesTableName(),
            Key: {
                categoryId,
            },
        });
        const result = await docClient.send(command);
        if (!result.Item) {
            createNotFoundError(`Category '${categoryId}' not found`);
        }
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
/**
 * Maps a DynamoDB product item to a CatalogueItem for list responses.
 */
function mapItemToCatalogueItem(item) {
    const imageUrls = item['imageUrls'];
    const primaryImageUrl = imageUrls?.[0] ?? '';
    return {
        productId: item['productId'],
        name: item['name'],
        price: item['price'],
        primaryImageUrl,
        averageRating: item['averageRating'] ?? 0,
        sellerName: item['sellerName'] ?? '',
    };
}
/**
 * Decodes a base64-encoded cursor into a DynamoDB ExclusiveStartKey.
 * Returns undefined if the cursor is invalid.
 */
function decodeCursor(cursor) {
    try {
        return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    }
    catch {
        return undefined;
    }
}
/**
 * Encodes a DynamoDB LastEvaluatedKey into a base64 cursor string.
 */
function encodeCursor(lastEvaluatedKey) {
    return Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64');
}
/**
 * Lists products in a category using GSI1 (CategoryByDate).
 * Filters out deleted products, applies cursor-based pagination,
 * and sorts by most recently listed first.
 *
 * Requirements: 6.1, 6.5, 6.7
 */
export async function listProductsByCategory(categoryId, limit = 20, cursor) {
    // Step 1: Validate category exists
    await validateCategoryExists(categoryId);
    // Step 2: Query GSI1 with CATEGORY#{categoryId}, filter isDeleted = false
    try {
        const queryInput = {
            TableName: getProductsTableName(),
            IndexName: 'GSI1-CategoryByDate',
            KeyConditionExpression: '#gsi1pk = :gsi1pk',
            FilterExpression: '#isDeleted = :isDeleted',
            ExpressionAttributeNames: {
                '#gsi1pk': 'GSI1PK',
                '#isDeleted': 'isDeleted',
            },
            ExpressionAttributeValues: {
                ':gsi1pk': `CATEGORY#${categoryId}`,
                ':isDeleted': false,
            },
            Limit: limit,
            ScanIndexForward: false, // Most recently listed first
        };
        if (cursor) {
            const decodedKey = decodeCursor(cursor);
            if (decodedKey) {
                queryInput.ExclusiveStartKey = decodedKey;
            }
        }
        const command = new QueryCommand(queryInput);
        const result = await docClient.send(command);
        const items = (result.Items ?? []).map((item) => mapItemToCatalogueItem(item));
        const response = { items };
        if (result.LastEvaluatedKey) {
            response.nextCursor = encodeCursor(result.LastEvaluatedKey);
        }
        return response;
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
/**
 * Retrieves a product by ID from the Products table.
 * Returns 404 if the product does not exist or is marked as deleted.
 * Returns the full ProductRecord including sellerPolicy summary.
 *
 * Requirements: 6.2, 6.3
 */
export async function getProductDetail(productId) {
    try {
        const command = new GetCommand({
            TableName: getProductsTableName(),
            Key: {
                PK: `PRODUCT#${productId}`,
                SK: 'METADATA',
            },
        });
        const result = await docClient.send(command);
        if (!result.Item) {
            createNotFoundError(`Product '${productId}' not found`);
        }
        const item = result.Item;
        if (item['isDeleted'] === true) {
            createNotFoundError(`Product '${productId}' not found`);
        }
        const sellerPolicy = item['sellerPolicy'];
        const product = {
            productId: item['productId'],
            sellerId: item['sellerId'],
            name: item['name'],
            description: item['description'],
            price: item['price'],
            stockQuantity: item['stockQuantity'],
            categories: item['categories'],
            imageUrls: item['imageUrls'],
            isDeleted: item['isDeleted'],
            createdAt: item['createdAt'],
            updatedAt: item['updatedAt'],
        };
        if (sellerPolicy) {
            product.sellerPolicy = sellerPolicy;
        }
        return product;
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
/**
 * Searches products using GSI1 with a FilterExpression that checks
 * if searchTokens contains the lowercase query.
 * Returns paginated CatalogueListResponse.
 *
 * For the academic scope, search scans GSI1 across all categories
 * with a filter on searchTokens. In production, this would use OpenSearch.
 *
 * Requirements: 6.6, 6.7
 */
export async function searchProducts(query, limit = 20, cursor) {
    try {
        const lowercaseQuery = query.toLowerCase();
        const scanInput = {
            TableName: getProductsTableName(),
            FilterExpression: 'contains(#searchTokens, :query) AND #isDeleted = :isDeleted',
            ExpressionAttributeNames: {
                '#searchTokens': 'searchTokens',
                '#isDeleted': 'isDeleted',
            },
            ExpressionAttributeValues: {
                ':query': lowercaseQuery,
                ':isDeleted': false,
            },
            Limit: limit,
        };
        if (cursor) {
            const decodedKey = decodeCursor(cursor);
            if (decodedKey) {
                scanInput.ExclusiveStartKey = decodedKey;
            }
        }
        const command = new ScanCommand(scanInput);
        const result = await docClient.send(command);
        const items = (result.Items ?? []).map((item) => mapItemToCatalogueItem(item));
        const response = { items };
        if (result.LastEvaluatedKey) {
            response.nextCursor = encodeCursor(result.LastEvaluatedKey);
        }
        return response;
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
//# sourceMappingURL=service.js.map