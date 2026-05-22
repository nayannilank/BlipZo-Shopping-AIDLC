import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, } from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { createForbiddenError, createNotFoundError, createS3UploadFailedError, createServiceUnavailableError, } from './errors.js';
const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);
const s3Client = new S3Client({});
function getProductsTableName() {
    return process.env['PRODUCTS_TABLE_NAME'] ?? '';
}
function getProductImagesBucket() {
    return process.env['PRODUCT_IMAGES_BUCKET'] ?? '';
}
/** Pre-signed URL expiry in seconds (15 minutes) */
const PRESIGNED_URL_EXPIRY = 900;
/**
 * Generates search tokens from product name and description.
 * Tokens are lowercase, space-separated for DynamoDB contains-based search.
 */
function generateSearchTokens(name, description) {
    return `${name} ${description}`.toLowerCase();
}
/**
 * Generates pre-signed S3 PUT URLs for each image in the product creation request.
 * Returns the URLs and corresponding S3 keys.
 *
 * Requirement 5.8: Pre-signed URLs strategy.
 */
async function generatePresignedUploadUrls(productId, images) {
    const uploadUrls = [];
    for (const image of images) {
        const imageId = uuidv4();
        const extension = image.filename.split('.').pop() ?? 'jpg';
        const s3Key = `products/${productId}/${imageId}.${extension}`;
        try {
            const command = new PutObjectCommand({
                Bucket: getProductImagesBucket(),
                Key: s3Key,
                ContentType: image.contentType,
                ContentLength: image.sizeBytes,
            });
            const uploadUrl = await getSignedUrl(s3Client, command, {
                expiresIn: PRESIGNED_URL_EXPIRY,
            });
            uploadUrls.push({
                filename: image.filename,
                uploadUrl,
                s3Key,
            });
        }
        catch {
            // If we can't generate pre-signed URLs, the upload will fail
            createS3UploadFailedError();
        }
    }
    return uploadUrls;
}
/**
 * Confirms that all S3 uploads have been completed by checking if the objects exist.
 * For the pre-signed URL flow, the client uploads directly to S3.
 * In this implementation, we generate the URLs and trust the client will upload.
 * The handler returns the pre-signed URLs to the client.
 *
 * Note: In a production system, you'd use S3 event notifications or a confirmation endpoint.
 * For this academic project, we write the DynamoDB record with the expected S3 URLs
 * after successfully generating all pre-signed URLs. If URL generation fails for any
 * image, we return 503 and write nothing.
 *
 * Requirement 5.8
 */
function buildImageUrls(uploadUrls) {
    const bucket = getProductImagesBucket();
    return uploadUrls.map((upload) => `https://${bucket}.s3.amazonaws.com/${upload.s3Key}`);
}
/**
 * Creates a new product in DynamoDB with proper GSI keys and search tokens.
 * Generates pre-signed S3 PUT URLs for image uploads.
 * Only writes to DynamoDB after all pre-signed URLs are successfully generated.
 *
 * Requirements: 5.1, 5.2, 5.8
 */
export async function createProduct(input, sellerId) {
    const productId = uuidv4();
    const now = new Date().toISOString();
    const primaryCategory = input.categories[0] ?? '';
    // Step 1: Generate pre-signed S3 PUT URLs for each image
    // If any URL generation fails, createS3UploadFailedError() is thrown (503)
    const uploadUrls = await generatePresignedUploadUrls(productId, input.images);
    // Step 2: Build the image URLs (expected final S3 object URLs)
    const imageUrls = buildImageUrls(uploadUrls);
    // Step 3: Build the product record with GSI keys
    const searchTokens = generateSearchTokens(input.name, input.description);
    const productRecord = {
        productId,
        sellerId,
        name: input.name,
        description: input.description,
        price: input.price,
        stockQuantity: input.stockQuantity,
        categories: input.categories,
        imageUrls,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
    };
    // Step 4: Write to DynamoDB with GSI attributes
    const dynamoItem = {
        PK: `PRODUCT#${productId}`,
        SK: 'METADATA',
        ...productRecord,
        GSI1PK: `CATEGORY#${primaryCategory}`,
        GSI1SK: `CREATED#${now}`,
        GSI2PK: `SELLER#${sellerId}`,
        GSI2SK: `CREATED#${now}`,
        searchTokens,
    };
    try {
        const putCommand = new PutCommand({
            TableName: getProductsTableName(),
            Item: dynamoItem,
        });
        await docClient.send(putCommand);
    }
    catch {
        createServiceUnavailableError();
    }
    return {
        product: productRecord,
        uploadUrls,
    };
}
/**
 * Maps a DynamoDB item to a ProductRecord, handling optional sellerPolicy
 * in a way compatible with exactOptionalPropertyTypes.
 */
