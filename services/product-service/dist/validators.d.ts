import type { CreateProductRequest, UpdateProductSchemaInput, SellerPolicySchemaInput } from '@blipzo/shared';
import type { APIGatewayProxyEvent } from 'aws-lambda';
/**
 * Extracts the seller ID from the API Gateway event's request context.
 * The JWT authorizer places claims in requestContext.authorizer.claims.
 */
export declare function extractSellerId(event: APIGatewayProxyEvent): string;
/**
 * Extracts the user role from the API Gateway event's request context.
 */
export declare function extractUserRole(event: APIGatewayProxyEvent): string;
/**
 * Validates the create product request body against the shared createProductSchema.
 * Returns a typed CreateProductRequest on success, throws a 400 error on validation failure.
 *
 * Requirement 5.1, 5.2
 */
export declare function validateCreateProductInput(event: APIGatewayProxyEvent): CreateProductRequest;
/**
 * Extracts the productId from the path parameters.
 * Throws 400 if not present.
 */
export declare function extractProductId(event: APIGatewayProxyEvent): string;
/**
 * Validates the update product request body against the shared updateProductSchema.
 * Returns a typed UpdateProductSchemaInput on success, throws a 400 error on validation failure.
 * Ensures at least one field is provided for update.
 *
 * Requirements: 5.5, 5.7
 */
export declare function validateUpdateProductInput(event: APIGatewayProxyEvent): UpdateProductSchemaInput;
/**
 * Extracts pagination parameters from query string.
 */
export declare function extractPaginationParams(event: APIGatewayProxyEvent): {
    limit: number;
    cursor?: string;
};
/**
 * Validates the seller policy request body against the shared sellerPolicySchema.
 * Returns a typed SellerPolicySchemaInput on success, throws a 400 error on validation failure.
 *
 * Requirements: 14.1
 */
export declare function validateSellerPolicyInput(event: APIGatewayProxyEvent): SellerPolicySchemaInput;
//# sourceMappingURL=validators.d.ts.map