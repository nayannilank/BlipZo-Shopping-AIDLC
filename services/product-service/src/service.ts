import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  CreateProductRequest,
  ProductRecord,
  ImageUpload,
  UpdateProductSchemaInput,
  SellerPolicy,
  SellerPolicySchemaInput,
  AttributeDefinition,
} from '@blipzo/shared';
import { v4 as uuidv4 } from 'uuid';

import { validateDynamicAttributes } from './attribute-validator.js';
import {
  createCategoryImmutableError,
  createForbiddenError,
  createNotFoundError,
  createS3UploadFailedError,
  createServiceUnavailableError,
  createValidationError,
} from './errors.js';

const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);
const s3Client = new S3Client({});

function getProductsTableName(): string {
  return process.env['PRODUCTS_TABLE_NAME'] ?? '';
}

function getProductImagesBucket(): string {
  return process.env['PRODUCT_IMAGES_BUCKET'] ?? '';
}

function getCategoriesTableName(): string {
  return process.env['CATEGORIES_TABLE_NAME'] ?? '';
}

/**
 * Fetches the latest attribute schema for a given subcategory from the categories table.
 * Queries with PK = CAT#{subcategoryId} and SK begins_with "SCHEMA#", sorted descending
 * to get the latest version.
 *
 * Requirements: 3.6, 7.3
 *
 * @returns The schema version and attribute definitions, or null if no schema exists
 */