function mapItemToProductRecord(item) {
    const record = {
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
    if (item['sellerPolicy']) {
        record.sellerPolicy = item['sellerPolicy'];
    }
    return record;
}
/**
 * Retrieves a product by ID from DynamoDB.
 * Returns the ProductRecord or throws 404 if not found.
 */
export async function getProductById(productId) {
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
            createNotFoundError('Product not found');
        }
        return mapItemToProductRecord(result.Item);
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
/**
 * Asserts that the requesting user owns the product.
 * Throws 403 if sellerId does not match.
 *
 * Requirements: 5.4, 5.6
 */
export function assertOwnership(product, requestingUserId) {
    if (product.sellerId !== requestingUserId) {
        createForbiddenError();
    }
}
/**
 * Updates a product with only the supplied fields using DynamoDB UpdateExpression.
 * Only fields present in the validated input are updated.
 *
 * Requirements: 5.5, 5.7
 */
export async function updateProduct(productId, input, sellerId) {
    // Step 1: Read the existing product
    const existingProduct = await getProductById(productId);
    // Step 2: Assert ownership
    assertOwnership(existingProduct, sellerId);
    // Step 3: Build UpdateExpression for only supplied fields
    const now = new Date().toISOString();
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    const updateExpressions = [];
    // Always update updatedAt
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;
    updateExpressions.push('#updatedAt = :updatedAt');
    if (input.name !== undefined) {
        expressionAttributeNames['#name'] = 'name';
        expressionAttributeValues[':name'] = input.name;
        updateExpressions.push('#name = :name');
        // Update searchTokens when name changes
        const description = input.description ?? existingProduct.description;
        expressionAttributeNames['#searchTokens'] = 'searchTokens';
        expressionAttributeValues[':searchTokens'] = generateSearchTokens(input.name, description);
        updateExpressions.push('#searchTokens = :searchTokens');
    }
    if (input.description !== undefined) {
        expressionAttributeNames['#description'] = 'description';
        expressionAttributeValues[':description'] = input.description;
        updateExpressions.push('#description = :description');
        // Update searchTokens when description changes (if name wasn't already updated)
        if (input.name === undefined) {
            const name = existingProduct.name;
            expressionAttributeNames['#searchTokens'] = 'searchTokens';
            expressionAttributeValues[':searchTokens'] = generateSearchTokens(name, input.description);
            updateExpressions.push('#searchTokens = :searchTokens');
        }
    }
    if (input.price !== undefined) {
        expressionAttributeNames['#price'] = 'price';
        expressionAttributeValues[':price'] = input.price;
        updateExpressions.push('#price = :price');
    }
    if (input.stockQuantity !== undefined) {
        expressionAttributeNames['#stockQuantity'] = 'stockQuantity';
        expressionAttributeValues[':stockQuantity'] = input.stockQuantity;
        updateExpressions.push('#stockQuantity = :stockQuantity');
    }
    if (input.categories !== undefined) {
        expressionAttributeNames['#categories'] = 'categories';
        expressionAttributeValues[':categories'] = input.categories;
        updateExpressions.push('#categories = :categories');
        // Update GSI1PK if primary category changes
        const newPrimaryCategory = input.categories[0] ?? '';
        expressionAttributeNames['#GSI1PK'] = 'GSI1PK';
        expressionAttributeValues[':GSI1PK'] = `CATEGORY#${newPrimaryCategory}`;
        updateExpressions.push('#GSI1PK = :GSI1PK');
    }
    // Step 4: Execute the update
    try {
        const updateCommand = new UpdateCommand({
            TableName: getProductsTableName(),
            Key: {
                PK: `PRODUCT#${productId}`,
                SK: 'METADATA',
            },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW',
        });
        const result = await docClient.send(updateCommand);
        const item = result.Attributes;
        if (!item) {
            throw new Error('Update returned no attributes');
        }
        return mapItemToProductRecord(item);
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
/**
 * Soft-deletes a product by setting isDeleted = true.
 * Does not physically remove the DynamoDB item.
 *
 * Requirements: 5.3, 5.4
 */
export async function deleteProduct(productId, sellerId) {
    // Step 1: Read the existing product
    const existingProduct = await getProductById(productId);
    // Step 2: Assert ownership
    assertOwnership(existingProduct, sellerId);
    // Step 3: Set isDeleted = true
    const now = new Date().toISOString();
    try {
        const updateCommand = new UpdateCommand({
            TableName: getProductsTableName(),
            Key: {
                PK: `PRODUCT#${productId}`,
                SK: 'METADATA',
            },
            UpdateExpression: 'SET #isDeleted = :isDeleted, #updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#isDeleted': 'isDeleted',
                '#updatedAt': 'updatedAt',
            },
            ExpressionAttributeValues: {
                ':isDeleted': true,
                ':updatedAt': now,
            },
        });
        await docClient.send(updateCommand);
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
/**
 * Lists all products for a seller using GSI2 (SellerProducts).
 * Supports cursor-based pagination.
 *
 * Requirements: 5.3
 */
export async function listSellerProducts(sellerId, limit = 20, cursor) {
    try {
        const queryInput = {
            TableName: getProductsTableName(),
            IndexName: 'GSI2-SellerProducts',
            KeyConditionExpression: '#gsi2pk = :gsi2pk',
            ExpressionAttributeNames: {
                '#gsi2pk': 'GSI2PK',
            },
            ExpressionAttributeValues: {
                ':gsi2pk': `SELLER#${sellerId}`,
            },
            Limit: limit,
            ScanIndexForward: false, // Most recent first
        };
        if (cursor) {
            try {
                const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
                queryInput['ExclusiveStartKey'] = decodedCursor;
            }
            catch {
                // Invalid cursor, ignore and start from beginning
            }
        }
        const command = new QueryCommand(queryInput);
        const result = await docClient.send(command);
        const items = (result.Items ?? []).map((item) => mapItemToProductRecord(item));
        const paginatedResult = { items };
        if (result.LastEvaluatedKey) {
            paginatedResult.nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
        }
        return paginatedResult;
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
/**
 * Sets or updates the Seller Policy on a product.
 * Asserts product ownership, generates a new policyVersion UUID and createdAt timestamp,
 * writes the sellerPolicy map onto the product DynamoDB item.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */
export async function setSellerPolicy(productId, input, sellerId) {
    // Step 1: Read the existing product
    const existingProduct = await getProductById(productId);
    // Step 2: Assert ownership
    assertOwnership(existingProduct, sellerId);
    // Step 3: Build the SellerPolicy with new policyVersion and createdAt
    const now = new Date().toISOString();
    const policyVersion = uuidv4();
    const sellerPolicy = {
        returnWindowDays: input.returnWindowDays,
        exchangeAllowed: input.exchangeAllowed,
        policyVersion,
        createdAt: now,
    };
    if (input.conditions !== undefined) {
        sellerPolicy.conditions = input.conditions;
    }
    // Step 4: Write sellerPolicy map onto the product DynamoDB item
    try {
        const updateCommand = new UpdateCommand({
            TableName: getProductsTableName(),
            Key: {
                PK: `PRODUCT#${productId}`,
                SK: 'METADATA',
            },
            UpdateExpression: 'SET #sellerPolicy = :sellerPolicy, #updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#sellerPolicy': 'sellerPolicy',
                '#updatedAt': 'updatedAt',
            },
            ExpressionAttributeValues: {
                ':sellerPolicy': sellerPolicy,
                ':updatedAt': now,
            },
            ReturnValues: 'ALL_NEW',
        });
        const result = await docClient.send(updateCommand);
        const item = result.Attributes;
        if (!item) {
            throw new Error('Update returned no attributes');
        }
        return mapItemToProductRecord(item);
    }
    catch (error) {
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }
        createServiceUnavailableError();
    }
}
//# sourceMappingURL=service.js.map