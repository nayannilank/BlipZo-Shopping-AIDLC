import type { CreateProductRequest, ProductRecord } from '@blipzo/shared';
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
 * Creates a new product in DynamoDB with proper GSI keys and search tokens.
 * Generates pre-signed S3 PUT URLs for image uploads.
 * Only writes to DynamoDB after all pre-signed URLs are successfully generated.
 *
 * Requirements: 5.1, 5.2, 5.8
 */
export declare function createProduct(input: CreateProductRequest, sellerId: string): Promise<CreateProductResult>;
//# sourceMappingURL=service.d.ts.map