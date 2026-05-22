import type { CreateProductRequest, ProductRecord, UpdateProductSchemaInput, SellerPolicySchemaInput } from '@blipzo/shared';
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
/**
 * Retrieves a product by ID from DynamoDB.
 * Returns the ProductRecord or throws 404 if not found.
 */
export declare function getProductById(productId: string): Promise<ProductRecord>;
/**
 * Asserts that the requesting user owns the product.
 * Throws 403 if sellerId does not match.
 *
 * Requirements: 5.4, 5.6
 */
export declare function assertOwnership(product: ProductRecord, requestingUserId: string): void;
/**
 * Updates a product with only the supplied fields using DynamoDB UpdateExpression.
 * Only fields present in the validated input are updated.
 *
 * Requirements: 5.5, 5.7
 */
export declare function updateProduct(productId: string, input: UpdateProductSchemaInput, sellerId: string): Promise<ProductRecord>;
/**
 * Soft-deletes a product by setting isDeleted = true.
 * Does not physically remove the DynamoDB item.
 *
 * Requirements: 5.3, 5.4
 */
export declare function deleteProduct(productId: string, sellerId: string): Promise<void>;
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
export declare function listSellerProducts(sellerId: string, limit?: number, cursor?: string): Promise<PaginatedProductsResult>;
/**
 * Sets or updates the Seller Policy on a product.
 * Asserts product ownership, generates a new policyVersion UUID and createdAt timestamp,
 * writes the sellerPolicy map onto the product DynamoDB item.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */
export declare function setSellerPolicy(productId: string, input: SellerPolicySchemaInput, sellerId: string): Promise<ProductRecord>;
//# sourceMappingURL=service.d.ts.map