export async function fetchAttributeSchema(
  subcategoryId: string,
): Promise<{ schemaVersion: number; attributes: AttributeDefinition[] } | null> {
  try {
    const command = new QueryCommand({
      TableName: getCategoriesTableName(),
      KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :skPrefix)',
      ExpressionAttributeNames: {
        '#pk': 'PK',
        '#sk': 'SK',
      },
      ExpressionAttributeValues: {
        ':pk': `CAT#${subcategoryId}`,
        ':skPrefix': 'SCHEMA#',
      },
      ScanIndexForward: false, // Sort descending to get latest version first
      Limit: 1,
    });

    const result = await docClient.send(command);
    const items = result.Items ?? [];

    if (items.length === 0) {
      return null;
    }

    const item = items[0] as Record<string, unknown>;
    return {
      schemaVersion: item['schemaVersion'] as number,
      attributes: item['attributes'] as AttributeDefinition[],
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}

/** Pre-signed URL expiry in seconds (15 minutes) */
const PRESIGNED_URL_EXPIRY = 900;

export interface CreateProductResult {
  product: ProductRecord;
  uploadUrls: PresignedUploadUrl[];
}

export interface PresignedUploadUrl {
  filename: string;
  uploadUrl: string;
  s3Key: string;
}

/**
 * Generates search tokens from product name, description, and text-type dynamic attribute values.
 * Tokens are lowercase, space-separated for DynamoDB contains-based search.
 *
 * When dynamicAttributes and schema are provided, text-type attribute values (e.g., brand, model, author)
 * are included in the search tokens to improve search discoverability.
 *
 * Requirements: 9.4
 */
function generateSearchTokens(
  name: string,
  description: string,
  dynamicAttributes?: Record<string, string | number | boolean | string[]>,
  schema?: AttributeDefinition[],
): string {
  let tokens = `${name} ${description}`;

  if (dynamicAttributes && schema) {
    const textValues: string[] = [];
    for (const attr of schema) {
      if (attr.dataType === 'text') {
        const value = dynamicAttributes[attr.fieldName];
        if (typeof value === 'string' && value.length > 0) {
          textValues.push(value);
        }
      }
    }
    if (textValues.length > 0) {
      tokens += ` ${textValues.join(' ')}`;
    }
  }

  return tokens.toLowerCase();
}

/**
 * Generates pre-signed S3 PUT URLs for each image in the product creation request.
 * Returns the URLs and corresponding S3 keys.
 *
 * Requirement 5.8: Pre-signed URLs strategy.
 */
async function generatePresignedUploadUrls(
  productId: string,
  images: ImageUpload[],
): Promise<PresignedUploadUrl[]> {
  const uploadUrls: PresignedUploadUrl[] = [];

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
    } catch {
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
function buildImageUrls(uploadUrls: PresignedUploadUrl[]): string[] {
  const bucket = getProductImagesBucket();
  return uploadUrls.map((upload) => `https://${bucket}.s3.amazonaws.com/${upload.s3Key}`);
}

/**
 * Creates a new product in DynamoDB with proper GSI keys and search tokens.
 * Generates pre-signed S3 PUT URLs for image uploads.
 * Only writes to DynamoDB after all pre-signed URLs are successfully generated.
 *
 * When categoryId and subcategoryId are provided, fetches the attribute schema
 * from the categories table, validates dynamicAttributes against it, and stores
 * the category fields and schema version on the product record.
 *
 * Requirements: 5.1, 5.2, 5.8, 3.6, 3.8, 7.1, 7.2, 7.3, 7.5
 */
export async function createProduct(
  input: CreateProductRequest,
  sellerId: string,
): Promise<CreateProductResult> {
  const productId = uuidv4();
  const now = new Date().toISOString();

  // Determine GSI1 keys based on whether subcategoryId is provided
  let gsi1pk: string;
  let gsi1sk: string;
  let schemaVersion: number | undefined;
  let validatedDynamicAttributes: Record<string, string | number | boolean | string[]> | undefined;
  let schemaAttributes: AttributeDefinition[] | undefined;

  if (input.subcategoryId) {
    // Fetch attribute schema from categories table for the given subcategoryId
    const schema = await fetchAttributeSchema(input.subcategoryId);

    if (!schema) {
      createValidationError({
        subcategoryId: `Attribute schema not found for subcategory '${input.subcategoryId}'`,
      });
    }

    // Validate dynamicAttributes against the schema
    const dynamicAttrs = input.dynamicAttributes ?? {};
    const validationResult = validateDynamicAttributes(dynamicAttrs, schema.attributes);

    if (!validationResult.valid) {
      createValidationError(validationResult.fields);
    }

    schemaVersion = schema.schemaVersion;
    schemaAttributes = schema.attributes;
    validatedDynamicAttributes = dynamicAttrs as Record<
      string,
      string | number | boolean | string[]
    >;
    gsi1pk = `SUBCATEGORY#${input.subcategoryId}`;
    gsi1sk = `CREATED#${now}`;
  } else {
    // Legacy flow: use categories array for GSI1
    const primaryCategory = input.categories?.[0] ?? '';
    gsi1pk = `CATEGORY#${primaryCategory}`;
    gsi1sk = `CREATED#${now}`;
  }

  // Step 1: Generate pre-signed S3 PUT URLs for each image
  // If any URL generation fails, createS3UploadFailedError() is thrown (503)
  const uploadUrls = await generatePresignedUploadUrls(productId, input.images);

  // Step 2: Build the image URLs (expected final S3 object URLs)
  const imageUrls = buildImageUrls(uploadUrls);

  // Step 3: Build the product record with GSI keys
  const searchTokens = generateSearchTokens(
    input.name,
    input.description,
    validatedDynamicAttributes,
    schemaAttributes,
  );

  const productRecord: ProductRecord = {
    productId,
    sellerId,
    name: input.name,
    description: input.description,
    price: input.price,
    stockQuantity: input.stockQuantity,
    imageUrls,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  // Add legacy categories if provided
  if (input.categories) {
    productRecord.categories = input.categories;
  }

  // Add category-based fields if subcategoryId is provided
  if (input.categoryId) {
    productRecord.categoryId = input.categoryId;
  }
  if (input.subcategoryId) {
    productRecord.subcategoryId = input.subcategoryId;
  }
  if (validatedDynamicAttributes) {
    productRecord.dynamicAttributes = validatedDynamicAttributes;
  }
  if (schemaVersion !== undefined) {
    productRecord.schemaVersion = schemaVersion;
  }

  // Step 4: Write to DynamoDB with GSI attributes
  const dynamoItem = {
    PK: `PRODUCT#${productId}`,
    SK: 'METADATA',
    ...productRecord,
    GSI1PK: gsi1pk,
    GSI1SK: gsi1sk,
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
  } catch {
    createServiceUnavailableError();
  }

  return {
    product: productRecord,
    uploadUrls,
  };
}

/**
 * Maps a DynamoDB item to a ProductRecord, handling optional sellerPolicy
 * and category-based fields in a way compatible with exactOptionalPropertyTypes.
 */
function mapItemToProductRecord(item: Record<string, unknown>): ProductRecord {
  const record: ProductRecord = {
    productId: item['productId'] as string,
    sellerId: item['sellerId'] as string,
    name: item['name'] as string,
    description: item['description'] as string,
    price: item['price'] as number,
    stockQuantity: item['stockQuantity'] as number,
    imageUrls: item['imageUrls'] as string[],
    isDeleted: item['isDeleted'] as boolean,
    createdAt: item['createdAt'] as string,
    updatedAt: item['updatedAt'] as string,
  };

  if (item['categories']) {
    record.categories = item['categories'] as string[];
  }

  if (item['categoryId']) {
    record.categoryId = item['categoryId'] as string;
  }

  if (item['subcategoryId']) {
    record.subcategoryId = item['subcategoryId'] as string;
  }

  if (item['dynamicAttributes']) {
    record.dynamicAttributes = item['dynamicAttributes'] as Record<
      string,
      string | number | boolean | string[]
    >;
  }

  if (item['schemaVersion'] !== undefined && item['schemaVersion'] !== null) {
    record.schemaVersion = item['schemaVersion'] as number;
  }

  if (item['sellerPolicy']) {
    record.sellerPolicy = item['sellerPolicy'] as SellerPolicy;
  }

  return record;
}

/**
 * Retrieves a product by ID from DynamoDB.
 * Returns the ProductRecord or throws 404 if not found.
 */
export async function getProductById(productId: string): Promise<ProductRecord> {
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

    return mapItemToProductRecord(result.Item as Record<string, unknown>);
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}

/**
 * Response shape for the enriched product detail endpoint.
 * Includes attributeLabels mapping fieldName → displayLabel from the schema,
 * and omits optional attributes with null/undefined values from dynamicAttributes.
 *
 * Requirements: 4.4, 4.5, 4.6
 */
export interface EnrichedProductDetail extends ProductRecord {
  attributeLabels?: Record<string, string>;
}

/**
 * Retrieves a product by ID and enriches it with display labels from the attribute schema.
 * When the product has a subcategoryId, fetches the schema and builds an attributeLabels map.
 * Optional attributes (required=false) with null/undefined values are omitted from dynamicAttributes.
 *
 * Requirements: 4.4, 4.5, 4.6
 */
export async function getProductDetail(productId: string): Promise<EnrichedProductDetail> {
  const product = await getProductById(productId);

  // If no subcategoryId, return the product as-is (legacy product)
  if (!product.subcategoryId) {
    return product;
  }

  // Fetch the attribute schema for the product's subcategory
  const schema = await fetchAttributeSchema(product.subcategoryId);

  if (!schema || !product.dynamicAttributes) {
    return product;
  }

  // Build attributeLabels map and filter out optional attributes with null/undefined values
  const attributeLabels: Record<string, string> = {};
  const filteredDynamicAttributes: Record<string, string | number | boolean | string[]> = {};

  for (const attrDef of schema.attributes) {
    const value = product.dynamicAttributes[attrDef.fieldName];

    // Omit optional attributes with null/undefined values
    if (!attrDef.required && (value === null || value === undefined)) {
      continue;
    }

    // Include the attribute if it has a value
    if (value !== null && value !== undefined) {
      filteredDynamicAttributes[attrDef.fieldName] = value;
      attributeLabels[attrDef.fieldName] = attrDef.displayLabel;
    }
  }

  return {
    ...product,
    dynamicAttributes: filteredDynamicAttributes,
    attributeLabels,
  };
}

/**
 * Asserts that the requesting user owns the product.
 * Throws 403 if sellerId does not match.
 *
 * Requirements: 5.4, 5.6
 */
export function assertOwnership(product: ProductRecord, requestingUserId: string): void {
  if (product.sellerId !== requestingUserId) {
    createForbiddenError();
  }
}

/**
 * Updates a product with only the supplied fields using DynamoDB UpdateExpression.
 * Only fields present in the validated input are updated.
 *
 * Rejects attempts to change categoryId or subcategoryId (immutable after creation).
 * Validates dynamicAttributes against the current attribute schema if provided.
 * Updates schemaVersion if the schema has changed since product creation.
 *
 * Requirements: 5.5, 5.7, 8.3, 8.4, 8.5
 */
export async function updateProduct(
  productId: string,
  input: UpdateProductSchemaInput,
  sellerId: string,
): Promise<ProductRecord> {
  // Step 1: Read the existing product
  const existingProduct = await getProductById(productId);

  // Step 2: Assert ownership
  assertOwnership(existingProduct, sellerId);

  // Step 3: Reject attempts to change categoryId or subcategoryId (Requirement 8.3)
  if (input.categoryId !== undefined && input.categoryId !== existingProduct.categoryId) {
    createCategoryImmutableError();
  }
  if (input.subcategoryId !== undefined && input.subcategoryId !== existingProduct.subcategoryId) {
    createCategoryImmutableError();
  }

  // Step 4: Build UpdateExpression for only supplied fields
  const now = new Date().toISOString();
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};
  const updateExpressions: string[] = [];

  // Fetch schema for validation and search token generation if product has a subcategory
  let schemaAttributes: AttributeDefinition[] | undefined;
  let newSchemaVersion: number | undefined;
  if (existingProduct.subcategoryId) {
    const schema = await fetchAttributeSchema(existingProduct.subcategoryId);
    if (schema) {
      schemaAttributes = schema.attributes;

      // Validate dynamicAttributes against current schema if provided (Requirements 8.4, 8.5)
      if (input.dynamicAttributes !== undefined) {
        const validationResult = validateDynamicAttributes(
          input.dynamicAttributes,
          schema.attributes,
        );

        if (!validationResult.valid) {
          createValidationError(validationResult.fields);
        }

        // Update schemaVersion if it has changed since product creation (Requirement 8.5)
        if (existingProduct.schemaVersion !== schema.schemaVersion) {
          newSchemaVersion = schema.schemaVersion;
        }
      }
    }
  }

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
    expressionAttributeValues[':searchTokens'] = generateSearchTokens(
      input.name,
      description,
      existingProduct.dynamicAttributes,
      schemaAttributes,
    );
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
      expressionAttributeValues[':searchTokens'] = generateSearchTokens(
        name,
        input.description,
        existingProduct.dynamicAttributes,
        schemaAttributes,
      );
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

  // Update dynamicAttributes and regenerate searchTokens if dynamic attributes change
  if (input.dynamicAttributes !== undefined) {
    expressionAttributeNames['#dynamicAttributes'] = 'dynamicAttributes';
    expressionAttributeValues[':dynamicAttributes'] = input.dynamicAttributes;
    updateExpressions.push('#dynamicAttributes = :dynamicAttributes');

    // Regenerate searchTokens with updated dynamic attributes (if not already updated by name/description change)
    if (input.name === undefined && input.description === undefined) {
      const updatedDynamicAttrs = input.dynamicAttributes as Record<
        string,
        string | number | boolean | string[]
      >;
      expressionAttributeNames['#searchTokens'] = 'searchTokens';
      expressionAttributeValues[':searchTokens'] = generateSearchTokens(
        existingProduct.name,
        existingProduct.description,
        updatedDynamicAttrs,
        schemaAttributes,
      );
      updateExpressions.push('#searchTokens = :searchTokens');
    } else {
      // Name or description already triggered searchTokens update, but with old dynamicAttributes.
      // Re-generate with the new dynamicAttributes instead.
      const updatedDynamicAttrs = input.dynamicAttributes as Record<
        string,
        string | number | boolean | string[]
      >;
      const name = input.name ?? existingProduct.name;
      const description = input.description ?? existingProduct.description;
      expressionAttributeValues[':searchTokens'] = generateSearchTokens(
        name,
        description,
        updatedDynamicAttrs,
        schemaAttributes,
      );
    }
  }

  // Update schemaVersion if it has changed (Requirement 8.5)
  if (newSchemaVersion !== undefined) {
    expressionAttributeNames['#schemaVersion'] = 'schemaVersion';
    expressionAttributeValues[':schemaVersion'] = newSchemaVersion;
    updateExpressions.push('#schemaVersion = :schemaVersion');
  }

  // Step 5: Execute the update
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

    return mapItemToProductRecord(item as Record<string, unknown>);
  } catch (error) {
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
export async function deleteProduct(productId: string, sellerId: string): Promise<void> {
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
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}

export interface PaginatedProductsResult {
  items: ProductRecord[];
  nextCursor?: string;
}

/**
 * Lists all products for a seller using GSI2 (SellerProducts).
 * Supports cursor-based pagination.
 *
 * Requirements: 5.3
 */
export async function listSellerProducts(
  sellerId: string,
  limit: number = 20,
  cursor?: string,
): Promise<PaginatedProductsResult> {
  try {
    const queryInput: Record<string, unknown> = {
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
        const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8')) as Record<
          string,
          unknown
        >;
        queryInput['ExclusiveStartKey'] = decodedCursor;
      } catch {
        // Invalid cursor, ignore and start from beginning
      }
    }

    const command = new QueryCommand(queryInput as ConstructorParameters<typeof QueryCommand>[0]);
    const result = await docClient.send(command);

    const items: ProductRecord[] = (result.Items ?? []).map((item) =>
      mapItemToProductRecord(item as Record<string, unknown>),
    );

    const paginatedResult: PaginatedProductsResult = { items };
    if (result.LastEvaluatedKey) {
      paginatedResult.nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
        'base64',
      );
    }

    return paginatedResult;
  } catch (error) {
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
export async function setSellerPolicy(
  productId: string,
  input: SellerPolicySchemaInput,
  sellerId: string,
): Promise<ProductRecord> {
  // Step 1: Read the existing product
  const existingProduct = await getProductById(productId);

  // Step 2: Assert ownership
  assertOwnership(existingProduct, sellerId);

  // Step 3: Build the SellerPolicy with new policyVersion and createdAt
  const now = new Date().toISOString();
  const policyVersion = uuidv4();

  const sellerPolicy: SellerPolicy = {
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

    return mapItemToProductRecord(item as Record<string, unknown>);
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    createServiceUnavailableError();
  }
}
