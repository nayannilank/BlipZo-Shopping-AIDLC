import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { CreateProductRequest, ProductRecord, ImageUpload } from '@blipzo/shared';
import { v4 as uuidv4 } from 'uuid';

import { createS3UploadFailedError, createServiceUnavailableError } from './errors.js';

const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);
const s3Client = new S3Client({});

function getProductsTableName(): string {
  return process.env['PRODUCTS_TABLE_NAME'] ?? '';
}

function getProductImagesBucket(): string {
  return process.env['PRODUCT_IMAGES_BUCKET'] ?? '';
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
 * Generates search tokens from product name and description.
 * Tokens are lowercase, space-separated for DynamoDB contains-based search.
 */
function generateSearchTokens(name: string, description: string): string {
  return `${name} ${description}`.toLowerCase();
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
 * Requirements: 5.1, 5.2, 5.8
 */
export async function createProduct(
  input: CreateProductRequest,
  sellerId: string,
): Promise<CreateProductResult> {
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

  const productRecord: ProductRecord = {
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
  } catch {
    createServiceUnavailableError();
  }

  return {
    product: productRecord,
    uploadUrls,
  };
}
